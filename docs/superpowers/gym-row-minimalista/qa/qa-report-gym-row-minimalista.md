# QA Report — Linha de Academia Minimalista

## Resumo
- **Status**: ⚠️ PARCIAL
- **PRD**: `../prd/prd-gym-row-minimalista.md`
- **Total de Requisitos**: 10
- **Requisitos Atendidos**: 10 / 10 cobertos por testes unitários; 5 / 10 também confirmados no app rodando (FR-001, FR-002, FR-003, FR-009, FR-010)
- **Bugs Encontrados**: 0

Cobertura por história: US-01 e US-05 `PASSED` (com screenshot); US-02, US-03 e US-04 `PARTIAL` (testes verdes, sem verificação visual no app por falta de sessão autenticada ou de administrador). O ícone de editar e o estado "Desativada" só foram verificados por testes, pois nenhum usuário de QA era administrador.

---

## Requisitos Verificados

| ID | Requisito | Status | Evidência |
|----|-----------|--------|-----------|
| FR-001 | Linha exibe imagem, nome, descrição e endereço | ✅ PASSOU | `evidence/us-01-usuario-uma-lista-de-academias/result.json`, `.../screenshot.png` |
| FR-002 | Sem telefone nem "Ver detalhes" | ✅ PASSOU | `evidence/us-01-usuario-uma-lista-de-academias/result.json` |
| FR-003 | Sem selo de texto de status | ✅ PASSOU | `evidence/us-01-usuario-uma-lista-de-academias/result.json` |
| FR-004 | Ponto verde (disponível) e vermelho (desativada) antes do nome | ⚠️ PARCIAL | `evidence/us-02-usuario-reconhecer-a-disponibilidade-da/result.json` (21 testes; aparência no navegador vista só em US-01/US-05 como ponto de status, sem cor confirmada para "Desativada") |
| FR-005 | "Desativada" só para admin | ⚠️ PARCIAL | `evidence/us-02-usuario-reconhecer-a-disponibilidade-da/result.json` (testes; sem admin no app) |
| FR-006 | Ícone de Check-in leva ao detalhe | ⚠️ PARCIAL | `evidence/us-03-usuario-acionar-o-checkin-por/result.json` (testes); presença do link confirmada no app em `evidence/us-05-usuario-de-teclado-ou-leitor/screenshot.png` |
| FR-007 | Ícone de editar só para admin | ⚠️ PARCIAL | `evidence/us-04-administrador-editar-uma-academia-por/result.json` (testes; sem admin no app) |
| FR-008 | Alvo mínimo 24px e sem sobreposição com título longo | ⚠️ PARCIAL | `evidence/us-04-administrador-editar-uma-academia-por/result.json` (classes `h-8 w-8`, `pr-14`/`pr-24`; sem verificação de layout real) |
| FR-009 | Ícones com nome acessível e tooltip no foco | ✅ PASSOU | `evidence/us-05-usuario-de-teclado-ou-leitor/result.json`, `.../screenshot.png` |
| FR-010 | Ponto de status com nome acessível e `title` | ✅ PASSOU | `evidence/us-05-usuario-de-teclado-ou-leitor/result.json` |

---

## Testes E2E Executados

| Fluxo | Resultado | Observações |
|-------|-----------|-------------|
| US-01: lista limpa em `/academias` (visão lista, usuário MEMBER) | ✅ PASSOU | 32 testes + navegador; sem telefone, sem "Ver detalhes" e sem selo de texto |
| US-02: indicador de status por ponto | ⚠️ PARCIAL | 21 testes; sem screenshot (sessão não autenticada) |
| US-03: Check-in por ícone | ⚠️ PARCIAL | 18 testes; sem screenshot (login exigido) |
| US-04: editar por ícone (admin) | ⚠️ PARCIAL | 18 testes; sem credencial de administrador |
| US-05: nomes acessíveis e tooltip no foco | ✅ PASSOU | 18 testes + navegador: árvore de acessibilidade expõe a imagem "Disponível" e o link "Check-in em {título}"; tooltip aparece no foco por teclado |

Efeito colateral no ambiente local: os subagentes criaram os usuários `qa-us01@example.com` e `qa-us05@example.com` no backend de desenvolvimento via `POST /users`.

---

## Acessibilidade
- [x] Navegação por teclado verificada (foco no link de Check-in abre o tooltip)
- [ ] Contraste de cores adequado (não verificado)
- [x] Labels e ARIA roles presentes (ponto com `role="img"` e `aria-label`; ícones com `aria-label`)

---

## Bugs Encontrados

| ID | Descrição | Severidade | Screenshot |
|----|-----------|------------|------------|
| — | Nenhum bug encontrado | — | — |

---

## Conclusão
Aprovada com ressalvas: nenhuma história falhou e os testes cobrem todos os requisitos. Ficaram sem verificação no app rodando o ícone de editar, o estado "Desativada" (exigem administrador), o contraste de cores e o layout com títulos muito longos em telas estreitas.
