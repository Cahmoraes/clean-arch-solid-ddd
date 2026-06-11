# Tarefa 2.0: Infra de UI (Tailwind v4 + shadcn/ui)

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Instalar e configurar Tailwind CSS v4 com os tokens do `DESIGN.md`, e gerar os primitivos base do shadcn/ui customizados ao design system monocromático. Esta task não depende de nenhum domínio funcional e é pré-requisito visual para todas as features.

<skills>
### Conformidade com Skills Padrões

- `ui-ux-pro-max` — aderência estrita ao `DESIGN.md` (paleta monocromática, pill-shaped, SF Pro Rounded)
- `no-workarounds` — validar compatibilidade shadcn/ui com Tailwind v4 antes de instalar
- `vitest` — testes de renderização dos primitivos
- `test-antipatterns` — não mockar componentes próprios nos testes
</skills>

<requirements>
- Tailwind CSS v4 instalado com `@tailwindcss/postcss` e `@import "tailwindcss"` em `globals.css`
- Tokens do `DESIGN.md` aplicados como CSS custom properties: paleta de cinza, tipografia SF Pro Rounded, border-radius 12px (containers) e 9999px (interativos)
- shadcn/ui inicializado e ajustado para Tailwind v4 (sem referências a v3)
- Primitivos gerados e customizados: `Button`, `Input`, `Dialog`, `Skeleton`, `Tabs`, `DropdownMenu`, `Pagination`
- Componentes `Toast` (via Sonner) e `EmptyState` (custom) criados
- Zero sombras, zero gradientes, zero cores cromáticas (exceto anel de foco azul do Tailwind)
- `tsconfig.json` com paths `@/components/*`, `@/lib/*`, `@/features/*`
</requirements>

## Subtarefas

- [x] 2.1 Instalar `tailwindcss@^4`, `@tailwindcss/postcss`, `clsx`, `tailwind-merge`, `lucide-react`, `sonner`
- [x] 2.2 Atualizar `globals.css` com `@import "tailwindcss"`, variáveis CSS da paleta monocromática e tipografia do `DESIGN.md`
- [x] 2.3 Atualizar `postcss.config.js` (ou equivalente) para usar `@tailwindcss/postcss`
- [x] 2.4 Inicializar shadcn/ui (`npx shadcn@latest init`) validando que os templates gerados são compatíveis com Tailwind v4; ajustar manualmente se necessário
- [x] 2.5 Gerar primitivos: `Button`, `Input`, `Dialog`, `Skeleton`, `Tabs`, `DropdownMenu`, `Pagination` via shadcn CLI
- [x] 2.6 Customizar cada primitivo para respeitar o design system: border-radius pill em interativos, sem sombras, paleta monocromática
- [x] 2.7 Criar componente `EmptyState` em `src/components/ui/empty-state.tsx` com slot de ícone, título, descrição e ação opcional
- [x] 2.8 Integrar `Toaster` do Sonner em `src/app/layout.tsx`
- [x] 2.9 Atualizar `tsconfig.json` com path aliases `@/components/*`, `@/lib/*`, `@/features/*`
- [x] 2.10 Criar utilitário `src/lib/cn.ts` exportando função `cn` (clsx + tailwind-merge)

## Detalhes de Implementação

Ver `techspec.md` → seção **Sequenciamento de Desenvolvimento** item 1, **Riscos Conhecidos** (shadcn/ui + Tailwind v4) e **Considerações Técnicas** (Tailwind v4 + shadcn/ui).

## Critérios de Sucesso

- `pnpm dev` renderiza sem erros de CSS
- Todos os primitivos renderizam visualmente alinhados ao `DESIGN.md`
- `Button` com variante padrão tem border-radius 9999px e sem sombra
- `EmptyState` aceita props de título, descrição e ação e renderiza corretamente
- Nenhuma cor cromática visível exceto o anel de foco azul em elementos focados

## Testes da Tarefa

- [x] Teste de unidade: `Button` renderiza com as classes corretas para cada variante
- [x] Teste de unidade: `EmptyState` renderiza título, descrição e botão de ação quando fornecidos
- [x] Teste de unidade: `Skeleton` renderiza com animação de pulse
- [x] Teste de unidade: função `cn` combina classes corretamente e resolve conflitos Tailwind
- [x] Teste de integração: `Dialog` abre e fecha via interação de usuário com `userEvent`

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- `apps/frontend/src/app/globals.css`
- `apps/frontend/src/app/layout.tsx`
- `apps/frontend/src/components/ui/` (todos os primitivos)
- `apps/frontend/src/lib/cn.ts`
- `apps/frontend/tsconfig.json`
- `apps/frontend/postcss.config.js`
- `apps/frontend/DESIGN.md` (referência visual)
