# Automação de marketing WedPlan

Esta estrutura gera screenshots, gravações e vídeos de anúncio usando a interface real do WedPlan com contas demo e dados fictícios.

## Arquitetura

- `playwright.marketing.config.ts`: configuração isolada do Playwright para marketing.
- `scripts/marketing/playwright`: login demo, screenshots, gravações e fluxos de demonstração.
- `scripts/marketing/remotion`: composições de vídeo para anúncios.
- `scripts/marketing/supabase/demo-accounts.seed.sql`: seed manual para popular contas demo no Supabase.
- `marketing-output`: saídas geradas localmente, ignoradas pelo Git.
- `public/marketing/screenshots`: cópia dos screenshots para o Remotion ler via `staticFile`.

## Contas demo

Crie usuários Auth no Supabase, um por plano, sem usar dados reais:

- `demo.essential@wedplan.com.br`
- `demo.premium@wedplan.com.br`
- `demo.pro@wedplan.com.br`
- `demo.agency@wedplan.com.br`

Depois aplique manualmente no SQL Editor:

```sql
-- scripts/marketing/supabase/demo-accounts.seed.sql
```

A seed procura esses usuários em `auth.users`, vincula plano, account, profile, wedding e restaura dados fictícios. Ela não cria senha e não mexe em contas fora desses e-mails.

## Variáveis

```env
MARKETING_BASE_URL=http://127.0.0.1:5173
MARKETING_DEV_SERVER_COMMAND=npm run dev -- --host 127.0.0.1
MARKETING_SKIP_WEBSERVER=false
MARKETING_FORCE_LOGIN=false
MARKETING_CAPTURE_PLANS=pro_couple

MARKETING_DEMO_EMAIL=
MARKETING_DEMO_PASSWORD=

MARKETING_DEMO_ESSENTIAL_EMAIL=
MARKETING_DEMO_ESSENTIAL_PASSWORD=
MARKETING_DEMO_PREMIUM_EMAIL=
MARKETING_DEMO_PREMIUM_PASSWORD=
MARKETING_DEMO_PRO_COUPLE_EMAIL=
MARKETING_DEMO_PRO_COUPLE_PASSWORD=
MARKETING_DEMO_PRO_AGENCY_EMAIL=
MARKETING_DEMO_PRO_AGENCY_PASSWORD=
```

`MARKETING_CAPTURE_PLANS` aceita lista separada por vírgula, por exemplo:

```env
MARKETING_CAPTURE_PLANS=essential,premium,pro_couple,pro_agency
```

Se quiser usar uma única conta demo para tudo, preencha `MARKETING_DEMO_EMAIL` e `MARKETING_DEMO_PASSWORD`.

## Comandos

```bash
npm run marketing:check-demo
npm run marketing:screenshots
npm run marketing:record
npm run marketing:render
npm run marketing:render:general
npm run marketing:render:budget
npm run marketing:render:guests
npm run marketing:render:checklist
npm run marketing:render:horizontal
npm run marketing:render:all
npm run marketing:all
```

Nesta máquina o `npm` não estava disponível no PATH durante a implementação, então os mesmos scripts também podem ser chamados com `pnpm`:

```bash
pnpm marketing:screenshots
pnpm marketing:render:general
```

Se o dev server já estiver aberto, o Playwright reutiliza `MARKETING_BASE_URL`. Para impedir que ele tente subir servidor:

```env
MARKETING_SKIP_WEBSERVER=true
```

## Saídas

- Screenshots: `marketing-output/screenshots/{plan}/`
- Cópia pública para Remotion: `public/marketing/screenshots/{plan}/`
- Gravações Playwright: `marketing-output/recordings/{plan}/`
- Anúncios finais: `marketing-output/ads/`
- Relatório Playwright: `marketing-output/playwright-report/`

## Formatos de screenshot

- `desktop`: 1440x900
- `instagram`: 1080x1350
- `story`: 1080x1920
- `horizontal`: 1200x628

As rotas capturadas hoje são:

- Dashboard
- Financeiro
- Convidados
- Tarefas
- Fornecedores
- Planejamento
- Ferramentas
- Site do Casal

## Vídeos Remotion

Composições disponíveis:

- `GeneralAd`: anúncio geral vertical 9:16, 20 segundos.
- `BudgetAd`: anúncio financeiro vertical.
- `GuestsAd`: anúncio de convidados vertical.
- `ChecklistAd`: anúncio de tarefas vertical.
- `GeneralHorizontalAd`: versão horizontal 16:9.

As composições usam screenshots reais em `public/marketing/screenshots/pro_couple`. Se os screenshots ainda não existirem, o vídeo renderiza com fundo de produto genérico, mas o ideal para anúncio é rodar `marketing:screenshots` primeiro.

## Criar novo fluxo Playwright

1. Crie um arquivo em `scripts/marketing/playwright/flows`.
2. Use `openMarketingPage(page, '/rota')`.
3. Use `highlightFirstVisible` e `moveMarketingCursor` para guiar a atenção.
4. Adicione o fluxo em `recordings.spec.ts`.

Evite alterar dados reais. Para fluxos que criam/atualizam registros, use apenas contas demo e rode a seed antes/depois.

## Segurança

- Credenciais ficam somente em `.env`, nunca no Git.
- `scripts/marketing/playwright/.auth` é ignorado.
- `marketing-output` é ignorado.
- A seed SQL só opera sobre e-mails demo conhecidos.
- Não execute automações contra produção usando conta de cliente.

## Troubleshooting

- `Credenciais demo ausentes`: preencha as variáveis da conta escolhida em `MARKETING_CAPTURE_PLANS`.
- `Falha ao autenticar`: confirme senha, e-mail e se a conta Auth está confirmada/ativa.
- Playwright não encontra navegador: rode `npx playwright install chromium` ou `pnpm exec playwright install chromium`.
- Remotion mostra fundo sem tela real: rode `marketing:screenshots` antes de renderizar.
- Servidor local não sobe: ajuste `MARKETING_DEV_SERVER_COMMAND` para o gerenciador disponível, por exemplo `pnpm dev -- --host 127.0.0.1`.
