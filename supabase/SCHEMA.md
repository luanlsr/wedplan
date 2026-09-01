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
| `role` | text | Valores: `master`/`couple`/`staff`. A migration `0020_admin_master_foundation.sql` mantém esta coluna alinhada para blindagem das policies. |
| `role_id` | uuid (FK → `roles.id`) | Relação normalizada com `roles`. `public.is_master()` considera tanto `profiles.role = 'master'` quanto `roles.name = 'master'`. |
| `wedding_id` | uuid | **Legado.** Coluna que várias policies de negócio atuais (`Acesso ao casamento vinculado`, `Noivo gere convidados/fornecedores/parcelas/tarefas`) realmente usam para escopar acesso — não `wedding_members`. |
| `account_id` | uuid (FK → `accounts.id`) | |
| `asaas_customer_id` | text | |
| `plan_id`, `plan_status`, `billing_interval` | uuid/text/text | Plano comercial atual sincronizado com `subscriptions` e Asaas. |
| `plan_current_period_start`, `plan_current_period_end`, `plan_access_expires_at` | date/date/timestamptz | Ciclo de acesso vigente. Se expirar, o app bloqueia e pede renovação. |
| `plan_access_checked_at`, `plan_access_source` | timestamptz/text | Última checagem de acesso e origem (`asaas_login_sync`, `asaas_webhook`, etc.). |
| `refund_window_started_at`, `refund_window_ends_at`, `refund_window_status` | timestamptz/timestamptz/text | Janela de reembolso de 7 dias e status (`eligible`/`expired`/`requested`/etc.). |
| `created_at`, `updated_at` | timestamptz | |

### `roles`
Tabela de referência para `role_id`. Valores esperados: `master`, `couple`, `staff`, `guest`. Autenticados podem ler os nomes de roles; gerenciamento deve ocorrer apenas por migration ou ação master segura.

### `account_types`
Planos disponíveis. Colunas: `id`, `name`, `price numeric(10,2)`, `features jsonb`, `created_at`. **RLS ligado, zero policies.**

### `accounts`
Conta/tenant (uma por usuário pagante). Colunas: `id` (= `auth.users.id` para novos signups), `account_type_id` (FK), `status` (`pending_payment`/`active`/`past_due`/`canceled`), `asaas_customer_id`, `asaas_subscription_id`, `created_at`, `updated_at`. RLS ligado; usuário autenticado vê a própria conta e master gerencia todas via `public.is_master()`.

Conta master inicial criada por migration: `admin.master@wedplan.com.br`, role `master`, conta ativa e sem bloqueio por assinatura. Trocar a senha temporária após o primeiro acesso.

### `subscriptions`
Assinaturas comerciais processadas pelo Asaas. Colunas principais: `id`, `account_id`, `plan_id`, `status` (`incomplete`/`trialing`/`active`/`past_due`/`canceled`/`expired`), `billing_interval`, `asaas_customer_id`, `asaas_subscription_id`, `current_period_start`, `current_period_end`, `access_expires_at`, `last_payment_id`, `last_payment_status`, `last_payment_at`, `last_status_checked_at`, `last_status_source`, `refund_window_days`, `refund_window_started_at`, `refund_window_ends_at`, `refund_window_status`, `refund_window_checked_at`, `metadata`, `created_at`, `updated_at`. O webhook do Asaas e a Edge Function `sync-subscription-access` mantêm essa tabela sincronizada.

### `subscription_cancellation_requests`
Pedidos de cancelamento e reembolso abertos pelo usuário dentro do sistema. Colunas principais: `id`, `account_id`, `subscription_id`, `requested_by`, `requested_refund`, `refund_window_status_at_request`, `reason`, `status`, `requested_at`, `resolved_at`, `metadata`, `created_at`, `updated_at`. Usuário autenticado insere e vê os próprios pedidos; master gerencia.

### `subscription_events`
Eventos brutos recebidos do provedor de cobrança. Colunas principais: `id`, `subscription_id`, `account_id`, `provider`, `event_type`, `provider_event_id`, `payload`, `received_at`.

### `legal_documents`
Controle de versões publicadas de documentos legais. Colunas principais: `id`, `document_type` (`terms`/`privacy`/`cookies`/`refund`), `version`, `title`, `public_url`, `content_hash`, `is_active`, `published_at`, `created_at`. Documentos ativos e publicados são públicos; master gerencia.

