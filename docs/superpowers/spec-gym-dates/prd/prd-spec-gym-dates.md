---
created_at: "2026-09-15T09:06:40-03:00"
updated_at: "2026-09-15T09:06:40-03:00"
---

# PRD: Horário de Funcionamento da Academia

## Visão Geral

Academias hoje não possuem informação de dias e horários de abertura. Esta feature permite ao admin informar o horário de funcionamento no cadastro (opcional) e atualizá-lo depois na edição, e exibe um resumo na tela de detalhe da academia (`/academias/[id]`). Suporta múltiplos intervalos por dia (ex: 08:00–12:00 e 14:00–18:00) e dias fechados. Resolve a falta de transparência para usuários que precisam saber quando a academia está aberta antes de se deslocar.

## Objetivos

- Permitir que 100% dos cadastros/edições de academia possam registrar horário semanal sem bloquear o fluxo atual (campo opcional).
- Garantir que 100% dos horários exibidos no detalhe correspondam ao validado no domínio (sem horários inválidos persistidos).
- Reduzir dúvidas sobre funcionamento: resumo visível em ≤ 80px colapsado com status “Aberto agora / Fechado” calculado corretamente para `America/Sao_Paulo`.
- Manter `biome:fix` com zero issues e cobertura de testes de validação para todos os invariantes.

## Histórias de Usuário

- **US-01** — Como admin, eu quero informar os dias e horários de funcionamento ao cadastrar uma academia para que usuários saibam quando ela abre · **UI:** sim
- **US-02** — Como admin, eu quero editar os horários de uma academia já cadastrada para que correções e mudanças de expediente sejam refletidas no detalhe · **UI:** sim
- **US-03** — Como usuário, eu quero ver um resumo do horário de funcionamento na tela de detalhe da academia para que eu saiba rapidamente quando ela está aberta · **UI:** sim
- **US-04** — Como usuário, eu quero saber se a academia está aberta agora e quando ela fecha/abre para que eu decida se vou agora · **UI:** sim
- **US-05** — Como sistema, eu quero rejeitar horários inválidos (formato, intervalo invertido, sobreposição) para que apenas dados consistentes sejam persistidos · **UI:** não

## Funcionalidades Principais

### Cadastro e edição de horário

Permite ao admin preencher por dia da semana (Dom–Sáb) zero ou mais intervalos `HH:mm`, marcar dia como Fechado ou adicionar até 3 intervalos por dia, tanto no cadastro (seção opcional colapsada) quanto na edição.

- **FR-001** (US-01) — o sistema deve aceitar `operatingHours` opcional em `POST /gyms` no formato `[{ weekday: 0-6, intervals: [{open:"HH:mm", close:"HH:mm"}] }]` e persistir quando fornecido
- **FR-002** (US-02) — o sistema deve aceitar `operatingHours` opcional em `PUT /gyms/:id` e substituir integralmente o horário anterior (envio de `[]` ou dia ausente = Fechado; `null`/omitido = manter sem horário quando nunca preenchido, ou limpar conforme contrato)
- **FR-003** (US-05) — o sistema deve validar cada `TimeInterval` com regex `^([01]\d|2[0-3]):[0-5]\d$` e rejeitar `open >= close` com erro 400 mapeado para `InvalidOperatingHoursError`
- **FR-004** (US-05) — o sistema deve rejeitar intervalos sobrepostos ou não ordenados no mesmo `weekday` (ordenação por `open`, checa `prev.close <= next.open`) com 400
- **FR-005** (US-05) — o sistema deve validar `weekday` em 0–6 (0=Dom … 6=Sáb) e no máximo 7 `DaySchedule`, sem duplicar `weekday`

### Exibição no detalhe

Resumo no `DetailCard` de `/academias/[id]` no layout C (compacto agrupado + badge de status + tabela expansível).

- **FR-006** (US-03) — o sistema deve retornar `operatingHours` em `GET /gyms/:id` (e `GET /gyms` quando aplicável) como JSON idêntico ao persistido ou `null` quando nunca informado
- **FR-007** (US-03) — a tela de detalhe deve exibir bloco “Horário de funcionamento” com resumo compacto agrupando dias consecutivos com mesmo horário (ex: `Seg–Sex 06:00–22:00 · Sáb 08:00–14:00 · Dom fechado`) e tabela de 7 dias expansível sob demanda
- **FR-008** (US-03) — quando `operatingHours` for `null`/vazio, o detalhe deve exibir estado vazio “Horário não informado” sem badge ou tabela
- **FR-009** (US-04) — o detalhe deve exibir badge “Aberto agora” / “Fechado” e `Fecha às HH:mm` / `Abre às HH:mm` calculado no client a partir de `operatingHours` com `timeZone: 'America/Sao_Paulo'`, destacando a linha do dia atual
- **FR-010** (US-01, US-02) — o formulário deve exibir 7 linhas (Dom–Sáb) com toggle Fechado, `input type=time` por intervalo, botão `+ intervalo` (máx 3/dia) e erro inline por dia quando validação falhar

## Experiência do Usuário

Jornada admin: acessa cadastro (`/academias/nova` ou fluxo atual) → seção “Horário de funcionamento” colapsada opcional → expande, marca dias Fechado ou adiciona intervalos → validação inline impede `open>=close`/sobreposição → salva com sucesso (toast). Edição: `/admin/academias/[id]/editar` carrega horário existente, permite alterar e salvar (PUT).

Jornada usuário: acessa `/academias/[id]` → vê `DetailCard` com imagem, endereço, telefone e, abaixo, bloco de horário: resumo em 1 linha + badge de status; clica “Ver horários completos” para expandir tabela 7 dias com hoje destacado. Se sem horário, vê “Horário não informado” tracejado.

Visual (WHAT/WHY): layout C prioriza economia vertical e prova imediata de status; decisões de hierarchy/spacing/tokens em `specs/mockups/spec-gym-dates-visual.md` (primary `#39e58c`, card `rounded-[12px]`, Space Grotesk/Inter) — implementação deve seguir esse norte sem re-derivar.

Acessibilidade: inputs `type=time` com `label` por dia/intervalo, toggle Fechado com `aria-pressed`, tabela com `caption` “Horário semanal”, badge com `aria-live="polite"` para mudança de status.

## Restrições Técnicas de Alto Nível

- Stack: Node (backend) + Prisma + PostgreSQL + Next.js frontend (conforme `projectProfile: node — package.json`).
- Persistência: coluna `operating_hours Json?` em `Gym`; domínio via VO `OperatingHours/DaySchedule/TimeInterval` com `create/restore/equals/toJSON/isOpenAt` e `Either`, sem throw (padrão `Name/CNPJ/Phone`).
- Contrato: `operatingHours` opcional em create/update; OpenAPI via `makeCreateGymSwaggerSchema` e tipos regenerados em `@repo/api-types`.
- Características arquiteturais priorizadas do spec: corretude de validação (100% invariantes cobertos), manutenibilidade DDD (VO sem throw), clareza de UX (≤80px colapsado).
- Timezone fixo `America/Sao_Paulo` para cálculo de “Aberto agora” (client).

## Fora de Escopo

- Filtro/busca por “academias abertas agora” ou por horário (exigiria tabela normalizada e índice).
- Feriados, exceções pontuais ou horários especiais (ex: Natal).
- Horário overnight com `close` no dia seguinte (ex: 22:00–02:00) — intervalos devem estar contidos no mesmo dia; caso futuro, modelar como dois intervalos.
- Notificações ou auditoria de quem alterou horário.
- Galeria de imagens ou outro campo novo além de `operatingHours`.
