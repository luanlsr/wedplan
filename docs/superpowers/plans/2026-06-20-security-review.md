# Revisão de Segurança Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar a exposição de dados de `weddings`/`guests` para clientes anônimos sem token válido, e tornar o bucket de contratos privado, sem alterar nada nas 4 tabelas do sistema externo de convite digital.

**Architecture:** Duas functions Postgres `SECURITY DEFINER` (`public_get_checkin_data`, `public_toggle_guest_presence`) substituem o acesso direto `anon` às tabelas `weddings`/`guests` para o fluxo de check-in público; o frontend (`useWeddingData.ts`) passa a chamar essas RPCs em vez de fazer queries diretas. O cutover é em duas migrations separadas (criar RPCs → validar → remover as policies antigas) para não quebrar check-in de um casamento em andamento. Separadamente, `suppliers.contract_url` é migrado de URL pública completa para path relativo, o bucket `contracts` vira privado, e o frontend passa a gerar signed URLs on-demand.

**Tech Stack:** PostgreSQL/Supabase (migrations SQL), React+TypeScript (`useWeddingData.ts`, `AddSupplierModal.tsx`, `SupplierDetails.tsx`), Supabase CLI local stack (Docker) para validação.

## Global Constraints

- Nenhuma policy das tabelas `confirmacoes`, `lista_presentes`, `categorias_presentes`, `chaves_pix` é alterada (pertencem a um site externo ativo).
- Os achados #4–#9 do `supabase/KNOWN_ISSUES.md` (dualidade de roles, policies de `accounts`/`account_types`/`roles`, etc.) não são tocados aqui — ficam para o sub-projeto de Planos+RLS.
- O fluxo autenticado (couple/staff/master) usando `wedding_members`/`is_master()` não é alterado — só o caminho anônimo via `public_checkin_token`.
- Toda nova migration segue a convenção documentada em `supabase/SCHEMA.md`: arquivo numerado em `supabase/migrations/`, sem SQL manual fora desse fluxo.
- O bucket `contracts` armazena arquivos num path **flat** (`<nome-aleatorio>.<ext>`, sem prefixo de `wedding_id`) — confirmado lendo `AddSupplierModal.tsx:166-168` e os dados reais em produção (ex: `https://whzxmuozumymgopgtslq.supabase.co/storage/v1/object/public/contracts/velv0o0o55p.pdf`). A nova policy de leitura do bucket usa `auth.role() = 'authenticated'` (mesmo padrão já usado pelas policies `Auth Insert`/`Auth Update`/`Auth Delete` existentes) — **não** isolamento por casamento, que exigiria migrar os arquivos para um path com prefixo (fora de escopo aqui; ver Task 8 para o registro desse achado).

---

## Arquivos afetados

- Criar: `supabase/migrations/0002_public_checkin_rpc.sql`
- Criar: `supabase/migrations/0003_drop_public_checkin_policies.sql`
- Criar: `supabase/migrations/0004_backfill_contract_url.sql`
- Criar: `supabase/migrations/0005_contracts_bucket_private.sql`
- Modificar: `src/hooks/useWeddingData.ts` (`loadData`, `updateGuest`)
- Modificar: `src/components/suppliers/AddSupplierModal.tsx`
- Modificar: `src/components/suppliers/SupplierDetails.tsx`
- Modificar: `supabase/KNOWN_ISSUES.md` (registrar o novo achado sobre isolamento do bucket de contratos)

---

### Task 1: Functions RPC para check-in público

**Files:**
- Create: `supabase/migrations/0002_public_checkin_rpc.sql`

**Interfaces:**
- Produces: `public.public_get_checkin_data(p_token uuid) RETURNS jsonb`, `public.public_toggle_guest_presence(p_token uuid, p_guest_id uuid, p_present boolean) RETURNS boolean` — consumidas pela Task 2.

- [ ] **Step 1: Criar o arquivo de migration com as 2 functions**

