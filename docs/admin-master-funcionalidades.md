# Admin Master WedPlan

## Funcionalidades necessárias

O perfil Admin Master deve ser a única role com visão global do sistema. Qualquer ação sensível deve ter validação no banco ou em Edge Function com `service_role`, nunca apenas por esconder botões no frontend.

### Gestão de usuários e contas

- Listar todos os usuários cadastrados.
- Buscar por nome, e-mail, status, plano e identificadores.
- Criar usuários manualmente com senha inicial e e-mail confirmado.
- Enviar solicitação de redefinição de senha.
- Liberar acesso manualmente.
- Bloquear acesso por inadimplência, suspeita de uso indevido ou solicitação operacional.
- Cancelar/desativar conta sem apagar dados imediatamente.
- Ver role atual, status da conta, plano, datas de acesso e última checagem.
- Impedir que uma ação comum bloqueie ou altere outro perfil `master`.

### Assinaturas e pagamentos

- Visualizar assinaturas ativas, pendentes, vencidas, canceladas e expiradas.
- Visualizar checkouts pendentes ou com falha.
- Ver vínculo com Asaas: cliente, assinatura, cobrança e link de pagamento.
- Forçar rechecagem de status de assinatura quando necessário.
- Ajustar status comercial apenas com registro de auditoria.
- Gerenciar pedidos de cancelamento e reembolso.
- Ver janela de reembolso de 7 dias e seu status.

### Planos e funcionalidades

- Editar nome, descrição, preço mensal/anual e status ativo dos planos.
- Controlar recursos por plano em `plan_features`.
- Ver quais funcionalidades cada plano libera.
- Manter histórico/auditoria de mudanças comerciais.

### Casamentos e dados do cliente

- Visualizar casamentos vinculados às contas.
- Alternar contexto para suporte operacional quando necessário.
- Ver fornecedores, convidados, tarefas, contratos e site do casal para atendimento.
- Corrigir vínculos quebrados entre `profiles`, `accounts`, `subscriptions` e `weddings`.

### Segurança, auditoria e LGPD

- Visualizar logs de eventos e erros.
- Filtrar logs por usuário, conta, casamento, rota, sessão e nível.
- Ver registros de aceite legal, consentimento de cookies e versão dos documentos.
- Ver solicitações de suporte e histórico operacional.
- Registrar toda ação sensível do master em `app_events`.
- Restringir acesso por RLS usando `public.is_master()`.
- Evitar fallback por e-mail hardcoded em Edge Functions.

### Domínios e site público

- Ver pedidos de domínio personalizado.
- Alterar status operacional do pedido.
- Alterar status de cobrança do domínio.
- Abrir site público vinculado ao pedido.
- Registrar observações e dados do provedor quando houver integração.

### Comunicação e suporte

- Centralizar envio transacional pelo remetente oficial `suporte@wedplan.com.br`.
- Ver solicitações de suporte dos usuários.
- Responder ou marcar solicitações como resolvidas.
- Auditar comunicações críticas: reset, cobrança, cancelamento e liberação de acesso.

## Implementado nesta etapa

- Conta inicial `admin.master@wedplan.com.br` criada por migration.
- Role `master` garantida em `profiles.role` e `profiles.role_id`.
- `public.is_master()` ajustada para aceitar role legada ou relação `roles`.
- Policies de `accounts` adicionadas para usuário ver a própria conta e master gerenciar contas.
- Rotas administrativas protegidas por guarda React além da sidebar.
- `admin-create-user` agora exige caller master e não aceita fallback por e-mail.
- Nova Edge Function `admin-update-user-access` para liberar/bloquear usuários com validação server-side.
- Tela de Usuários passou a acionar liberação/bloqueio real e protege usuários master.
