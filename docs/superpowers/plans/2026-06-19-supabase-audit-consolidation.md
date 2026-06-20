# Auditoria e Consolidação do Supabase — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer `supabase/migrations/` refletir com exatidão o banco de produção real (projeto `eternalplanner`, ref `whzxmuozumymgopgtslq`), documentar o schema e os riscos conhecidos, sem alterar nada no banco real.

**Architecture:** Arquivar as 21 migrations numeradas + 3 arquivos soltos; gerar uma migration baseline única a partir de um dump real do schema `public` (mais um bloco manual conhecido para buckets/policies de `storage`); marcar essa baseline como já aplicada no tracking remoto via `supabase migration repair` (bookkeeping apenas, zero SQL executado em produção); validar a baseline localmente via Docker (`supabase db reset`); escrever `SCHEMA.md` e `KNOWN_ISSUES.md`.

**Tech Stack:** Supabase CLI (via `npx supabase`), PostgreSQL 17, Docker (stack local do Supabase), git.

## Global Constraints

- Nenhuma alteração real é feita no schema do banco de produção — apenas no tracking de migrations (bookkeeping) e em arquivos locais/documentação.
- `categorias_presentes`, `chaves_pix`, `confirmacoes`, `lista_presentes` pertencem a um site/convite digital separado e ativo (confirmado pelo usuário) — não removê-las nem alterar suas policies. Apenas documentar sua existência.
- Toda documentação nova é em português, consistente com o restante do projeto.
- `supabase/.audit/schema_dump.sql` (dump de investigação já gerado, gitignored) pode ser usado como referência cruzada, mas não é o arquivo final de baseline.
- Projeto Supabase já linkado nesta máquina (`supabase link --project-ref whzxmuozumymgopgtslq` já executado). Comandos que precisam de autenticação remota devem ser prefixados com `SUPABASE_ACCESS_TOKEN=<token>` se a sessão de CLI não estiver ativa — peça o token ao usuário se necessário, nunca o registre em arquivo.

---

## Arquivos afetados

- Mover (git mv): `supabase/migrations/0001_setup_inicial.sql` … `0021_ensure_luan_master.sql`, `fix_rls_policies.sql`, `rollback_and_fix.sql`, `drop_all_tables.sql` → `supabase/migrations/_archive/`
- Criar: `supabase/migrations/0001_baseline_producao.sql`
- Criar: `supabase/SCHEMA.md`
- Criar: `supabase/KNOWN_ISSUES.md`

---

### Task 1: Arquivar as migrations antigas

**Files:**
- Move: 21 arquivos numerados + 3 soltos de `supabase/migrations/` para `supabase/migrations/_archive/`

**Interfaces:**
- Produces: pasta `supabase/migrations/` vazia (pronta para receber só a baseline na Task 2), pasta `supabase/migrations/_archive/` com todo o histórico preservado.

- [ ] **Step 1: Criar a pasta de arquivamento**

```bash
mkdir -p "supabase/migrations/_archive"
```

- [ ] **Step 2: Mover os 21 arquivos numerados com git mv**

