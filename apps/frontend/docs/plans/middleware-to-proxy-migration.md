# Plano de Migração: middleware → proxy (Next.js 16)

## Problema

O Next.js 16 deprecou a convenção de arquivo `middleware.ts`, renomeando-a para `proxy.ts`. O warning:

```
⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.
```

## Mudanças Realizadas

1. **`src/middleware.ts` → `src/proxy.ts`**: Renomeado arquivo e função exportada (`middleware()` → `proxy()`)
2. **`src/middleware.test.ts` → `src/proxy.test.ts`**: Atualizado imports, referências e describe

## Validação

- lint:fix: OK (0 erros, apenas 2 warnings pre-existentes não relacionados)
- tsc:check: OK
- test: 43 arquivos, 181 testes passando
- build: OK, sem warning de deprecação
