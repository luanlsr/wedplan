# Auditoria e Consolidação do Supabase — Design

**Data:** 2026-06-19
**Status:** Aprovado pelo usuário, pronto para plano de implementação.
**Sub-projeto:** 1 de 7 da iniciativa "Transformar WedPlan em produto comercial" (ver seção Contexto Macro).

## Contexto

O WedPlan (SaaS de planejamento de casamento, React+Vite+Supabase+Asaas) já passou por uma transformação SaaS parcial (roles, accounts, account_types, landing page, Asaas). O usuário quer evoluir o produto para venda: planos pagos com funcionalidades diferenciadas por plano (via RLS), compliance legal (LGPD/Termos/Cookies), landing page de vendas, revisão de segurança completa, e documentação (AGENTS.md/README).

Esse trabalho foi decomposto em 7 sub-projetos sequenciais, na ordem escolhida pelo usuário ("fundação primeiro"):

1. **Auditoria e consolidação do Supabase** (este documento)
2. Revisão de segurança (corrige achados levantados aqui)
3. Sistema de planos vinculados a usuários + RLS por funcionalidade
4. Compliance legal (Termos de Uso, Política de Cookies, LGPD)
5. Landing page de vendas
6. Novas funcionalidades (brainstorm aberto)
7. Documentação (AGENTS.md, README, lista de skills)

### Achado prévio já remediado (fora deste spec)

Durante a exploração inicial, identificou-se que `.env` (contendo API key de produção do Asaas e webhook token) estava versionado no git e enviado ao remoto `github-pessoal:luanlsr/eternalplanner`. Ação tomada: `.env` removido do tracking, `.gitignore` atualizado, `.env.example` criado (commit `f524f6c`). **Pendente do usuário:** rotacionar as credenciais no painel do Asaas/Supabase Secrets, e decidir se quer reescrever o histórico do git (force-push) depois da rotação — isso é uma decisão separada, fora do escopo deste sub-projeto.

### Por que auditar antes de criar novas migrations

A pasta `supabase/migrations/` tem 21 arquivos numerados (`0001`–`0021`) mais três arquivos soltos sem prefixo numérico: `fix_rls_policies.sql`, `rollback_and_fix.sql`, `drop_all_tables.sql`. Um dump real do banco de produção (via `supabase db dump --schema public,storage,auth`, projeto `eternalplanner` / `whzxmuozumymgopgtslq`) foi comparado contra o que as migrations numeradas implicam. Resultado: **a pasta de migrations não reflete o banco real.**

## Achados da auditoria (confirmados contra o dump real)

### Drift confirmado entre arquivos e produção

- `weddings.creator_id` **nunca existiu em produção** — `fix_rls_policies.sql` nunca foi aplicado. O schema real usa `owner_id` (com UNIQUE constraint, da migration 0007).
- `rollback_and_fix.sql` **foi aplicado** (a função `is_master()` e as 4 policies de master no dump batem exatamente com esse arquivo).
- `drop_all_tables.sql` é um script de **reset destrutivo** (dropa 9 tabelas + trigger de auth) sem prefixo numérico, parado dentro de `supabase/migrations/` — risco silencioso de execução acidental.
- `profiles.role` (TEXT, legado, com CHECK constraint) e `profiles.role_id` (UUID, FK para `roles`) **coexistem** no banco real. A migration 0016 introduziu `role_id` mas nunca removeu `role`. A função `is_master()` e a maioria das policies de negócio (`Noivo gere convidados/fornecedores/parcelas/tarefas`) **ainda leem a coluna legada `role`**, não a nova arquitetura `role_id → roles`. Ou seja, a "nova" arquitetura de roles está escrita no schema mas inerte na prática.
- `roles`, `account_types`, `accounts` têm RLS habilitado mas **zero policies** — hoje isso bloqueia todo acesso via anon/authenticated key (seguro por acidente, não por design).
- 4 tabelas existem em produção sem nenhuma migration correspondente nas 0001–0021: `categorias_presentes`, `chaves_pix`, `confirmacoes` (a tabela em si — só a função/trigger que a referencia está em 0011), `lista_presentes`. Não são referenciadas em nenhum lugar do `src/` deste repositório.
  - **Confirmado pelo usuário:** essas tabelas pertencem a um **site/convite digital separado e ativo**, que acessa esse mesmo projeto Supabase via chave `anon`. Não fazem parte do app WedPlan e não devem ser alteradas sem considerar esse outro consumidor.
- Function `rls_auto_enable()` (event trigger que força RLS em qualquer `CREATE TABLE` novo no schema `public`) existe em produção sem nenhuma migration que a documente.
- Bucket de storage `contracts` existe sem migration de criação rastreável (drift de infraestrutura criada manualmente, provavelmente via SQL Editor/Dashboard).

### Riscos de segurança identificados (não corrigidos neste sub-projeto — ver "Não-objetivos")

