# Plano de melhorias - produto, conversao e estabilidade

Data: 2026-09-02

## Objetivo

Evoluir o WedPlan nos pontos que mais impactam conversao, confianca do usuario e estabilidade operacional: checkout, login, dashboard mobile, estados vazios, financeiro, automacoes e observabilidade.

## Prioridade 1 - Fluxos criticos

### 1. Revisar checkout completo

Objetivo: reduzir abandono e evitar erros em telas mobile.

Escopo:
- Revisar layout mobile de todas as etapas.
- Melhorar validacao de campos obrigatorios.
- Garantir mascaras consistentes para telefone, CPF/CNPJ e valores.
- Melhorar estados de carregamento, erro e sucesso.
- Preservar dados preenchidos ao voltar etapas.
- Exibir resumo do plano, preco, garantia e pagamento seguro durante o fluxo.

Criterios de aceite:
- Nenhuma etapa gera rolagem lateral no mobile.
- Campos longos nao ficam cortados.
- Erros aparecem perto do campo correto.
- Usuario entende claramente o que precisa corrigir.
- Build e TypeScript passam.

### 2. Fortalecer login e rotas protegidas

Objetivo: tornar autenticao previsivel e diminuir falhas intermitentes.

Escopo:
- Diferenciar mensagens de senha errada, e-mail nao confirmado, internet instavel e conta sem acesso ativo.
- Criar estado de sessao expirada.
- Revisar redirecionamentos para usuarios logados, deslogados e acessos por token.
- Garantir que o app so navegue depois de confirmar a sessao.
- Registrar eventos de sucesso, falha e logout.

Criterios de aceite:
- Login nao redireciona antes da sessao estar disponivel.
- Usuario deslogado nao acessa areas protegidas.
- Usuario com token continua acessando check-in corretamente.
- Falhas recebem mensagens compreensiveis.

### 3. Validar dashboard mobile inteiro

Objetivo: eliminar rolagem lateral e componentes mais largos que a tela.

Escopo:
- Revisar dashboard, convidados, financeiro, fornecedores, tarefas, cronograma, contratos e configuracoes.
- Trocar tabelas problematicas por cards responsivos quando necessario.
- Aplicar `min-w-0`, `max-w-full`, truncamento e quebra controlada em textos longos.
- Testar nomes longos, fornecedores longos, categorias longas e valores altos.

Criterios de aceite:
- Nenhuma tela principal gera rolagem lateral em 360px, 390px e 430px.
- Textos nao sobrepoem botoes, badges ou valores.
- A leitura continua confortavel em desktop.

## Prioridade 2 - Conversao e confianca

### 4. Melhorar prova social da landing page

Objetivo: aumentar confianca antes do checkout.

Escopo:
- Adicionar depoimentos curtos.
- Incluir indicadores de uso, quando houver dados reais.
- Mostrar beneficios objetivos por perfil de casal.
- Reforcar garantia de 7 dias, LGPD, site seguro e pagamento seguro.

Criterios de aceite:
- Landing comunica seguranca sem parecer poluida.
- Selos aparecem bem no mobile.
- CTA principal continua visivel e claro.

### 5. Melhorar secao de planos

Objetivo: deixar escolha de plano mais rapida.

Escopo:
- Destacar plano recomendado.
- Comparar mensal e anual com economia real.
- Exibir recursos por plano de forma escaneavel.
- Reforcar garantia e meios de pagamento perto do CTA.

Criterios de aceite:
- Usuario entende preco, periodo e vantagens antes de clicar.
- Plano recomendado e visualmente evidente.
- Layout mobile nao corta preco, CTA ou beneficios.

### 6. Criar resumo fixo do checkout

Objetivo: reduzir inseguranca durante compra.

Escopo:
- No desktop, exibir resumo lateral do plano.
- No mobile, usar resumo compacto recolhivel.
- Mostrar plano, preco, garantia, formas de pagamento e selo Asaas.

Criterios de aceite:
- Resumo nao atrapalha preenchimento.
- Usuario pode conferir compra antes de pagar.

## Prioridade 3 - Produto

### 7. Estados vazios com acao direta

Objetivo: guiar novos usuarios apos o primeiro acesso.

