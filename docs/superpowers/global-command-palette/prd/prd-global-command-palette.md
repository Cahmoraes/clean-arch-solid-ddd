---
created_at: "2026-06-02T09:28:26-03:00"
updated_at: "2026-06-02T09:28:26-03:00"
---

# PRD: Global Command Palette

## Visão Geral

Usuários autenticados da plataforma perdem tempo navegando pelo menu lateral para encontrar páginas ou registros específicos. O Command Palette resolve esse problema oferecendo um único ponto de entrada — acionado por `⌘K` / `Ctrl+K` ou clique no campo de busca do header — que unifica navegação entre páginas e busca de registros (academias e usuários) em um modal centralizado, acessível de qualquer ponto do app.

O campo de busca no header já existe e exibe o hint `⌘K`, mas não tem funcionalidade. Esta feature conecta esse componente existente a um Command Palette real.

---

## Objetivos

- Reduzir o número de cliques necessários para navegar entre páginas de 2–3 para 1 (abrir palette + selecionar item).
- Permitir encontrar um registro específico (academia ou usuário) sem precisar navegar à página correspondente e digitar uma busca manualmente.
- O resultado de navegação deve aparecer em < 50 ms após abertura do palette (estático).
- O resultado de busca de registros deve aparecer em < 500 ms após o usuário parar de digitar (debounce 300 ms).
- Funcionar 100% via teclado sem necessidade de mouse.

---

## Histórias de Usuário

**US-01 — Navegação rápida pelo app**
Como usuário autenticado, eu quero abrir um palette de busca com `⌘K` ou clicando no campo do header para que eu possa navegar para qualquer página do app sem usar o menu lateral.

**US-02 — Busca de academia**
Como usuário autenticado, eu quero digitar o nome de uma academia no palette para que eu seja direcionado à lista de academias com aquela busca pré-preenchida.

**US-03 — Busca de usuário (admin)**
Como administrador, eu quero digitar o nome ou e-mail de um usuário no palette para que eu possa acessar o painel de detalhes daquele usuário diretamente.

**US-04 — Acessibilidade total via teclado**
Como usuário que prefere teclado, eu quero navegar entre os resultados com as setas, selecionar com Enter e fechar com Esc para que eu nunca precise do mouse para usar o palette.

**US-05 — Resultados por perfil**
Como membro regular (não admin), eu quero que o palette não exiba a seção de usuários para que eu não veja opções irrelevantes ao meu perfil.

---

## Funcionalidades Principais

### F-01 — Abertura e fechamento do palette

O palette é um modal centralizado que abre sobre qualquer página autenticada.

**Requisitos funcionais:**

| ID | Requisito |
|---|---|
| RF-001 | O palette abre ao pressionar `⌘K` (macOS) ou `Ctrl+K` (Windows/Linux) em qualquer página autenticada. |
| RF-002 | O palette abre ao clicar no campo de busca do header. |
| RF-003 | O palette fecha ao pressionar `Esc`. |
| RF-004 | O palette fecha ao clicar fora do modal (backdrop). |
| RF-005 | O foco retorna ao elemento anterior após o fechamento do palette. |

---

### F-02 — Grupo de navegação (estático)

Exibe as páginas do app acessíveis ao usuário como itens de resultado imediatamente ao abrir o palette, sem nenhuma digitação.

**Requisitos funcionais:**

| ID | Requisito |
|---|---|
| RF-006 | Ao abrir o palette com a query vazia, o grupo "Navegação" é exibido com as páginas disponíveis para o role do usuário. |
| RF-007 | Itens de navegação para páginas admin (`/admin/usuarios`, `/admin/check-ins`) são exibidos apenas para usuários com role `ADMIN`. |
| RF-008 | Ao selecionar um item de navegação, o app navega para a página correspondente e o palette fecha. |
| RF-009 | Os itens de navegação aparecem em menos de 50 ms após a abertura do palette (não dependem de API). |

---

### F-03 — Grupo de academias (busca server-side)

Exibe academias cujo nome corresponde à query digitada.

**Requisitos funcionais:**

