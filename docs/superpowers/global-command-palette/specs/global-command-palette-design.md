---
created_at: "2026-06-02T09:22:24-03:00"
updated_at: "2026-06-02T09:22:24-03:00"
---

# Design Spec — Global Command Palette

## Visão Geral

Implementar um **Command Palette** global no frontend, acionado por `⌘K` / `Ctrl+K` ou clique no `SearchBar` do header. O modal centralizado — com backdrop escurecido, keyboard navigation completa e resultados agrupados por tipo — serve como ponto unificado de busca e navegação para todos os usuários autenticados.

**Contexto:** O `SearchBar` já existe no header (`authenticated-shell.tsx`) com o hint `⌘K` visível, mas sem funcionalidade. Esta spec documenta como conectá-lo a um Command Palette real.

**Escopo:**

| Incluso | Excluído |
|---|---|
| Modal Command Palette com `cmdk` | Busca de check-ins (fase futura) |
| Grupo **Navegação** (páginas do app, filtrado por role) | Busca de assinaturas |
| Grupo **Academias** — todos os usuários autenticados | Histórico de buscas persistido |
| Grupo **Usuários** — admin only | Ações inline ("promover João a admin") |
| Atalho `⌘K` / `Ctrl+K` + clique no `SearchBar` | Página de detalhe de academia (não existe) |
| Resultado de registro navega para a página correta com contexto | — |

---

## Características Arquiteturais

**Priorizadas (top 3):**

| Característica | Por quê (preocupação de domínio) | Critério mensurável |
|---|---|---|
| **Performance** | Palette é ferramenta de produtividade — resposta lenta destrói o valor | Nav estático: < 50ms; registros: < 500ms com debounce 300ms |
| **Usabilidade / Acessibilidade** | ⌘K é o coração da feature — deve funcionar 100% via teclado e screen reader | Keyboard navigation completa; ARIA `combobox` via `cmdk`; sem mouse obrigatório |
| **Extensibilidade** | Hoje: usuários + academias; amanhã: check-ins, assinaturas, ações inline | Novo grupo de resultado adicionável sem modificar o shell ou grupos existentes |

**Consideradas, não priorizadas:** segurança/autorização (endpoints já protegidos no backend; filtro client-side é camada de UX), simplicidade (cmdk elimina o boilerplate de keyboard nav).

---

## Componentes

Derivados pelo **Actor/Action approach**. Atores: membro autenticado, admin, sistema.

### `CommandPalette`

- **Responsabilidade:** renderiza o modal `cmdk` com backdrop, agrupa os resultados e gerencia a query de busca interna.
- **Depende de:** `useGlobalSearch`, `NavigationGroup`, `GymGroup`, `UserGroup`
- **Depende-se de:** `AuthenticatedShell` (recebe `open` + `onOpenChange`)
- **Arquivo:** `apps/frontend/src/components/command-palette/command-palette.tsx`

### `useGlobalSearch`

- **Responsabilidade:** executa as queries de busca com debounce 300ms e retorna resultados agrupados por tipo (`gyms[]`, `users[]`).
- **Depende de:** `useDebounce` (existente), `useGymsByName` (existente), `useUsers` (existente, admin-only)
- **Depende-se de:** `CommandPalette`
- **Arquivo:** `apps/frontend/src/components/command-palette/use-global-search.ts`

### `NavigationGroup`

- **Responsabilidade:** exibe itens de navegação estáticos filtrados pelo role do usuário autenticado.
- **Depende de:** `useAuthStore` (role do usuário)
- **Sem API** — lista de rotas hardcoded com ícone, label e `href`
- **Arquivo:** `apps/frontend/src/components/command-palette/navigation-group.tsx`

### `GymGroup`

- **Responsabilidade:** exibe academias retornadas pela busca; ao selecionar, navega para `/academias?search=X`.
- **Recebe:** `gyms[]` via props de `CommandPalette`
- **Arquivo:** `apps/frontend/src/components/command-palette/gym-group.tsx`

