---
created_at: "2026-07-28T08:42:49-03:00"
updated_at: "2026-07-28T08:42:49-03:00"
---

# Toggle de Visualização (Grid/Lista) em /academias

## Visão Geral

Hoje `/academias` renderiza resultados só como grid de cards (`GymCard`). Esta feature
adiciona uma segunda visualização — lista compacta, um item por linha — com um controle
na própria barra de busca para alternar entre as duas, e persiste a escolha do usuário
por dispositivo (sobrevive a reload e a "voltar amanhã").

## Características Arquiteturais

**Priorizadas (top 2):**

| Característica | Por quê | Critério mensurável |
|---|---|---|
| Consistência/Usabilidade | Reaproveitar padrões já validados (`SegmentedControl`, cookie SSR-safe) reduz risco de UX nova | Zero flash grid→lista perceptível no primeiro paint (coberto por teste de hidratação) |
| Maintainability | Não introduzir superfície nova de backend para uma preferência de UI | 0 novos endpoints/migrations no PR |

**Consideradas, não priorizadas:** performance (volume de academias já paginado hoje, sem
gargalo novo); scalability multi-dispositivo (não pedido — ver D1).

## Componentes Lógicos

| Componente | Responsabilidade | Depende de | Depende dele |
|---|---|---|---|
| Ler Preferência de Visualização | Lê o cookie no servidor e produz o valor inicial (`grid`\|`list`) para hidratação | util de leitura de cookie | árvore client (props iniciais) |
| Alternar Preferência de Visualização | Mantém o valor atual em memória (Zustand) e grava o cookie a cada mudança | util de escrita de cookie | Controle de Toggle; Selecionar Layout dos Resultados |
| Renderizar Controle de Toggle | Exibe o `SegmentedControl` com as duas opções e chama a ação de alternância na interação | Alternar Preferência de Visualização; `SegmentedControl` existente | — |
| Renderizar Linha da Academia | Renderiza uma academia como item compacto de linha única (thumbnail pequena + nome + localização) | dado da academia | Selecionar Layout dos Resultados |
| Selecionar Layout dos Resultados | Lê a visualização atual e escolhe entre o grid existente (`GymCard`) e a lista nova (`Renderizar Linha da Academia`) | Alternar Preferência de Visualização (leitura); Renderizar Linha da Academia; grid existente | — |

**Acoplamento temporal:** "Ler Preferência de Visualização" (servidor) executa antes de
"Alternar Preferência de Visualização" (client) — o valor lido no servidor vira prop
inicial que hidrata o store, eliminando flash.

## Estrutura de Arquivos e Fluxo de Dados

```
src/lib/ui-state/
  gym-view-cookie.ts        (novo) — read/write do cookie "gym-view" (grid|list, 1 ano),
                              mesmo shape de sidebar-collapse-cookie.ts
  gym-view-store.ts         (novo) — store Zustand { view, setView }, setView atualiza
                              estado + grava cookie, mesmo shape de sidebar-collapse-store.ts

apps/frontend/src/components/ui/
  search-bar.tsx            (editado) — adiciona instância de SegmentedControl ligada
                              a gym-view-store

apps/frontend/src/features/gyms/components/
  gym-row.tsx               (novo) — item de linha compacto (thumbnail pequena + nome +
                              localização)
  gym-results.tsx           (editado) — lê `view` do store, escolhe entre GymCard (grid,
                              já existe) e GymRow (lista, novo)
```

**Fluxo (caminho feliz):**
1. Requisição em `/academias` → leitura do cookie `gym-view` no servidor → default `grid`
   se ausente.
2. Valor vira `initialView`, passado como prop até o boundary client que inicializa
   `gym-view-store` — sem flash.
3. Clique no `SegmentedControl` → `setView('list')` → store atualiza e grava o cookie na
   mesma ação.
4. `GymResults` relê `view` e troca o mapeamento de `GymCard` para `GymRow`.
5. Reload / dia seguinte: passo 1 se repete, cookie já diz `list`, grid nunca aparece.

