---
created_at: "2026-06-03T11:30:55-03:00"
updated_at: "2026-06-03T11:30:55-03:00"
---

# PRD: Content Width Standardization

## Visão Geral

As telas autenticadas do frontend VOLT não compartilham uma largura de conteúdo consistente. Cada página redefine sua própria `max-w` e a centraliza dentro do frame do shell, fazendo com que a borda esquerda do conteúdo se desloque até 242px ao navegar entre telas, com larguras variando sem sistema (672 → 1172px). Isso gera uma experiência de navegação instável — o conteúdo "dança" horizontalmente — e dificulta a manutenção (largura espalhada em ~11 arquivos).

Este PRD formaliza a padronização: um sistema de 3 tiers de largura, todos alinhados à esquerda do frame do shell, aplicados via um componente único `PageContainer`. O público é todo usuário autenticado (membro e admin) e a equipe de frontend que mantém as telas.

## Objetivos

- **Eliminar o deslocamento da borda esquerda:** a borda esquerda do título (`<h1>`) deve ser idêntica (±2px) em 100% das telas autenticadas, no mesmo viewport.
- **Estabelecer um sistema de larguras testável:** toda largura de página derivada de 3 tiers definidos (`wide` ~1100px, `default` 896px, `narrow` 672px), sem `max-w-*` ad-hoc no wrapper raiz das páginas.
- **Centralizar a definição de largura:** 100% das páginas autenticadas usam `PageContainer`, eliminando padding horizontal duplicado.
- **Preservar a legibilidade por tipo de tela:** formulários ≤ 672px, listas/detalhe ≤ 896px, grids data-dense até ~1100px.
- **Zero regressão funcional:** comportamento, dados e semântica das telas inalterados; gate do projeto (lint + tsc + test + build) 100%.

## Histórias de Usuário

**HU-01 — Navegação visualmente estável**
Como usuário autenticado, eu quero que o conteúdo comece sempre na mesma posição horizontal ao navegar entre telas, para que a interface não "salte" e a navegação pareça coesa.

**HU-02 — Leitura confortável em listas**
Como usuário autenticado, eu quero que listas de coluna única (histórico de check-ins, validação admin) tenham largura moderada, para que eu consiga varrer cada linha sem que os elementos fiquem distantes demais entre si.

**HU-03 — Formulários focados**
Como usuário autenticado, eu quero que telas de formulário (cadastrar academia, editar perfil, trocar senha) tenham largura reduzida, para que a linha de leitura e preenchimento seja confortável.

**HU-04 — Telas data-dense aproveitam o espaço**
Como usuário autenticado, eu quero que telas com grade ou múltiplas colunas (dashboard, academias, gestão de usuários) usem a largura cheia disponível, para que eu veja mais informação sem rolar desnecessariamente.

**HU-05 — Manutenção sem drift (equipe)**
Como desenvolvedor de frontend, eu quero um único ponto de definição de largura de página, para que novas telas herdem o padrão automaticamente e não reintroduzam o problema de inconsistência.

## Funcionalidades Principais

### F-01 — Componente `PageContainer`

Componente de layout que envolve o conteúdo de uma página autenticada e aplica a largura do tier e o alinhamento à esquerda de forma consistente.

- **RF-001:** O sistema deve prover um componente `PageContainer` que aceita uma prop de largura com os valores `wide`, `default` e `narrow`.
- **RF-002:** Quando nenhuma largura é informada, `PageContainer` deve usar `default` (896px).
- **RF-003:** `PageContainer` deve alinhar o conteúdo à esquerda do frame do shell — nunca centralizar horizontalmente (sem `mx-auto`).
- **RF-004:** `PageContainer` não deve re-aplicar padding horizontal — o padding horizontal é responsabilidade exclusiva do shell autenticado.
- **RF-005:** `PageContainer` deve aplicar um ritmo de espaçamento vertical padronizado entre as páginas.
- **RF-006:** `PageContainer` deve aceitar e repassar uma `className` para o layout interno da página (ex: disposição em coluna com espaçamento).

