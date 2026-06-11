ADR003 — Adotar openapi-typescript + openapi-fetch para Geração de Client Tipado

- Status: Aceito
- Data: 01/05/2026
- Autor: Equipe de Engenharia

---

## Decisão

Adotaremos `openapi-typescript` para gerar tipos TypeScript a partir da spec OpenAPI e `openapi-fetch` como client HTTP tipado para consumo da API, priorizando zero runtime overhead na geração de tipos e um client leve baseado em fetch.

## Contexto

O PRD exige que seja possível gerar um client TypeScript tipado a partir da spec OpenAPI (RF-21, RF-22), permitindo que outros serviços consumam a API com segurança de tipos. O client gerado deve incluir tipos de request/response inferidos da spec.

O projeto é uma API backend Node.js/TypeScript. O client será consumido por serviços externos ou aplicações frontend que integrem com esta API. A prioridade é type-safety em compile-time sem overhead de runtime desnecessário.

Forças relevantes:
- Types devem ser inferidos da spec (não escritos manualmente)
- Client deve ser leve e sem dependências pesadas
- Não há necessidade de integração com React Query ou frameworks frontend específicos
- A spec será exportada como JSON estático

## Opções Consideradas

- **Opção A** — `openapi-typescript-codegen`
  - Prós: simples; gera clients para fetch/axios; API familiar
  - Contras: gera código runtime (não apenas types); bundle maior; menos type-safe que abordagem types-only; manutenção irregular

- **Opção B** — `orval`
  - Prós: robusto; suporta React Query, Zod schemas, mocking; boa documentação
  - Contras: pesado para o caso de uso (features desnecessárias como React Query); configuração mais complexa; adiciona muitas dependências

- **Opção C (SELECIONADA)** — `openapi-typescript` + `openapi-fetch`
  - Prós: types gerados sem runtime (apenas `.d.ts`); zero overhead em bundle; `openapi-fetch` é client leve baseado em fetch nativo; type-safe em compile-time; alta reputação (benchmark 80.57, source High); manutenção ativa pelo mesmo time
  - Contras: requer dois pacotes separados; `openapi-fetch` pode não cobrir todos os edge cases de HTTP (interceptors, retry); menos features out-of-the-box que orval

## Consequências

- Positivo: Zero runtime overhead na geração de tipos — apenas arquivo `.d.ts` gerado em build-time
- Positivo: Client leve baseado em fetch nativo — sem dependências pesadas
- Positivo: Type-safety completo inferido da spec — params, body, responses tipados automaticamente
- Positivo: Separação clara entre types (dev dependency) e client (runtime dependency)
- Negativo: Dois pacotes para gerenciar (`openapi-typescript` + `openapi-fetch`) ao invés de solução all-in-one
- Negativo: `openapi-fetch` pode não suportar patterns avançados (interceptors, retry) sem configuração adicional
- Negativo: Script de geração de types precisa ser executado manualmente após alterações na spec