- Múltiplas policies `USING (true)` / `WITH CHECK (true)` para `anon` em tabelas com dados sensíveis: `weddings` (leitura pública sem checar token), `guests` (leitura pública + "check-in via token" que não valida token nenhum — o autor original deixou um comentário admitindo isso na migration 0009), `confirmacoes` (permite até DELETE anônimo), `lista_presentes`/`categorias_presentes`.
- Bucket `contracts` com policy de leitura pública sem nenhuma outra condição — qualquer um baixa qualquer contrato.
- `is_master()` (SECURITY DEFINER) depende da coluna legada `profiles.role`, criando risco de drift entre `role` e `role_id` ao longo do tempo.

Esses achados foram **registrados para a fase de Segurança** (sub-projeto 2), que é a próxima da sequência. O usuário optou por não fazer patch de emergência agora — vai esperar o spec formal dessa fase, que precisa levar em conta o consumidor externo (site de convite) ao desenhar a correção.

## Objetivo deste sub-projeto

Fazer a pasta `supabase/migrations/` e a documentação refletirem **com exatidão** o que existe em produção, hoje, antes de qualquer nova migration ser escrita para os próximos sub-projetos (planos/RLS, etc). Não corrigir os problemas de segurança em si (isso é o sub-projeto 2) — apenas documentá-los com precisão suficiente para que o sub-projeto 2 comece sem precisar re-investigar do zero.

## Não-objetivos

- Corrigir as policies `USING (true)` ou redesenhar o acesso público (fica para o sub-projeto "Segurança").
- Migrar `profiles.role` → `role_id` nas policies de negócio (fica para "Segurança" ou "Planos+RLS", pois é pré-requisito direto desse último).
- Alterar ou remover `categorias_presentes`/`chaves_pix`/`confirmacoes`/`lista_presentes` (pertencem a outro sistema; apenas documentar sua existência e o aviso de não-toque).
- Rotacionar credenciais do Asaas ou reescrever histórico do git (já tratado fora deste spec).

## Design

### 1. Baseline + arquivamento

1. Limpar o dump bruto (`supabase/.audit/schema_dump.sql`, já gerado e gitignored) removendo ruído de `pg_dump` que não é necessário num arquivo de migration (`SET`, `COMMENT ON EXTENSION`, grants redundantes que o Supabase já aplica por padrão), mantendo CREATE TABLE/POLICY/FUNCTION/TRIGGER/bucket inserts.
2. Salvar o resultado como `supabase/migrations/0001_baseline_producao.sql`, com um cabeçalho de comentário explicando que é uma baseline gerada a partir do estado real em 2026-06-19, substituindo o histórico anterior.
3. Mover os 21 arquivos antigos (`0001_setup_inicial.sql` ... `0021_ensure_luan_master.sql`) e os 3 soltos (`fix_rls_policies.sql`, `rollback_and_fix.sql`, `drop_all_tables.sql`) para `supabase/migrations/_archive/`, preservando nomes originais. Isso os tira do que o Supabase CLI escaneia como migrations ativas, mas mantém o histórico no git.
4. Rodar `supabase migration repair --status applied 0001` no projeto linkado, para marcar a baseline como já aplicada no tracking remoto (`supabase_migrations.schema_migrations`) **sem executar SQL nenhum em produção** — é só ajuste de bookkeeping para o CLI não tentar reaplicar algo que já existe.
5. Validar com `supabase migration list` que o estado local e remoto ficaram consistentes (nenhuma migration pendente, nenhum drift reportado).

### 2. `supabase/SCHEMA.md`

Documento de referência em português, estruturado como:
- **Tabelas do app WedPlan** (as 11 tabelas centrais): colunas, tipos, FKs, propósito em 1 linha cada.
- **RLS policies por tabela**, em linguagem simples ("quem pode ver/criar/editar/excluir o quê").
- **Functions e triggers**: nome, gatilho, o que fazem.
- **Storage buckets**: `contracts`, `casamentos`.
- **⚠️ Seção "Tabelas de outro sistema"**: `categorias_presentes`, `chaves_pix`, `confirmacoes`, `lista_presentes` — propósito (RSVP/convite digital separado), aviso explícito de não alterar sem considerar esse outro consumidor.
- **Convenção de migrations daqui pra frente**: sempre `supabase migration new <nome>` para novas mudanças; nunca editar uma migration já aplicada; nunca aplicar SQL manual via Dashboard sem depois capturar como migration.

### 3. `supabase/KNOWN_ISSUES.md`

Lista dos achados de segurança/arquitetura (seção "Riscos de segurança identificados" acima), cada um com severidade (crítico/alto/médio) e a tabela/policy afetada, servindo de ponto de partida direto para o brainstorm do sub-projeto 2 (Segurança).

## Critérios de conclusão

- `supabase migration list` não reporta nenhuma migration pendente nem diff entre local e remoto.
- `supabase/migrations/` contém apenas `0001_baseline_producao.sql` (mais o que vier depois); os 24 arquivos antigos estão em `_archive/`.
- `supabase/SCHEMA.md` e `supabase/KNOWN_ISSUES.md` existem e cobrem 100% das tabelas/policies/functions/triggers/buckets confirmados no dump real.
- Nenhuma alteração foi feita no schema real do banco (apenas bookkeeping local + documentação).
