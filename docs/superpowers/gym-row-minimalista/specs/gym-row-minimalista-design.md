# Linha de Academia Minimalista: Design

- **Norte visual:** `mockups/gym-row-minimalista-visual.md`

## Visão Geral

A linha da lista de academias (`GymRow`, `apps/frontend/src/features/gyms/components/gym-row.tsx`) tem quatro elementos à direita: telefone, pílula "Check-in", botão editar (admin) e selo de texto de status no canto superior. O usuário achou a área verbosa e quer algo minimalista.

Resultado: a linha mostra imagem, nome, descrição e endereço à esquerda, e à direita só dois ícones de 32px (Check-in e, para admin, editar). O status vira um ponto colorido antes do nome. O sucesso se observa na lista de `/academias`: menos ruído, nenhuma ação perdida.

**Correções de entendimento:** o número à direita é o **telefone** (`gym.phone`, ou "Ver detalhes" sem telefone), não um ID. O Check-in atual é um `<span>` dentro do link da linha, sem ação própria: leva ao detalhe, como a linha inteira.

## Escopo

**Dentro:**
- Redesenho do `GymRow` (visão em linhas) e de seus testes.

**Fora de escopo:**
- `GymCard` (visão em grid) fica como está: o usuário escolheu mudar só o `GymRow`. As duas visões passam a divergir na apresentação do status.
- Telefone sai só da linha; continua no card e no detalhe da academia.
- Nenhuma mudança de backend, API, tema, fonte VT323 ou chanfros.
- Botão de status/desativação (feature `gym-deactivation`): não aparece na linha hoje e não entra.

## Arquitetura e Fluxo

Mudança de apresentação em um único componente. `GymResults` continua passando `gym` e `adminEditHref` ao `GymRow`; a assinatura de `GymRowProps` não muda. O `resolveGymStatusBadge` continua fonte do tom e do rótulo do status.

## Componentes

**`GymRow`** (alterado). Renderiza:
- Link da linha para `/academias/{id}` com imagem, ponto de status + nome, descrição e endereço.
- Grupo de ações à direita, fora do link da linha (irmãos, nunca aninhados, como já é o editar): Check-in (link para `/academias/{id}`) e editar (link para `adminEditHref`, só admin).
- Oculta: como o tom vira cor do ponto e como o grupo de ações reserva espaço sem sobrepor texto.

Removidos do `GymRow`: uso do `StatusBadge` (selo de texto), telefone / "Ver detalhes", pílula "Check-in".

## Fronteiras e Contratos

**Significados:** status "Disponível" = `success` (verde); "Desativada" = `danger` (vermelho), só quando `adminEditHref` e `gym.status === "deactivated"`, como hoje em `resolveGymStatusBadge`. O rótulo do status nunca some: vai em `aria-label` e `title` do ponto.

## Especificação Visual

**Artefato curado:** `mockups/gym-row-minimalista-visual.md`

**Fonte de design original:** screenshot da lista atual fornecido pelo usuário e mockup da variante A no companion.

**Decisões visuais (norte, não pixel-final):**
- Ponto de status 8px antes do nome, cor por tom (`bg-success` / `bg-destructive`).
- Ações à direita: dois botões-ícone de 32px, gap 8px; Check-in em destaque (borda e ícone `accent`), editar neutro (como hoje).
- Sem telefone, sem selo de texto, sem pílula.
- Tema, fonte e tokens atuais mantidos.

## Decisões Arquiteturais

### D1. Vamos alterar só o `GymRow`, sem componente compartilhado com o `GymCard`

- **Contexto:** alternativa considerada: extrair ponto de status e ações para uma peça usada nas duas visões (rejeitada: muda o card sem pedido e aumenta o diff).
- **Decisão:** mudança localizada em `gym-row.tsx`.
- **Justificativa:** o pedido é sobre a lista em linhas; menor risco de regressão no grid.
- **Consequências:** grid e lista divergem no status (selo de texto vs ponto). Reversível por extração posterior.
- **Conformidade:** testes do `GymCard` seguem passando sem alteração.

### D2. Check-in e editar são links irmãos com ícone, `aria-label` e tooltip

- **Contexto:** regra fechada em `admin-semantic-icons`: botão só de ícone exige `aria-label` e `Tooltip` (foco de teclado incluso). Um `<a>` dentro do link da linha é HTML inválido.
- **Decisão:** ambos fora do link da linha, posicionados à direita, com `aria-label` ("Check-in em {título}", "Editar academia {título}") e `Tooltip` de `components/ui/tooltip.tsx`.
- **Justificativa:** acessibilidade e alvo de toque de 32px (acima do mínimo de 24px do WCAG 2.2).
- **Consequências:** o Check-in passa a ter alvo próprio, com o mesmo destino da linha (comportamento inalterado).
- **Conformidade:** testes verificam `aria-label`, `href` e tooltip de cada ícone.

**Decisões locais (reversíveis):**

| Decisão | Padrão escolhido | Gatilho para rever |
|---|---|---|
| Ícone do Check-in | ícone pixel-art de `pixel-icons.tsx` a escolher no plano (candidato: `CheckCircle`) | ícone não legível a 16px |
| Ponto de status | `<span role="img">` com `aria-label` e `title` | tooltip visual insuficiente |
| Espaço reservado à direita | padding do link da linha calculado pelo nº de ícones | sobreposição com texto longo |

## Riscos

| Risco | Onde | Impacto (1-3) | Probabilidade (1-3) | Score | Mitigação |
|---|---|---|---|---|---|
| Ícones à direita sobrepõem nome/descrição longos | `GymRow` | 2 | 2 | 4 🟡 | Reservar padding e teste com título longo |
| Perda de informação: usuário não vê "Disponível" em texto | `GymRow` | 1 | 2 | 2 🟢 | `aria-label` e `title` no ponto |

## Testes

Runner: Vitest + Testing Library (`pnpm test -- --run` em `apps/frontend`), nomes em PT-BR com `test`. Reescrever `gym-row.test.tsx`:
- Sem telefone nem "Ver detalhes" na linha.
- Sem selo de texto visível; ponto com `aria-label` "Disponível" (e "Desativada" com admin e status desativado; sem admin, sempre "Disponível").
- Check-in: `aria-label`, `href` do detalhe, tooltip.
- Editar: presente só com `adminEditHref`, `href` correto, `aria-label`.
- Título longo não sobrepõe o grupo de ações.
- Atualizar `gym-results.test.tsx` onde assertar "Disponível" ou telefone na visão em linhas.
- `e2e/accessibility.spec.ts` (axe em `/academias`) deve continuar passando.