```bash
git mv supabase/migrations/0001_setup_inicial.sql supabase/migrations/_archive/
git mv supabase/migrations/0002_add_children_names_to_guests.sql supabase/migrations/_archive/
git mv supabase/migrations/0003_reestruturacao_total.sql supabase/migrations/_archive/
git mv supabase/migrations/0004_fix_auth_trigger.sql supabase/migrations/_archive/
git mv supabase/migrations/0005_fix_rls_recursion.sql supabase/migrations/_archive/
git mv supabase/migrations/0006_fix_missing_policies.sql supabase/migrations/_archive/
git mv supabase/migrations/0007_unique_wedding_owner.sql supabase/migrations/_archive/
git mv supabase/migrations/0008_seed_guests.sql supabase/migrations/_archive/
git mv supabase/migrations/0009_checkin_token_rls.sql supabase/migrations/_archive/
git mv supabase/migrations/0010_add_data_pagamento_to_installments.sql supabase/migrations/_archive/
git mv supabase/migrations/0011_sync_guest_names_trigger.sql supabase/migrations/_archive/
git mv supabase/migrations/0012_add_supplier_contract_fields.sql supabase/migrations/_archive/
git mv supabase/migrations/0013_add_user_roles_and_asaas.sql supabase/migrations/_archive/
git mv supabase/migrations/0014_data_isolation_and_storage.sql supabase/migrations/_archive/
git mv supabase/migrations/0015_add_email_to_profiles.sql supabase/migrations/_archive/
git mv supabase/migrations/0016_account_and_roles_architecture.sql supabase/migrations/_archive/
git mv supabase/migrations/0017_set_master_user.sql supabase/migrations/_archive/
git mv supabase/migrations/0018_set_test_asaas_customer_id.sql supabase/migrations/_archive/
git mv supabase/migrations/0019_set_plan_price_5reais.sql supabase/migrations/_archive/
git mv supabase/migrations/0020_fix_signup_trigger.sql supabase/migrations/_archive/
git mv supabase/migrations/0021_ensure_luan_master.sql supabase/migrations/_archive/
```

- [ ] **Step 3: Mover os 3 arquivos soltos**

```bash
git mv supabase/migrations/fix_rls_policies.sql supabase/migrations/_archive/
git mv supabase/migrations/rollback_and_fix.sql supabase/migrations/_archive/
git mv supabase/migrations/drop_all_tables.sql supabase/migrations/_archive/
```

- [ ] **Step 4: Verificar que a pasta migrations está vazia e o arquivo está intacto**

```bash
ls supabase/migrations/
ls supabase/migrations/_archive/ | wc -l
```

Expected: `supabase/migrations/` não lista nenhum `.sql` (só a subpasta `_archive`); `_archive` lista 24 arquivos.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/
git commit -m "chore: archive legacy migration files before baseline reset"
```

---

### Task 2: Gerar a migration baseline a partir do schema real (`public`)

**Files:**
- Create: `supabase/migrations/0001_baseline_producao.sql`

**Interfaces:**
- Consumes: projeto Supabase linkado (`whzxmuozumymgopgtslq`).
- Produces: `supabase/migrations/0001_baseline_producao.sql` contendo DDL completo do schema `public` (tabelas, policies, functions, triggers, extensions) — usado pela Task 3 e validado pela Task 4.

- [ ] **Step 1: Gerar o dump do schema public direto no arquivo de destino**

Se o CLI não estiver autenticado nesta sessão, peça ao usuário um Personal Access Token (https://supabase.com/dashboard/account/tokens) e use só como variável de ambiente do comando, nunca salvo em arquivo:

```bash
SUPABASE_ACCESS_TOKEN=<token_do_usuario> npx supabase db dump --schema public --linked -f supabase/migrations/0001_baseline_producao.sql
```

Expected: saída final `Dumped schema to .../supabase/migrations/0001_baseline_producao.sql.` e exit code 0.

- [ ] **Step 2: Remover o boilerplate padrão do pg_dump (linhas de SET/COMMENT que não fazem parte do schema em si)**

```bash
grep -vE "^(SET |SELECT pg_catalog\.set_config|COMMENT ON SCHEMA|COMMENT ON EXTENSION|RESET ALL;)" supabase/migrations/0001_baseline_producao.sql > supabase/migrations/0001_baseline_producao.tmp.sql
mv supabase/migrations/0001_baseline_producao.tmp.sql supabase/migrations/0001_baseline_producao.sql
```

Expected: nenhum erro; o arquivo continua começando por uma instrução `CREATE EXTENSION` ou `CREATE FUNCTION`/`CREATE TABLE` válida (confira abrindo as primeiras 20 linhas).

- [ ] **Step 3: Adicionar cabeçalho explicativo no topo do arquivo**

Abra o arquivo e adicione estas linhas no topo (antes de qualquer outra coisa):

```sql
-- ============================================================
-- BASELINE DE PRODUÇÃO — gerada em 2026-06-19 a partir de
-- `supabase db dump --schema public` do projeto eternalplanner
-- (ref whzxmuozumymgopgtslq). Substitui o histórico de
-- migrations 0001-0021 + fix_rls_policies.sql + rollback_and_fix.sql
-- + drop_all_tables.sql, arquivados em supabase/migrations/_archive/.
-- Esta migration é marcada como já aplicada via
-- `supabase migration repair` (Task 5) — NUNCA deve ser reaplicada
-- manualmente contra o banco de produção.
-- ============================================================

