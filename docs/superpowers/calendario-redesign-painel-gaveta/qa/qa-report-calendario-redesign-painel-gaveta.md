# QA Report — Calendário: redesign com painel do dia e gaveta

## Resumo
- **Status**: ⚠️ PARCIAL
- **PRD**: docs/superpowers/calendario-redesign-painel-gaveta/prd/prd-calendario-redesign-painel-gaveta.md
- **Total de Requisitos**: 17
- **Requisitos Atendidos**: 16 / 17 (FR-017 sem verificação: ver nota abaixo)
- **Bugs Encontrados**: 2

Resultado por história: 7 PASSED (US-01, 02, 03, 05, 06, 07, 08), 1 PARTIAL (US-04) e 1 sem resultado capturado (US-09).

**Nota sobre a US-09:** o subagente da US-09 foi interrompido a pedido do usuário antes de gravar o `result.json` (restaram só três screenshots em `evidence/us-09-pessoa-que-usa-o-calendario/`). Pelo critério automático do gate, um resultado ausente conta como `FAILED` e o status geral seria REPROVADO. O usuário pediu para concluir a validação do jeito que estava, então o status acima é uma decisão dele, não um veredito do QA sobre a US-09. Os cenários de AC-16 foram observados em parte nas US-03 e US-04 (ver Bugs e Conclusão).

---

## Requisitos Verificados

