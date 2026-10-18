# PRD: Clima Detalhado

**Spec:** `../specs/clima-detalhado-design.md`

## Visão Geral

Quem consulta o clima de uma cidade em `/clima` vê hoje só a temperatura atual, a mínima e a máxima. Esta feature faz o resultado responder de relance como está o tempo agora e como ficará nas próximas horas e dias, com a opção de ver tudo no padrão americano.

## Objetivos

Os critérios de sucesso da spec valem (`## Visão Geral`).

## Histórias de Usuário

- **US-01** — Como pessoa que consulta o clima de uma cidade, eu quero ver a condição do tempo com ícone, a sensação térmica, a umidade e o vento para que eu entenda de relance como está lá agora · **UI:** sim
- **US-02** — Como pessoa que consulta o clima de uma cidade, eu quero ver as próximas horas para que eu planeje o resto do dia · **UI:** sim
- **US-03** — Como pessoa que consulta o clima de uma cidade, eu quero ver os próximos dias com mínima, máxima e condição para que eu planeje a semana · **UI:** sim
- **US-04** — Como pessoa acostumada ao padrão americano, eu quero alternar o resultado para °F e mph, com Celsius como padrão, para que eu leia os valores na minha unidade · **UI:** sim
- **US-05** — Como pessoa que consulta o clima, eu quero ler a temperatura grande com nitidez, no estilo pixel do app, para que o número não pareça distorcido · **UI:** sim

## Funcionalidades Principais

- **FR-001** (US-01, US-02, US-03) — o sistema deve devolver, numa única consulta, condição, sensação, umidade, vento, 24 horas e 7 dias além dos dados que já existiam (AC-01, AC-02)
- **FR-002** (US-01, US-02, US-03) — o sistema deve mostrar um ícone de condição, de dia ou de noite, para o agora, para cada hora e para cada dia, com um ícone genérico quando a condição for desconhecida (AC-04, AC-05)
- **FR-003** (US-01) — o sistema deve mostrar sensação térmica, umidade e vento (velocidade e direção) do momento atual (AC-01)
- **FR-004** (US-02) — o sistema deve mostrar as próximas 24 horas, começando pela hora atual da cidade (AC-02)
- **FR-005** (US-03) — o sistema deve mostrar os próximos 7 dias com condição, mínima e máxima (AC-01)
- **FR-006** (US-04) — o sistema deve oferecer um botão que alterna entre o padrão métrico e o americano, sem nova consulta (AC-03, AC-06)
- **FR-007** (US-04) — o sistema deve exibir o padrão métrico quando a unidade não for informada ou for inválida (AC-09)
- **FR-008** (US-01, US-02, US-03) — o sistema deve continuar mostrando o erro de cidade não encontrada e o de serviço indisponível, sem resultado parcial (AC-07, AC-08)
- **FR-009** (US-05) — o sistema deve exibir a temperatura grande em VT323 com tamanho e espaçamento que a mantenham nítida (AC-11)
- **FR-010** (US-01) — o sistema deve exibir o crédito à Open-Meteo junto do resultado (AC-10)

## Experiência do Usuário

O norte visual está em `../specs/mockups/clima-detalhado-visual.md`. A jornada acrescenta apenas: a pessoa consulta uma cidade, vê os três blocos (agora, horas, dias) sem sair da página, e alterna a unidade no próprio resultado; o link da página preserva a unidade escolhida (spec, D3).

## Fora de Escopo

As exclusões da spec valem (`## Escopo`).