```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0001_baseline_producao.sql
git commit -m "feat: generate production baseline migration from live schema dump"
```

---

### Task 3: Anexar buckets e policies de storage à baseline

O comando `db dump --schema public` não inclui objetos do schema `storage` (buckets/policies), que são necessários para o app (upload de contratos e arquivos por casamento). Esta task adiciona o bloco exato e já confirmado contra o dump real de produção (ver auditoria).

**Files:**
- Modify: `supabase/migrations/0001_baseline_producao.sql` (apêndice no final do arquivo)

**Interfaces:**
- Consumes: arquivo criado na Task 2.
- Produces: baseline completa (public + storage), usada pela Task 4.

- [ ] **Step 1: Acrescentar o bloco de storage ao final do arquivo**

Adicione ao final de `supabase/migrations/0001_baseline_producao.sql`:

```sql

-- ============================================================
-- STORAGE: buckets e policies (schema storage, fora do dump
-- --schema public). Conteúdo confirmado contra o dump real de
-- produção em 2026-06-19.
-- ============================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('contracts', 'contracts', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('casamentos', 'casamentos', true) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'contracts');

DROP POLICY IF EXISTS "Auth Insert" ON storage.objects;
CREATE POLICY "Auth Insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'contracts' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Auth Update" ON storage.objects;
CREATE POLICY "Auth Update" ON storage.objects FOR UPDATE USING (bucket_id = 'contracts' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Auth Delete" ON storage.objects;
CREATE POLICY "Auth Delete" ON storage.objects FOR DELETE USING (bucket_id = 'contracts' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Membros do casamento podem ver arquivos" ON storage.objects;
CREATE POLICY "Membros do casamento podem ver arquivos" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'casamentos'
        AND (
            EXISTS (
                SELECT 1 FROM public.wedding_members
                WHERE wedding_id::text = (string_to_array(name, '/'))[1]
                AND user_id = auth.uid()
            )
            OR public.is_master()
        )
    );

DROP POLICY IF EXISTS "Membros do casamento podem fazer upload" ON storage.objects;
CREATE POLICY "Membros do casamento podem fazer upload" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'casamentos'
        AND (
            EXISTS (
                SELECT 1 FROM public.wedding_members
                WHERE wedding_id::text = (string_to_array(name, '/'))[1]
                AND user_id = auth.uid()
            )
            OR public.is_master()
        )
    );

DROP POLICY IF EXISTS "Membros do casamento podem deletar arquivos" ON storage.objects;
CREATE POLICY "Membros do casamento podem deletar arquivos" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'casamentos'
        AND (
            EXISTS (
                SELECT 1 FROM public.wedding_members
                WHERE wedding_id::text = (string_to_array(name, '/'))[1]
                AND user_id = auth.uid()
            )
            OR public.is_master()
        )
    );
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/0001_baseline_producao.sql
git commit -m "feat: append storage buckets and policies to baseline migration"
```

---

### Task 4: Validar a baseline localmente (Docker)

Isso aplica a baseline do zero num banco local (Docker), nunca em produção — é o equivalente a "rodar os testes" para uma migration.

**Files:**
- Nenhum arquivo novo. Apenas validação.

**Interfaces:**
- Consumes: `supabase/migrations/0001_baseline_producao.sql` (Tasks 2+3).
- Produces: confirmação de que a baseline é aplicável do zero, sem erros — pré-requisito para a Task 5.

- [ ] **Step 1: Subir a stack local do Supabase (requer Docker Desktop ativo)**

