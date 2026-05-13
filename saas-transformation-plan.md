# SaaS Transformation Plan & Admin Backoffice

## Completed Sprints (History)
- [x] Sprint 1: Authentication & Master Profile Basic Setup
- [x] Sprint 2: Data Isolation & Storage Security
- [x] Sprint 3: SaaS UX & Wedding Switcher

---

## Sprint 4: Role & Account Database Architecture
*Redesign the database to support a true multi-tenant account model with dynamic roles and subscription plans.*

- [x] Task 1: Create `roles` table (e.g., master, admin, couple, guest) and `account_types` table (e.g., Premium).
- [x] Task 2: Create `accounts` table linking `account_types_id`, storing `asaas_subscription_id`, `status` (active, pending_payment), and `created_at`.
- [x] Task 3: Update `profiles` to include `account_id` and reference `role_id` (from the `roles` table) instead of a simple text column.
- [x] Task 4: Write a migration script to transition existing data into the new `accounts` and `roles` structure. → Verify: Existing couples have an account and the master user has the master role.

## Sprint 5: Master Backoffice UI
*Isolate the Master experience. A master user should not see the couple's dashboard.*

- [x] Task 5: Modify `Sidebar.tsx` and `AppLayout.tsx` to conditionally render a completely different menu for Master users (no Fornecedores, Tarefas, etc.).
- [x] Task 6: Implement "Dashboard Admin" (Overview of MRR, active accounts, recent signups).
- [x] Task 7: Implement "Gestão de Usuários" page (List all users, view their account status).
- [x] Task 8: Implement "Reset de Senha" function in the user management page (using Supabase Admin API).
- [x] Task 9: Implement "Cadastro Manual" by the Admin (Bypassing payment).

## Sprint 6: Sales Landing Page & Payment Pipeline
*Transform the public area into a sales funnel and gate the app behind payment.*

- [x] Task 10: Revamp the public route (`/`) into a modern SaaS Landing Page detailing features, benefits, and Pricing.
- [x] Task 11: Modify the `/signup` flow. Step 1: User creates Auth account. Step 2: User selects Plan and is redirected to Asaas checkout or embedded payment form.
- [x] Task 12: Implement the Asaas webhook handler (via Supabase Edge Function) to listen for payment confirmations.
- [x] Task 13: Upon successful payment, update `accounts.status` to 'active' and route the user to the `Onboarding` flow. → Verify: Unpaid users cannot access the app dashboard.

## Done When
- [ ] The database has clear separation of Accounts, Account Types, and Roles.
- [ ] Logging in as `master` shows an exclusive Backoffice (Users, Financials, etc.) instead of the Wedding dashboard.
- [ ] Visitors see a Sales Landing Page.
- [ ] New users must pay via Asaas before accessing the system.
- [ ] Admin can manually manage, create, and reset passwords for users.
