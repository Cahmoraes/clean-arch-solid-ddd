# Cadastro de Academias — Navegação Frontend

**Data:** 2026-05-03
**Status:** Aprovado

## Problema

O formulário de cadastro de academias já existe em `/admin/academias/nova` com validação Zod, mutation TanStack Query, tratamento de erros e testes unitários. Porém, não há nenhum link na UI que leve até ele — a página é inacessível para o usuário.

## Decisão

Adicionar um botão "Cadastrar Academia" na página `/academias` (busca de academias), posicionado no header ao lado do título. Visível apenas para usuários com role `ADMIN`.

## Escopo

### Incluído

- Botão condicional (role ADMIN) no header da página `/academias`
- Link para `/admin/academias/nova`
- Teste unitário para verificar renderização condicional do botão

### Excluído

- Mudanças no formulário de cadastro (já completo)
- Mudanças na API de backend (já funcional)
- Mudanças no menu de navegação principal
- Dashboard admin ou sub-navegação

## Arquitetura

### Componentes afetados

**`apps/frontend/src/app/(authenticated)/academias/page.tsx`** — Único arquivo de produção modificado.

Mudanças:
1. Importar `Link` de `next/link` e `useAuthStore` de `@/lib/auth/auth-store`
2. Ler `user` do auth store para verificar role
3. Transformar o `<header>` em flex row com `justify-between` para acomodar o botão à direita
4. Renderizar condicionalmente um `<Link>` estilizado como `Button` apontando para `/admin/academias/nova` quando `user?.role === "ADMIN"`

### Fluxo do usuário

1. Admin acessa `/academias` (busca de academias)
2. Vê botão "Cadastrar Academia" no canto superior direito do header
3. Clica no botão → navega para `/admin/academias/nova`
4. Preenche o formulário → submete → redirecionado para detalhe da academia criada

Usuários com role `MEMBER` não veem o botão — a página funciona exatamente como antes.

### Padrões seguidos

- `useAuthStore` para checar role (mesmo padrão de `AdminGuard` e `authenticated-shell.tsx`)
- Componente `Button` existente para estilo visual
- `Link` do Next.js para navegação client-side
- `data-testid` para seletor de testes

## Testes

Adicionar testes em `apps/frontend/src/app/(authenticated)/academias/page.test.tsx`:

1. **Admin vê botão** — renderizar com auth store simulado com role ADMIN, verificar que o link para `/admin/academias/nova` está presente
2. **Member não vê botão** — renderizar com role MEMBER, verificar que o link não está presente

Padrão de teste: `renderWithProviders` + mock do auth store via Zustand.

## Arquivos

| Arquivo | Ação |
|---------|------|
| `apps/frontend/src/app/(authenticated)/academias/page.tsx` | Editar — adicionar botão condicional |
| `apps/frontend/src/app/(authenticated)/academias/page.test.tsx` | Criar — testes de renderização condicional |