### `UserGroup`

- **Responsabilidade:** exibe usuários retornados pela busca (visível apenas para admins); ao selecionar, navega para `/admin/usuarios?userId=X`.
- **Recebe:** `users[]` via props de `CommandPalette`
- **Arquivo:** `apps/frontend/src/components/command-palette/user-group.tsx`

### Integração em `AuthenticatedShell` *(sem novo componente)*

- Adiciona `useState<boolean>` para `isOpen`
- Registra listener `keydown` para `⌘K` / `Ctrl+K` em `useEffect`
- Passa `open={isOpen}` e `onOpenChange={setOpen}` para `CommandPalette`
- Passa `onClick={() => setOpen(true)}` para o `SearchBar` existente

---

## Fluxo de Dados

```
AuthenticatedShell
  ├── isOpen: useState(false)
  ├── useEffect: listener ⌘K/Ctrl+K → setOpen(true)
  │
  ├── SearchBar (existente, showShortcut=true)
  │     └── onClick → setOpen(true)
  │
  └── CommandPalette (open, onOpenChange)
        ├── query: useState('')
        │
        ├── NavigationGroup
        │     └── lista estática filtrada por role (useAuthStore)
        │           seleção → router.push(href) + onOpenChange(false)
        │
        ├── useGlobalSearch(query)
        │     ├── useDebounce(query, 300ms)
        │     ├── query.length < 2 → enabled: false (sem chamada à API)
        │     ├── GET /gyms/search/{name}        → gyms[]
        │     └── GET /users?query=X             → users[] (só se role === 'ADMIN')
        │
        ├── GymGroup(gyms, isLoading)
        │     └── seleção → router.push('/academias') + onOpenChange(false)
        │
        └── UserGroup(users, isLoading)  — só renderiza se role === 'ADMIN'
              └── seleção → router.push('/admin/usuarios?userId=X') + onOpenChange(false)
```

**Estado padrão (query vazia):** apenas `NavigationGroup` é exibido. Nenhuma chamada à API — percepção de velocidade imediata ao abrir o palette.

---

## Decisões Arquiteturais

### D1. `cmdk` como base do Command Palette

- **Contexto:** O palette precisa de keyboard navigation, focus trap, fuzzy search e ARIA. Alternativas: `@radix-ui/react-dialog` customizado, `cmdk`, implementação manual.
- **Decisão:** Instalar `cmdk` (base do componente `Command` do shadcn/ui).
- **Justificativa técnica:** `cmdk` entrega keyboard nav, ARIA `combobox`, fuzzy search e focus trap prontos. O projeto já usa Radix primitives — `cmdk` segue o mesmo modelo.
- **Justificativa de negócio:** Implementar keyboard navigation acessível manualmente levaria ~200 linhas extras com alto risco de bugs de acessibilidade.
- **Trade-offs aceitos:** nova dependência (~6 KB gzip); sem fuzzy search customizável (o algoritmo de `cmdk` é adequado para o volume atual).

### D2. Busca server-side com debounce 300ms (não client-side)

- **Contexto:** Usuários podem ser milhares; pré-carregar todos em memória é inviável. Alternativa: cache client-side do TanStack Query existente.
- **Decisão:** Queries server-side disparadas após debounce de 300ms e `query.length >= 2`.
- **Justificativa técnica:** Escala para qualquer volume de registros; `useGymsByName` e `useUsers` já existem; `useDebounce` já existe com 300ms disponível.
- **Trade-offs aceitos:** latência percebida na primeira busca (mitigada pelo estado padrão com navegação estática e skeleton durante o carregamento).

### D3. Estado `isOpen` em `AuthenticatedShell`, não no Zustand

