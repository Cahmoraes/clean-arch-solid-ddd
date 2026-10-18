# Clima Detalhado: Design

- **Norte visual:** `mockups/clima-detalhado-visual.md`

## Visão Geral

A rota pública `/clima` mostra hoje só a temperatura atual, a mínima e a máxima do dia. O usuário quer um resultado mais completo: ao consultar uma cidade, ver de relance a condição do tempo com ícone, a sensação térmica, a umidade e o vento, e também a previsão das próximas horas e dos próximos dias. Quer ainda alternar a exibição para o padrão americano, com Celsius como padrão.

Duas coisas incomodam na tela atual e entram no escopo: o número grande da temperatura (VT323 a 60px) parece esticado, e o resultado é simples demais.

Sucesso é o usuário consultar uma cidade e ver, sem rolar além do card, o agora, as próximas 24 horas e os próximos 7 dias, e trocar entre °C e °F com um clique.

Este design estende de forma aditiva o endpoint `GET /weather` e a página `/clima` criados em `weather-service` e estendidos em `weather-globe-clima`. Duas exclusões dessas features são reabertas aqui por decisão do usuário: "sem condição climática" e "sem previsão de vários dias".

## Escopo

**Dentro:**
- Backend: a resposta de `/weather` passa a trazer condição (código WMO e dia/noite), sensação térmica, umidade, vento, previsão de 24 horas e de 7 dias, vinda da mesma chamada à Open-Meteo.
- Frontend: card "agora" com ícone de condição, faixa de próximas horas, lista de próximos dias, botão de unidade °C/°F, e correção do número grande da temperatura (a fonte continua VT323, no estilo cyberpunk do app).
- Crédito à Open-Meteo no rodapé do resultado.

**Fora de escopo:**
- Busca por coordenadas, alertas, radar e probabilidade de chuva: não foram pedidos.
- Persistir a unidade escolhida fora da URL (cookie, localStorage, conta): a URL basta (decisão do usuário: padrão Celsius, botão para trocar).
- Unidades avulsas (misturar °F com km/h): o botão alterna o conjunto inteiro.
- Cache, desambiguação de cidades homônimas e i18n: continuam fora, como em `weather-service`.

**Anti-objetivos:**
- O clima atual não pode sumir nem atrasar por causa da previsão: uma resposta só, sem segunda chamada do front (D2).
- Um ícone errado é pior que nenhum: código desconhecido cai num ícone genérico, nunca num ícone de outra condição.
- A fonte não pode ser trocada para resolver o "esticado" (o usuário quer manter o estilo cyberpunk).

**Restrições:**
- Contrato aditivo: campos existentes (`city`, `temperature.current/min/max`, `latitude`, `longitude`) não mudam de nome nem de significado (`weather-globe-clima`, D3).
- O Fastify só serializa o que está em `weatherResponseSchema`, então todo campo novo precisa estar no schema do controller, no value object e no `OpenApiSchemaBuilder`; depois se regeneram os tipos (`pnpm openapi:export` e `pnpm openapi:generate-client` em `apps/backend`).
- Frontend segue o `AGENTS.md`: ícones só de `pixel-icons.tsx` (tamanhos 12/16/20/24, gerados por `scripts/generate-pixel-icons.mjs`), sem glow em texto, sem `rounded-full`, sem `corner-shape` fora de `globals.css`, descrições de teste em português com `test`.
- Uso não comercial da Open-Meteo (plano gratuito) e crédito CC BY 4.0 obrigatório (fato do usuário: projeto pessoal, aceito na rodada de premissas).

**Deixado ao construtor:** nomes exatos dos campos do JSON além do formato do Contrato; a lista dos ícones pixelarticons escolhidos por categoria; o tamanho e o espaçamento finais do número grande, desde que fiquem nítidos (a recomendação é múltiplo de 16px, hoje 80px) (decisão minha); como a faixa de horas rola em telas estreitas.