| ID | Requisito | Status | Evidência |
|----|-----------|--------|-----------|
| FR-001 | Célula do dia só com número e marcadores | ✅ PASSOU | evidence/us-01-pessoa-que-consulta-o-calendario/result.json, screenshot.png |
| FR-002 | Tooltip, marcadores decorativos e resumo no nome acessível | ✅ PASSOU | evidence/us-01-pessoa-que-consulta-o-calendario/result.json; evidence/us-08-pessoa-que-usa-teclado-ou/result.json |
| FR-003 | Clicar no dia só seleciona, sem abrir a gaveta | ✅ PASSOU | evidence/us-02-pessoa-que-consulta-o-calendario/result.json |
| FR-004 | Painel mostra feriado e nota do dia selecionado | ✅ PASSOU | evidence/us-02-pessoa-que-consulta-o-calendario/screenshot.png |
| FR-005 | Dia sem nota mostra "Adicionar nota" | ✅ PASSOU | evidence/us-02-pessoa-que-consulta-o-calendario/result.json; evidence/us-04-pessoa-que-registra-notas-de/result.json |
| FR-006 | Dia selecionado coerente com o mês exibido | ✅ PASSOU | evidence/us-06-pessoa-que-navega-entre-meses/result.json, screenshot-novembro-dia1.png |
| FR-007 | Lista do mês com feriados e notas, em ordem de data | ✅ PASSOU | evidence/us-03-pessoa-que-registra-notas-de/result.json |
| FR-008 | Lista rola por dentro e não aumenta a tela | ✅ PASSOU | evidence/us-03-pessoa-que-registra-notas-de/screenshot.png, screenshot-1100px.png |
| FR-009 | Clicar numa linha da lista seleciona o dia | ✅ PASSOU | evidence/us-03-pessoa-que-registra-notas-de/screenshot-selecionado-25.png; evidence/us-02-pessoa-que-consulta-o-calendario/screenshot-selecao-por-linha.png |
| FR-010 | Gaveta abre vazia ao adicionar | ✅ PASSOU | evidence/us-04-pessoa-que-registra-notas-de/result.json |
| FR-011 | Salvar atualiza painel, célula e lista | ✅ PASSOU | evidence/us-04-pessoa-que-registra-notas-de/screenshot.png |
| FR-012 | 409, erro de rede e 404 tratados | ⚠️ PARCIAL | cobertos por testes (evidence/us-04-.../*.acceptance.test.tsx), não provocados no app real |
| FR-013 | Exclusão com confirmação, pelo painel e pela gaveta | ✅ PASSOU | evidence/us-05-pessoa-que-registra-notas-de/screenshot-confirmacao-painel.png |
| FR-014 | Foco volta ao botão do dia ao fechar ou excluir | ✅ PASSOU | evidence/us-05-pessoa-que-registra-notas-de/result.json; evidence/us-08-pessoa-que-usa-teclado-ou/result.json |
| FR-015 | Setas não trocam o mês em campo editável ou com gaveta aberta | ✅ PASSOU | evidence/us-06-pessoa-que-navega-entre-meses/screenshot.png |
| FR-016 | Falha ou demora de uma fonte não esconde a outra | ✅ PASSOU | evidence/us-07-pessoa-que-consulta-o-calendario/screenshot-notas-falham.png (a demora dos feriados só em teste) |
| FR-017 | Layout responsivo (lado a lado a partir de 1280px, gaveta pela base abaixo de 768px) | ⚠️ PARCIAL | sem result.json da US-09; observado nas US-03 e US-04: evidence/us-03-.../screenshot.png (1440px, painel 481px igual ao card da grade), evidence/us-04-.../screenshot-390px.png |

---

## Testes E2E Executados

| Fluxo | Resultado | Observações |
|-------|-----------|-------------|
| US-01 · dia só com número e marcadores | ✅ PASSOU | 16 testes; 31 células sem texto além do número |
| US-02 · selecionar dia e ver detalhe no painel | ✅ PASSOU | 64 testes; seleção por clique e por linha da lista |
| US-03 · lista do mês sem aumentar a tela | ✅ PASSOU | 48 testes; 30 notas, rolagem interna a 1440px; a 1100px a lista tem `max-h-80` |
| US-04 · criar e editar nota na gaveta | ⚠️ PARCIAL | 65 testes mais 3 de aceitação; funciona, mas a gaveta cobre o painel em desktop (BUG-01) |
| US-05 · excluir com confirmação | ✅ PASSOU | 40 testes; foco volta ao dia após Cancelar e Excluir, pelo painel e pela gaveta |
| US-06 · seleção coerente e setas seguras | ✅ PASSOU | 41 testes; setas no textarea movem o cursor e não trocam o mês |
| US-07 · fontes independentes | ✅ PASSOU | 69 testes mais 2 de aceitação; a demora dos feriados não foi vista no navegador (o login entrou em rate limit) |
| US-08 · teclado e leitor de tela | ✅ PASSOU | 74 testes; leitor de tela não exercitado, só a árvore de acessibilidade |
| US-09 · layout responsivo | — SEM RESULTADO | interrompida a pedido do usuário; só screenshots em evidence/us-09-pessoa-que-usa-o-calendario/ |

---

## Acessibilidade
- [x] Navegação por teclado verificada (US-08: Tab, setas, Enter, Esc e retorno do foco ao dia)
- [ ] Contraste de cores adequado (não verificado neste gate)
- [x] Labels e ARIA roles presentes (`aria-label` do dia, `aria-hidden` nos marcadores, `aria-current`, `aria-pressed`, `aria-describedby`)

---

## Bugs Encontrados

| ID | Descrição | Severidade | Screenshot |
|----|-----------|------------|------------|
| BUG-01 | A gaveta lateral (384px, altura total, com overlay) cobre o painel do dia por completo a 1280px e 1440px, e corta a borda do card da grade a 1440px; abaixo de 768px cobre metade da tela. A razão da US-04 ("a edição não cubra a grade nem o painel") não se cumpre. O app segue a spec ("Sheet à direita"), então a decisão é de spec ou de texto da história. | Média | evidence/us-04-pessoa-que-registra-notas-de/screenshot-1440px.png, screenshot-390px.png |
| BUG-02 | Aviso do Radix no console: "Tooltip is changing from controlled to uncontrolled". Vem de `monthly-calendar.tsx:199`, onde `open={temConteudo ? undefined : false}` alterna entre controlado e não controlado quando a nota chega depois da célula. | Baixa | (sem screenshot; observado no console na US-03) |

---

## Conclusão
Aprovada com ressalvas. Sete das nove histórias passaram, a US-04 ficou parcial e a US-09 não tem resultado. O comportamento principal (seleção, painel, lista, gaveta, exclusão com foco devolvido, setas seguras e fontes independentes) foi confirmado no app real. Pendências: (1) decidir se a gaveta cobrir o painel em desktop é aceitável ou se a spec muda (BUG-01); (2) corrigir o `open` do Tooltip (BUG-02); (3) conferir a US-09 e o FR-017 (1280, 1000 e 767px) com os screenshots já existentes ou numa nova rodada; (4) o contraste de cores não foi verificado. Efeito colateral do gate: os subagentes criaram usuários `qa-*@example.com` e algumas notas no banco de desenvolvimento.
