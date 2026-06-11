ADR005 — Adotar `openapi-fetch` como Cliente HTTP Tipado no Frontend

- Status: Aceito
- Data: 02/05/2026
- Autor: Time de Arquitetura

---

## Decisão

Adotaremos a biblioteca **`openapi-fetch`** como cliente HTTP do frontend Next.js, integrada com
os tipos gerados de `@repo/api-types`, para garantir chamadas de API completamente type-safe em
tempo de compilação sem overhead de runtime.

## Contexto

O frontend Next.js precisará consumir a API REST do backend. A API possui um OpenAPI spec
completo (`docs/openapi-spec.json`) e tipos TypeScript gerados (`@repo/api-types`). A escolha
do cliente HTTP precisava ser compatível com esses tipos para eliminar erros de integração
silenciosos (parâmetros errados, respostas mal tipadas, endpoints inexistentes).

O backend já possuía `openapi-fetch` como `devDependency` (v0.17.0) nos seus scripts de geração —
a biblioteca é do mesmo ecossistema que `openapi-typescript`, que também já era utilizado.

Critérios de decisão:
- Tipagem completa de parâmetros de rota, query, body e resposta em tempo de compilação
- Zero overhead de runtime (sem validação dinâmica)
- Compatibilidade com os tipos gerados por `openapi-typescript`
- Leveza e ausência de dependências transitivas pesadas

## Opções Consideradas

- **Opção 1 — `fetch` nativo do browser/Node.js**
  - Prós: zero dependências; disponível nativamente no Next.js
  - Contras: sem tipagem de contrato de API; erros de rota ou payload apenas em runtime; verboso para lidar com erros HTTP

- **Opção 2 — Axios**
  - Prós: API bem conhecida; suporte a interceptors; ampla adoção
  - Contras: sem tipagem de contrato OpenAPI nativa; require adaptadores para integrar com `openapi-typescript`; adiciona ~12KB ao bundle

- **Opção 3 — `openapi-fetch`** *(SELECIONADA)*
  - Prós: projetado especificamente para consumir tipos gerados pelo `openapi-typescript`; erros de parâmetro, path e body detectados em compilação; `data` e `error` tipados automaticamente por status code; wrapper fino sobre `fetch` nativo (~2KB); já é dependência do ecossistema do projeto
  - Contras: API menos familiar que Axios para desenvolvedores não acostumados com o padrão OpenAPI-first; requer que os tipos sejam gerados antes do build do frontend

- **Opção 4 — TanStack Query com `fetch` manual**
  - Prós: TanStack Query já é adotado para cache e estado servidor
  - Contras: não substitui o cliente HTTP em si; seria usado em conjunto com `openapi-fetch` de qualquer forma

## Consequências

- ✅ Positivo: chamadas de API incorretas (path errado, parâmetro ausente, body inválido) são erros de compilação TypeScript — não chegam ao runtime
- ✅ Positivo: `data` e `error` são automaticamente tipados de acordo com os status codes definidos no OpenAPI spec
- ✅ Positivo: bundle impact mínimo (~2KB gzipped)
- ✅ Positivo: reutiliza o mesmo ecossistema (`openapi-typescript`) já adotado no backend
- ❌ Negativo: o frontend não compila sem `packages/api-types/index.d.ts` gerado — ambiente de desenvolvimento requer `pnpm generate:types` antes do primeiro build
- ❌ Negativo: curva de aprendizado para desenvolvedores acostumados com Axios ou `react-query` com fetch manual

## Recomendações

- Tech Spec de migração para monorepo (02/05/2026) — `openapi-fetch` definido como cliente HTTP padrão; padrão de uso documentado em `apps/frontend/src/lib/api.ts`