Escopo:
- Criar estados vazios para convidados, fornecedores, financeiro, tarefas, cronograma e site.
- Incluir CTA principal em cada estado.
- Usar copy curta e orientada a proxima acao.

Criterios de aceite:
- Usuario novo sempre sabe o que fazer na tela.
- Estados vazios nao parecem erro ou tela quebrada.

### 8. Importacao de convidados por planilha

Objetivo: acelerar a configuracao inicial.

Escopo:
- Permitir importacao CSV/XLSX.
- Mapear colunas comuns: nome, telefone, grupo, adultos, criancas, status.
- Exibir pre-visualizacao antes de salvar.
- Validar duplicados e campos obrigatorios.

Criterios de aceite:
- Usuario consegue importar uma lista padrao sem editar manualmente cada convidado.
- Erros de linhas aparecem de forma clara.

### 9. Tarefas sugeridas automaticamente

Objetivo: tornar o produto mais util assim que o casal informa a data.

Escopo:
- Gerar tarefas por marco temporal: 12 meses, 6 meses, 3 meses, 1 mes, semana do casamento.
- Permitir aceitar tudo, editar ou remover sugestoes.
- Ajustar prazos conforme data do casamento.

Criterios de aceite:
- Casal novo recebe um planejamento inicial pronto para adaptar.
- Tarefas sugeridas nao duplicam tarefas existentes.

### 10. Alertas inteligentes

Objetivo: chamar atencao para riscos do planejamento.

Escopo:
- Alertar pagamentos proximos e atrasados.
- Alertar tarefas atrasadas.
- Alertar convidados pendentes.
- Alertar orcamento estourando ou perto do limite.

Criterios de aceite:
- Alertas aparecem no dashboard e nas telas relevantes.
- Alertas podem ser resolvidos ao concluir a acao relacionada.

### 11. Melhorias no financeiro

Objetivo: deixar custos e pagamentos mais claros.

Escopo:
- Adicionar graficos simples por categoria.
- Exibir total pago, restante, contratado e orcado.
- Melhorar visualizacao de parcelas.
- Criar previsao mensal de desembolso.

Criterios de aceite:
- Usuario entende rapidamente quanto falta pagar.
- Categorias caras ficam evidentes.

## Prioridade 4 - Tecnico e operacao

### 12. Testes dos fluxos criticos

Objetivo: evitar regressao em login, checkout e dashboard mobile.

Escopo:
- Criar testes para login, logout, checkout, rotas protegidas e check-in por token.
- Criar testes visuais ou Playwright para largura mobile.
- Incluir cenarios de erro do Supabase e pagamento.

Criterios de aceite:
- Fluxos criticos rodam em pipeline/local com comandos documentados.
- Regressao de rolagem lateral e detectada antes de deploy.

### 13. Observabilidade de autenticacao e pagamento

Objetivo: diagnosticar problemas reais de usuario com rapidez.

Escopo:
- Registrar eventos de login iniciado, login com sucesso, login falhou, sessao expirada.
- Registrar checkout iniciado, checkout enviado, erro de pagamento, pagamento confirmado.
- Padronizar metadados sem expor dados sensiveis.

Criterios de aceite:
- Erros de login e pagamento podem ser investigados por evento.
- Logs nao armazenam senha, token ou dados sensiveis.

### 14. Otimizacao de bundle

Objetivo: reduzir tempo de carregamento.

Escopo:
- Analisar chunks grandes apontados pelo Vite.
- Separar telas pesadas com lazy loading.
- Revisar bibliotecas carregadas no bundle principal.
- Medir impacto antes e depois.

Criterios de aceite:
- Bundle inicial fica menor.
- Rotas principais carregam mais rapido.
- Nao ha regressao funcional.

## Ordem sugerida de execucao

1. Checkout completo.
2. Login, sessao expirada e rotas protegidas.
3. Auditoria mobile das telas internas.
4. Estados vazios e onboarding inicial.
5. Landing page, planos e resumo do checkout.
6. Importacao de convidados.
7. Tarefas sugeridas e alertas inteligentes.
8. Financeiro avancado.
9. Testes e observabilidade.
10. Otimizacao de bundle.

## Proxima sessao sugerida

Comecar pelo checkout completo, porque ele impacta diretamente a conversao e tambem reaproveita melhorias de layout, validacao e mensagens de erro para o restante do app.
