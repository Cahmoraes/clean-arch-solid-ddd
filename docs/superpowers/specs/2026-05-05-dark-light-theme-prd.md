# PRD: Dark/Light Theme Toggle

**Data:** 2026-05-05
**Status:** Draft
**Spec de referência:** `docs/superpowers/specs/2026-05-05-dark-light-theme-design.md`

---

## Visão Geral

O frontend atualmente exibe apenas o tema claro, sem opção de personalização. Usuários que preferem ou necessitam de um modo escuro (por conforto visual, uso noturno ou sensibilidade à luz) não têm como adaptar a interface. Esta feature adiciona um toggle manual de tema dark/light acessível em todas as páginas da aplicação.

---

## Objetivos

- Permitir que qualquer usuário (autenticado ou não) alterne entre tema claro e escuro com um único clique
- Persistir a preferência de tema entre sessões do navegador sem necessidade de login
- Garantir que a troca de tema não cause flash visual (FOUC) no carregamento da página
- O toggle deve estar disponível em 100% das páginas da aplicação

---

## Histórias de Usuário

| ID | História |
|---|---|
| US-001 | Como **usuário autenticado**, eu quero ativar o modo escuro para que eu possa usar a aplicação confortavelmente à noite ou em ambientes com pouca luz. |
| US-002 | Como **visitante não autenticado** (nas páginas de login/cadastro), eu quero alternar o tema para que minha experiência seja consistente com minhas preferências visuais antes mesmo de fazer login. |
| US-003 | Como **qualquer usuário**, eu quero que minha preferência de tema seja lembrada ao retornar à aplicação para que eu não precise reconfigurar toda vez. |
| US-004 | Como **qualquer usuário**, eu quero que o tema seja aplicado imediatamente ao carregar a página para que não haja piscar de tela branca ao acessar no modo escuro. |

---

## Funcionalidades Principais

### F-001 — Toggle de Tema (FAB)

Um botão flutuante fixo no canto inferior direito da tela, disponível em todas as páginas, que alterna o tema entre `light` e `dark`.

**Requisitos funcionais:**

| ID | Requisito |
|---|---|
| RF-001 | O toggle deve estar visível em todas as páginas da aplicação (autenticadas e públicas). |
| RF-002 | O toggle deve exibir ícone 🌙 quando o tema ativo for light, e ☀️ quando o tema ativo for dark. |
| RF-003 | Ao clicar no toggle, o tema deve alternar imediatamente entre `light` e `dark`. |
| RF-004 | O toggle deve possuir `aria-label` descritivo indicando a ação que será executada. |

### F-002 — Persistência de Tema

A preferência de tema do usuário é salva localmente no navegador e restaurada automaticamente em visitas futuras.

**Requisitos funcionais:**

| ID | Requisito |
|---|---|
| RF-005 | A preferência de tema deve ser persistida no `localStorage` do navegador. |
| RF-006 | Ao recarregar ou retornar à aplicação, o tema salvo deve ser restaurado automaticamente. |
| RF-007 | O tema padrão para novos usuários (sem preferência salva) deve ser `light`. |

### F-003 — Tema Dark (Paleta Cinza Escuro)

O tema escuro utiliza uma paleta monocromática de tons cinza escuro, aplicada globalmente a todos os componentes via variáveis CSS semânticas.

**Requisitos funcionais:**

| ID | Requisito |
|---|---|
| RF-008 | O tema dark deve ser aplicado globalmente a todos os componentes shadcn/ui e elementos da interface. |
| RF-009 | A transição de tema não deve causar flash visual (FOUC) ao carregar a página. |
| RF-010 | O tema dark deve manter contraste de texto adequado para leitura confortável. |

---

## Experiência do Usuário

**Fluxo principal:**
1. Usuário acessa qualquer página da aplicação
2. FAB circular aparece fixo no canto inferior direito
3. Usuário clica no FAB → tema alterna imediatamente
4. Em visitas futuras, tema preferido é restaurado automaticamente sem ação do usuário

**Acessibilidade:**
- Botão com `aria-label` dinâmico ("Ativar tema escuro" / "Ativar tema claro")
- Contraste adequado do FAB em ambos os temas
- Área de clique mínima de 40×40px

**Consistência:**
- O mesmo FAB aparece em páginas públicas (login, cadastro) e autenticadas
- Não há menus ou configurações adicionais — é um toggle simples de 2 estados

---

## Restrições Técnicas de Alto Nível

- A solução deve funcionar corretamente com Next.js App Router e renderização server-side (SSR)
- Não deve introduzir regressões nos componentes shadcn/ui existentes
- A preferência de tema é local ao navegador — não requer autenticação nem backend

---

## Fora de Escopo

- **Opção "Sistema"** (`prefers-color-scheme`) — usuário optou por controle manual explícito
- **Sincronização de tema com conta do usuário** — preferência é local ao dispositivo
- **Temas por página** (`forcedTheme`) — todas as páginas seguem o tema global
- **Animação de transição entre temas** — troca é instantânea (`disableTransitionOnChange`)
- **Paletas de cores adicionais** — apenas light e dark monochromáticos
