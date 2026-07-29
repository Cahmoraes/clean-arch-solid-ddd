---
created_at: "2026-07-29T12:14:30-03:00"
updated_at: "2026-07-29T12:14:30-03:00"
---

# Botão voltar na edição de academia

## Visão Geral

Adicionar um link de navegação "Voltar para a busca" no topo da tela de edição de academia (`/admin/academias/[id]/editar`), replicando o padrão visual já existente na tela de detalhes (`/academias/[id]`). O link leva o usuário de volta à lista de academias (`/academias`).

Além disso, o botão "Cancelar" no final do formulário de edição será renomeado para "Descartar alterações" para deixar explícita a diferença semântica entre sair da tela (voltar) e desfazer as mudanças em andamento (descartar).

## Características Arquiteturais

| Característica | Por quê | Critério mensurável |
|---|---|---|
| Usabilidade | O usuário precisa sair da edição sem se sentir preso ao formulário | O link deve ser visível acima do dobra e acessível via teclado |
| Consistência visual | Reutilizar padrão da tela de detalhes reduz carga cognitiva | Mesmo estilo, ícone e posição do link de voltar da tela de detalhes |

**Consideradas, não priorizadas:** performance (sem impacto mensurável), segurança (sem mudança de permissões).

## Especificação Visual

**Artefato curado:** `specs/mockups/academia-botao-voltar-visual.md`

O link de voltar fica no topo da tela, acima do título "Editar academia", alinhado à esquerda, usando o mesmo padrão da tela de detalhes: ícone `ArrowLeft` + texto "Voltar para a busca" em tom muted, sem estilo de botão arredondado.

## Decisões Arquiteturais

### D1. Link no topo apontando para `/academias`

- **Contexto:** A edição de academia é acessada a partir do detalhe ou da lista. O usuário solicitou um botão para voltar "para a lista de academias que é a tela anterior".
- **Decisão:** O link leva para `/academias`, mesma rota do link de voltar da tela de detalhes.
- **Justificativa técnica:** Reutiliza padrão de navegação já existente (`next/link` + `ArrowLeft`), sem lógica condicional de rota.
- **Justificativa de negócio:** Consistência com a tela de detalhes; o usuário reconhece o padrão.
- **Trade-offs aceitos:** Se o usuário chegou ao formulário vindo do detalhe, voltar à lista exige um clique adicional para retornar ao detalhe.

### D2. Renomear "Cancelar" para "Descartar alterações"

- **Contexto:** Com um link "Voltar" no topo, o botão "Cancelar" no final do formulário passa a ter um significado menos claro.
- **Decisão:** Renomear para "Descartar alterações".
- **Justificativa técnica:** Alteração apenas de string de UI, sem impacto em lógica ou comportamento.
- **Justificativa de negócio:** Clareza semântica: "Voltar" sai da tela, "Descartar alterações" desfaz as mudanças.
- **Trade-offs aceitos:** Pequena mudança em testes existentes que verificam o texto do botão.

## Riscos

| Risco | Impacto (1-3) | Probabilidade (1-3) | Score | Mitigação |
|---|---|---|---|---|
| Quebra de testes que assertam o texto "Cancelar" | 2 | 2 | 4 🟡 | Atualizar testes na mesma task |
| Inconsistência visual se tokens da tela de detalhes mudarem | 1 | 1 | 1 🟢 | Replicar classes exatas do link existente |

## Estrutura de Componentes / Mudanças

**Arquivo tocado:**
- `apps/frontend/src/app/(authenticated)/admin/academias/[id]/editar/page.tsx`

**Mudanças:**
1. Importar `Link` do Next.js e `ArrowLeft` do lucide-react.
2. Inserir o link de voltar acima do título "Editar academia", com `data-testid="gym-edit-back-link"`.
3. Alterar o texto do botão de cancelamento de "Cancelar" para "Descartar alterações".

## Testes

- Verificar renderização do link "Voltar para a busca" com `href="/academias"`.
- Verificar que o botão inferior renderiza "Descartar alterações".
- Verificar que o link usa `next/link` (navegação client-side).