**Lentes fechadas:** segurança e privacidade (endpoint público sem dados pessoais, sem mudança); dados e consistência (nada é gravado, a unidade vive na URL); evolução e rollout (um único consumidor, o próprio frontend, no mesmo monorepo, e o contrato é aditivo).

## Características Arquiteturais

**Priorizadas (top 3):**

| Característica | Preocupação de domínio | Critério mensurável | Escopo |
|---|---|---|---|
| Disponibilidade | Uma falha da Open-Meteo não pode deixar o usuário com tela quebrada ou dados misturados | Falha do provedor devolve 503 `weather_provider_unavailable` e a tela mostra o erro existente, sem resultado parcial (AC-07) | `/weather` |
| Corretude dos dados exibidos | Ícone, hora e unidade errados enganam o usuário | Todo código WMO da tabela mapeia para a categoria certa; conversão °F/mph confere nos valores de referência (AC-03, AC-05) | frontend |
| Latência | A consulta fica mais pesada (horas e dias) | Mesma única chamada à Open-Meteo; nenhuma chamada nova do front ao alternar a unidade (AC-06) | backend e frontend |

**Consideradas, não priorizadas:** escalabilidade (rota pública de baixo tráfego, 10.000 chamadas/dia do plano gratuito bastam).

## Arquitetura e Fluxo

O backend continua com o fluxo geocoding e depois forecast, agora pedindo à Open-Meteo também as variáveis de condição, sensação, umidade, vento, 24 horas e 7 dias na mesma requisição, em `timezone=auto`. O gateway traduz a resposta da Open-Meteo para o modelo do nosso domínio, e o controller devolve o JSON. O backend sempre responde em unidades métricas.

O frontend faz uma consulta (`useWeatherQuery`) e guarda tudo no cache do TanStack Query. A unidade vive na URL (`?units=imperial`; ausente significa métrico), igual a `?city=`. Alternar a unidade só reescreve a URL: a conversão acontece na renderização, sem nova chamada.

## Componentes

- **Previsão no gateway (backend)** — Responsabilidade: obter da Open-Meteo e entregar ao domínio condição, sensação, umidade, vento, horas e dias. Interface: `getCurrentWeather(coordinate)` passa a devolver o conjunto completo, ainda como `Either` com `WeatherProviderUnavailableError`. Oculta: nomes das variáveis da Open-Meteo, a escolha das 24 horas a partir da hora atual, o fuso da cidade (`timezone=auto`). Local: `apps/backend/src/weather/infra/gateway/open-meteo-weather-gateway.ts` e `domain/value-object/current-weather.ts`. Usado por: `GetCurrentWeatherByCityUseCase`.
- **Esquema da resposta (backend)** — Responsabilidade: declarar o contrato HTTP novo. Oculta: formato dos campos no OpenAPI. Local: `weather-controller.ts` (`weatherResponseSchema`) e `OpenApiSchemaBuilder`.
- **Conversor de unidades (frontend)** — Responsabilidade: converter °C, km/h para °F, mph e formatar valores. Interface: funções puras que recebem o número métrico e o sistema (`metric` ou `imperial`) e devolvem o número arredondado. Oculta: as fórmulas e o arredondamento (°F com 1 casa decimal como o °C atual; velocidade do vento inteira). Local: `apps/frontend/src/features/weather/lib/`.
- **Mapa de condição para ícone (frontend)** — Responsabilidade: transformar `{código WMO, isDay}` em categoria e ícone. Oculta: a tabela WMO, o agrupamento em categorias e o fallback genérico. Local: `apps/frontend/src/features/weather/lib/`.
- **Card agora, faixa de horas, lista de dias (frontend)** — componentes de apresentação que recebem os dados já no sistema de unidades escolhido. `CurrentWeatherDisplay` é estendido e os outros dois são novos. Local: `apps/frontend/src/features/weather/components/`.
- **Botão de unidade (frontend)** — Responsabilidade: alternar `metric` e `imperial` na URL. Interface: botão com `aria-pressed` e rótulo do sistema oposto ao ativo. Local: `apps/frontend/src/features/weather/components/`.

