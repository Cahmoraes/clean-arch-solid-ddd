---
feature: weather-service-frontend
created_at: "2026-08-12T10:18:19-03:00"
updated_at: "2026-08-12T10:45:00-03:00"
depends_on: docs/superpowers/weather-service/specs/weather-service-design.md
---

# Frontend do Serviço de Meteorologia — Design

## Visão Geral

Página pública `/clima` no frontend (Next.js App Router, `apps/frontend`) que permite ao usuário buscar o clima atual de uma cidade, consumindo o endpoint `GET /weather?city=` descrito em [weather-service-design.md](./weather-service-design.md). Sem autenticação, sem persistência local — busca sempre ao vivo via o cliente OpenAPI existente.

## Características Arquiteturais

1. **Consistência com o app existente** — reutiliza 100% dos componentes de design system e do padrão de sincronização de estado via URL já usados em `admin/usuarios` e `check-ins`. Nenhum padrão novo é introduzido.
2. **Simplicidade** — uma única página pública, sem estado global, sem cache client-side além do gerenciado pelo TanStack Query.
3. **Testabilidade** — integração via MSW nos testes, seguindo a mesma convenção de mocks já usada nas demais features.

## Componentes Lógicos

| Componente | Responsabilidade | Depende de | Do qual dependem |
|---|---|---|---|
| `WeatherPage` (`app/(public)/clima/page.tsx`) | Orquestra a leitura da URL, o formulário e a renderização condicional dos estados (vazio, carregando, erro, resultado) | `useSearchParams`, `WeatherSearchForm`, `useWeatherQuery`, `CurrentWeatherDisplay` | — (raiz da rota) |
| `WeatherSearchForm` | Captura o nome da cidade e atualiza o parâmetro `city` na URL ao submeter | `Input`, `Button`, `FormField` (design system), schema Zod | `WeatherPage` |
| `useWeatherQuery` | Busca o clima atual de uma cidade via cliente OpenAPI (`lib/api.ts`) e expõe estado de carregamento/erro/dado via TanStack Query | Cliente OpenAPI gerado (`@repo/api-types`), contrato `GET /weather?city=` → `{ city, temperature: { current, min, max } }` | `WeatherPage` |
| `CurrentWeatherDisplay` | Renderiza o resultado (`temperature.current` em destaque + `temperature.min`/`temperature.max` em tiles secundários) | Dado retornado por `useWeatherQuery` | `WeatherPage` |

## Fluxo de Interação

1. Usuário acessa `/clima` (ou `/clima?city=X` via link direto) → `WeatherPage` lê `city` da URL.
2. Se `city` ausente → renderiza `EmptyState` (componente já existente) convidando à busca.
3. Usuário digita e submete em `WeatherSearchForm` → `router.replace` atualiza `?city=`.
4. Mudança na URL dispara `useWeatherQuery`, que chama `/weather?city=` via cliente OpenAPI.
5. Durante a chamada, o botão de busca fica desabilitado com label "Consultando…" (sem skeleton).
6. Sucesso → `CurrentWeatherDisplay` renderiza temperatura atual + mínima/máxima.
7. Erro `code: "city_not_found"` (HTTP 404) → mensagem inline "Cidade não encontrada. Verifique o nome e tente novamente."
8. Erro `code: "weather_provider_unavailable"` (HTTP 503) → mensagem inline "Serviço de meteorologia indisponível no momento. Tente novamente em instantes."

