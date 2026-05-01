ADR001 — Adotar zod-openapi para Derivar Schemas OpenAPI a partir de Zod

- Status: Aceito
- Data: 01/05/2026
- Autor: Equipe de Engenharia

---

## Decisão

Adotaremos a biblioteca `zod-openapi` (samchungy/zod-openapi) para converter os schemas Zod v4 existentes nos controllers em JSON Schema compatível com OpenAPI 3.0, utilizando o método nativo `.meta()` do Zod v4 para adicionar metadata de documentação.

## Contexto

O projeto possui schemas Zod definidos em todos os 19 controllers para validação de request, mas apenas 2 possuem schemas OpenAPI documentados. Esses schemas OpenAPI eram escritos manualmente como objetos JSON Schema, duplicando a definição já existente no Zod. Essa duplicação gera risco de dessincronização entre validação real e documentação, além de aumentar o custo de manutenção.

O projeto utiliza Zod v4.3.6, que introduz o método `.meta()` nativamente, permitindo que bibliotecas como `zod-openapi` consumam metadata sem monkey-patching. O `@fastify/swagger` 9.7.0 já está configurado e aceita JSON Schema no campo `schema` das rotas.

Forças relevantes:
- 17 controllers precisam de schemas OpenAPI (alto volume de trabalho repetitivo se manual)
- Zod já é a source of truth para validação — derivar OpenAPI dele elimina duplicação
- O padrão de factory function (`makeSwaggerSchema()`) deve ser mantido nos controllers

## Opções Consideradas

- **Opção A (SELECIONADA)** — `zod-openapi` (samchungy/zod-openapi)
  - Prós: suporte nativo a Zod v4 via `.meta()`; sem monkey-patching; gera JSON Schema compatível com OpenAPI 3.1/3.0; permite `id` para componentes reutilizáveis; alta reputação (benchmark 71.22, source reputation High)
  - Contras: adiciona dependência de runtime; possível incompatibilidade com tipos Zod avançados (`z.coerce`); gera OpenAPI 3.1 por padrão (projeto usa 3.0)

- **Opção B** — Schemas manuais em JSON Schema (padrão atual)
  - Prós: zero dependências adicionais; controle total sobre o output; já funciona com os 2 controllers existentes
  - Contras: duplicação completa entre Zod e JSON Schema; alto risco de dessincronização; custo de manutenção multiplicado por 19 endpoints; propenso a erros humanos

- **Opção C** — `@asteasolutions/zod-to-openapi`
  - Prós: popular; usa método `.openapi()` extensível
  - Contras: requer extensão do Zod via `extendZodWithOpenApi()` (monkey-patching); incompatível com Zod v4 nativo sem adaptações; benchmark inferior (65.4)

## Consequências

- Positivo: Zod passa a ser single source of truth para validação E documentação — elimina duplicação
- Positivo: Novos endpoints automaticamente documentados ao definir o schema Zod com `.meta()`
- Positivo: Sem monkey-patching — usa API nativa do Zod v4
- Positivo: Compatível com o padrão existente de factory function nos controllers
- Negativo: Adiciona dependência de runtime (`zod-openapi`)
- Negativo: Tipos Zod com `z.coerce` podem requerer `.meta({ override })` para conversão correta
- Negativo: Pode ser necessário ajustar output para OpenAPI 3.0 (vs 3.1 que a lib gera por padrão)