```bash
npx supabase start
```

Expected: depois de baixar/iniciar os containers, mostra uma tabela com `API URL`, `DB URL`, `Studio URL`, etc. Pode levar alguns minutos na primeira vez.

- [ ] **Step 2: Resetar o banco local aplicando a baseline do zero**

```bash
npx supabase db reset
```

Expected: log mostrando `Applying migration 0001_baseline_producao.sql...` seguido de `Finished supabase db reset` sem nenhuma linha de erro (`ERROR:`). Se der erro de sintaxe ou objeto duplicado, volte à Task 2/3 e corrija o arquivo antes de continuar.

- [ ] **Step 3: Confirmar que a baseline está marcada como aplicada localmente**

```bash
npx supabase migration list
```

Expected: uma única linha, com `Local: 0001` e `Remote` vazio (o remoto só será atualizado na Task 5) — e nenhuma outra migration listada (confirma que o arquivamento da Task 1 funcionou).

- [ ] **Step 4: Parar a stack local**

```bash
npx supabase stop
```

(Nenhum commit nesta task — é só validação, sem mudança de arquivo.)

---

### Task 5: Marcar a baseline como aplicada no remoto (bookkeeping, sem tocar o schema)

**Files:**
- Nenhum arquivo modificado. Apenas o tracking remoto (`supabase_migrations.schema_migrations`).

**Interfaces:**
- Consumes: baseline validada na Task 4; projeto linkado.
- Produces: estado consistente entre `supabase/migrations/` local e o tracking remoto — pré-requisito para que futuras migrations (sub-projeto Planos+RLS) possam ser aplicadas com `supabase db push` sem conflito.

- [ ] **Step 1: Marcar a versão 0001 como aplicada no remoto**

```bash
SUPABASE_ACCESS_TOKEN=<token_do_usuario> npx supabase migration repair --status applied 0001
```

Expected: confirmação de que a versão `0001` foi marcada como `applied` no remoto. **Este comando não executa nenhum SQL — só insere um registro na tabela de controle.**

- [ ] **Step 2: Verificar consistência local vs remoto**

```bash
SUPABASE_ACCESS_TOKEN=<token_do_usuario> npx supabase migration list
```

Expected: uma única linha `0001 | 0001 | <timestamp>` — local e remoto batendo, sem nenhuma migration pendente.

(Nenhum commit nesta task — é uma operação remota, sem mudança de arquivo local.)

---

### Task 6: Escrever `supabase/SCHEMA.md`

**Files:**
- Create: `supabase/SCHEMA.md`

**Interfaces:**
- Consumes: achados da auditoria (tabelas, policies, functions, triggers, buckets confirmados contra o dump real).
- Produces: documento de referência usado pelo sub-projeto 2 (Segurança) e pelo sub-projeto 7 (Documentação/AGENTS.md).

- [ ] **Step 1: Criar o arquivo com o conteúdo completo abaixo**

