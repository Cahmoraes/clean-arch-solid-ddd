# Tarefas: Clima Detalhado

**Spec:** `../specs/clima-detalhado-design.md`

**PRD:** `../prd/prd-clima-detalhado.md`

---

## Tarefas

- [ ] 1. Gateway Open-Meteo e modelo de domínio com condição, vento, horas e dias → `task-01.md`
- [ ] 2. Contrato HTTP de /weather e regeneração dos tipos → `task-02.md`
- [ ] 3. Conversor de unidades, direção do vento e leitura de `units` → `task-03.md`
- [ ] 4. Ícones pixel de condição do tempo → `task-04.md`
- [ ] 5. Mapa de condição WMO para ícone e rótulo → `task-05.md`
- [ ] 6. Card "agora" com condição, sensação, umidade, vento e número nítido → `task-06.md`
- [ ] 7. Faixa das próximas 24 horas → `task-07.md`
- [ ] 8. Lista dos próximos 7 dias → `task-08.md`
- [ ] 9. Botão de unidade, integração na página e crédito à Open-Meteo → `task-09.md`

## Restrições Globais

- Contrato aditivo: campos existentes (`city`, `temperature.current/min/max`, `latitude`, `longitude`) não mudam de nome nem de significado (`weather-globe-clima`, D3).
- O Fastify só serializa o que está em `weatherResponseSchema`, então todo campo novo precisa estar no schema do controller, no value object e no `OpenApiSchemaBuilder`; depois se regeneram os tipos (`pnpm openapi:export` e `pnpm openapi:generate-client` em `apps/backend`).
- Frontend segue o `AGENTS.md`: ícones só de `pixel-icons.tsx` (tamanhos 12/16/20/24, gerados por `scripts/generate-pixel-icons.mjs`), sem glow em texto, sem `rounded-full`, sem `corner-shape` fora de `globals.css`, descrições de teste em português com `test`.
- O backend sempre responde em unidades métricas.

## Foco de Revisão

- A hora atual (`current.time`) não aparece no array horário da Open-Meteo → falha controlada (503), nunca lista vazia ou deslocada → `task-01`
- Valores `null` em `hourly` ou `daily` vindos da Open-Meteo → falha controlada (503), nunca `NaN` na tela → `task-01`
- Direção do vento 0 e 360 graus → ambas viram "N"; 359 vira "N" → `task-03`
- Código WMO fora da tabela → ícone genérico e texto "Condição indisponível", sem lançar → `task-05`
- Alternar a unidade mantém `?city=` na URL e consultar outra cidade mantém `?units=` → `task-09`
