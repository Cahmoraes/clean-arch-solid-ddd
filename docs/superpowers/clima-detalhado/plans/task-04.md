# Task 4: Ícones pixel de condição do tempo [FR-002]

**Status:** DONE

**PRD:** `../prd/prd-clima-detalhado.md`

**Spec:** `../specs/clima-detalhado-design.md`

**Tier:** standard

## Visão Geral

Acrescenta a `pixel-icons.tsx`, pelo gerador, os ícones de condição que o mapa WMO usa. O `pixelarticons` 2.4.1 não tem chuva, chuvisco, névoa nem um ícone de condição desconhecida, então esses quatro são desenhados à mão.

## Arquivos

- Modify: `apps/frontend/scripts/generate-pixel-icons.mjs`
- Modify: `apps/frontend/src/components/ui/pixel-icons.tsx` (gerado; nunca editar à mão)
- Test: `apps/frontend/src/components/ui/pixel-icons.test.tsx`

## Interfaces

- **Consome:** N/A (já existem `Sun` e `Moon`)
- **Produz:** em `@/components/ui/pixel-icons`, todos do tipo `PixelIcon`: `Cloud`, `CloudSun`, `CloudMoon`, `Snowflake`, `Wind`, `Zap`, `CloudRain`, `CloudDrizzle`, `CloudFog`, `CloudUnknown` (genérico para condição desconhecida).

### Skills a invocar

- `test-antipatterns`: o teste de exports e de glifos distintos já existe; estender, não duplicar.
- `wcag-audit-patterns`: ícones decorativos (`aria-hidden`), o significado vem do rótulo de texto.

## Passos

- **Step 1: Write the failing test — estender `pixel-icons.test.tsx`**

Acrescentar a `EXPECTED_EXPORTS` (na ordem alfabética da lista) `"Cloud"`, `"CloudDrizzle"`, `"CloudFog"`, `"CloudMoon"`, `"CloudRain"`, `"CloudSun"`, `"CloudUnknown"`, `"Snowflake"`, `"Wind"`, `"Zap"`, e a `DISTINCT_GLYPHS`:

```ts
"Sun", "Moon", "Cloud", "CloudSun", "CloudMoon", "CloudRain", "CloudDrizzle", "CloudFog", "CloudUnknown", "Snowflake", "Zap", "Wind",
```

- **Step 2: Run test to verify it fails**

Run: `cd apps/frontend && pnpm exec vitest run src/components/ui/pixel-icons.test.tsx`
Expected: FAIL — os exports do arquivo gerado não igualam `EXPECTED_EXPORTS` e `ícone não exportado: Cloud`.

- **Step 3: Editar `ICON_MAP` e `CUSTOM_ICONS` em `scripts/generate-pixel-icons.mjs`**

`ICON_MAP`: `Cloud: "cloud"`, `CloudSun: "cloud-sun"`, `CloudMoon: "cloud-moon"`, `Snowflake: "snowflake"`, `Wind: "wind"`, `Zap: "zap"` (mantendo a ordem do mapa). `CUSTOM_ICONS` (junto de `Sunset`, no mesmo formato de retângulos `M x y h w v h h-w z`, grade 24x24, blocos de 2px, só inteiros): `CloudRain` (silhueta de nuvem e 3 gotas diagonais abaixo), `CloudDrizzle` (silhueta de nuvem e 3 pontos de 2x2 abaixo), `CloudFog` (silhueta de nuvem e 2 barras horizontais abaixo), `CloudUnknown` (silhueta de nuvem com um ponto de interrogação em blocos de 2px dentro dela). Os quatro glifos devem diferir entre si e de `Cloud`.

- **Step 4: Regenerar o arquivo de ícones**

Run: `cd apps/frontend && node scripts/generate-pixel-icons.mjs` (precisa de rede e de `pnpm exec biome`)
Expected: imprime `pixel-icons.tsx gerado com <N> ícones`, com N igual ao total anterior mais 10.

- **Step 5: Run test to verify it passes**

Run: `cd apps/frontend && pnpm exec vitest run src/components/ui/pixel-icons.test.tsx`
Expected: PASS

- **Step 6: Commit** *(somente quando `workflow.auto_commit` for true; senão, reportar os arquivos)*

```bash
git add apps/frontend/scripts/generate-pixel-icons.mjs apps/frontend/src/components/ui/pixel-icons.tsx apps/frontend/src/components/ui/pixel-icons.test.tsx
git commit -m "feat(frontend): ícones pixel de condição do tempo

Claude-Session: https://claude.ai/code/session_01UnzndmG2GmaU644wqVtVC2"
```

## Critérios de Sucesso

- Os dez ícones novos são exportados com os mesmos atributos dos demais (decorativos, `crispEdges`, caminho com inteiros) e têm glifos distintos de `Sun`, `Moon` e entre si.
- Nenhum ícone de condição é reaproveitado para "condição desconhecida": `CloudUnknown` é exclusivo.