Mapeamento feito por `ApiError.code` (populado pelo `errorNormalizationMiddleware` já existente em `lib/api.ts`), não por parsing de texto — corpo de erro do backend segue `{ code, message }` (ver [weather-service-design.md § Contrato HTTP](./weather-service-design.md#contrato-http)).

## Decisões Arquiteturais

### D1 — Sincronização de estado via URL com `useSearchParams`

- **Contexto**: a cidade buscada precisa ser refletida na URL, permitindo link direto/compartilhável.
- **Decisão**: client component (`"use client"`) + `useSearchParams`/`router.replace`, replicando o padrão já usado em `admin/usuarios` e `check-ins`.
- **Justificativa técnica**: zero padrão novo introduzido no codebase; reaproveita hooks e testes já validados.
- **Justificativa de negócio**: consistência entre telas reduz custo de manutenção e curva de aprendizado.
- **Trade-offs aceitos**: sem dado no HTML do primeiro paint em links compartilhados (busca sempre client-side) — aceitável para uma página pública leve e de baixo tráfego.

### D2 — Reaproveitamento total do design system

- **Contexto**: a tela precisa de formulário, botão, input e exibição de resultado.
- **Decisão**: nenhum componente de UI novo é criado; `Button`, `Input`, `FormField`, `EmptyState` são reaproveitados como estão.
- **Justificativa técnica**: reduz superfície de revisão visual e mantém consistência com o restante do app.
- **Justificativa de negócio**: menor esforço de implementação e manutenção futura.
- **Trade-offs aceitos**: nenhum — layout aprovado (ver Especificação Visual) se encaixa integralmente nos componentes existentes.

## Riscos

- 🟡 **R1 — Dependência do contrato OpenAPI do backend ainda não implementado**: o endpoint `/weather` precisa existir no backend, registrar schema OpenAPI via `OpenApiSchemaBuilder` (ver weather-service-design.md § Injeção de Dependência) e ser incluído na geração de tipos (`pnpm openapi:generate-client` → `@repo/api-types`) antes da integração real. **Mitigação**: desenvolver a UI contra mock MSW local primeiro (usando o contrato de `§ Contrato HTTP` do spec de backend); trocar para o cliente real quando o backend estiver disponível.
- 🟢 **R2 — Ambiguidade de nome de cidade** (ex.: "Springfield"): já resolvida no backend (retorna o primeiro resultado do geocoding); frontend não precisa de UI de desambiguação — fora de escopo, herdado da decisão original do backend.

## Especificação Visual

Layout aprovado via preview local (visual companion) — ver distillation em [`mockups/weather-service-frontend-visual.md`](./mockups/weather-service-frontend-visual.md): temperatura atual em destaque (hero) + mínima/máxima como tiles secundários abaixo, usando os tokens do tema VOLT.

## Estrutura de Diretórios

```
apps/frontend/src/
├── app/(public)/clima/
│   ├── page.tsx                       # WeatherPage
│   └── page.test.tsx
└── features/weather/
    ├── api/
    │   ├── use-weather-query.ts       # useWeatherQuery
    │   └── use-weather-query.test.tsx
    ├── components/
    │   ├── weather-search-form.tsx
    │   ├── weather-search-form.test.tsx
    │   ├── current-weather-display.tsx
    │   └── current-weather-display.test.tsx
    └── schemas/
        ├── index.ts                   # citySchema (zod)
        └── index.test.ts
```

Edições em arquivos existentes: componente de navegação pública (adiciona link `/clima`) e `src/test/msw/handlers` (mock de `/weather` para testes).

## Testes

- Unitários (Vitest): `citySchema` (validação), `useWeatherQuery` (estados de sucesso/404/503 via MSW), `WeatherSearchForm` (submit atualiza URL), `CurrentWeatherDisplay` (renderização dos valores).
- Integração de página: `page.test.tsx` cobrindo os 4 estados (vazio, carregando, erro, resultado) com MSW mockando `/weather`.
- `pnpm lint:fix`, `pnpm tsc:check`, `pnpm test -- --run`, `pnpm build` — obrigatórios antes de concluir, por `apps/frontend/AGENTS.md`.

## Fora de Escopo

- Previsão estendida (múltiplos dias) — herdado do backend.
- Desambiguação de cidade (múltiplos resultados de geocoding) — herdado do backend.
- Histórico de buscas / cidades favoritas / persistência client-side.
- Autocomplete/sugestões de cidade durante a digitação.
- Internacionalização (i18n) da interface.
