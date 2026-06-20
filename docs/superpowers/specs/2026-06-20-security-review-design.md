# Revisão de Segurança — Design

**Data:** 2026-06-20
**Status:** Aprovado pelo usuário, pronto para plano de implementação.
**Sub-projeto:** 2 de 7 da iniciativa "Transformar WedPlan em produto comercial" (ver `docs/superpowers/specs/2026-06-19-supabase-audit-consolidation-design.md` para o sub-projeto 1, já concluído e mergeado).

## Contexto

O sub-projeto 1 (auditoria e consolidação do Supabase) produziu `supabase/KNOWN_ISSUES.md`, com 9 achados de segurança/arquitetura confirmados contra o schema real de produção. Este sub-projeto resolve os achados de exposição de dados ativa (críticos #1, #2, #3), deixando a reformulação da arquitetura de roles (achados #4 e #5) para o início do sub-projeto de Planos+RLS, que é quem realmente depende dela.

### Como o fluxo público de check-in funciona hoje (confirmado lendo o código)

A rota `/checkin?token=...` carrega o `MainApp` inteiro sem exigir login — `AppRoutes` em `src/App.tsx` libera essa rota só com base na presença do query param `token`. `useWeddingData.ts` resolve o `wedding_id` a partir de `weddings.public_checkin_token` quando não há usuário autenticado, e então busca `weddings`, `suppliers`, `guests` e `tasks` via queries normais filtradas por esse `wedding_id`. O `isPublicMode` em `MainApp.tsx` restringe a UI renderizada a só `CheckInView` (não mostra dashboard financeiro), mas os dados de `suppliers`/`tasks`/orçamento ainda são buscados para o cliente mesmo assim (over-fetch).

`CheckInView` tem duas abas, ambas sobre a tabela `guests` (a aba "Fornecedores" filtra `guests` por `categoria = 'staff'` — **não** é a tabela `suppliers`). É uma ferramenta de check-in no dia do evento (equipe marca presença), não um RSVP pré-evento — RSVP pré-evento é o que o site de convite separado (`confirmacoes`) resolve, em outro sistema.

**O problema real:** a app sempre filtra por `wedding_id` nas suas próprias queries, mas isso só protege contra uso normal do app — não impede alguém de consultar a API REST do Supabase diretamente, sem filtro, usando a `anon key` pública. As policies reais de `weddings` e `guests` são `USING (true)`: permitem leitura (e, em `guests`, escrita via "check-in via token") de **qualquer linha de qualquer casamento**, para qualquer cliente anônimo, sem verificar o token em nenhum momento.

## Achados em escopo (de `KNOWN_ISSUES.md`)

1. **CRÍTICO #1** — `weddings`, `guests` legíveis/editáveis por qualquer anônimo sem checar token.
2. **CRÍTICO #2** — bucket de storage `contracts` publicamente legível.
3. **CRÍTICO #3** — "Check-in via Token Público" não valida token de fato.

## Fora de escopo (explicitamente)

- Achados #4 e #5 (dualidade `profiles.role`/`role_id`, policies ausentes em `accounts`/`account_types`/`roles`) — ficam para o sub-projeto de Planos+RLS.
- Achados #6, #7, #8, #9 (médios) — não bloqueiam venda nem expõem dados; revisar oportunisticamente depois.
- `confirmacoes`, `lista_presentes`, `categorias_presentes`, `chaves_pix` — pertencem a um site de convite digital separado e ativo, que acessa via `anon key`. **Nenhuma policy dessas tabelas é alterada neste sub-projeto.**

## Design

### 1. Functions RPC para o check-in público

Duas functions Postgres `SECURITY DEFINER`, criadas numa nova migration `supabase/migrations/0002_public_checkin_rpc.sql`:

**`public_get_checkin_data(p_token uuid)`**
- Resolve `wedding_id` via `SELECT id, couple_name1, couple_name2, wedding_date FROM weddings WHERE public_checkin_token = p_token`. Se não encontrar, retorna um resultado vazio (não lança erro distinguível de "token inválido" vs "token válido mas sem convidados" — evita oracle de enumeração).
- Retorna: dados do casal (nome1, nome2, data) + lista de `guests` daquele `wedding_id` (`id, nome, categoria, status, adultos, criancas, children_names, is_present`).
- **Não retorna** `suppliers`, `tasks`, `total_budget` ou qualquer outro campo de `weddings` — corrige o over-fetch atual junto com a falha de autorização.

**`public_toggle_guest_presence(p_token uuid, p_guest_id uuid, p_present boolean)`**
- Resolve `wedding_id` via o mesmo lookup de token.
- Confirma `EXISTS (SELECT 1 FROM guests WHERE id = p_guest_id AND wedding_id = <resolvido>)` antes de atualizar — um `guest_id` de outro casamento (mesmo que adivinhado) nunca é afetado.
- Faz `UPDATE guests SET is_present = p_present WHERE id = p_guest_id` só se a confirmação acima passar.
- Retorna um boolean de sucesso, sem detalhar o motivo da falha.

Ambas expostas automaticamente pelo PostgREST via `supabase.rpc('public_get_checkin_data', { p_token })` / `supabase.rpc('public_toggle_guest_presence', { ... })`, chamáveis com a `anon key` normal (RPCs `SECURITY DEFINER` não dependem das policies das tabelas que tocam internamente).

### 2. Remoção das policies inseguras (na mesma migration, após validar o RPC)

- `DROP POLICY "Leitura pública do casamento via token" ON weddings;`
- `DROP POLICY "Leitura pública de convidados" ON guests;`
- `DROP POLICY "Check-in via Token Público" ON guests;`

Depois disso, `anon` não tem mais nenhuma policy em `weddings`/`guests` — todo acesso público passa a ser exclusivamente pelas 2 functions RPC. Acesso autenticado (membros do casamento, master) continua via as policies existentes (`Acesso ao casamento vinculado`, `Users can manage guests of their weddings`, etc.), que não são tocadas.

### 3. Bucket `contracts` → privado + signed URLs

**Migration (mesma `0002_*`):**
- `UPDATE storage.buckets SET public = false WHERE id = 'contracts';`
- `DROP POLICY "Public Access" ON storage.objects;` (a policy de SELECT geral do bucket `contracts`)
- Nova policy de SELECT restrita a membros do casamento dono do contrato (mesmo padrão de path-based check já usado no bucket `casamentos`: `wedding_id::text = (string_to_array(name, '/'))[1]`), assumindo que os arquivos de contrato sejam armazenados com prefixo `{wedding_id}/...` (a ser confirmado/ajustado durante a implementação, verificando o path real usado por `AddSupplierModal.tsx`).

**Backfill de dados (mesma migration, antes do `UPDATE storage.buckets`):**
- `suppliers.contract_url` hoje armazena a URL pública completa retornada por `getPublicUrl()`. Antes de tornar o bucket privado, rodar um `UPDATE suppliers SET contract_url = <path extraído da URL> WHERE contract_url LIKE '%/storage/v1/object/public/contracts/%'` para passar a armazenar só o path relativo dentro do bucket (ex: `{wedding_id}/contrato-fornecedor-x.pdf`), não a URL completa.
- A implementação deve inspecionar os valores reais de `contract_url` em produção antes de escrever o `UPDATE` final, para garantir que o padrão de extração cobre 100% dos registros existentes (não assumir o formato sem checar).

**Frontend:**
- `src/components/suppliers/AddSupplierModal.tsx`: para de chamar `.getPublicUrl(filePath)` e salva apenas `filePath` em `contract_url`.
- `src/components/suppliers/SupplierDetails.tsx`: ao clicar em "Abrir contrato", gera uma signed URL on-demand via `supabase.storage.from('contracts').createSignedUrl(currentSupplier.contract_url, 60)` e abre essa URL (expira em 60s), em vez de abrir `contract_url` diretamente.

### 4. Sequência de rollout (cutover em duas etapas, sem quebrar check-in ativo)

1. Deploy da migration criando as 2 RPCs (mas mantendo as policies antigas por enquanto) + deploy do frontend já chamando as RPCs.
2. Validar manualmente que o novo fluxo funciona (token válido retorna dados certos, toggle funciona, token inválido não retorna nada).
3. Só então, numa segunda migration ou no mesmo deploy já validado localmente, remover as 3 policies antigas de `weddings`/`guests`.
4. Para o bucket de contratos: rodar o backfill primeiro, validar que `createSignedUrl` funciona para contratos já existentes, só então marcar o bucket como privado.

## Critérios de conclusão

- Query anônima direta (sem token) em `weddings` ou `guests` via REST/JS client retorna vazio.
- `supabase.rpc('public_get_checkin_data', { p_token: <token válido> })` retorna casal + convidados daquele casamento e nada de outros casamentos.
- `supabase.rpc('public_get_checkin_data', { p_token: <token inválido> })` retorna vazio, sem erro revelador.
- `supabase.rpc('public_toggle_guest_presence', ...)` com `guest_id` de outro casamento não altera nada.
- Bucket `contracts` é privado; contratos já cadastrados continuam abríveis via signed URL; nenhuma URL pública antiga continua funcionando.
- Nenhuma policy das 4 tabelas do sistema externo (`confirmacoes`, `lista_presentes`, `categorias_presentes`, `chaves_pix`) foi alterada.
- Nenhuma mudança nos achados #4–#9 do `KNOWN_ISSUES.md` (ficam documentados, não corrigidos aqui).