```markdown
# Schema do Banco — WedPlan

> Gerado em 2026-06-19 a partir do schema real de produção (projeto `eternalplanner`, ref `whzxmuozumymgopgtslq`), confirmado via `supabase db dump`. Substitui qualquer suposição baseada só nas migrations antigas (ver `supabase/migrations/_archive/` para o histórico).

## Convenção de migrations daqui pra frente

- Toda mudança de schema é uma migration numerada nova em `supabase/migrations/`, criada com `supabase migration new <nome>`.
- Nunca editar uma migration já aplicada (nem a baseline `0001_baseline_producao.sql`).
- Nunca aplicar SQL manual via Dashboard/SQL Editor sem depois capturar a mesma mudança como uma migration formal — é exatamente essa prática que causou o drift documentado nesta auditoria.
- Aplicar com `supabase db push` (não SQL Editor manual).

## Tabelas do app WedPlan

### `profiles`
Perfil de cada usuário autenticado (1:1 com `auth.users`).
| Coluna | Tipo | Notas |
|---|---|---|
| `id` | uuid (PK) | = `auth.users.id` |
| `full_name` | text | |
| `email` | text | |
| `role` | text | **Legado.** Valores: `master`/`couple`/`staff`. Ainda é a coluna que `is_master()` e a maioria das policies de negócio realmente leem. |
| `role_id` | uuid (FK → `roles.id`) | Arquitetura "nova" introduzida em 2025, hoje sem uso real nas policies — ver `KNOWN_ISSUES.md`. |
| `account_id` | uuid (FK → `accounts.id`) | |
| `asaas_customer_id` | text | |
| `created_at`, `updated_at` | timestamptz | |

### `roles`
Tabela de referência para `role_id`. Valores esperados: `master`, `couple`, `staff`, `guest`. **RLS ligado, zero policies** (ver `KNOWN_ISSUES.md`).

### `account_types`
Planos disponíveis. Colunas: `id`, `name`, `price numeric(10,2)`, `features jsonb`, `created_at`. **RLS ligado, zero policies.**

### `accounts`
Conta/tenant (uma por usuário pagante). Colunas: `id` (= `auth.users.id` para novos signups), `account_type_id` (FK), `status` (`pending_payment`/`active`/`past_due`/`canceled`), `asaas_customer_id`, `asaas_subscription_id`, `created_at`, `updated_at`. **RLS ligado, zero policies.**

### `weddings`
Um casamento (unidade central de dados). Colunas principais: `id`, `owner_id` (FK `auth.users`, **UNIQUE** — um usuário só pode ser owner de 1 wedding), `couple_name1`, `couple_name2`, `wedding_date`, `total_budget`, `theme`, `public_checkin_token`, `account_id` (FK `accounts`), `created_at`, `updated_at`.
**Policies:** dono (`owner_id = auth.uid()`) lê/edita; master (`is_master()`) lê/edita tudo; **policy `Leitura pública do casamento via token` usa `USING (true)` sem checar o token de fato — ver `KNOWN_ISSUES.md`.**

### `wedding_members`
Relação N:N entre `weddings` e usuários (membros que não são o owner). PK composta `(wedding_id, user_id)`, coluna `role` (texto livre, default `'owner'`).

### `guests`
Convidados de um casamento. Colunas: `id`, `wedding_id` (FK), `nome`, `categoria`, `status` (`confirmado`/`pendente`/`recusado`), `adultos`, `criancas`, `children_names`, `telefone`, `observacoes`, `is_present`, `created_at`, `updated_at`.
**Policies:** membros do casamento gerenciam; **policy `Leitura pública de convidados` (`USING (true)`) e `Check-in via Token Público` (`USING (true)`, sem validar o token) expõem dados publicamente — ver `KNOWN_ISSUES.md`.**

### `suppliers`
Fornecedores contratados. Colunas: `id`, `wedding_id`, `fornecedor`, `servico`, `categoria`, `valor_total`, `tipo_pagamento`, `data_contrato`, `staff_names`, `phone`, `email`, `cnpj_cpf`, `address`, `contract_url`, `created_at`, `updated_at`. Gerenciado por membros do casamento.

### `installments`
Parcelas de pagamento de um fornecedor. Colunas: `id`, `supplier_id` (FK), `wedding_id` (FK, denormalizado para RLS), `numero`, `valor`, `data_vencimento`, `data_pagamento`, `status`. Gerenciado por membros do casamento.

### `tasks`
Checklist de tarefas. Colunas: `id`, `wedding_id`, `titulo`, `descricao`, `categoria`, `data_limite`, `status`, `ordem`. Gerenciado por membros do casamento.

### `planning_simulations`
Simulação de fluxo de caixa/aportes mensais. PK `wedding_id`. Colunas: `current_step`, `current_month_index`, `simulated_aportes jsonb`, `updated_at`. Gerenciado por membros do casamento.

## ⚠️ Tabelas de outro sistema (NÃO ALTERAR sem checar o outro consumidor)

As tabelas abaixo **existem no mesmo projeto Supabase** mas **não são usadas em nenhum lugar do código deste repositório** (`src/`). Confirmado com o usuário: pertencem a um site de convite/RSVP digital separado e ativo, que acessa este banco via chave `anon`. Qualquer mudança de policy/schema aqui tem que considerar esse outro consumidor antes de alterar.

- **`confirmacoes`** — confirmações de presença (RSVP). Tem um trigger (`trg_sync_guest_name`) que sincroniza o nome com `guests.nome` via `unaccent()`.
- **`lista_presentes`** — lista de presentes/gift registry.
- **`categorias_presentes`** — categorias da lista de presentes.
- **`chaves_pix`** — chaves PIX para recebimento de presentes em dinheiro.

Todas as quatro têm policies de `anon` escopadas a um `wedding_id` fixo (`c28206d4-9c4b-4cb3-8a4a-9045e7b0bd8a`) **mais** policies adicionais com `USING (true)` sem escopo — ver `KNOWN_ISSUES.md` para o risco de segurança associado.

## Functions e triggers

| Nome | Tipo | O que faz |
|---|---|---|
| `handle_new_user()` | function, `SECURITY DEFINER`, trigger em `auth.users` (`on_auth_user_created`) | Ao criar um usuário, cria `accounts` (status `pending_payment`) e `profiles` (`role_id`='couple', `account_id`=user.id). |
| `is_master()` | function, `SECURITY DEFINER` | Retorna `true` se `profiles.role = 'master'` para o usuário atual. Usada em quase toda policy de bypass de master. **Lê a coluna legada `role`, não `role_id`.** |
| `update_updated_at_column()` | function, trigger (4x: `weddings`, `guests`, `suppliers`, `tasks`) | Atualiza `updated_at = now()` antes de cada UPDATE. |
| `sync_guest_name()` | function, trigger (`trg_sync_guest_name` em `confirmacoes`) | Sincroniza `guests.nome` a partir de `confirmacoes.full_name` via `unaccent()`/`ILIKE`. Pertence ao fluxo do sistema de convite separado. |
| `rls_auto_enable()` | function, **event trigger** | Habilita RLS automaticamente em qualquer `CREATE TABLE` novo no schema `public`. Existia em produção sem nenhuma migration documentada — agora capturado na baseline. |

## Storage buckets

| Bucket | Público | Policies |
|---|---|---|
| `contracts` | sim | Leitura pública sem restrição (`Public Access`); insert/update/delete só autenticado. **Ver `KNOWN_ISSUES.md` — contratos contêm dados sensíveis e estão publicamente baixáveis.** |
| `casamentos` | sim (a nível de bucket) | Ver/upload/deletar restrito a membros do casamento (via prefixo `{wedding_id}/` no path) ou master. |
```