```sql
-- supabase/migrations/0002_public_checkin_rpc.sql

CREATE OR REPLACE FUNCTION public.public_get_checkin_data(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wedding record;
  v_guests jsonb;
BEGIN
  SELECT id, couple_name1, couple_name2, wedding_date
    INTO v_wedding
    FROM public.weddings
    WHERE public_checkin_token = p_token;

  IF v_wedding.id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'id', g.id,
           'nome', g.nome,
           'categoria', g.categoria,
           'status', g.status,
           'adultos', g.adultos,
           'criancas', g.criancas,
           'children_names', g.children_names,
           'is_present', g.is_present
         )), '[]'::jsonb)
    INTO v_guests
    FROM public.guests g
    WHERE g.wedding_id = v_wedding.id;

  RETURN jsonb_build_object(
    'wedding_id', v_wedding.id,
    'couple_name1', v_wedding.couple_name1,
    'couple_name2', v_wedding.couple_name2,
    'wedding_date', v_wedding.wedding_date,
    'guests', v_guests
  );
END;
$$;

REVOKE ALL ON FUNCTION public.public_get_checkin_data(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_get_checkin_data(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.public_toggle_guest_presence(p_token uuid, p_guest_id uuid, p_present boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wedding_id uuid;
  v_updated integer;
BEGIN
  SELECT id INTO v_wedding_id FROM public.weddings WHERE public_checkin_token = p_token;

  IF v_wedding_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.guests
     SET is_present = p_present
   WHERE id = p_guest_id
     AND wedding_id = v_wedding_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.public_toggle_guest_presence(uuid, uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_toggle_guest_presence(uuid, uuid, boolean) TO anon, authenticated;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/0002_public_checkin_rpc.sql
git commit -m "feat: add SECURITY DEFINER RPCs for public check-in token validation"
```

---

### Task 2: Frontend consome as RPCs no fluxo público

**Files:**
- Modify: `src/hooks/useWeddingData.ts:58-227` (`loadData`), `src/hooks/useWeddingData.ts:330-349` (`updateGuest`)

**Interfaces:**
- Consumes: `public_get_checkin_data`, `public_toggle_guest_presence` (Task 1).

- [ ] **Step 1: Adicionar um branch de retorno antecipado em `loadData` para o caso `!user && publicToken`**

Em `src/hooks/useWeddingData.ts`, logo depois da linha `if (!data.id) setLoading(true);` (linha 69) e **antes** do `try {` que hoje começa na linha 71, insira:

```ts
    if (!user && publicToken) {
      try {
        const { data: checkinData, error } = await supabase.rpc('public_get_checkin_data', { p_token: publicToken });
        if (error) throw error;

        if (!checkinData) {
          setData({ ...INITIAL_DATA, role: 'couple' as UserRole });
          return;
        }

        setData({
          ...INITIAL_DATA,
          id: checkinData.wedding_id,
          role: 'couple' as UserRole,
          account_status: 'active',
          casal: {
            nome1: checkinData.couple_name1 || '',
            nome2: checkinData.couple_name2 || '',
            data: checkinData.wedding_date || '',
          },
          convidados: (checkinData.guests || []).map((g: any) => ({
            id: g.id,
            nome: g.nome,
            categoria: g.categoria,
            status: g.status,
            adultos: g.adultos,
            criancas: g.criancas,
            children_names: g.children_names,
            is_present: g.is_present,
          })),
        });
      } catch (error) {
        console.error('Falha ao carregar dados públicos de check-in:', error);
        setData(INITIAL_DATA);
      } finally {
        setLoading(false);
      }
      return;
    }

```

- [ ] **Step 2: Remover o branch `else if (publicToken)` que ficou morto dentro do bloco autenticado**

O early-return da Step 1 garante que, ao chegar no `try` original (linha 71 antes da edição), `user` é sempre truthy. Remova só o `else if`, mantendo o `if (user) { ... }` exatamente como está:

Antes (linhas ~76-109 do arquivo original):
```ts
        if (user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('full_name, wedding_id, role, role_id, roles(name), accounts(status)')
            .eq('id', user.id)
            .maybeSingle();
          
          if (profileError) console.error('Erro ao carregar perfil:', profileError);
          
          userProfile = profile;
          
          // Debugging
          console.log('DEBUG AUTH - profile from DB:', profile);

          // Normaliza a role para minúsculo
          const rolesData = profile?.roles as any;
          const dbRole = (Array.isArray(rolesData) ? rolesData[0]?.name : rolesData?.name) || profile?.role || 'couple';
          role = dbRole.toLowerCase();

          console.log('DEBUG AUTH - resolved role:', role);

          if (role === 'master') {
            weddingId = profile?.wedding_id;
          } else {
            weddingId = await ensureWeddingExists(user.id);
          }
        } else if (publicToken) {
          const { data: weddingByToken } = await supabase
            .from('weddings')
            .select('id')
            .eq('public_checkin_token', publicToken)
            .maybeSingle();
          if (weddingByToken) weddingId = weddingByToken.id;
        }
```

Depois (remove só o `else if`):
```ts
        if (user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('full_name, wedding_id, role, role_id, roles(name), accounts(status)')
            .eq('id', user.id)
            .maybeSingle();
          
          if (profileError) console.error('Erro ao carregar perfil:', profileError);
          
          userProfile = profile;
          
          // Debugging
          console.log('DEBUG AUTH - profile from DB:', profile);

          // Normaliza a role para minúsculo
          const rolesData = profile?.roles as any;
          const dbRole = (Array.isArray(rolesData) ? rolesData[0]?.name : rolesData?.name) || profile?.role || 'couple';
          role = dbRole.toLowerCase();

          console.log('DEBUG AUTH - resolved role:', role);

          if (role === 'master') {
            weddingId = profile?.wedding_id;
          } else {
            weddingId = await ensureWeddingExists(user.id);
          }
        }
```

- [ ] **Step 3: Especializar `updateGuest` para o caminho público**

Em `src/hooks/useWeddingData.ts:330-349`, substitua a função inteira:

Antes:
```ts
  const updateGuest = async (id: string, updated: Partial<Guest>) => {
    const searchParams = new URLSearchParams(window.location.search);
    const publicToken = searchParams.get('token');
    if (!user && !publicToken) return;
    try {
      const payload: any = {};
      if (updated.nome) payload.nome = updated.nome;
      if (updated.categoria) payload.categoria = updated.categoria;
      if (updated.status) payload.status = updated.status;
      if (updated.adultos !== undefined) payload.adultos = updated.adultos;
      if (updated.criancas !== undefined) payload.criancas = updated.criancas;
      if (updated.children_names !== undefined) payload.children_names = updated.children_names;
      if (updated.telefone !== undefined) payload.telefone = updated.telefone;
      if (updated.observacoes !== undefined) payload.observacoes = updated.observacoes;
      if (updated.is_present !== undefined) payload.is_present = updated.is_present;
      if (updated.invitation_sent !== undefined) payload.invitation_sent = updated.invitation_sent;
      await supabase.from('guests').update(payload).eq('id', id);
      loadData();
    } catch (err) { console.error(err); }
  };
```

Depois:
```ts
  const updateGuest = async (id: string, updated: Partial<Guest>) => {
    const searchParams = new URLSearchParams(window.location.search);
    const publicToken = searchParams.get('token');
    if (!user && !publicToken) return;

    if (!user && publicToken) {
      if (updated.is_present === undefined) return;
      try {
        await supabase.rpc('public_toggle_guest_presence', {
          p_token: publicToken,
          p_guest_id: id,
          p_present: updated.is_present,
        });
        loadData();
      } catch (err) { console.error(err); }
      return;
    }

    try {
      const payload: any = {};
      if (updated.nome) payload.nome = updated.nome;
      if (updated.categoria) payload.categoria = updated.categoria;
      if (updated.status) payload.status = updated.status;
      if (updated.adultos !== undefined) payload.adultos = updated.adultos;
      if (updated.criancas !== undefined) payload.criancas = updated.criancas;
      if (updated.children_names !== undefined) payload.children_names = updated.children_names;
      if (updated.telefone !== undefined) payload.telefone = updated.telefone;
      if (updated.observacoes !== undefined) payload.observacoes = updated.observacoes;
      if (updated.is_present !== undefined) payload.is_present = updated.is_present;
      if (updated.invitation_sent !== undefined) payload.invitation_sent = updated.invitation_sent;
      await supabase.from('guests').update(payload).eq('id', id);
      loadData();
    } catch (err) { console.error(err); }
  };
```

