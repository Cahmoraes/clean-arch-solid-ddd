ADR002 — Adotar vitest-openapi para Testes de Contrato Automatizados

- Status: Aceito
- Data: 01/05/2026
- Autor: Equipe de Engenharia

---

## Decisão

Adotaremos a biblioteca `vitest-openapi` para implementar testes de contrato automatizados que validam responses HTTP reais contra a spec OpenAPI gerada, utilizando o matcher customizado `toSatisfyApiSpec()` integrado ao Vitest.

## Contexto

O PRD exige testes de contrato que garantam conformidade entre endpoints reais e a spec OpenAPI documentada (RF-15 a RF-18). O projeto já utiliza Vitest como test runner e supertest para testes HTTP (business-flow tests). Não existem testes de contrato atualmente.

A suite deve ser separada dos business-flow tests existentes (decisão do usuário), executável via comando `npm run test:contract`, e capaz de bloquear merge no CI quando detectar divergências.

Forças relevantes:
- Stack de testes já consolidada em Vitest + supertest
- Necessidade de matchers declarativos que reduzam boilerplate
- Spec OpenAPI será exportada como JSON (disponível para carregamento)
- Testes devem validar status codes, estrutura do body e tipos de campos

## Opções Consideradas

- **Opção A (SELECIONADA)** — `vitest-openapi`
  - Prós: matchers nativos para Vitest (`toSatisfyApiSpec()`); suporta OpenAPI 2 e 3; compatível com supertest responses; carrega spec uma única vez no setup; baixo boilerplate por teste; validação declarativa
  - Contras: biblioteca menos madura (v1.0.3); comunidade menor que jest-openapi; possível incompatibilidade com versão atual do Vitest

- **Opção B** — Validação programática manual com AJV
  - Prós: controle total sobre validação; AJV é amplamente testado e maduro; sem dependência de matcher customizado
  - Contras: alto boilerplate por teste (carregar spec, extrair schema do path, compilar validator, executar); mais verboso; manutenção de código de infraestrutura de teste significativa; não declarativo

## Consequências

- Positivo: Testes de contrato declarativos e legíveis — uma linha por assertion (`expect(res).toSatisfyApiSpec()`)
- Positivo: Integra naturalmente com Vitest e supertest já existentes
- Positivo: Detecta automaticamente breaking changes entre spec e implementação
- Positivo: Bloqueia merge no CI — proteção contra regressões de contrato
- Negativo: Dependência de biblioteca com comunidade menor (risco de abandono)
- Negativo: Pode requerer ajustes se `vitest-openapi` não suportar a versão exata do Vitest utilizada
- Negativo: Necessita spec exportada como arquivo estático antes da execução dos testes