- [ ] **Step 2: Commit**

```bash
git add supabase/SCHEMA.md
git commit -m "docs: add SCHEMA.md documenting the real production database"
```

---

### Task 7: Escrever `supabase/KNOWN_ISSUES.md`

**Files:**
- Create: `supabase/KNOWN_ISSUES.md`

**Interfaces:**
- Consumes: achados de segurança confirmados na auditoria.
- Produces: ponto de partida direto do brainstorm do sub-projeto 2 (Segurança).

- [ ] **Step 1: Criar o arquivo com o conteúdo completo abaixo**

```markdown
# Known Issues — Banco de Dados

> Achados da auditoria de 2026-06-19 (sub-projeto "Auditoria e consolidação do Supabase"). Nenhum destes itens foi corrigido aqui — ficam para o sub-projeto seguinte ("Revisão de segurança"). Severidade: CRÍTICO > ALTO > MÉDIO.

## CRÍTICO

1. **Dados de convidados/RSVP/presentes legíveis e editáveis por qualquer visitante anônimo.** As tabelas `weddings`, `guests`, `confirmacoes`, `lista_presentes`, `categorias_presentes` têm policies com `USING (true)` / `WITH CHECK (true)` para `anon`, sem nenhum filtro por `wedding_id` ou token. Em `confirmacoes`, isso inclui `DELETE`. Correção precisa validar o `public_checkin_token` de fato (hoje nenhuma policy faz isso) e, para as 4 tabelas do sistema de convite separado, coordenar com esse outro consumidor antes de mudar qualquer policy.
2. **Bucket de storage `contracts` é publicamente legível** (`Public Access` policy sem nenhuma condição além do bucket). Qualquer pessoa baixa qualquer contrato de fornecedor de qualquer casamento, sem login.
3. **"Check-in via Token Público" não valida token nenhum.** A policy de UPDATE em `guests` só confere que o `wedding_id` existe — o próprio autor original deixou um comentário admitindo a limitação na migration arquivada `0009_checkin_token_rls.sql`. Qualquer pessoa pode marcar qualquer convidado de qualquer casamento como presente.

## ALTO

4. **Duas fontes de verdade para o "role" do usuário.** `profiles.role` (texto legado) é o que `is_master()` e quase todas as policies de negócio realmente leem. `profiles.role_id` → `roles` (a arquitetura "nova", introduzida para suportar múltiplos papéis de forma extensível) existe no schema mas está inerte — nada escreve ou lê dela nas policies atuais. Isso é um pré-requisito direto para o sub-projeto de Planos+RLS (que precisa de uma fonte de verdade confiável para "o que este usuário pode fazer").
5. **`accounts`, `account_types`, `roles` têm RLS ligado e zero policies.** Hoje isso bloqueia todo acesso via `anon`/`authenticated` (seguro por acidente). Mas como essas tabelas já têm `GRANT ALL` concedido por padrão do Postgres/Supabase, a primeira policy futura mal calibrada (ex.: copiar um `USING (true)` de outra tabela) exporia dados financeiros/de assinatura imediatamente. Recomendação: escrever policies explícitas e restritivas para essas 3 tabelas como parte do sub-projeto de Planos+RLS, não deixar para depois.

## MÉDIO

6. **`UNIQUE` em `weddings.owner_id` conflita conceitualmente com `wedding_members`.** Um usuário só pode ser *owner* de 1 casamento, mas o modelo `wedding_members` (N:N) sugere que um usuário poderia ser *membro* de vários. Vale decidir se isso é intencional (1 conta = 1 casamento próprio) antes de desenhar o sistema de planos.
7. **`rls_auto_enable()` (event trigger) existia em produção sem nenhuma migration que a documentasse.** Agora capturada na baseline (`0001_baseline_producao.sql`), mas vale revisar se o comportamento automático (RLS forçado em toda tabela nova) é desejado daqui pra frente ou se deveria ser explícito por migration.
8. **`wedding_id` hardcoded** (`c28206d4-9c4b-4cb3-8a4a-9045e7b0bd8a`) em policies do sistema de convite separado (`chaves_pix`, `confirmacoes`, `lista_presentes`). Não afeta o app WedPlan, mas indica acoplamento rígido a um único casamento naquele outro sistema — relevante só se algum dia ele for migrado/generalizado.
```

- [ ] **Step 2: Commit**

```bash
git add supabase/KNOWN_ISSUES.md
git commit -m "docs: add KNOWN_ISSUES.md with confirmed security and architecture findings"
```

---

### Task 8: Verificação final

**Files:**
- Nenhum arquivo novo.

- [ ] **Step 1: Confirmar estrutura final da pasta migrations**

```bash
ls supabase/migrations/
```

Expected: apenas `0001_baseline_producao.sql` e a subpasta `_archive/`.

- [ ] **Step 2: Confirmar que o git está limpo (nada pendente deste plano)**

```bash
git status --porcelain
```

Expected: nenhuma linha relacionada a `supabase/migrations/`, `supabase/SCHEMA.md` ou `supabase/KNOWN_ISSUES.md` (tudo já commitado nas tasks anteriores).

- [ ] **Step 3: Conferir consistência remota uma última vez**

```bash
SUPABASE_ACCESS_TOKEN=<token_do_usuario> npx supabase migration list
```

Expected: `0001 | 0001 | <timestamp>`, sem pendências.