- [ ] **Step 4: Build para garantir que não há erro de tipos**

```bash
npm run build
```

Expected: build conclui sem erros do TypeScript relacionados a `useWeddingData.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useWeddingData.ts
git commit -m "feat: route public check-in flow through SECURITY DEFINER RPCs"
```

---

### Task 3: Validar localmente antes de remover as policies antigas

Gate de validação — sem commit. Usa a stack local do Supabase (Docker) com dados de teste, simulando exatamente o cenário de segurança que a Task 4 vai travar.

**Files:** nenhum arquivo novo (cria e remove um `supabase/seed.sql` temporário).

- [ ] **Step 1: Criar fixtures de teste**

```bash
cat > supabase/seed.sql << 'EOF'
INSERT INTO public.weddings (id, owner_id, couple_name1, couple_name2, wedding_date, public_checkin_token) VALUES
  ('11111111-1111-1111-1111-111111111111', NULL, 'Ana', 'Bruno', '2026-12-12', '22222222-2222-2222-2222-222222222222'),
  ('33333333-3333-3333-3333-333333333333', NULL, 'Outro', 'Casal', '2026-01-01', '44444444-4444-4444-4444-444444444444');

INSERT INTO public.guests (id, wedding_id, nome, categoria, status, adultos, criancas, is_present) VALUES
  ('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'Convidado Teste', 'Familia', 'confirmado', 1, 0, false),
  ('66666666-6666-6666-6666-666666666666', '33333333-3333-3333-3333-333333333333', 'Convidado Outro Casamento', 'Familia', 'confirmado', 1, 0, false);
EOF
```

- [ ] **Step 2: Subir a stack local e resetar (aplica migrations + seed.sql automaticamente)**

```bash
npx supabase start
npx supabase db reset
```

Expected: log mostra `Applying migration 0002_public_checkin_rpc.sql...` e depois `Seeding data from seed.sql...`, sem `ERROR:`. Anote a `Publishable key` impressa por `supabase start` (ex.: `sb_publishable_...`) — vai precisar dela nos próximos steps.

- [ ] **Step 3: Testar `public_get_checkin_data` com token válido**

```bash
curl -s -X POST 'http://127.0.0.1:54321/rest/v1/rpc/public_get_checkin_data' \
  -H "apikey: <publishable_key_do_supabase_start>" \
  -H "Content-Type: application/json" \
  -d '{"p_token": "22222222-2222-2222-2222-222222222222"}'
```

Expected: JSON com `"wedding_id":"11111111-1111-1111-1111-111111111111"`, `"couple_name1":"Ana"`, e `"guests"` contendo o convidado `55555555-...` — **sem** nenhum dado do casamento `33333333-...`.

- [ ] **Step 4: Testar com token inválido**

```bash
curl -s -X POST 'http://127.0.0.1:54321/rest/v1/rpc/public_get_checkin_data' \
  -H "apikey: <publishable_key_do_supabase_start>" \
  -H "Content-Type: application/json" \
  -d '{"p_token": "99999999-9999-9999-9999-999999999999"}'
```

Expected: `null` (sem erro, sem detalhe sobre o motivo).

- [ ] **Step 5: Testar `public_toggle_guest_presence` legítimo**

