# Instruções para agentes

Sempre use o servidor MCP ui-skills para consultar práticas recomendadas de design de interfaces, acessibilidade, motion e design de componentes front-end quando estiver criando ou refatorando telas.

## Estado do projeto

Este projeto ainda está em desenvolvimento e não está em produção.

## Build e validação de produção

- Não execute `npm run build` automaticamente como parte de uma tarefa comum.
- Não execute `npm test` automaticamente: o script `test` chama `npm run build` antes dos testes.
- Não inicie fluxo de publicação, deploy ou hospedagem pelo Sites sem uma solicitação explícita do usuário.
- Para alterações comuns, prefira inspeção do código, validações direcionadas e `npm run lint` quando isso for suficiente.
- Só execute build, teste completo ou validação de produção quando o usuário pedir explicitamente, solicitar publicação/deploy ou quando essa validação for indispensável para uma etapa explicitamente solicitada. Nesse caso, informe antes qual comando será executado e por quê.
- Se a validação de build parecer apenas recomendável, registre-a como uma sugestão pendente em vez de executá-la.

## Desenvolvimento local

- Quando for necessário visualizar o projeto, prefira `npm run dev`.
- Não trate a existência de `dist/` ou da integração com Sites como motivo suficiente para executar um novo build.
