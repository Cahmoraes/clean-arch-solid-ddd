---
created_at: "2026-09-20T10:35:06-03:00"
updated_at: "2026-09-20T10:35:06-03:00"
---

# Research: capacidade de paginação variável nas atividades do usuário

## Question & Scope

Verificar se o backend atualmente consegue fornecer à tela de atividades do usuário
(`/perfil`) um número variável de itens por página, mantendo a paginação por `page`.

O escopo é somente a capacidade atual do backend e seus contratos existentes. Não
foram desenhadas alterações nem definidos valores de UX para as opções de tamanho.

## Key Findings

### O backend pagina por página, mas o tamanho está fixo em 20

**Estabelecido.** O `GetUserActivityUseCase` recebe apenas `userId` e `page` e
define `USER_ACTIVITY_PAGE_SIZE = 20`. Esse valor é repassado ao DAO e também
retornado em `pagination.pageSize`.

Evidências:

- `apps/backend/src/user/application/use-case/get-user-activity.usecase.ts:16,55-58`
- `apps/backend/src/user/infra/controller/get-user-activity.controller.ts:16-30`
- `apps/backend/src/user/infra/controller/get-my-activity.controller.ts:16-25`

### Não existe parâmetro HTTP para escolher o tamanho da página

**Estabelecido.** Os endpoints autenticados `GET /users/me/activity` e
`GET /users/:userId/activity` aceitam somente `page` na query. Não há
`pageSize`, `limit`, `size` ou `offset` configurável por requisição. O
`pageSize` aparece apenas na resposta, dentro dos metadados de paginação.

Evidências:

- `apps/backend/src/user/infra/controller/get-user-activity.controller.ts:16-30,67-87`
- `apps/backend/src/user/infra/controller/get-my-activity.controller.ts:16-25,58-67`
- `apps/backend/docs/openapi-spec.json:1966-1986,2174-2192`
- `packages/api-types/index.d.ts:1400-1455,1510-1551`

### A persistência já suporta um tamanho recebido como argumento

**Estabelecido.** A abstração do DAO já possui a assinatura
`findActivityPage(userId, page, pageSize)`. Tanto o DAO Prisma quanto o
in-memory usam esse argumento para calcular `skip`/`take` ou o recorte da lista.
Portanto, a camada de persistência não está estruturalmente presa ao valor 20.

Evidências:

- `apps/backend/src/user/application/persistence/dao/user-activity-dao.ts:11-35`
- `apps/backend/src/shared/infra/database/dao/prisma/prisma-user-activity-dao.ts:18-77`
- `apps/backend/src/shared/infra/database/dao/in-memory/user-activity-dao-memory.ts:16-49`

### O frontend atualmente não envia tamanho de página

**Estabelecido.** A rota `/perfil` lê e altera somente o parâmetro `page`.
`useUserActivity` envia `params.query.page`; a interface exibe o `pageSize`
recebido pelo backend e mostra o texto fixo “20 por página”. Não existe
`pageSize`/`limit` no request atual.

Evidências:

- `apps/frontend/src/app/(authenticated)/perfil/page.tsx:370-480`
- `apps/frontend/src/features/activity/api/use-user-activity.ts:8-13,35-47,84-94`
- `apps/frontend/src/features/activity/components/activity-pagination-card-header.tsx:20-28`
- `apps/frontend/src/features/activity/components/activity-tab.tsx:182-196`

### Trocar a constante permitiria apenas uma mudança global, não por usuário

**Provável.** Alterar `USER_ACTIVITY_PAGE_SIZE` faria o backend usar outro
valor para todas as requisições, sem mudar a estrutura do DAO. Porém, isso não
atende à opção de aumentar/reduzir a página escolhida na tela, porque o
request não carrega essa escolha.

O limite máximo de `page` também é derivado do tamanho fixo, por meio de
`floor(Number.MAX_SAFE_INTEGER / USER_ACTIVITY_PAGE_SIZE)`, e o OpenAPI
publicado contém o valor resultante. Assim, uma alteração global exigiria
atualizar expectativas e contratos gerados.

