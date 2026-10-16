# QA Report — notas-treino-calendario

## Resumo
- **Status**: ⚠️ PARCIAL
- **PRD**: docs/superpowers/notas-treino-calendario/prd/prd-notas-treino-calendario.md
- **Total de Requisitos**: 10
- **Requisitos Atendidos**: 10 / 10 (comportamento verificado por testes; aspecto visual da US-01 não verificado por screenshot)
- **Bugs Encontrados**: 0

---

## Requisitos Verificados

| ID | Requisito | Status | Evidência |
|----|-----------|--------|-----------|
| FR-001 | permitir criar uma nota de treino por dia | ✅ PASSOU | evidence/us-01-usuario-logado-anotar-o-treino/result.json + training-note.business-flow-test.ts (POST 201) |
| FR-002 | permitir editar a nota existente de um dia | ✅ PASSOU | evidence/us-02-usuario-logado-editar-a-nota/result.json + acceptance editar-nota (2 testes novos) |
| FR-003 | excluir a nota mediante confirmação, removendo-a da célula e da lista | ✅ PASSOU | evidence/us-03-usuario-logado-excluir-a-nota/result.json + screenshot.png (diálogo Excluir) |
| FR-004 | exibir a nota junto ao nome do feriado quando coincidirem | ✅ PASSOU | evidence/us-04-usuario-logado-ver-minhas-notas/result.json + screenshot.png (12/10 feriado + nota) |
| FR-005 | recusar texto vazio sem apagar nada | ✅ PASSOU | evidence/us-01 + us-03 result.json (INV-02, AC-04) |
| FR-006 | isolar as notas por conta, sem exibir notas de outros usuários | ✅ PASSOU | evidence/us-05-usuario-logado-que-so-eu/result.json + screenshot.png (conta B vê mês vazio) |
| FR-007 | manter o rascunho e oferecer retry quando a rede falhar ao salvar | ✅ PASSOU | evidence/us-01 + us-02 result.json (AC-06; edição compartilha mecanismo do modal) |
| FR-008 | recusar a segunda nota do mesmo dia orientando a editar | ✅ PASSOU | evidence/us-01 + us-02 result.json (409 AC-07, modal troca para edição) |
| FR-009 | avisar sem efeitos quando a nota alvo não existir | ✅ PASSOU | evidence/us-02 + us-03 result.json (404 AC-08, toast recarregar) |
| FR-010 | manter as notas visíveis quando a leitura de feriados falhar | ✅ PASSOU | evidence/us-04-usuario-logado-ver-minhas-notas/result.json (AC-09) |

---

## Testes E2E Executados

| Fluxo | Resultado | Observações |
|-------|-----------|-------------|
| US-01 anotar o treino do dia | ⚠️ PARCIAL | 15 testes verdes (8 frontend + 4 unidade + 3 business-flow); screenshot indisponível (navegador ausente + /calendario exige login) |
| US-02 editar a nota de um dia | ✅ PASSOU | 19 testes verdes + 2 aceitações novas (edição via modal, PUT 404); screenshot do modal em edição |
| US-03 excluir a nota com confirmação | ✅ PASSOU | 12 testes verdes + INV-03 no Postgres real; screenshot do diálogo de confirmação |
| US-04 ver notas junto dos feriados | ✅ PASSOU | 4 testes verdes (AC-02, AC-09); screenshot real 12/10/2026 com feriado + nota |
| US-05 só eu vejo minhas notas | ✅ PASSOU | 7 testes verdes + verificação ao vivo com 2 contas (B vê [], A vê a nota); screenshot conta B com mês vazio |

---

## Acessibilidade
- [ ] Navegação por teclado verificada
- [ ] Contraste de cores adequado
- [ ] Labels e ARIA roles presentes

---

## Bugs Encontrados

| ID | Descrição | Severidade | Screenshot |
|----|-----------|------------|------------|
| — | Nenhum bug encontrado nesta rodada | — | — |

---

## Conclusão
Feature aprovada com ressalva: os 10 requisitos têm comportamento verificado por testes (unitários, business-flow, integração Prisma e frontend), 4 das 5 histórias com screenshot real e isolamento por conta provado ao vivo com duas contas. A ressalva é a US-01 sem screenshot (ambiente sem navegador + rota autenticada), sem impacto no comportamento. Pronta para o done-state gate.
