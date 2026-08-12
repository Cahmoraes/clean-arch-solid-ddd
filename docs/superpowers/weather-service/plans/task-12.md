# Task 12: Integração: regenerar `@repo/api-types` com o contrato `/weather`

**Status:** DONE
**PRD:** N/A
**Spec:** ../specs/weather-service-design.md e ../specs/weather-service-frontend-design.md
**Tier:** cheap
**Depends on:** task-11

## Visão Geral

Task de build/geração, sem código escrito à mão: exporta o schema OpenAPI atualizado do backend (agora incluindo `GET /weather`, criado nas tasks 09-11) e regenera o client tipado `@repo/api-types` que o frontend consome via `openapi-fetch`. Sem esta task, o hook `useWeatherQuery` (task-13) não teria o tipo `paths["/weather"]` disponível.

## Arquivos

- Modify (gerado, não escrito à mão): `apps/backend/docs/openapi-spec.json`
- Modify (gerado, não escrito à mão): `packages/api-types/index.d.ts`

### Conformidade com as Skills Padrão

Nenhuma skill de domínio se aplica — task de build/geração, sem lógica de negócio ou código de aplicação a escrever.

## Passos

- **Step 1: Exportar o schema OpenAPI atualizado do backend**

Run: `pnpm --filter backend openapi:export`
Expected: escreve/atualiza `apps/backend/docs/openapi-spec.json`, agora incluindo o path `/weather` (definido pelo `WeatherController`/`makeWeatherSwaggerSchema` na task-10).

- **Step 2: Regenerar o client tipado a partir do schema exportado**

Run: `pnpm --filter backend openapi:generate-client`
Expected: escreve `packages/api-types/index.d.ts` atualizado; console mostra "Types gerados com sucesso" (mensagem do script `openapi:generate-client` de `@repo/api-types`).

- **Step 3: Verificar que o path `/weather` está presente no client gerado**

Run: `grep -n '"/weather"' packages/api-types/index.d.ts`
Expected: retorna ao menos uma linha (a chave `"/weather"` no tipo `paths` exportado).

- **Step 4: Commit** *(sequential execution only — em uma wave paralela o orquestrador comita na barreira de integração; se este prompt indicar que você é um dos vários implementadores em uma árvore compartilhada, pule este passo e reporte os arquivos.)*

```bash
git add apps/backend/docs/openapi-spec.json packages/api-types/index.d.ts
git commit -m "chore(weather): regenerate api-types with /weather contract"
```

## Critérios de Sucesso

- `apps/backend/docs/openapi-spec.json` inclui o path `/weather` com os métodos/respostas definidos em `makeWeatherSwaggerSchema` (200/400/404/503).
- `packages/api-types/index.d.ts` inclui `paths["/weather"]`, verificável via `grep -n '"/weather"' packages/api-types/index.d.ts`.
- Nenhuma edição manual em `openapi-spec.json` ou `index.d.ts` — ambos são artefatos gerados pelos comandos acima.