```bash
curl -s -X POST 'http://127.0.0.1:54321/rest/v1/rpc/public_toggle_guest_presence' \
  -H "apikey: <publishable_key_do_supabase_start>" \
  -H "Content-Type: application/json" \
  -d '{"p_token": "22222222-2222-2222-2222-222222222222", "p_guest_id": "55555555-5555-5555-5555-555555555555", "p_present": true}'
```

Expected: `true`.

- [ ] **Step 6: Testar tentativa de cross-tenant (token de um casamento, guest_id de outro)**

```bash
curl -s -X POST 'http://127.0.0.1:54321/rest/v1/rpc/public_toggle_guest_presence' \
  -H "apikey: <publishable_key_do_supabase_start>" \
  -H "Content-Type: application/json" \
  -d '{"p_token": "22222222-2222-2222-2222-222222222222", "p_guest_id": "66666666-6666-6666-6666-666666666666", "p_present": true}'
```

Expected: `false` (o guest pertence ao outro casamento, não é atualizado).

- [ ] **Step 7: Remover o seed temporário (não é commitado)**

```bash
rm supabase/seed.sql
npx supabase stop
```

---

### Task 4: Remover as policies inseguras de `weddings`/`guests`

**Files:**
- Create: `supabase/migrations/0003_drop_public_checkin_policies.sql`

**Interfaces:**
- Consumes: validação da Task 3 (só prosseguir se todos os 4 testes de RPC passaram).

- [ ] **Step 1: Criar a migration**

```sql
-- supabase/migrations/0003_drop_public_checkin_policies.sql

DROP POLICY IF EXISTS "Leitura pública do casamento via token" ON public.weddings;
DROP POLICY IF EXISTS "Leitura pública de convidados" ON public.guests;
DROP POLICY IF EXISTS "Check-in via Token Público" ON public.guests;
```

- [ ] **Step 2: Validar localmente que o acesso anônimo direto às tabelas agora retorna vazio, mas a RPC continua funcionando**

```bash
npx supabase db reset
```

Expected: aplica `0001` → `0003` sem erro (sem seed desta vez, pasta `supabase/seed.sql` não existe mais).

```bash
curl -s 'http://127.0.0.1:54321/rest/v1/weddings?select=id' \
  -H "apikey: <publishable_key_do_supabase_start>"
```

Expected: `[]` (lista vazia — antes desta task, retornaria todas as weddings).

```bash
npx supabase stop
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0003_drop_public_checkin_policies.sql
git commit -m "fix: remove unscoped anon policies on weddings/guests"
```

---

### Task 5: Backfill de `suppliers.contract_url`

**Files:**
- Create: `supabase/migrations/0004_backfill_contract_url.sql`

**Interfaces:**
- Produces: `suppliers.contract_url` passa a armazenar só o path relativo dentro do bucket `contracts` (ex.: `velv0o0o55p.pdf`), não mais a URL pública completa.

- [ ] **Step 1: Criar a migration**

Os dados reais de produção confirmam o formato `https://<project-ref>.supabase.co/storage/v1/object/public/contracts/<path>` (verificado contra `suppliers.contract_url` real antes de escrever este plano):

```sql
-- supabase/migrations/0004_backfill_contract_url.sql

UPDATE public.suppliers
SET contract_url = regexp_replace(contract_url, '^.*/storage/v1/object/public/contracts/', '')
WHERE contract_url LIKE '%/storage/v1/object/public/contracts/%';
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/0004_backfill_contract_url.sql
git commit -m "fix: backfill suppliers.contract_url to store relative storage path"
```

---

### Task 6: Frontend usa path + signed URL para contratos

**Files:**
- Modify: `src/components/suppliers/AddSupplierModal.tsx:181-185`
- Modify: `src/components/suppliers/SupplierDetails.tsx:362-369`

**Interfaces:**
- Consumes: `suppliers.contract_url` agora é um path relativo (Task 5).
- Produces: `SupplierDetails` gera signed URLs on-demand em vez de usar uma URL pública salva.

