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
9. **Extensão `unaccent` não capturada como `CREATE EXTENSION` na baseline.** A função `sync_guest_name()` usa `unaccent()`, mas como ela já existia em produção, o dump `--schema public` não a inclui. Funciona normalmente em produção; só falharia se alguém recriasse o banco do zero (`supabase db reset`) e o trigger em `confirmacoes` disparasse antes da extensão existir. Baixo risco hoje, vale um `CREATE EXTENSION IF NOT EXISTS unaccent;` explícito na próxima migration que tocar essa função.