## Especificação Visual

**Artefato curado:** `mockups/clima-detalhado-visual.md`

**Fonte de design original:** nenhuma; layout definido via mockup do companion, com tokens reais do app (tema Noite neon).

**Decisões visuais (norte, não pixel-final):**
- Três cards empilhados na coluna de `max-w-md`: agora, próximas horas, próximos dias.
- Agora: ícone grande ao lado da temperatura em VT323 com espaçamento entre letras; condição em ciano; grade com sensação, umidade e vento; depois mínima e máxima.
- Horas: faixa com rolagem horizontal, 24 itens, o item "Agora" com borda primária.
- Dias: 7 linhas com dia, ícone, barra de faixa de temperatura e mínima/máxima.
- Botão de unidade no cabeçalho do resultado.
- Tokens: os do `globals.css`; nenhum valor de cor novo no código.

## Fronteiras e Contratos

**Contrato:**

| Operação | Entrada | Saída | Erros |
|---|---|---|---|
| `GET /weather` | `city` (1 a 100 caracteres) | `200` com os campos atuais mais `temperature.apparent`, `condition {code, isDay}`, `humidity`, `wind {speed, directionDegrees}`, `hourly[24] {time, temperature, code, isDay}`, `daily[7] {date, min, max, code}` | `city_not_found` 404; `weather_provider_unavailable` → 503; nenhum novo |

Os nomes exatos seguem a tabela acima (decisão minha); o builder pode ajustar a grafia mantendo o significado.

**Significados:**
- `temperature.*`, `hourly[].temperature` e `daily[].min/max` são graus Celsius. A velocidade do vento é km/h. A umidade é percentual de 0 a 100.
- `condition.code`, `hourly[].code` e `daily[].code` são códigos WMO inteiros; `isDay` é booleano.
- `hourly[].time` é um horário local da cidade, sem deslocamento de fuso (por exemplo `2026-10-18T15:00`); `daily[].date` é um dia de calendário local (`2026-10-18`). A tela os mostra como "15h" e como dia da semana; nenhuma conversão de fuso.
- `directionDegrees` é de 0 a 360 e a tela mostra a direção em pontos cardeais (N, NE, L...).
- Unidade: `metric` (padrão) ou `imperial`; só existe no frontend. Alternar não busca dados novos. Uma tela desatualizada continua correta, porque a escolha só muda a conversão.

**Integrações:**

| Fronteira (upstream para downstream) | O que atravessa |
|---|---|
| Open-Meteo para gateway | o modelo da Open-Meteo, traduzido para o nosso modelo no gateway; nada do formato do provedor vaza para o controller |
| Backend para frontend | contrato HTTP versionado nos tipos de `@repo/api-types` (aditivo) |

## Falhas e Erros

| Falha | Detecção | Comportamento | O que o usuário vê | AC |
|---|---|---|---|---|
| Open-Meteo fora ou lenta | falha após retry e circuit breaker existentes | `503 weather_provider_unavailable`, sem resultado parcial | a mensagem de serviço indisponível que já existe | AC-07 |
| Cidade inexistente | geocoding sem resultado | `404 city_not_found` | a mensagem de cidade não encontrada que já existe | AC-08 |
| Código WMO fora da tabela | código não mapeado | ícone genérico e texto "Condição indisponível" | ícone genérico, resto do card normal | AC-04 |
| Valor `units` inválido na URL | valor diferente de `imperial` | trata como métrico | Celsius | AC-09 |

## Decisões Arquiteturais

**D1 · Conversão de unidades no frontend.** Alternativa rejeitada: o backend receber um parâmetro `units` e converter. Consequências: alternar é instantâneo e sem chamada; o preço é uma tabela de conversão duplicada se outro cliente aparecer (hoje só há o frontend). Conformidade: o backend responde sempre em métrico (AC-06). (decisão minha)