- [ ] **Step 1: `AddSupplierModal.tsx` para de salvar URL pública**

Antes (`src/components/suppliers/AddSupplierModal.tsx:181-185`):
```tsx
      const { data: { publicUrl } } = supabase.storage
        .from('contracts')
        .getPublicUrl(filePath);
        
      contractUrl = publicUrl;
```

Depois:
```tsx
      contractUrl = filePath;
```

- [ ] **Step 2: `SupplierDetails.tsx` gera signed URL ao abrir o contrato**

Antes (`src/components/suppliers/SupplierDetails.tsx:362-369`):
```tsx
              <Button 
                variant="outline" 
                className="w-full justify-start font-bold h-12"
                disabled={!currentSupplier.contract_url}
                onClick={() => currentSupplier.contract_url && window.open(currentSupplier.contract_url, '_blank')}
              >
                <FileText size={18} /> Ver Contrato
              </Button>
```

Depois:
```tsx
              <Button 
                variant="outline" 
                className="w-full justify-start font-bold h-12"
                disabled={!currentSupplier.contract_url}
                onClick={async () => {
                  if (!currentSupplier.contract_url) return;
                  const { data, error } = await supabase.storage
                    .from('contracts')
                    .createSignedUrl(currentSupplier.contract_url, 60);
                  if (error || !data?.signedUrl) {
                    console.error('Erro ao gerar link do contrato:', error);
                    return;
                  }
                  window.open(data.signedUrl, '_blank');
                }}
              >
                <FileText size={18} /> Ver Contrato
              </Button>
```

Confirme que `supabase` (de `src/lib/supabase`) já está importado em `SupplierDetails.tsx` — se não estiver, adicione `import { supabase } from '../../lib/supabase';` no topo do arquivo.

- [ ] **Step 3: Build para garantir que não há erro de tipos**

```bash
npm run build
```

Expected: build conclui sem erros relacionados a `AddSupplierModal.tsx`/`SupplierDetails.tsx`.

- [ ] **Step 4: Commit**

```bash
git add src/components/suppliers/AddSupplierModal.tsx src/components/suppliers/SupplierDetails.tsx
git commit -m "feat: use signed URLs for contract files instead of public URLs"
```

---

### Task 7: Validar o fluxo de signed URL localmente

Gate de validação — sem commit.

- [ ] **Step 1: Subir a stack local**

```bash
npx supabase start
```

Anote a `Publishable key` e a `Secret key` impressas.

- [ ] **Step 2: Fazer upload de um arquivo de teste usando a secret key (simula um upload já existente, bypassando RLS só para criar a fixture)**

```bash
echo "contrato de teste" > /tmp/teste-contrato.pdf
curl -s -X POST 'http://127.0.0.1:54321/storage/v1/object/contracts/teste-contrato.pdf' \
  -H "apikey: <secret_key_do_supabase_start>" \
  -H "Authorization: Bearer <secret_key_do_supabase_start>" \
  -H "Content-Type: application/pdf" \
  --data-binary @/tmp/teste-contrato.pdf
```

Expected: resposta JSON de sucesso (`{"Key":"contracts/teste-contrato.pdf", ...}`).

- [ ] **Step 3: Gerar uma signed URL com a publishable key (o mesmo caminho que o frontend usa)**

```bash
curl -s -X POST 'http://127.0.0.1:54321/storage/v1/object/sign/contracts/teste-contrato.pdf' \
  -H "apikey: <publishable_key_do_supabase_start>" \
  -H "Content-Type: application/json" \
  -d '{"expiresIn": 60}'
```

Expected: JSON com `"signedURL"` apontando para `/storage/v1/object/sign/contracts/teste-contrato.pdf?token=...`.

- [ ] **Step 4: Confirmar que a signed URL funciona**

```bash
curl -s -o /dev/null -w "%{http_code}\n" "http://127.0.0.1:54321<signedURL_do_step_anterior>"
```

Expected: `200`.