## Conteúdo da Linha (Visualização em Lista)

`GymRow` mostra apenas o essencial: thumbnail pequena + nome + localização — sem
descrição completa, sem CTA visível na linha (mantém-se acessível via clique na linha
inteira, igual ao comportamento de navegação já existente no card). Escolhido para
maximizar o número de academias visíveis por tela, o motivo declarado do pedido, sem
perder o reconhecimento visual rápido que o grid já oferece. Reaproveita o padrão de
linha compacta já validado por `CheckInItem` neste projeto.

## Decisões Arquiteturais

### D1. Cookie SSR-safe em vez de localStorage ou backend por usuário

- **Contexto:** a preferência precisa sobreviver a reload e a "voltar amanhã", não a
  troca de dispositivo.
- **Decisão:** cookie SSR-safe, mesmo padrão de `sidebar-collapse-cookie.ts`, 1 ano de
  expiração.
- **Justificativa técnica:** leitura no servidor elimina flash; não exige sessão
  autenticada nem nova tabela.
- **Justificativa de negócio:** menor custo de implementação/manutenção para uma
  preferência sem requisito multi-dispositivo.
- **Trade-offs aceitos:** a preferência é por navegador/dispositivo, não por conta —
  trocar de dispositivo mostra o default de novo.

### D2. Store Zustand global em vez de Context Provider escopado à feature

- **Contexto:** o estado é lido (hidratação SSR) e escrito (toggle) por dois pontos não
  pai-filho diretos (`SearchBar` e `GymResults`).
- **Decisão:** novo store `gym-view-store.ts`, espelhando 1:1 `sidebar-collapse-store.ts`.
- **Justificativa técnica:** reaproveita mecanismo já testado no projeto para
  exatamente essa classe de problema (preferência de UI persistida, SSR-safe).
- **Justificativa de negócio:** menos código novo para revisar/manter; consistência com
  convenção já conhecida no time.
- **Trade-offs aceitos:** o estado fica num store global mesmo consumido só por uma
  página — aceito porque um Context dedicado introduziria um segundo estilo concorrente
  de state management persistido, para a mesma classe de problema, sem ganho de
  característica arquitetural.

## Riscos

| Risco | Impacto | Prob | Score | Mitigação |
|---|---|---|---|---|
| Flash de grid antes do cookie aplicar (regressão de SSR) | 2 | 1 | 2 🟢 | Reaproveitar leitura server-side já testada do sidebar; cobrir com teste de hidratação |
| `GymRow` diverge visualmente do `CheckInItem` que a inspira | 1 | 2 | 2 🟢 | Revisão de código compara lado a lado com `CheckInItem` |

## Nota de Escopo

Recall de memória apontou a feature anterior `dashboard-inicio` como possível ponto de
atrito. Não há sobreposição de arquivo confirmada com o escopo desta feature (que toca
só `SearchBar`, `GymResults`, `GymCard`-adjacentes e o novo par cookie/store). **Fora de
escopo, sem ação nesta spec** — se o planning encontrar overlap real de arquivo, tratar
como achado novo, não bloqueio aqui.

## Testes

- `gym-view-cookie.test.ts` — read/write do cookie, espelhando `sidebar-collapse-cookie.test.ts`.
- `gym-view-store.test.ts` — estado inicial, `setView`, persistência via cookie,
  espelhando `sidebar-collapse-store.test.ts`.
- `gym-row.test.tsx` — renderização com thumbnail/nome/localização.
- `gym-results.test.tsx` (estendido) — alterna corretamente entre `GymCard` e `GymRow`
  conforme `view`.
- Teste de hidratação/SSR: cookie `list` pré-existente não produz flash de grid no
  primeiro paint.

## Complexidade

Checkpoint 1 (pré-design): `medium`, confiança alta. Checkpoint 2 (pós-design, escopo
concreto): `medium`, confirmado, sem escalonamento nem de-escalonamento.