| ID | Requisito |
|---|---|
| RF-010 | O grupo "Academias" é exibido para todos os usuários autenticados. |
| RF-011 | A busca de academias só é disparada quando a query tem 2 ou mais caracteres. |
| RF-012 | A busca é disparada com debounce de 300 ms após a última tecla pressionada. |
| RF-013 | Durante o carregamento, o grupo exibe um estado de skeleton/loading. |
| RF-014 | Se nenhuma academia for encontrada, o grupo exibe uma mensagem de resultado vazio. |
| RF-015 | Ao selecionar uma academia, o app navega para `/academias` com a busca pré-preenchida com o nome da academia selecionada, e o palette fecha. |

---

### F-04 — Grupo de usuários (busca server-side, admin only)

Exibe usuários cujo nome ou e-mail corresponde à query digitada.

**Requisitos funcionais:**

| ID | Requisito |
|---|---|
| RF-016 | O grupo "Usuários" é exibido apenas para usuários com role `ADMIN`. |
| RF-017 | A busca de usuários só é disparada quando a query tem 2 ou mais caracteres. |
| RF-018 | A busca é disparada com debounce de 300 ms após a última tecla pressionada. |
| RF-019 | Durante o carregamento, o grupo exibe um estado de skeleton/loading. |
| RF-020 | Se nenhum usuário for encontrado, o grupo exibe uma mensagem de resultado vazio. |
| RF-021 | Ao selecionar um usuário, o app navega para `/admin/usuarios` com o painel de detalhe daquele usuário aberto, e o palette fecha. |

---

### F-05 — Keyboard navigation

O palette é completamente operável via teclado.

**Requisitos funcionais:**

| ID | Requisito |
|---|---|
| RF-022 | As teclas `↑` e `↓` movem o foco entre os itens de resultado. |
| RF-023 | A tecla `Enter` seleciona o item em foco e executa a ação correspondente. |
| RF-024 | A tecla `Esc` fecha o palette sem executar nenhuma ação. |
| RF-025 | O foco é capturado dentro do modal enquanto o palette estiver aberto (focus trap). |
| RF-026 | O componente expõe ARIA `role="combobox"` e `aria-activedescendant` para leitores de tela. |

---

## Experiência do Usuário

**Fluxo principal:**

1. Usuário pressiona `⌘K` ou clica no campo de busca do header.
2. Modal abre centralizado com backdrop escurecido; foco vai direto para o campo de input.
3. Grupo "Navegação" exibe imediatamente as páginas disponíveis (sem delay).
4. Usuário digita 2+ caracteres → após 300 ms, os grupos "Academias" e/ou "Usuários" exibem resultados da API.
5. Usuário navega com `↑↓` e pressiona `Enter` (ou clica) no resultado desejado.
6. App navega para o destino; palette fecha automaticamente.

**Comportamento visual:**
- Modal com backdrop semitransparente escuro sobre a página atual.
- Resultados agrupados por tipo com label de grupo ("Navegação", "Academias", "Usuários").
- Item em foco destacado com cor de superfície elevada.
- Skeleton/loading visível apenas nos grupos que dependem de API, enquanto navegação permanece disponível.

**Estado padrão (query vazia):** apenas o grupo "Navegação" é visível. Nenhum skeleton nem resultado de busca.

**Mobile:** o campo de busca do header permanece visível; o palette abre por clique (sem atalho de teclado). O hint `⌘K` é ocultado em viewports sem teclado.

---

## Restrições Técnicas de Alto Nível

- Os endpoints `GET /gyms/search/{name}` e `GET /users?query=X` já existem no backend — nenhuma mudança de backend é necessária.
- O `SearchBar` existente no header deve ser reutilizado como trigger, sem substituição.
- O palette deve funcionar com o tema claro e o tema escuro já implementados no app.
- **Performance:** navegação estática < 50 ms; registros < 500 ms (debounce 300 ms + resposta de API).
- **Acessibilidade:** keyboard navigation completa; ARIA `combobox`; focus trap; compatível com leitores de tela.
- **Autorização:** a filtragem de resultados por role é uma camada de UX; a segurança real está nos endpoints do backend (já protegidos).

---

## Fora de Escopo

- Busca de check-ins pelo palette (fase futura).
- Busca de assinaturas pelo palette.
- Histórico de buscas persistido entre sessões.
- Ações inline no palette ("promover João a admin" sem sair do palette).
- Página de detalhe de academia (não existe; resultado navega para a lista com busca pré-preenchida).
- Criação de novos endpoints de busca no backend.
- Alterações no componente `SearchBar` além de adicionar `onClick`.