### F-02 — Sistema de tiers de largura

Três níveis de largura, todos alinhados à esquerda.

- **RF-007:** O tier `wide` deve preencher a largura útil do frame do shell (~1100px), sem limite de largura adicional.
- **RF-008:** O tier `default` deve limitar a largura do conteúdo a 896px.
- **RF-009:** O tier `narrow` deve limitar a largura do conteúdo a 672px.
- **RF-010:** A borda esquerda do conteúdo deve ser idêntica entre os três tiers — eles diferem apenas no limite à direita.

### F-03 — Migração das telas autenticadas

Aplicar `PageContainer` e o tier correto a cada tela autenticada, removendo os wrappers ad-hoc.

- **RF-011:** As telas Dashboard, Academias (listagem) e Admin Usuários devem usar o tier `wide`.
- **RF-012:** As telas Check-ins (membro), Admin Check-ins, Perfil, Assinatura, Detalhe de academia e Perfil público devem usar o tier `default`.
- **RF-013:** As telas Cadastrar academia, Editar perfil e Trocar senha devem usar o tier `narrow`.
- **RF-014:** A migração deve remover de cada página migrada o `mx-auto`, o `max-w-*` ad-hoc do wrapper raiz e o padding horizontal duplicado (`px-*`).
- **RF-015:** As telas públicas de autenticação (login, cadastro, recuperar senha, redefinir senha) não devem ser alteradas.
- **RF-016:** Após a migração, nenhuma página autenticada deve definir `max-w-*` no seu wrapper de conteúdo raiz fora do `PageContainer`.

## Experiência do Usuário

- **Jornada:** ao transitar entre quaisquer telas autenticadas (ex: Dashboard → Cadastrar academia → Check-ins), a borda esquerda do conteúdo permanece fixa; apenas o limite à direita muda conforme o tier, sem saltos perceptíveis.
- **Telas wide:** conteúdo ocupa quase todo o frame; grids e layouts master-detail respiram.
- **Telas default:** conteúdo limitado a 896px, alinhado à esquerda — espaço vazio fica à direita, não centralizado.
- **Telas narrow:** formulários compactos à esquerda; o espaço à direita permanece vazio por design.
- **Responsividade:** em mobile, o padding do shell (`px-[18px]` abaixo de 560px) governa as margens; os tiers naturalmente cedem à largura total da viewport.
- **Acessibilidade:** nenhuma mudança de semântica, ordem de foco ou ARIA — apenas largura/alinhamento visual.

## Restrições Técnicas de Alto Nível

Características arquiteturais priorizadas (do design spec, validadas em brainstorming):

- **Consistência visual (prioridade 1):** borda esquerda do `<h1>` idêntica (±2px) em 100% das telas autenticadas no mesmo viewport.
- **Manutenibilidade (prioridade 2):** toda largura de página passa por `PageContainer`; zero `max-w-*` ad-hoc no wrapper raiz das páginas.
- **Legibilidade/UX (prioridade 3):** forms ≤ 672px; listas ≤ 896px; grids até ~1100px.

Demais restrições:
- Mudança puramente de frontend/CSS — sem novos endpoints, sem alteração de API ou backend.
- Sem novas dependências.
- Deve respeitar o design system VOLT existente (tokens, shell, padding) sem alterá-lo.

## Fora de Escopo

- Telas públicas de autenticação (`public-shell` com card centralizado) — padrão deliberado, não alterado.
- Mudanças de cores, tipografia ou espaçamento vertical interno dos cards.
- Redesign do conteúdo ou do layout interno das telas (apenas a largura/alinhamento do contêiner muda).
- Alteração do frame do shell autenticado (`max-w-[1180px]`, `px-8`).
- Novos endpoints, mudanças de API ou de backend.
- Persistência de preferência de largura por usuário ou tiers configuráveis.