- **Contexto:** O palette é global e precisa ser acionado de qualquer página. Opções: estado local no shell, store Zustand.
- **Decisão:** `useState` em `AuthenticatedShell`.
- **Justificativa técnica:** `AuthenticatedShell` já é o owner natural de todos os elementos do layout global. Elevar ao Zustand adicionaria acoplamento sem benefício — nenhum outro módulo precisa ler ou escrever `isOpen`.
- **Trade-offs aceitos:** se futuramente uma página precisar abrir o palette programaticamente (ex.: botão "buscar" numa empty state), será necessário elevar para Context ou Zustand.

### D4. Resultado de academia navega para `/academias` com `searchParams`

- **Contexto:** Não existe página de detalhe de academia. Ao clicar num resultado de academia, a alternativa seria abrir um modal/drawer inline.
- **Decisão:** Navegar para `/academias?search=X`, que pré-preenche a busca já existente na página.
- **Justificativa técnica:** Reutiliza infraestrutura existente sem nova página ou drawer.
- **Trade-offs aceitos:** o usuário sai do contexto atual para ver o resultado — não é um "detalhe inline". Aceitável para MVP.

### D5. Filtro de role é client-side (UX), não de segurança

- **Contexto:** `UserGroup` e a query de usuários não devem aparecer para membros.
- **Decisão:** Verificar `role === 'ADMIN'` no cliente antes de renderizar `UserGroup` e antes de habilitar a query de usuários.
- **Justificativa técnica:** `GET /users` já retorna 403 para não-admins. O filtro client-side é uma camada de UX — evita chamada desnecessária e não exibe seção vazia.
- **Trade-offs aceitos:** nenhum — a segurança real está no backend.

---

## Riscos

| Risco | Impacto (1-3) | Probabilidade (1-3) | Score | Mitigação |
|---|---|---|---|---|
| `cmdk` incompatível com Next.js 16 App Router (Server Components) | 2 | 2 | 4 🟡 | `CommandPalette` é explicitamente `'use client'`; verificar na instalação |
| `/admin/usuarios?userId=X` não abre o painel de detalhe sem implementação adicional | 2 | 3 | 6 🔴 | Verificar durante implementação se a página já lê `userId` do searchParam; caso contrário, incluir esse wiring como sub-tarefa |
| Debounce 300ms causa chamadas excessivas em digitação rápida | 1 | 2 | 2 🟢 | `enabled: false` quando `query.length < 2` limita o blast radius |
| Listener `⌘K` conflita com atalho nativo do browser | 1 | 1 | 1 🟢 | `preventDefault()` no handler; padrão já estabelecido pelo mercado |

---

## Estrutura de Arquivos

```
apps/frontend/src/components/command-palette/
  ├── command-palette.tsx       # Modal principal (cmdk)
  ├── use-global-search.ts      # Hook de busca debounced
  ├── navigation-group.tsx      # Grupo de navegação estático
  ├── gym-group.tsx             # Grupo de academias
  └── user-group.tsx            # Grupo de usuários (admin only)
```

Integração:
```
apps/frontend/src/components/layout/authenticated-shell.tsx  # isOpen state + ⌘K listener
```

---

## Testes

### Unitários (`*.test.tsx`)

| Caso | Componente/Hook |
|---|---|
| Abre com ⌘K | `AuthenticatedShell` |
| Abre ao clicar no `SearchBar` | `AuthenticatedShell` |
| Fecha com Esc | `CommandPalette` |
| Query < 2 chars → queries desabilitadas | `useGlobalSearch` |
| Query >= 2 chars → queries habilitadas com debounce | `useGlobalSearch` |
| Membro não vê `UserGroup` | `CommandPalette` |
| Admin vê `UserGroup` | `CommandPalette` |
| Seleção de navegação chama `router.push` | `NavigationGroup` |
| Seleção de academia navega com `searchParams` | `GymGroup` |
| Seleção de usuário navega com `userId` | `UserGroup` |
| Estado padrão (query vazia) exibe apenas navegação | `CommandPalette` |
| Loading state exibe skeleton nos grupos de registro | `CommandPalette` |
| Nenhum resultado exibe mensagem vazia por grupo | `CommandPalette` |
