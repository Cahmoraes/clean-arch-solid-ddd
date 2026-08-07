---
created_at: "2026-08-07T18:28:23-03:00"
updated_at: "2026-08-07T18:28:23-03:00"
---

# PRD: Ícones Semânticos em Telas Admin

## Visão Geral

As telas administrativas (`/admin/usuarios`, listagem de academias, revisão de check-ins) usam botões e badges com rótulos textuais longos ("Editar dados", "Mais ações") e indicadores de status pouco escaneáveis (dot colorido + texto). Para administradores que operam essas telas repetidamente ao longo do dia, isso adiciona ruído visual sem ganho de clareza. Este PRD formaliza a substituição desses elementos por ícones semânticos — mantendo texto onde ele já é essencial para a compreensão (papel do usuário, status) e acessibilidade completa (aria-label + tooltip) onde o texto é removido.

## Objetivos

- Reduzir a área ocupada pelos botões de ação nas telas admin, sem perder a identificação da ação.
- Padronizar o indicador de status (ícone + texto) entre `/admin/usuarios` e academias, hoje implementados de forma divergente.
- Manter 100% de conformidade de acessibilidade: nenhum botão ícone-só sem `aria-label` e tooltip visível.
- Critério mensurável: todo `Button size="icon"` introduzido por esta entrega possui `aria-label` E `Tooltip` — verificável por teste de componente.

## Histórias de Usuário

- **US-01** — Como administrador, eu quero que os botões "Editar dados" e "Mais ações" apareçam como ícones compactos com tooltip para que eu identifique a ação rapidamente sem poluição visual na tela.
- **US-02** — Como administrador, eu quero que o badge de status do usuário (Ativo/Inativo/Bloqueado) mostre um ícone semântico junto ao texto para que eu reconheça o estado à primeira vista, sem depender só da cor do dot.
- **US-03** — Como administrador, eu quero que o badge de status de academias (Disponível/Desativada) siga o mesmo padrão visual usado em usuários para que eu tenha uma leitura consistente entre as telas do admin.
- **US-04** — Como administrador revisando check-ins, eu quero que os botões "Aprovar" e "Rejeitar" sejam ícones compactos com tooltip para que eu agilize a revisão sem perder clareza sobre qual ação estou tomando.
- **US-05** — Como usuário de leitor de tela ou navegação por teclado, eu quero que todo botão ícone-só tenha rótulo acessível e tooltip visível também no foco (não só no hover do mouse) para que eu não perca acesso a nenhuma funcionalidade ao usar ícones em vez de texto.

## Funcionalidades Principais

**1. Botões de ação ícone-só com tooltip (usuários e check-ins)**
O que faz: substitui os botões textuais "Editar dados", "Mais ações" (gatilho) e "Aprovar"/"Rejeitar" por botões ícone-só com tooltip visual e `aria-label`. Por que importa: reduz verbosidade sem sacrificar identificação da ação (US-01, US-04, US-05).

- **FR-001** — O botão "Editar dados" no painel de detalhe de usuário é renderizado como botão ícone-só (ícone de edição), com rótulo acessível e tooltip mostrando o texto "Editar dados" no hover e no foco de teclado.
- **FR-002** — O botão-gatilho "Mais ações" é renderizado como botão ícone-só (ícone de menu/kebab), com rótulo acessível e tooltip "Mais ações"; os itens internos do menu que ele abre permanecem em texto, sem alteração.
- **FR-006** — Os botões "Aprovar" e "Rejeitar" na revisão de check-ins são renderizados como botões ícone-só, cada um com rótulo acessível e tooltip mostrando seu respectivo texto, usando o mesmo componente de botão compartilhado das demais telas admin (em vez do elemento nativo usado hoje).
- **FR-008** — Nenhum botão ícone-só introduzido por esta entrega é publicado sem rótulo acessível E tooltip associados simultaneamente — um sem o outro é considerado incompleto.

**2. Badge de status com ícone semântico (usuários e academias)**
O que faz: substitui o indicador de dot colorido por um ícone semântico, mantendo o texto do status visível. Por que importa: melhora o reconhecimento rápido do estado e unifica o padrão visual entre usuários e academias (US-02, US-03).

- **FR-003** — O badge de status de usuário mostra um ícone semântico distinto para cada estado (Ativo, Inativo, Bloqueado), sempre acompanhado do texto do status — nunca ícone sozinho.
- **FR-004** — O mesmo componente de badge de status aceita e exibe corretamente o vocabulário de status de academias (Disponível, Desativada), com ícone + texto, sem exigir um componente separado.
- **FR-005** — O badge de status na listagem de academias passa a usar o componente de badge compartilhado (em vez de um markup próprio daquela tela), sem alterar o comportamento funcional da listagem.

**3. Consistência e fora de escopo explícito**
O que faz: define o que NÃO muda nesta entrega, para não gerar expectativa de escopo maior. Por que importa: evita retrabalho em elementos que já estão no formato-alvo ou que foram deliberadamente mantidos (US-01–US-04, contexto de escopo).

- **FR-007** — O badge de papel (Membro/Admin) e os itens internos do menu "Mais ações" não sofrem alteração visual nesta entrega — continuam em texto.

## Experiência do Usuário

Fluxo principal: um administrador navega por `/admin/usuarios`, a listagem de academias ou a fila de revisão de check-ins e reconhece cada ação/estado pelo ícone, confirmando via tooltip (mouse) ou navegação por teclado + leitor de tela (aria-label) quando precisar de confirmação textual. Nenhum fluxo de navegação ou de dados muda — apenas a representação visual do botão/badge.

Decisões visuais (validadas com o usuário via mockup interativo, artefato curado em `../specs/mockups/admin-semantic-icons-visual.md`):
- Ícone de editar = lápis; ícone de "mais ações" = três pontos horizontais (kebab); ícone de aprovar/rejeitar = check/x.
- Ícones de status: círculo com check (ativo/disponível), círculo cortado (inativo/desativada), triângulo de alerta (bloqueado).
- Badge de papel (Membro/Admin) permanece só texto — descartado ícone-só nessa badge por risco de ambiguidade semântica.

Requisitos de acessibilidade (não negociáveis, cobertos por FR-001, FR-002, FR-006, FR-008): todo botão ícone-só precisa de `aria-label` E tooltip visível também no foco de teclado — não apenas no hover do mouse.

## Restrições Técnicas de Alto Nível

Carregadas das Características Arquiteturais da spec de design:

- **Acessibilidade** — todo botão ícone-só deve ter rótulo acessível e tooltip; critério mensurável: cobertura de teste de componente para presença de ambos.
- **Consistência** — o mapeamento de ícone por status/ação deve ser a única fonte usada pelos componentes afetados; critério mensurável: nenhum componente define seu próprio literal de ícone para os mesmos conceitos.
- **Manutenibilidade** — a listagem de academias não mantém markup de badge próprio após a mudança; critério mensurável: badge de academia usa o mesmo componente de badge dos usuários.

Sem integrações externas novas, sem mudança de backend/API, sem impacto de performance mensurável (mudança puramente de apresentação).

## Fora de Escopo

- Mudanças de backend ou de contrato de API.
- Badge de papel (Membro/Admin) — permanece em texto.
- Itens internos do menu "Mais ações" — permanecem em texto.
- Botão de editar de academias — já é ícone-só hoje, nenhuma mudança necessária.
- Chip de status de check-ins (`check-in-item.tsx`) — já é ícone-só sem texto hoje, nenhuma mudança necessária.
- Outras telas admin não mencionadas (analytics, notificações, etc.) — fora desta entrega.
