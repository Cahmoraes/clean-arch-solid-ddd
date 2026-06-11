# PRD - Integração OpenAPI Completa

## Visão Geral

O projeto possui infraestrutura parcial de OpenAPI (via `@fastify/swagger` e `@fastify/swagger-ui`) com Swagger UI acessível em `/documentation`. Porém, apenas 2 de 18 controllers possuem schemas documentados. Este PRD define os requisitos para alcançar **100% de cobertura OpenAPI** em todos os endpoints, com validação automática, testes de contrato e possibilidade de geração de clients.

**Problema central**: ausência de documentação explícita das rotas expostas, dificultando o entendimento da API por desenvolvedores internos, impedindo validação automática de contratos e tornando a integração entre serviços propensa a erros.

## Objetivos

- **100% das rotas documentadas** com schemas OpenAPI 3.0 completos (request body, query params, path params, headers, responses)
- **Validação automática** de request/response contra os schemas definidos
- **Testes de contrato** que garantam que a spec OpenAPI reflete o comportamento real da API
- **Geração de clients/SDK** a partir da spec para consumo por outros serviços
- **Swagger UI funcional** com exemplos de uso para cada endpoint
- **Spec exportável** como arquivo JSON/YAML para uso em ferramentas externas

## Histórias de Usuário

### Desenvolvedor interno consultando API

> Como desenvolvedor interno, eu quero acessar uma documentação interativa (Swagger UI) de todos os endpoints para que eu possa entender rapidamente os contratos de entrada/saída sem precisar ler o código-fonte.

### Desenvolvedor integrando serviço

> Como desenvolvedor de um serviço consumidor, eu quero gerar um client tipado automaticamente a partir da spec OpenAPI para que eu tenha segurança de tipos ao chamar a API.

### Desenvolvedor mantendo a API

> Como desenvolvedor que altera endpoints, eu quero que testes de contrato falhem automaticamente se eu quebrar o schema documentado para que eu detecte breaking changes antes do deploy.

### Desenvolvedor novo no projeto

> Como novo integrante do time, eu quero explorar a API via Swagger UI com exemplos preenchidos para que meu onboarding seja mais rápido e autônomo.

## Funcionalidades Principais

### F1. Documentação OpenAPI completa de todos os endpoints

**O que faz**: Cada um dos 18 controllers do sistema deve ter um schema OpenAPI completo associado, documentando method, path, tags, summary, description, parameters, request body e responses.

**Por que é importante**: Sem isso, a documentação é parcial e não confiável. Desenvolvedores não sabem quais endpoints estão documentados e quais não.

**Requisitos funcionais**:

1. RF-01: Todos os endpoints devem possuir schema OpenAPI com tags, summary e description
2. RF-02: Request body deve documentar todos os campos com tipos, formatos, validações (min, max, enum) e campos obrigatórios
3. RF-03: Path parameters e query parameters devem estar documentados com tipo e descrição
4. RF-04: Cada endpoint deve documentar todas as respostas possíveis (sucesso e erro) com status code, description e schema do body
5. RF-05: Endpoints protegidos devem indicar requisito de autenticação (Bearer token) na spec
6. RF-06: Endpoints restritos a ADMIN devem documentar essa restrição
7. RF-07: Cada response deve incluir pelo menos um exemplo realista de payload

### F2. Swagger UI acessível e organizada

**O que faz**: Interface visual interativa em `/documentation` com todos os endpoints organizados por domínio/tag.

**Por que é importante**: Permite exploração rápida e testes manuais sem ferramentas externas.

**Requisitos funcionais**:

8. RF-08: Swagger UI deve estar disponível em `/documentation` com todos os endpoints visíveis
9. RF-09: Endpoints devem estar agrupados por tags de domínio: users, gyms, check-ins, sessions, subscriptions, health
10. RF-10: A spec deve incluir descrição geral da API, versão e informações de contato/servidor
11. RF-11: Swagger UI deve permitir envio de requests com autenticação Bearer (botão "Authorize")

### F3. Validação automática de request/response

**O que faz**: Requests recebidos e responses enviados são automaticamente validados contra os schemas OpenAPI definidos.

**Por que é importante**: Garante que a implementação nunca diverge da documentação, eliminando documentação desatualizada.

**Requisitos funcionais**:

12. RF-12: Requests com body inválido conforme o schema devem retornar 400 com mensagem descritiva
13. RF-13: Em ambiente de desenvolvimento, responses que não conformam ao schema devem gerar warning em log
14. RF-14: A validação deve ser configurável (ativável/desativável por ambiente)

### F4. Testes de contrato automatizados

**O que faz**: Suite de testes que verifica se os endpoints reais retornam respostas conforme a spec OpenAPI.

**Por que é importante**: Detecta breaking changes e divergências entre spec e implementação automaticamente no CI.

**Requisitos funcionais**:

15. RF-15: Deve existir uma suite de testes que valida cada endpoint contra sua spec OpenAPI
16. RF-16: Testes devem verificar status codes, estrutura do response body e tipos de campos
17. RF-17: Testes de contrato devem ser executáveis via comando npm dedicado
18. RF-18: Falha em teste de contrato deve bloquear merge (integrável ao CI)

### F5. Exportação de spec e geração de clients

**O que faz**: A spec OpenAPI completa deve ser acessível como arquivo JSON e poder ser usada para gerar SDKs/clients tipados.

**Por que é importante**: Permite que ferramentas externas (Postman, Insomnia, geradores de SDK) consumam a spec.

**Requisitos funcionais**:

19. RF-19: A spec OpenAPI completa deve ser acessível via endpoint GET (ex: `/documentation/json`)
20. RF-20: Deve ser possível exportar a spec como arquivo estático via comando npm
21. RF-21: Deve existir comando npm para gerar client TypeScript tipado a partir da spec
22. RF-22: O client gerado deve incluir tipos de request/response inferidos da spec

## Experiência do Usuário

### Persona: Desenvolvedor interno

- Acessa `/documentation` no browser para explorar endpoints
- Usa botão "Authorize" para inserir JWT e testar rotas protegidas
- Consulta exemplos de payload para integrar rapidamente
- Gera client tipado com um comando para consumir a API em outro serviço

### Fluxo principal

1. Desenvolvedor acessa `http://localhost:{PORT}/documentation`
2. Visualiza todos os endpoints organizados por tags (domínios)
3. Expande um endpoint para ver request/response schemas e exemplos
4. Clica em "Try it out" para testar diretamente
5. Para rotas protegidas, insere token via "Authorize"

### Considerações de UX

- Tags devem ter ordem lógica: users > sessions > gyms > check-ins > subscriptions > health
- Descrições devem ser claras e em inglês (padrão do projeto)
- Exemplos devem usar dados realistas (não "string", "test")

## Restrições Técnicas de Alto Nível

- **Stack existente**: O projeto já usa `@fastify/swagger` 9.7.0 e `@fastify/swagger-ui` 5.2.6 — a solução deve aproveitar essa infraestrutura
- **Padrão de schemas**: Os schemas já seguem o padrão de factory function (`makeSwaggerSchema()`) nos controllers — este padrão deve ser mantido e expandido
- **Formato**: OpenAPI 3.0 (já configurado)
- **Servidor HTTP**: Fastify (schemas são passados como opção no registro de rota)
- **Validação de request**: Já existe via Zod nos controllers — os schemas OpenAPI devem refletir as mesmas regras
- **Performance**: A spec não deve impactar performance em produção (lazy loading ou build-time generation são aceitáveis)
- **Extensibilidade para versionamento**: Embora versionamento não esteja no escopo, a estrutura deve permitir adição futura sem refatoração significativa

## Fora de Escopo

- **Versionamento de API** (v1, v2) — não será implementado nesta fase, mas a estrutura deve ser extensível para suportá-lo no futuro
- **Autenticação OAuth/OpenID na spec** — apenas Bearer token simples
- **Mock server** — não será gerado a partir da spec nesta fase
- **Internacionalização da documentação** — descrições apenas em inglês
- **Gateway/API Management** — sem integração com API gateways externos
- **Rate limiting documentation** — não documentado na spec nesta fase
- **Deprecation workflow** — sem mecanismo de deprecação de endpoints

## Inventário de Endpoints (Estado Atual)

| Domínio | Controller | Rota | Método | Schema OpenAPI |
|---------|-----------|------|--------|----------------|
| User | CreateUserController | /users | POST | Sim |
| User | FetchUsersController | /users | GET | Nao |
| User | UserProfileController | /users/:userId | GET | Nao |
| User | UpdateUserProfileController | /users/:userId | PATCH | Nao |
| User | MyProfileController | /users/me | GET | Nao |
| User | UserMetricsController | /users/me/metrics | GET | Nao |
| User | ChangePasswordController | /users/me/change-password | PATCH | Nao |
| User | ActivateUserController | /users/activate | PATCH | Nao |
| Gym | CreateGymController | /gyms | POST | Nao |
| Gym | SearchGymController | /gyms/search/:name | GET | Nao |
| Check-in | CheckInController | /check-ins | POST | Nao |
| Check-in | MetricsController | /check-ins/metrics/:userId | GET | Nao |
| Check-in | ValidateCheckInController | /check-ins/validate | POST | Nao |
| Session | AuthenticateController | /sessions | POST | Nao |
| Session | RefreshTokenController | /sessions/refresh | POST | Nao |
| Session | LogoutController | /sessions/logout | POST | Nao |
| Subscription | CreateSubscriptionController | /subscriptions | POST | Sim |
| Subscription | StripeWebhookController | /webhook/stripe | POST | Nao |
| Shared | HealthCheckController | /health | GET | Nao |

**Cobertura atual**: 2/19 endpoints (10.5%)
**Meta**: 19/19 endpoints (100%)