**D2 · Uma única chamada ao provedor.** Alternativa rejeitada: chamar a Open-Meteo de novo para horas e dias. Consequências: a resposta cresce, mas a latência e o consumo do plano gratuito não dobram. Conformidade: o gateway faz um só `fetch` por consulta. (decisão minha)

**D3 · Unidade na URL.** Alternativa rejeitada: `localStorage` ou cookie. Consequência: o link compartilhado preserva a unidade, e a escolha não persiste entre visitas. (decisão minha)

**D4 · Mapeamento WMO no frontend.** Alternativa rejeitada: o backend devolver o nome da categoria. Consequência: o backend entrega o fato da Open-Meteo (código e dia/noite) e a apresentação fica toda no frontend, mas o mapa precisa cobrir os códigos da tabela da Open-Meteo. (decisão minha)

## Riscos

| Risco | Mitigação |
|---|---|
| O `pixelarticons` 2.4.1 pode não ter um ícone exato para toda categoria (sol, lua, nuvem, chuva, neve, tempestade, névoa) | `generate-pixel-icons.mjs` aborta se o nome não existir; o construtor confere os nomes na lib e usa o mais próximo quando faltar, como já aceito em `pixel-art-icons` |
| O parâmetro que limita as horas devolvidas pela Open-Meteo e seus nomes de variável horária não foram verificados nesta conversa | o construtor confirma na documentação da Open-Meteo antes de implementar (AC-01 e AC-02 cobrem o resultado) |

## Testes

**Runner backend:** `pnpm test` em `apps/backend` (Vitest). **Runner frontend:** `pnpm test -- --run` em `apps/frontend` (Vitest, Testing Library, MSW). Gates: `tsc:check` nos dois, `lint:fix` no frontend, `next build`.
**Níveis:** unitário para todos os critérios; nenhum precisa de banco real.

- AC-01 · WHEN uma cidade é consultada THEN a resposta traz condição, sensação, umidade, vento, 24 horas e 7 dias, além dos campos que já existiam (origem: fato do usuário ("próximas horas e dias também"))
- AC-02 · WHEN a resposta traz `hourly` THEN a primeira hora é a hora atual local da cidade e são 24 itens em ordem crescente (origem: D2)
- AC-03 · WHEN a unidade é imperial THEN 22,4 °C aparece como 72,3 °F e 12 km/h como 7 mph (origem: fato do usuário ("padrão americano"))
- AC-04 · WHEN o código WMO não está na tabela THEN o ícone é o genérico e nenhuma outra condição é mostrada (origem: Falhas: Código WMO fora da tabela)
- AC-05 · WHEN o código é 0 ou 1 THEN o ícone é sol de dia e lua à noite; WHEN é 61 THEN é chuva (origem: fato do usuário ("ícone de tempo: nublado, chovendo, ensolarado"))
- AC-06 · WHEN o usuário alterna a unidade THEN a URL ganha ou perde `units=imperial` e nenhuma requisição nova é feita (origem: D1)
- AC-07 · WHEN a Open-Meteo falha THEN a resposta é 503 `weather_provider_unavailable` e a tela mostra o erro de serviço indisponível (origem: Falhas: Open-Meteo fora ou lenta)
- AC-08 · WHEN a cidade não existe THEN a resposta é 404 `city_not_found` (origem: Falhas: Cidade inexistente)
- AC-09 · WHEN `units` na URL é inválido ou ausente THEN a tela mostra °C, km/h (origem: fato do usuário ("Celsius continuam como default"))
- AC-10 · WHEN o resultado aparece THEN o crédito à Open-Meteo está visível (origem: fato do usuário (premissa 1 aceita: uso gratuito e não comercial))
- AC-11 · WHEN o resultado aparece THEN o número grande da temperatura usa `font-display` em tamanho múltiplo de 16px com tracking positivo, sem `font-bold` (origem: fato do usuário ("a fonte parece esticada"))
