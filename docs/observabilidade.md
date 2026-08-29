# Observabilidade WedPlan

## Objetivo

Registrar eventos importantes do produto para investigar falhas, acompanhar funil de checkout, entender uso das principais telas e apoiar suporte sem expor dados pessoais desnecessários.

## Eventos iniciais

- `route.viewed`: navegação no frontend.
- `browser.error`: erro global do navegador.
- `browser.unhandled_rejection`: promise rejeitada sem tratamento.
- `auth.session.loaded`: sessão local carregada.
- `auth.signed_in`, `auth.signed_out`, `auth.token_refreshed`: eventos do Supabase Auth.
- `auth.reset_password.requested`: solicitação de reset de senha.
- `auth.update_password.success`: senha atualizada.
- `checkout.subscription.started`: início do checkout.
- `checkout.subscription.created`: checkout criado no Asaas.
- `checkout.subscription.error`: erro ao iniciar checkout.
- `edge.checkout.started`: Edge Function de checkout recebeu requisição.
- `edge.checkout.created`: checkout persistido pela Edge Function.
- `edge.checkout.error`: erro interno da Edge Function.
- `edge.asaas_webhook.received`: webhook recebido.
- `edge.asaas_webhook.processed`: webhook processado.
- `edge.asaas_webhook.checkout_not_found`: webhook sem checkout correspondente.
- `supplier.created`, `supplier.updated`, `supplier.deleted`, `supplier.reordered`.
- `installment.updated`.
- `guest.created`, `guest.updated`, `guest.deleted`, `guest.public_presence_updated`.
- `task.created`, `task.updated`, `task.deleted`.
- `wedding.info_updated`, `wedding.config_updated`.
- `guided_tour.completed`.

## Dados que não devem ser logados

- Senhas.
- Tokens de autenticação.
- Chaves de API.
- CPF/CNPJ.
- Telefone completo.
- Dados completos de cartão.
- Payload bruto do webhook do Asaas em `app_events`.
- Nome completo de convidados ou mensagens privadas.

## Consulta

Usuários master acessam a tela `Logs` no painel administrativo. A tela consulta os últimos 200 eventos da tabela `app_events`.

## Supabase

A migration `0012_observability_app_events.sql` cria a tabela `app_events`, índices e policies de RLS. Ela é aditiva e deve ser aplicada manualmente no Supabase antes dos logs aparecerem na tela administrativa.

As Edge Functions foram preparadas para não quebrar caso a tabela ainda não exista: nesse caso, elas seguem funcionando e apenas registram aviso no console.
