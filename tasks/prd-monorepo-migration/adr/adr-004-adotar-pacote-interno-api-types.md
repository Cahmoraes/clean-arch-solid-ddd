ADR004 — Adotar Pacote Interno `@repo/api-types` para Distribuição de Tipos OpenAPI

- Status: Aceito
- Data: 02/05/2026
- Autor: Time de Arquitetura

---

## Decisão

Adotaremos um pacote interno `packages/api-types/` exportado como `@repo/api-types` (via pnpm
workspace protocol) como ponto único de distribuição dos tipos TypeScript gerados a partir do
OpenAPI spec do backend. O frontend consumirá esses tipos via `import type { paths } from "@repo/api-types"`.

## Contexto

O backend já possui um pipeline de geração de tipos TypeScript a partir do OpenAPI:
1. `openapi:export` — sobe o servidor Fastify e exporta `docs/openapi-spec.json`
2. `openapi:generate-client` — usa `openapi-typescript` para gerar `api-types.d.ts` com todas as interfaces de rotas

Com a adição do frontend Next.js no mesmo monorepo, precisou-se definir como o frontend acessaria
esses tipos sem duplicação manual. O arquivo `api-types.d.ts` era gerado dentro do workspace
backend (`src/shared/infra/openapi/generated/`), inacessível ao frontend sem importações
cross-workspace ou cópia manual.

## Opções Consideradas

- **Opção 1 — Importação direta por caminho relativo** (`../../apps/backend/src/...`)
  - Prós: zero configuração
  - Contras: viola o isolamento de workspaces; cria acoplamento estrutural entre apps; quebra se o backend for movido; inviabiliza future extração do frontend para repositório separado

- **Opção 2 — Cópia manual do arquivo gerado**
  - Prós: cada workspace tem sua cópia independente
  - Contras: processo manual propenso a erro; tipos frontend e backend podem divergir silenciosamente; viola o objetivo do PRD de "zero cópia manual"

- **Opção 3 — Pacote interno `@repo/api-types`** *(SELECIONADA)*
  - Prós: contrato explícito via nome de pacote (`@repo/api-types`); isolamento total entre workspaces; regeneração automática via script único na raiz; o pacote é apenas um `.d.ts` — sem build step, zero overhead de bundle; escalável para múltiplos consumidores futuros
  - Contras: adiciona um workspace extra (`packages/api-types/`); `index.d.ts` é gerado e não deve ser commitado (requer atenção no `.gitignore`)

## Consequências

- ✅ Positivo: frontend importa `@repo/api-types` como qualquer outra dependência — sem conhecer a estrutura interna do backend
- ✅ Positivo: `pnpm generate:types` na raiz regenera os tipos e ambos os workspaces ficam sincronizados automaticamente
- ✅ Positivo: o pacote é puramente declarativo (`.d.ts`) — não adiciona bytes ao bundle do frontend
- ✅ Positivo: o `turbo.json` pode expressar que `frontend#build` depende de `api-types#build` via `"dependsOn": ["^build"]`
- ❌ Negativo: `packages/api-types/index.d.ts` é um artefato gerado — precisa ser excluído do git e regenerado em cada ambiente (clone fresco exige rodar `generate:types` antes de `build`)
- ❌ Negativo: se o servidor Fastify não subir (ex: banco indisponível), `generate:types` falha e o frontend não compila

## Recomendações

- PRD de migração para monorepo (02/05/2026) — requisito RF-08, RF-09 e RF-10 definem explicitamente esse comportamento
- Tech Spec de migração para monorepo (02/05/2026) — risco de dependência do servidor Fastify para gerar tipos mapeado na seção "Riscos Conhecidos"