Evidências:

- `apps/backend/src/user/infra/controller/get-user-activity.controller.ts:20-25`
- `apps/backend/src/user/infra/controller/get-my-activity.controller.ts:16-21`
- `apps/backend/docs/openapi-spec.json:1971-1974,2179-2182`
- `apps/backend/src/user/application/use-case/get-user-activity.usecase.test.ts:78,122,157`
- `apps/backend/src/user/infra/controller/get-user-activity.business-flow-test.ts:83,95,111,128`
- `apps/backend/src/user/infra/controller/get-my-activity.business-flow-test.ts:83,111`

## Sources

- `apps/backend/src/user/application/use-case/get-user-activity.usecase.ts` —
  fonte primária do caso de uso; define o tamanho fixo e encaminha o `pageSize`;
  código atual, consultado em 2026-09.
- `apps/backend/src/user/infra/controller/get-user-activity.controller.ts` —
  fonte primária do endpoint administrativo; schema e validação da query;
  código atual, consultado em 2026-09.
- `apps/backend/src/user/infra/controller/get-my-activity.controller.ts` —
  fonte primária do endpoint do próprio usuário; schema e validação da query;
  código atual, consultado em 2026-09.
- `apps/backend/src/user/application/persistence/dao/user-activity-dao.ts` —
  contrato primário de persistência; recebe `pageSize`; código atual,
  consultado em 2026-09.
- `apps/backend/src/shared/infra/database/dao/prisma/prisma-user-activity-dao.ts`
  — implementação primária de persistência; aplica `skip`/`take`; código atual,
  consultado em 2026-09.
- `apps/backend/docs/openapi-spec.json` —
  contrato HTTP publicado; documenta somente `page` como query param; código
  gerado/publicado, consultado em 2026-09.
- `packages/api-types/index.d.ts` —
  contrato TypeScript consumido pelo frontend; não expõe `pageSize` na query;
  código gerado, consultado em 2026-09.
- `apps/frontend/src/features/activity/api/use-user-activity.ts` —
  consumidor primário do endpoint; envia somente `page`; código atual,
  consultado em 2026-09.
- Testes unitários, business-flow e integração listados nos achados —
  evidência independente dentro do repositório de que o comportamento esperado
  hoje é `pageSize: 20`.

## Open Questions

- Qual conjunto de opções deve ser permitido na interface e qual limite máximo
  deve ser aceito pelo endpoint (por exemplo, 10/20/50/100)? Isso não faz parte
  da capacidade atual e precisa ser decidido no design.
- O tamanho escolhido deve permanecer apenas na URL da tela, em estado local ou
  ser persistido por usuário? O backend atual não expressa essa preferência.
- Não foi necessária pesquisa web: a pergunta foi respondida por fontes
  primárias do próprio repositório. Uma confirmação em ambiente executando o
  endpoint não foi feita; a conclusão é estática, baseada no código e nos
  contratos versionados.

## Recommendation / Implications for design

O backend **não é capaz atualmente de variar o número de itens por requisição**:
ele aceita apenas `page` e fixa o tamanho em 20 no caso de uso.

A viabilidade técnica é boa e não exige mudança estrutural na persistência. O
DAO já recebe `pageSize` e implementa o recorte de forma genérica. O ajuste
necessário ficaria no contrato de entrada e no caso de uso:

1. adicionar um parâmetro de query para o tamanho, com validação e limite
   explícitos;
2. encaminhar esse valor em vez da constante fixa;
3. manter `pagination.pageSize` refletindo o valor efetivamente usado;
4. atualizar OpenAPI, `@repo/api-types` e testes dos dois endpoints;
5. decidir uma política de segurança para impedir valores excessivos ou
   abusivos.

A conclusão é **estabelecida** para a ausência de suporte por requisição e para
o suporte genérico do DAO. A única decisão ainda aberta é o contrato desejado
para os valores permitidos; ela deve ser fechada antes da implementação.
