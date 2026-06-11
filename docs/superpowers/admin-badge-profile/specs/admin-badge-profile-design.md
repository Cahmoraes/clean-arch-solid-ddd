---
created_at: "2026-05-18T15:09:18-03:00"
updated_at: "2026-05-18T15:09:18-03:00"
---

# Design: Indicador de Administrador no Perfil

## Contexto

O projeto já implementou a feature de gerenciamento de papéis (`admin-role-management`), onde usuários podem ser promovidos a administrador. Esta feature complementa aquela, exibindo um status visual ao usuário administrador quando ele acessa sua própria página de perfil (`/perfil`).

## Objetivo

Quando um usuário com `role === 'ADMIN'` acessa `/perfil`, exibir um badge ao lado do título "Meu perfil" indicando que ele é administrador. O badge não é renderizado para usuários com `role === 'MEMBER'`.

## Escopo

- **Apenas frontend** — nenhuma alteração de backend ou API necessária.
- A role do usuário já está disponível no `useAuthStore().user.role` (extraída do JWT na autenticação).
- O indicador é visível **somente para o próprio administrador** na sua página de perfil; não é exibido em perfis públicos (`/perfil/[userId]`).

## Arquitetura

### Fluxo de dados

```
JWT token → useAuthStore (user.role) → ProfilePage → AdminBadge (condicional)
```

Nenhuma nova chamada à API é necessária. O `useAuthStore` já persiste a role do usuário durante a sessão.

### Componente `AdminBadge`

**Arquivo:** `src/components/ui/admin-badge.tsx`

Componente puramente presentacional. Renderiza um pill roxo com ícone de escudo (`Shield` do `lucide-react`) e o texto `"ADMIN"`.

- Aceita `className?: string` para extensibilidade futura.
- Não possui lógica condicional interna — a decisão de renderizá-lo ou não é de responsabilidade do consumidor.
- Usa classes Tailwind CSS alinhadas ao design system existente (violet/purple, arredondado, texto uppercase).

### Integração na página de perfil

**Arquivo:** `src/app/(authenticated)/perfil/page.tsx`

No componente `ProfilePage`:

1. Ler `user` do `useAuthStore`.
2. Calcular `isAdmin = user?.role === 'ADMIN'`.
3. No `<header>`, envolver o `<h1>` e o `AdminBadge` em um `<div>` flexível:

```tsx
<div className="flex items-center gap-3">
  <h1 className="font-display text-3xl font-semibold text-foreground">
    Meu perfil
  </h1>
  {isAdmin && <AdminBadge />}
</div>
```

O restante da página (`ProfileSection`, `MetricsSection`) permanece inalterado.

## Comportamento esperado

| Situação | Badge exibido? |
|---|---|
| Usuário com `role === 'ADMIN'` acessa `/perfil` | ✅ Sim |
| Usuário com `role === 'MEMBER'` acessa `/perfil` | ❌ Não |
| Qualquer usuário acessa `/perfil/[userId]` (perfil público) | ❌ Não |

## Tratamento de estados de carregamento

O `useAuthStore` é síncrono (estado local Zustand) — a role está disponível imediatamente sem estados de loading/error. Não há necessidade de skeleton ou fallback para o badge.

## Estilo visual

- **Cor de fundo:** `bg-violet-600`
- **Texto:** `text-white`, `text-xs`, `font-bold`, `uppercase`, `tracking-wide`
- **Forma:** `rounded-full`, `px-3 py-0.5`
- **Ícone:** `Shield` (lucide-react), `h-3 w-3`
- **Layout:** `inline-flex items-center gap-1`

## Testes

### `src/components/ui/admin-badge.test.tsx`
- Renderiza o ícone e o texto "ADMIN".
- Aplica `className` extra quando fornecido.

### `src/app/(authenticated)/perfil/page.test.tsx` (ou arquivo de testes existente)
- Badge presente no DOM quando `useAuthStore` retorna `role === 'ADMIN'`.
- Badge ausente no DOM quando `useAuthStore` retorna `role === 'MEMBER'`.

## Arquivos alterados

| Arquivo | Tipo de mudança |
|---|---|
| `src/components/ui/admin-badge.tsx` | Novo |
| `src/app/(authenticated)/perfil/page.tsx` | Modificado |
| `src/components/ui/admin-badge.test.tsx` | Novo |