### `legal_acceptances`
Evidências de aceite dos documentos legais. Colunas principais: `id`, `legal_document_id`, `document_type`, `document_version`, `document_title`, `public_url`, `content_hash`, `account_id`, `user_id`, `checkout_session_id`, `email`, `ip_address`, `user_agent`, `accepted_at`, `acceptance_source`, `locale`, `timezone`, `screen_resolution`, `referrer`, `device_type`, `browser_name`, `operating_system`, `metadata`. Usada para comprovar aceite de Termos/Privacidade no checkout e vinculada ao usuário após confirmação de pagamento.

### `weddings`
Um casamento (unidade central de dados). Colunas principais: `id`, `owner_id` (FK `auth.users`, **UNIQUE** — um usuário só pode ser owner de 1 wedding), `couple_name1`, `couple_name2`, `wedding_date`, `total_budget`, `theme`, `public_checkin_token`, `account_id` (FK `accounts`), `created_at`, `updated_at`.
**Policies:** dono (`owner_id = auth.uid()`) lê/edita; master (`is_master()`) lê/edita tudo; **policy `Leitura pública do casamento via token` usa `USING (true)` sem checar o token de fato — ver `KNOWN_ISSUES.md`.**

### `wedding_members`
Relação N:N entre `weddings` e usuários (membros que não são o owner). PK composta `(wedding_id, user_id)`, coluna `role` (texto livre, default `'owner'`).

### `guests`
Convidados de um casamento. Colunas: `id`, `wedding_id` (FK), `nome`, `categoria`, `status` (`confirmado`/`pendente`/`recusado`), `adultos`, `criancas`, `children_names`, `telefone`, `observacoes`, `is_present`, `created_at`, `updated_at`.
**Policies:** membros do casamento gerenciam; **policy `Leitura pública de convidados` (`USING (true)`) e `Check-in via Token Público` (`USING (true)`, sem validar o token) expõem dados publicamente — ver `KNOWN_ISSUES.md`.**

### `suppliers`
Fornecedores contratados. Colunas: `id`, `wedding_id`, `fornecedor`, `servico`, `categoria`, `valor_total`, `tipo_pagamento`, `data_contrato`, `staff_names`, `phone`, `email`, `cnpj_cpf`, `address`, `contract_url` (legado), `contract_storage_path`, `contract_file_name`, `contract_file_size_bytes`, `contract_compressed_size_bytes`, `contract_mime_type`, `contract_uploaded_at`, `created_at`, `updated_at`. Gerenciado por membros do casamento.

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
| `is_master()` | function, `SECURITY DEFINER` | Retorna `true` se `profiles.role = 'master'` ou se `profiles.role_id` aponta para `roles.name = 'master'`. Usada nas policies e nas Edge Functions administrativas. |
| `update_updated_at_column()` | function, trigger (4x: `weddings`, `guests`, `suppliers`, `tasks`) | Atualiza `updated_at = now()` antes de cada UPDATE. |
| `sync_guest_name()` | function, trigger (`trg_sync_guest_name` em `confirmacoes`) | Sincroniza `guests.nome` a partir de `confirmacoes.full_name` via `unaccent()`/`ILIKE`. Pertence ao fluxo do sistema de convite separado. |
| `rls_auto_enable()` | function, **event trigger** | Habilita RLS automaticamente em qualquer `CREATE TABLE` novo no schema `public`. Existia em produção sem nenhuma migration documentada — agora capturado na baseline. |

## Storage buckets

| Bucket | Público | Policies |
|---|---|---|
| `contracts` | não | Documentos privados de contratos de fornecedores em PDF, DOC ou DOCX. Paths seguem `{wedding_id}/{uuid}.{ext}`; acesso restrito a membros do casamento ou master. Upload passa pela Edge Function `upload-supplier-contract`, que tenta compactar PDFs antes de salvar; visualização usa URL assinada temporária via `create-supplier-contract-url`; remoção usa `delete-supplier-contract`. |
| `casamentos` | sim (a nível de bucket) | Ver/upload/deletar restrito a membros do casamento (via prefixo `{wedding_id}/` no path) ou master. |
