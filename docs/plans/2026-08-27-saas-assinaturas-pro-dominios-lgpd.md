# Plano de Execução: Assinaturas, Pro, Domínios, Segurança e LGPD

## Norte do Produto

Transformar o WedPlan em um SaaS de assinatura mensal para casais e assessorias, com planos por funcionalidade e add-ons pagos. O plano Pro passa a entregar uma experiência pública para convidados: landing page do casal, RSVP, mensagens, lista de presentes e domínio próprio opcional.

## Estratégia de Preço Inicial

- Essencial: R$ 14,90/mês
- Premium: R$ 24,90/mês
- Pro Casal: R$ 39,90/mês
- Pro Assessoria: R$ 79,90/mês, com múltiplos casamentos
- Add-on domínio próprio: valor anual separado, sugerido entre R$ 79,90 e R$ 149,90/ano

O plano principal da landing deve empurrar o Pro Casal, mas sem esconder o Essencial. A assinatura é melhor que pagamento único porque cobre Supabase, hospedagem, e-mail transacional, suporte e futuras integrações.

## Decisões de Arquitetura

- `role` define permissão humana: `master`, `couple`, `staff`.
- `plan` define cobrança e features: `essential`, `premium`, `pro_couple`, `pro_agency`.
- Não usar role como assinatura.
- Usuário só deve ser criado no Supabase Auth depois da confirmação do primeiro pagamento, ou via convite/admin.
- Não enviar senha por e-mail. O fluxo correto é pagamento confirmado -> criar usuário -> enviar e-mail seguro para definir senha/confirmar conta.
- Chaves Asaas ficam apenas em Supabase Edge Functions, nunca no frontend.
- Domínio próprio entra primeiro como fluxo semi-automático: consultar disponibilidade e cobrar add-on; registro/DNS automático vem depois.

## Fase 0: Segurança e Compliance Antes de Novas Vendas

Objetivo: reduzir risco de vazamento, invasão e descumprimento LGPD antes de escalar tráfego.

Checklist:

- Revisar e remover qualquer uso de `VITE_ASAAS_API_KEY`.
- Garantir que `.env`, `supabase/.temp/` e ferramentas locais não entrem no Git.
- Rotacionar chaves se já foram expostas em histórico remoto.
- Revisar todas as policies RLS de tabelas sensíveis.
- Revogar grants de `anon` onde não houver necessidade pública.
- Criar testes SQL de isolamento: usuário A não lê/edita dados do usuário B.
- Check-in público deve usar apenas RPC com token.
- Views públicas devem ser `security_invoker` ou removidas do acesso público.
- Criar páginas/documentos:
  - Termos de Uso
  - Política de Privacidade
  - Política de Cookies
  - Política de Reembolso/Cancelamento
- Criar banner de cookies com rejeição fácil e opt-in para cookies não necessários.
- Registrar aceite de termos, privacidade e cookies com versão do documento.

Referências de implementação:

- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase API security: https://supabase.com/docs/guides/api/securing-your-api
- OWASP Top 10: https://owasp.org/Top10/2021/
- ANPD Cookies: https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_orientativo_cookies_e_protecao_de_dados_pessoais

## Fase 1: Modelagem de Assinaturas

Criar migration incremental nova, sem alterar a `0002` já aplicada.

Tabelas propostas:

- `plans`
  - código, nome, descrição, preços mensal/anual, ordem, ativo
- `plan_features`
  - feature por plano, valor JSON
- `subscriptions`
  - account, plan, status, período atual, IDs Asaas, cancelamento
- `checkout_sessions`
  - dados do checkout antes de criar usuário Auth
- `subscription_events`
  - histórico imutável de webhooks Asaas
- `legal_documents`
  - termos/privacidade/cookies por versão
- `legal_acceptances`
  - aceite por checkout/account/documento
- `cookie_consents`
  - consentimento granular por visitante/usuário

Status de assinatura:

- `incomplete`
- `trialing`
- `active`
- `past_due`
- `canceled`
- `expired`

## Fase 2: Checkout Por Assinatura

Fluxo alvo:

