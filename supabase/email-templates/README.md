# E-mails transacionais WedPlan

O canal oficial para suporte e e-mails transacionais do WedPlan é:

```text
suporte@wedplan.com.br
```

Os templates desta pasta exibem esse endereço no rodapé. Para que o remetente real do e-mail também saia como `suporte@wedplan.com.br`, configure o SMTP/Auth do Supabase em produção com:

- Sender email: `suporte@wedplan.com.br`
- Sender name: `WedPlan Suporte`
- Reply-to: `suporte@wedplan.com.br`

Também mantenha as variáveis abaixo nos ambientes do frontend e das Edge Functions:

```text
VITE_SUPPORT_EMAIL=suporte@wedplan.com.br
VITE_TRANSACTIONAL_FROM_EMAIL=suporte@wedplan.com.br
SUPPORT_EMAIL=suporte@wedplan.com.br
TRANSACTIONAL_FROM_EMAIL=suporte@wedplan.com.br
```
