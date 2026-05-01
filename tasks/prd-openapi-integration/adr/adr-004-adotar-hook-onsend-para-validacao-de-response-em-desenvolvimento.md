ADR004 — Adotar Hook onSend Customizado para Validação de Response em Desenvolvimento

- Status: Aceito
- Data: 01/05/2026
- Autor: Equipe de Engenharia

---

## Decisão

Adotaremos um hook Fastify `onSend` customizado que valida responses contra os schemas OpenAPI definidos, ativo exclusivamente em ambiente de desenvolvimento, emitindo warnings via Logger quando detectar divergências.

## Contexto

O PRD exige validação automática de responses (RF-13): em ambiente de desenvolvimento, responses que não conformam ao schema devem gerar warning em log. A validação deve ser configurável e não impactar produção (RF-14).

O Fastify possui serialization nativa via `schema.response`, mas ela faz coercion (remove campos extras, converte tipos) ao invés de validação strict — ou seja, não detecta divergências, apenas as "esconde". Para garantir que a implementação nunca diverge da documentação, é necessário validação explícita que reporte problemas sem alterar o response.

Forças relevantes:
- Validação não deve impactar performance em produção
- Deve reportar problemas (não corrigir silenciosamente)
- O Logger já existe no projeto e é injetado via IoC
- O `FastifyAdapter` já possui hooks registrados (`onRequest`, `preHandler`)

## Opções Consideradas

- **Opção A** — Serialization nativa do Fastify (coercion apenas)
  - Prós: zero código adicional; já disponível; sem overhead de implementação
  - Contras: faz coercion ao invés de validação — remove campos extras silenciosamente, converte tipos sem reportar; não detecta divergências entre spec e implementação; mascara bugs

- **Opção B (SELECIONADA)** — Hook `onSend` customizado com validação strict + warning log
  - Prós: detecta divergências reais entre response e schema; não altera o response (apenas reporta); desativável por ambiente; feedback imediato durante desenvolvimento; usa infraestrutura de logging existente
  - Contras: implementação customizada a manter; adiciona latência mínima em dev (parse + validate do response body); requer acesso ao schema da rota dentro do hook

## Consequências

- Positivo: Divergências entre implementação e spec são detectadas imediatamente durante desenvolvimento
- Positivo: Zero impacto em produção — hook não registrado quando `NODE_ENV=production`
- Positivo: Não altera responses — apenas emite warnings, preservando comportamento real
- Positivo: Incentiva desenvolvedores a manter schemas atualizados (feedback loop curto)
- Negativo: Código de infraestrutura adicional a manter (hook + lógica de validação)
- Negativo: Latência extra em requests durante desenvolvimento (validação do response body)
- Negativo: Requer acesso ao schema registrado da rota dentro do hook — pode exigir armazenamento auxiliar dos schemas
