---
created_at: "2026-08-02T12:20:00-03:00"
updated_at: "2026-08-02T12:20:00-03:00"
---

# QA Report — gym-deactivation

## Resumo
- **Status**: ⚠️ PARCIAL
- **PRD**: docs/superpowers/gym-deactivation/prd/prd-gym-deactivation.md
- **Total de Requisitos**: 12
- **Requisitos Atendidos**: 11 PASSOU / 1 PARCIAL
- **Bugs Encontrados**: 0

---

## Requisitos Verificados

| ID | Requisito | Status | Evidência |
|----|-----------|--------|-----------|
| FR-001 | Admin desativa academia ativa a partir da tela de detalhe | ✅ PASSOU | evidence/us-01-administrador-desativar-uma-academia/result.json |
| FR-002 | Admin reativa academia desativada a partir da tela de detalhe | ✅ PASSOU | evidence/us-02-administrador-reativar-uma-academia-desativada/result.json |
| FR-003 | Botão de alternância exibe ícone/cor distintos por estado | ✅ PASSOU | evidence/us-01-administrador-desativar-uma-academia/result.json; evidence/us-02-administrador-reativar-uma-academia-desativada/result.json |
| FR-004 | Modal de confirmação com consequência da ação e opções confirmar/cancelar | ✅ PASSOU | evidence/us-03-administrador-ver-uma-confirmacao/result.json |
| FR-005 | Requisições de não-admin rejeitadas com 403 | ✅ PASSOU | evidence/us-01-administrador-desativar-uma-academia/result.json; evidence/us-02-administrador-reativar-uma-academia-desativada/result.json |
| FR-006 | Academia desativada não aparece em listagem/busca para não-admin | ✅ PASSOU | evidence/us-05-usuario-comum-nao-aparecem-buscas/result.json |
| FR-007 | Não-admin impedido de fazer check-in em academia desativada (erro de academia inexistente) | ✅ PASSOU | evidence/us-06-usuario-comum-impedido-check-in/result.json |
| FR-008 | Não-admin acessa URL de detalhe de academia desativada e recebe erro de não existe | ✅ PASSOU | evidence/us-05-usuario-comum-nao-aparecem-buscas/result.json |
| FR-009 | Admin continua acessando detalhe de academia desativada | ⚠️ PARCIAL | evidence/us-04-administrador-continuar-acessando/result.json — teste HTTP/backend passou, mas screenshot da UI não foi capturado |
| FR-010 | Desativar já-desativada ou reativar já-ativa retorna 409 sem alterar estado | ✅ PASSOU | evidence/us-01-administrador-desativar-uma-academia/result.json; evidence/us-02-administrador-reativar-uma-academia-desativada/result.json |
| FR-011 | Nenhuma exclusão física de academia, check-ins ou auditoria | ✅ PASSOU | evidence/us-01-administrador-desativar-uma-academia/result.json; evidence/us-02-administrador-reativar-uma-academia-desativada/result.json |
| FR-012 | Indicador visual "Desativada" na lista de busca para admin | ✅ PASSOU | evidence/us-07-administrador-identificar-visualmente/result.json |

---

## Testes E2E Executados

| Fluxo | Resultado | Observações |
|-------|-----------|-------------|
| US-01 — Admin desativa academia | ✅ PASSOU | Testes de use case/controller + screenshot real do modal de desativação |
| US-02 — Admin reativa academia | ✅ PASSOU | Testes de use case/controller/business-flow + screenshot real do modal de reativação |
| US-03 — Confirmação antes de desativar/reativar | ✅ PASSOU | Testes unitários do dialog + teste E2E Playwright com screenshot do modal |
| US-04 — Admin acessa detalhe de academia desativada | ⚠️ PARCIAL | Teste HTTP de controller passa; screenshot da UI não capturado |
| US-05 — Academias desativadas ocultas de usuários comuns | ✅ PASSOU | Testes de listagem, busca textual, proximidade e detalhe via controller |
| US-06 — Check-in bloqueado em academia desativada | ✅ PASSOU | Teste de use case + business-flow de ciclo completo |
| US-07 — Selo visual "Desativada" para admin | ✅ PASSOU | Testes unitários de gym-card/gym-row + screenshot real da lista de busca |

---

## Acessibilidade
- [ ] Navegação por teclado verificada
- [ ] Contraste de cores adequado
- [ ] Labels e ARIA roles presentes

> Nota: a verificação deste gate focou em funcionalidade e cobertura de testes. Os testes unitários do frontend já validam `aria-label` dos botões de alternância de status, mas não foi feita auditoria completa de acessibilidade.

---

## Bugs Encontrados

Nenhum bug encontrado nesta rodada de QA.

---

## Conclusão

A feature de desativação/reativação de academia foi verificada em 7 histórias de usuário. Seis histórias obtiveram status **PASSED** com evidências de testes automatizados e, quando aplicável, screenshots reais da UI. A história **US-04** ficou como **PARTIAL** porque a verificação se limitou ao teste HTTP de backend; não foi capturado screenshot do frontend mostrando o admin acessando o detalhe de uma academia desativada.

Considerando que o comportamento de FR-009 está coberto e verificado por teste de controller (200 + status "deactivated" para admin), a feature está **aprovada com ressalvas**. Recomenda-se capturar a evidência visual de US-04 antes do merge se o processo exigir 100% de evidência de UI, mas o comportamento funcional não está comprometido.

**QA Gate passou — 6/7 histórias verified, 1/7 partial, 0 failed.**
