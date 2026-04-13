# Plano de Implementação: Migração para Supabase & Rebranding (WedPlan)

## 🎯 Objetivos
1. **Infraestrutura**: Migrar de `localStorage` para **Supabase (PostgreSQL)**.
2. **Autenticação**: Implementar Login, Cadastro e Recuperação de Senha.
3. **Multi-usuário**: Permitir que o casal compartilhe o mesmo planejamento via `wedding_id`.
4. **Rebranding**: Mudar o nome para **WedPlan** e atualizar metadados.
5. **Marketing**: Criar uma Landing Page de vendas para usuários não logados.

---

## 🏗️ Sprint 1: Fundação, Auth & Rebranding
**Foco**: Configuração base e telas de acesso.

1. **Setup Inicial**:
    - Instalar `@supabase/supabase-js`.
    - Criar `.env.local` com as credenciais fornecidas.
    - Criar `src/lib/supabase.ts` para inicializar o cliente.
2. **Rebranding**:
    - Mudar `Eternal Planner` para `WedPlan` em todo o código.
    - Atualizar `<title>` no `index.html` para "WedPlan - Seu Casamento Perfeito".
3. **Telas de Autenticação (Estética Premium)**:
    - `src/components/auth/LoginForm.tsx`: Login com e-mail/senha.
    - `src/components/auth/SignUpForm.tsx`: Cadastro de novos usuários.
    - `src/components/auth/ForgotPassword.tsx`: Solicitação de link de recuperação.
    - `src/components/auth/ResetPassword.tsx`: Redefinição de senha.
4. **Roteamento & Proteção**:
    - Implementar `AuthProvider` para gerenciar o estado da sessão.
    - Criar `AuthGuard` para redirecionar usuários não logados para `/` (Landing Page).

---

## 🗄️ Sprint 2: Database Schema & Migração de Dados
**Foco**: Persistência real e transição transparente.

1. **Schema PostgreSQL (Migrations)**:
    - Tabela `weddings`: Dados do casal, data, orçamento total.
    - Tabela `profiles`: Vincula `auth.users` a um `wedding_id`.
    - Tabela `suppliers`: Lista de fornecedores vinculados ao `wedding_id`.
    - Tabela `installments`: Parcelas vinculadas ao `supplier_id`.
2. **Políticas de Segurança (RLS)**:
    - Garantir que um usuário só possa ler/escrever dados do seu `wedding_id`.
3. **Script de Migração Silenciosa**:
    - Ao logar pela primeira vez com o e-mail solicitado (`luan.ramalhosilva@gmail.com`), o app lerá o `localStorage`.
    - Enviará os dados para as novas tabelas do Supabase.
    - Marcará o `localStorage` como "migrado" ou o apagará.
4. **Refatoração dos Hooks**:
    - Migrar `useWeddingData` para consumir as tabelas do Supabase (Real-time opcional).

---

## 🚀 Sprint 3: Landing Page & Vendas
**Foco**: Atração de usuários e polimento final.

1. **Landing Page (Rota `/`)**:
    - Seção Hero impactante.
    - Lista de funcionalidades (Dashboard, Calendário de Pagamentos, Gestão de Fornecedores).
    - Botão "Começar Agora" direcionando para o Cadastro.
    - Design premium com animações `framer-motion`.
2. **Fluxo de Primeiro Acesso**:
    - Se um novo usuário se cadastrar e não tiver um `wedding_id`, criar um casamento vazio automaticamente ou redirecionar para um formulário de configurações iniciais.
3. **Validação Final**:
    - Testar recuperação de senha por e-mail (Supabase Auth).
    - Verificar consistência dos dados após a migração.

---

## 🛠️ Stack Técnica
- **Database/Auth**: Supabase.
- **ORM/Query**: Supabase JS Client.
- **Routing**: React Router (ou o sistema atual em App.tsx).
- **Styling**: Tailwind CSS + Estética Premium (Gold/Noir).

> [!IMPORTANT]
> A senha `123456` para o e-mail solicitado será criada via script de sign-up inicial ou por convite direto no Supabase.

> [!NOTE]
> O `wedding_id` (casal_id) será a chave mestre. Se o Luan convidar a parceira, ambos terão o mesmo `wedding_id` em seus perfis.
