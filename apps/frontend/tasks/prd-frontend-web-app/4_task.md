# Tarefa 4.0: Layout shells + Landing pública

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Criar os shells de página (`PublicShell` e `AuthenticatedShell`), os route groups `(public)` e `(authenticated)` no App Router, e a landing page pública como RSC. O `AuthenticatedShell` inclui header, navegação responsiva (mobile/desktop) e menu de usuário com guarda visual de role.

<skills>
### Conformidade com Skills Padrões

- `vercel-react-best-practices`, `vercel-composition-patterns` — composição RSC/Client, layouts do App Router
- `ui-ux-pro-max` — responsividade 320px–1920px, design monocromático, navegação adaptada
- `typescript-advanced` — tipos de role derivados do auth-store
- `test-antipatterns` — não mockar componentes próprios; testar comportamento real
</skills>

<requirements>
- Route group `(public)` com `PublicShell` (header mínimo, sem proteção)
- Route group `(authenticated)` com `AuthenticatedShell` (header com navegação, menu de usuário, logout)
- `AuthenticatedShell` esconde/exibe itens de menu admin com base na role do `auth-store`
- Landing page (`(public)/page.tsx`) como React Server Component: apresenta o produto, links para cadastro e login
- Navegação responsiva: menu colapsável em mobile, barra lateral ou topo em desktop
- Layout carrega font fallback SF Pro Rounded conforme `DESIGN.md`
- Sub-layout admin em `(authenticated)/admin/` aplica guarda extra de role (redireciona MEMBER para `/`)
</requirements>

## Subtarefas

- [ ] 4.1 Criar estrutura de pastas: `src/app/(public)/` e `src/app/(authenticated)/`
- [ ] 4.2 Criar `src/components/layout/PublicShell.tsx` com header mínimo e slot de conteúdo
- [ ] 4.3 Criar `src/components/layout/AuthenticatedShell.tsx` com header, navegação responsiva e menu de usuário
- [ ] 4.4 Implementar guarda visual de role no `AuthenticatedShell` (itens admin visíveis apenas para ADMIN)
- [ ] 4.5 Criar `src/app/(public)/layout.tsx` usando `PublicShell`
- [ ] 4.6 Criar `src/app/(authenticated)/layout.tsx` usando `AuthenticatedShell`
- [ ] 4.7 Criar `src/app/(authenticated)/admin/layout.tsx` com guarda de role ADMIN (redirect para `/` se MEMBER)
- [ ] 4.8 Criar `src/app/(public)/page.tsx` como RSC com conteúdo da landing (hero, CTA de cadastro/login)
- [ ] 4.9 Atualizar `src/app/layout.tsx` com fonte SF Pro Rounded (fallback system), Toaster e classes base Tailwind

## Detalhes de Implementação

Ver `techspec.md` → seção **Rotas do App Router**, **Sequenciamento de Desenvolvimento** item 4, e **Arquitetura do Sistema** (`src/components/layout/`).

## Critérios de Sucesso

- Landing acessível em `/` sem autenticação e renderiza como RSC
- Rotas autenticadas carregam `AuthenticatedShell` com navegação
- Menu admin invisível para usuários MEMBER
- Layout admin redireciona MEMBER para `/`
- Navegação funcional em viewport 320px (mobile) e 1280px (desktop)
- Font fallback SF Pro Rounded aplicada em títulos

## Testes da Tarefa

- [ ] Teste de unidade: `AuthenticatedShell` exibe links de admin quando role é ADMIN
- [ ] Teste de unidade: `AuthenticatedShell` oculta links de admin quando role é MEMBER
- [ ] Teste de integração: layout admin com role MEMBER redireciona para `/`
- [ ] Teste de integração: landing renderiza CTA de cadastro e login
- [ ] Teste de integração: navegação mobile exibe/oculta menu ao clicar no botão de hambúrguer

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- `apps/frontend/src/app/(public)/layout.tsx`
- `apps/frontend/src/app/(public)/page.tsx`
- `apps/frontend/src/app/(authenticated)/layout.tsx`
- `apps/frontend/src/app/(authenticated)/admin/layout.tsx`
- `apps/frontend/src/app/layout.tsx`
- `apps/frontend/src/components/layout/PublicShell.tsx`
- `apps/frontend/src/components/layout/AuthenticatedShell.tsx`
