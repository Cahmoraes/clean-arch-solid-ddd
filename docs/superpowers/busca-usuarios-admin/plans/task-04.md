# Task 4: Regenerar tipos da API (pnpm generate:types)

**Status:** DONE
**PRD:** N/A
**Spec:** `../specs/busca-usuarios-admin-design.md`

## Visão Geral

Após as mudanças no backend (Tasks 1-3), o schema OpenAPI do endpoint `GET /users` agora inclui o parâmetro `query?: string`. É preciso re-exportar a spec e regenerar o pacote `@repo/api-types` para que o frontend possa usar o parâmetro de forma type-safe via `api.GET("/users", { params: { query: { query: "..." } } })`.

**Pré-requisito:** Tasks 1, 2 e 3 concluídas.

## Arquivos

- Modify: `packages/api-types/index.d.ts` (gerado automaticamente)

## Conformidade com as Competências Padrão

- Nenhuma skill específica — tarefa de tooling puro.

## Passos

- [ ] **Step 1: Exportar a spec OpenAPI do backend e regenerar os tipos**

Na raiz do repositório:

```bash
pnpm generate:types
```

Este comando executa em sequência:
1. `pnpm --filter backend openapi:export` — gera o arquivo de spec OpenAPI a partir dos schemas Zod/anotações do backend
2. `pnpm --filter backend openapi:generate-client` — gera o `packages/api-types/index.d.ts` a partir da spec

Resultado esperado: comando encerra sem erros.

- [ ] **Step 2: Verificar que o parâmetro `query` aparece nos tipos gerados**

```bash
grep -n "query" packages/api-types/index.d.ts | grep -i "search\|name\|email\|string"
```

Resultado esperado: linha contendo algo como:
```
query?: string;
```
no contexto do endpoint `GET /users` (parâmetros de query string).

- [ ] **Step 3: Confirmar que o build do frontend compila sem erros**

```bash
pnpm --filter frontend tsc:check
```

Resultado esperado: zero erros de tipo.

- [ ] **Step 4: Commit dos tipos gerados**

```bash
git add packages/api-types/index.d.ts && git commit -m "chore(api-types): regenera tipos com parâmetro query para busca de usuários

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- `packages/api-types/index.d.ts` contém `query?: string` nos parâmetros do `GET /users`
- `pnpm --filter frontend tsc:check` passa sem erros