- [ ] **Step 5: Parar a stack**

```bash
npx supabase stop
```

---

### Task 8: Bucket `contracts` privado + registrar achado de isolamento

**Files:**
- Create: `supabase/migrations/0005_contracts_bucket_private.sql`
- Modify: `supabase/KNOWN_ISSUES.md`

**Interfaces:**
- Consumes: validação da Task 7 (signed URLs funcionando) e backfill da Task 5 já commitado.

- [ ] **Step 1: Criar a migration**

```sql
-- supabase/migrations/0005_contracts_bucket_private.sql

UPDATE storage.buckets SET public = false WHERE id = 'contracts';

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Auth Read" ON storage.objects FOR SELECT USING (bucket_id = 'contracts' AND auth.role() = 'authenticated');
```

- [ ] **Step 2: Validar localmente de ponta a ponta**

```bash
npx supabase start
npx supabase db reset
```

Expected: aplica `0001` → `0005` sem erro (a fixture da Task 7 não existe mais — `db reset` recria a stack do zero).

Recrie a fixture de teste agora que o bucket já está privado, usando a secret key (bypassa RLS, simula um arquivo já existente):

```bash
echo "contrato de teste" > /tmp/teste-contrato.pdf
curl -s -X POST 'http://127.0.0.1:54321/storage/v1/object/contracts/teste-contrato.pdf' \
  -H "apikey: <secret_key_do_supabase_start>" \
  -H "Authorization: Bearer <secret_key_do_supabase_start>" \
  -H "Content-Type: application/pdf" \
  --data-binary @/tmp/teste-contrato.pdf
```

Confirme que a URL pública antiga não funciona mais:

```bash
curl -s -o /dev/null -w "%{http_code}\n" 'http://127.0.0.1:54321/storage/v1/object/public/contracts/teste-contrato.pdf'
```

Expected: `400` ou `404` (bucket privado, rota pública não serve mais o arquivo — confirme o código exato retornado e registre no commit message se divergir do esperado).

Confirme que uma signed URL gerada **depois** do bucket ficar privado ainda funciona (é o que `SupplierDetails.tsx` vai chamar em produção):

```bash
curl -s -X POST 'http://127.0.0.1:54321/storage/v1/object/sign/contracts/teste-contrato.pdf' \
  -H "apikey: <publishable_key_do_supabase_start>" \
  -H "Content-Type: application/json" \
  -d '{"expiresIn": 60}'
```

Expected: JSON com `"signedURL"`. Confirme que ela resolve com `200`:

```bash
curl -s -o /dev/null -w "%{http_code}\n" "http://127.0.0.1:54321<signedURL_retornada_acima>"
```

Expected: `200`.

```bash
npx supabase stop
```

- [ ] **Step 3: Adicionar o achado de isolamento do bucket de contratos ao `supabase/KNOWN_ISSUES.md`**

Adicione ao final do arquivo, antes do fechamento, uma nova seção:

```markdown

## BAIXO (corrigido parcialmente)

10. **Bucket `contracts` não tem isolamento por casamento.** Os arquivos são salvos com nome aleatório direto na raiz do bucket (`AddSupplierModal.tsx`), sem prefixo de `wedding_id`. A correção deste sub-projeto (sub-projeto 2 — Segurança) tornou o bucket privado e exige autenticação para leitura/escrita, eliminando o acesso anônimo. Mas qualquer usuário autenticado de qualquer casamento ainda pode, em teoria, acessar o contrato de outro casamento se descobrir o nome do arquivo (que é aleatório, não enumerável, mas não é uma garantia criptográfica). Isolamento completo por casamento exigiria migrar os arquivos existentes para um path `{wedding_id}/{arquivo}` e atualizar `AddSupplierModal.tsx` para fazer upload nesse formato — fora de escopo deste sub-projeto.
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0005_contracts_bucket_private.sql supabase/KNOWN_ISSUES.md
git commit -m "fix: make contracts bucket private, require authentication for reads"
```
