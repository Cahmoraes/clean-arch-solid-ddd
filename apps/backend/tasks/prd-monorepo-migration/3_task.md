# Tarefa 3.0: Criar pacote `@repo/api-types`

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Criar o pacote interno `packages/api-types/` que exporta os tipos TypeScript gerados do OpenAPI
como `@repo/api-types`. Atualizar o script `apps/backend/scripts/generate-client.ts` para escrever
o output diretamente em `packages/api-types/index.d.ts` usando `import.meta.dirname` (em vez de
`process.cwd()`). Ao final, `pnpm generate:types` na raiz deve exportar o spec, gerar os tipos e
populá-los em `packages/api-types/index.d.ts` com um único comando.

<skills>
### Conformidade com Skills Padrões

- **`no-workarounds`** — usar `import.meta.dirname` para resolver path absoluto; não usar hacks com `process.cwd()`
</skills>

<requirements>
- `packages/api-types/package.json` deve ter `name: "@repo/api-types"` e exportar `./index.d.ts`
- `apps/backend/scripts/generate-client.ts` deve calcular o path de saída usando `import.meta.dirname`
- O output de `generate-client.ts` deve ser `packages/api-types/index.d.ts`
- `pnpm generate:types` na raiz deve executar os dois scripts do backend em sequência
- Após rodar `pnpm generate:types`, `packages/api-types/index.d.ts` deve existir e conter as interfaces do OpenAPI
- O `pnpm --filter backend tsc:check` deve continuar passando
</requirements>

## Subtarefas

- [ ] 3.1 Criar `packages/api-types/package.json` com `name: "@repo/api-types"`, `exports` e `types`
- [ ] 3.2 Criar `packages/api-types/.gitkeep` (o `index.d.ts` é gerado; não deve ser commitado diretamente)
- [ ] 3.3 Adicionar `packages/api-types/index.d.ts` ao `.gitignore` do backend ou do pacote
- [ ] 3.4 Atualizar `apps/backend/scripts/generate-client.ts`:
  - Substituir `resolve(process.cwd(), ...)` por caminho calculado via `import.meta.dirname`
  - Novo `OUTPUT_FILE`: `resolve(import.meta.dirname, "../../../packages/api-types/index.d.ts")`
- [ ] 3.5 Adicionar script `"generate:types"` no `package.json` raiz conforme a techspec
- [ ] 3.6 Executar `pnpm generate:types` e verificar que `packages/api-types/index.d.ts` foi gerado

## Detalhes de Implementação

Ver seções **"Pontos de Integração — Script `generate:types`"** e **"Riscos Conhecidos"** na
`techspec.md`.

O script na raiz deve ser:
```
"generate:types": "pnpm --filter backend openapi:export && pnpm --filter backend openapi:generate-client"
```

O `generate-client.ts` atualizado deve usar:
```typescript
const OUTPUT_FILE = resolve(import.meta.dirname, "../../../packages/api-types/index.d.ts")
```

O `packages/api-types/package.json` deve ter:
```json
{
  "name": "@repo/api-types",
  "version": "0.0.1",
  "exports": { ".": "./index.d.ts" },
  "types": "./index.d.ts"
}
```

## Critérios de Sucesso

- `pnpm generate:types` executa sem erros
- `packages/api-types/index.d.ts` existe e contém a interface `paths`
- `pnpm --filter backend tsc:check` continua passando
- `pnpm --filter backend test:run` continua passando

## Testes da Tarefa

- [ ] `pnpm generate:types` sem erros
- [ ] `grep "export interface paths" packages/api-types/index.d.ts` retorna resultado
- [ ] `pnpm --filter backend tsc:check` sem erros
- [ ] `pnpm --filter backend test:run` — todos os testes passam

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- `packages/api-types/package.json` (novo)
- `packages/api-types/index.d.ts` (gerado pelo script)
- `apps/backend/scripts/generate-client.ts` (modificado)
- `package.json` (raiz — script `generate:types` adicionado)