1. Landing mostra planos e CTAs.
2. Cliente escolhe plano.
3. Checkout coleta nome, e-mail, telefone, CPF/CNPJ quando necessário, aceite legal e plano.
4. Edge Function cria cliente e assinatura no Asaas.
5. `checkout_sessions` fica `payment_pending`.
6. Webhook confirma primeiro pagamento.
7. Edge Function cria usuário Supabase Auth.
8. Sistema envia e-mail seguro para definir senha/confirmar conta.
9. Conta, profile, account e wedding inicial são vinculados ao plano.

Remover:

- Login com Google.
- Criação de conta antes de pagamento, exceto fluxo admin/manual.
- Qualquer tela que sugira pagamento único.

## Fase 3: Landing Page de Vendas

Página maior e mais orientada à conversão:

- Hero com CTA primário e CTA secundário.
- CTAs repetidos em todos os blocos importantes.
- Bloco "para casais" e "para assessorias".
- Comparativo de planos.
- Demonstração visual do dashboard.
- Demonstração da landing pública do casal.
- Bloco de segurança/LGPD.
- FAQ.
- Garantia/cancelamento.
- CTA fixo no mobile.

## Fase 4: Plano Pro

Funcionalidades Pro:

- Landing pública personalizada do casal.
- URL pública por slug.
- RSVP integrado com lista de convidados.
- Mensagens dos convidados.
- Lista de presentes individual do casal.
- Pix/cotas de presente.
- Galeria/fotos do casal.
- Evento/local/mapa/horário.
- Contagem regressiva.
- Templates e tema visual.

Tabelas propostas:

- `wedding_sites`
- `wedding_site_sections`
- `wedding_site_events`
- `gift_lists`
- `gift_items`
- `gift_contributions`
- `guest_messages`
- `media_assets`

RLS:

- Público lê apenas site publicado.
- Público insere RSVP/mensagem/contribuição somente via slug/token e validações.
- Casal gerencia apenas seu próprio `wedding_id`.
- Master administra tudo.

## Fase 5: Domínio Próprio Como Add-on

Fluxo inicial recomendado:

1. Cliente digita domínio desejado.
2. Backend consulta disponibilidade.
3. Se disponível, cria pedido de domínio.
4. Cliente paga add-on anual.
5. Inicialmente o registro pode ser manual assistido.
6. Depois automatizar registro/DNS via API.

Tabelas propostas:

- `custom_domains`
- `domain_orders`
- `domain_availability_checks`

Status:

- `requested`
- `available`
- `payment_pending`
- `manual_registration`
- `registered`
- `dns_pending`
- `active`
- `failed`
- `expired`

Pontos LGPD:

- Registro de domínio pode exigir CPF/CNPJ, telefone e endereço.
- Esses dados precisam constar na Política de Privacidade.
- O titular precisa consentir com repasse ao provedor de domínio.

## Fase 6: Operação e Observabilidade

- Log de webhooks Asaas.
- Tela admin de assinaturas.
- Tela admin de checkout pendente/falho.
- Alertas de pagamento atrasado.
- Auditoria de alterações sensíveis.
- Rate limit em RPCs públicas.
- Monitoramento de erros.

## Ordem de Execução Imediata

1. Higiene Git: ignorar `supabase/.temp/` e `.claude/`.
2. Remover Google OAuth da UI.
3. Remover uso frontend de Asaas API key.
4. Criar migration `0003` com planos/assinaturas/legal/cookies.
5. Criar Edge Function de checkout de assinatura.
6. Ajustar webhook para eventos recorrentes.
7. Recriar landing com planos mensais e CTAs.
8. Criar políticas RLS e testes de isolamento.
9. Só então avançar para Pro landing pública e domínio próprio.

## Critérios de Pronto Para Vender

- Usuário A não acessa dados do usuário B em testes.
- Cliente sem pagamento confirmado não acessa app.
- Pagamento confirmado cria conta e envia e-mail seguro.
- Cancelamento/atraso bloqueia ou limita acesso conforme regra.
- Termos, privacidade e cookies estão disponíveis e versionados.
- Cookies não necessários são opt-in.
- Chaves sensíveis estão somente em Edge Functions/Supabase Secrets.
- Build passa.
- Checkout e webhook passam em sandbox.
