# QA Report — subscription-plan-link

## Resumo
- **Status**: ⚠️ PARCIAL
- **PRD**: `docs/superpowers/subscription-plan-link/prd/prd-subscription-plan-link.md`
- **Total de Requisitos**: 19
- **Requisitos Atendidos**: 17 / 19 (FR-017 e FR-018 cobertos por testes automatizados, sem observação ao vivo na UI)
- **Bugs Encontrados**: 0

Data: 2026-09-23. 6 user stories verificadas: 5 PASSED, 1 PARTIAL (US-05). Cada story rodou seus testes com escopo próprio e, quando tinha UI, foi verificada no navegador com `playwright-cli` contra o app local (`http://localhost:3000`, backend `:3333`).

---

## Requisitos Verificados

| ID | Requisito | Status | Evidência |
|----|-----------|--------|-----------|
| FR-001 | Assinatura criada grava plano, período e vínculo ao usuário | ✅ PASSOU | `evidence/us-01-usuario-autenticado-que-o-plano/result.json`, `evidence/us-02-usuario-sem-assinatura-continuar-escolhendo/result.json` |
| FR-002 | Plano resolvido pelo preço escolhido; sem correspondência informa plano não encontrado | ✅ PASSOU | `evidence/us-02-usuario-sem-assinatura-continuar-escolhendo/result.json` |
| FR-003 | Fim do período: +1 mês (mensal) ou +1 ano (anual) | ✅ PASSOU | `evidence/us-02-usuario-sem-assinatura-continuar-escolhendo/result.json`, `evidence/us-03-usuario-com-assinatura-ativa-trocar/result.json` |
| FR-004 | No máximo uma assinatura ativa por usuário; conflito informado | ✅ PASSOU | `evidence/us-02-usuario-sem-assinatura-continuar-escolhendo/result.json`, `evidence/us-05-usuario-com-assinatura-vencida-apos/result.json` |
| FR-005 | Consulta da assinatura vigente (plano, status, período, cancelamento agendado) | ✅ PASSOU | `evidence/us-06-sistema-cliente-da-api-consultar/result.json` |
| FR-006 | Sem assinatura: ausência como resultado normal (200 com `null`) | ✅ PASSOU | `evidence/us-06-sistema-cliente-da-api-consultar/result.json` |
| FR-007 | `/assinatura` pré-seleciona o plano vigente como "Plano atual" | ✅ PASSOU | `evidence/us-01-usuario-autenticado-que-o-plano/screenshot.png` |
| FR-008 | Plano vigente exibido mesmo se inativado no catálogo | ✅ PASSOU | `evidence/us-01-usuario-autenticado-que-o-plano/result.json` |
| FR-009 | Troca de plano na mesma assinatura | ✅ PASSOU | `evidence/us-03-usuario-com-assinatura-ativa-trocar/screenshot.png` (PATCH 200 ao vivo) |
| FR-010 | Troca recusada sem assinatura ativa ou com cancelamento agendado (409 + recarga) | ✅ PASSOU | `evidence/us-03-usuario-com-assinatura-ativa-trocar/result.json` |
| FR-011 | "Trocar plano" substitui "Assinar" com assinatura ativa | ✅ PASSOU | `evidence/us-03-usuario-com-assinatura-ativa-trocar/screenshot.png` |
| FR-012 | Assinatura legada sem plano aceita troca | ✅ PASSOU | `evidence/us-03-usuario-com-assinatura-ativa-trocar/result.json` |
| FR-013 | Cancelamento agendado ao fim do período, acesso mantido | ✅ PASSOU | `evidence/us-04-usuario-com-assinatura-ativa-cancelar/screenshot.png` (fluxo ao vivo) |
| FR-014 | Cancelar de novo é idempotente | ✅ PASSOU | `evidence/us-04-usuario-com-assinatura-ativa-cancelar/result.json` (testes automatizados) |
| FR-015 | Data de fim exibida após agendar | ✅ PASSOU | `evidence/us-04-usuario-com-assinatura-ativa-cancelar/screenshot.png` |
| FR-016 | 404 "Você não possui assinatura ativa" sem assinatura | ✅ PASSOU | `evidence/us-04-usuario-com-assinatura-ativa-cancelar/result.json` (testes automatizados) |
| FR-017 | Vencida quando o período passou com cancelamento agendado, sem job/evento | ⚠️ PARCIAL | `evidence/us-05-usuario-com-assinatura-vencida-apos/result.json` (só testes; estado não reproduzido na UI) |
| FR-018 | Nova assinatura encerra a vencida | ⚠️ PARCIAL | `evidence/us-05-usuario-com-assinatura-vencida-apos/result.json` (só testes; estado não reproduzido na UI) |
| FR-019 | Assinatura legada sem plano mostra "plano não identificado" e oferece cancelar e trocar | ✅ PASSOU | `evidence/us-01-usuario-autenticado-que-o-plano/result.json` |

---

## Testes E2E Executados

| Fluxo | Resultado | Observações |
|-------|-----------|-------------|
| US-01 — plano assinado fica salvo e aparece ao voltar | ✅ PASSOU | Assinou "Premium Mensal" no navegador e recarregou: plano segue como "Plano atual". 50 testes verdes |
| US-02 — usuário sem assinatura escolhe e assina | ✅ PASSOU | Seletor de planos exibido para usuário novo. 32 testes verdes |
| US-03 — trocar de plano | ✅ PASSOU | Clique real em "Trocar plano": `PATCH /subscriptions/me/plan` 200 e `GET /me` com o plano novo na mesma assinatura. 47 testes verdes |
| US-04 — cancelar ao fim do período | ✅ PASSOU | Diálogo de confirmação, POST 200, tela mostra "Cancelamento agendado. Acesso até 23/10/2026" e o estado persiste após recarregar. 29 testes verdes |
| US-05 — assinar de novo após vencer | ⚠️ PARCIAL | 17 testes verdes cobrem a regra; o estado "vencida" não tem fixture e não foi reproduzido no navegador |
| US-06 — API consulta a assinatura vigente | ✅ PASSOU | Story sem UI. 12 testes verdes (use case + HTTP) |

Nota de ambiente: a 1ª rodada de US-03/US-04 pegou um backend dev desatualizado (processo iniciado antes das rotas `PATCH /me/plan` e `POST /me/cancel`, então 404 na rota). O backend foi recarregado e as duas stories foram reverificadas ao vivo.

---

## Acessibilidade
- [ ] Navegação por teclado verificada
- [ ] Contraste de cores adequado
- [x] Labels e ARIA roles presentes

`role="alert"`, `role="status"`, `aria-busy` e o `AlertDialog` de confirmação do cancelamento foram checados na revisão de código e nos testes de componente. Teclado e contraste não foram auditados nesta QA.

---

## Bugs Encontrados

| ID | Descrição | Severidade | Screenshot |
|----|-----------|------------|------------|
| — | Nenhum bug de produto encontrado | — | — |

---

## Conclusão
Aprovada com ressalvas. A regra de negócio das 6 stories está coberta por testes que passam, e 5 delas foram confirmadas no app rodando. A ressalva é a US-05 (FR-017/FR-018): o fluxo "assinatura vencida → assinar de novo" só foi verificado por testes automatizados, porque não há fixture que coloque um usuário nesse estado.
