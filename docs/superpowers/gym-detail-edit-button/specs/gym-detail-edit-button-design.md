---
created_at: "2026-06-09T14:41:07-03:00"
updated_at: "2026-06-09T14:41:07-03:00"
---

# Design — Botão editar no detalhe da academia

## Contexto

A feature `gym-edit-entrypoint` entregou um botão de edição sobreposto ao `GymCard` na
listagem `/academias`. A tela de detalhe `/academias/[id]` exibe a mesma academia com
mais informações, mas não expõe nenhum ponto de entrada para a edição. A tela de edição
`/admin/academias/[id]/editar` já existe e é funcional — apenas inacessível a partir do
detalhe.

Este design cobre exclusivamente a adição do botão de edição na tela de detalhe, seguindo
o mesmo padrão visual e arquitetural já estabelecido.

## Características Arquiteturais Priorizadas

1. **Manutenibilidade** — `DetailCard` permanece um sub-componente de apresentação
   dirigido por props, sem acoplamento ao auth store. Mesma decisão do ADR-1 do
   `gym-edit-entrypoint`.
2. **Consistência** — visual e comportamento idênticos ao botão da listagem: mesmo ícone
   (`Pencil` do lucide-react), mesmo token CSS, mesmo posicionamento (`absolute right-3
   top-3 z-20`).
3. **Segurança (higiene)** — o botão é conveniência visual. A proteção real já existe:
   rota sob `AdminGuard` no frontend + backend recusa `PUT /gyms/:gymId` de não-admin.

## Componentes e Fluxo de Dados

O sinal "usuário é admin" já flui pelo mesmo padrão adotado em `/academias/page.tsx` —
via `useAuthStore((s) => s.user?.role === "ADMIN")`. A página de detalhe é `"use client"`
e pode consumir o store diretamente.

```
GymDetailPage
  lê isAdmin via useAuthStore((s) => s.user?.role === "ADMIN")
  deriva adminEditHref = isAdmin ? `/admin/academias/${id}/editar` : undefined
  │ passa adminEditHref
  ▼
DetailBody  (recebe adminEditHref?: string e repassa para DetailCard)
  │
  ▼
DetailCard  (recebe adminEditHref?: string)
  se presente: envolve GymImage em <div className="relative h-48 w-full rounded-[8px]">
               adiciona <Link href={adminEditHref}> sobreposto no topo-direito
```

### Responsabilidades

- **`GymDetailPage`** — fonte do sinal de admin (via `useAuthStore`). Deriva
  `adminEditHref` e repassa para `DetailBody`.
- **`DetailBody`** — recebe `adminEditHref?: string` e o encaminha para `DetailCard`
  quando `gym` está disponível. Não toma decisões sobre exibição.
- **`DetailCard`** — recebe `adminEditHref?: string`. Se presente, envolve `GymImage`
  em `<div className="relative">` e renderiza o `<Link>` de edição como irmão absoluto.
  **Não chama `useAuthStore`** — agnóstico de autenticação, testável apenas com props.

## Decisões Arquiteturais (ADR-lite)

### ADR-1 — `DetailCard` dirigido por prop, não por auth store

**Decisão:** `DetailCard` expõe `adminEditHref?: string` em vez de consultar o auth
store internamente.

**Trade-off:** exige que `GymDetailPage` e `DetailBody` repassem o href (plumbing
adicional mínimo) — em troca, `DetailCard` permanece desacoplado do auth, testável sem
mock de store, e consistente com o padrão estabelecido no `GymCard`.

**Alternativa rejeitada:** ler `useAuthStore` diretamente em `DetailCard`. Como o
componente já vive em um arquivo `"use client"`, seria tecnicamente viável — mas
introduziria acoplamento desnecessário e quebraria a consistência com o padrão do projeto.

### ADR-2 — `<Link>` sobreposto como irmão de `GymImage` dentro de `div relative`

**Decisão:** `GymImage` é envolvida em `<div className="relative h-48 w-full
rounded-[8px]">`. O `<Link href={adminEditHref}>` de edição é posicionado `absolute
right-3 top-3 z-20`, irmão de `GymImage` dentro desse wrapper.

**Trade-off:** requer a adição de um wrapper `div` ao redor da imagem, mudança mínima na
estrutura existente. Em troca, não há links aninhados (HTML válido), o clique no ícone
não conflita com nenhuma outra interação, e a navegação é acessível nativamente
(ctrl+click abre em nova aba).

**Por que `<Link>` e não `<button>` + `useRouter`:** o componente já é client, mas
`<Link>` mantém a consistência com `GymCard`, é acessível nativamente e os testes
verificam apenas `href` — sem mock de router.

### ADR-3 — Botão sempre visível para admin (não hover-only)

**Decisão:** o botão é renderizado sempre que `adminEditHref` está presente, com
`bg-background/80 backdrop-blur` para legibilidade sobre a imagem.

**Trade-off:** levemente mais "presente" visualmente que um affordance de hover — em
troca, funciona em touch (sem hover) e é consistente com o comportamento da listagem.

## Mudança Estrutural

**Antes:** `GymImage` é filho direto do `article.flex.flex-col`.

**Depois:** `GymImage` fica dentro de `<div className="relative h-48 w-full
rounded-[8px]">`, que substitui a imagem direta. O `className` da `GymImage` passa de
`"h-48 w-full rounded-[8px]"` para `"h-full w-full rounded-[8px]"` (a altura é herdada
do wrapper).

## Arquivos Afetados

| Arquivo | Mudança |
|---|---|
| `apps/frontend/src/app/(authenticated)/academias/[id]/page.tsx` | (1) `GymDetailPage` importa `useAuthStore` e deriva `adminEditHref`; (2) `DetailBody` recebe e repassa `adminEditHref`; (3) `DetailCard` recebe prop, envolve imagem em wrapper relativo, renderiza `<Link>` de edição |

## Acessibilidade

- `aria-label="Editar academia {título}"` no `<Link>` de edição.
- Ícone `Pencil` do `lucide-react` com `aria-hidden="true"`.
- Posicionado no canto superior direito — não conflita com nenhum elemento existente.

## Riscos

- 🟢 **Wrapper adicional ao redor da imagem** — mudança cirúrgica e isolada; o único
  efeito visível é o `overflow: hidden` do wrapper, que já estava na `GymImage`.
- 🟢 **Dependência de `useAuthStore` em `GymDetailPage`** — o store já é consumido em
  outras páginas autenticadas; sem risco novo.

## Tratamento de Erros

Sem novos caminhos de erro: a navegação é um `<Link>` client-side e a tela de destino
já trata loading/erro/404 via `useGymById`. O backend recusa edição de não-admin
independentemente do botão.

## Testes

- **`DetailCard`**: botão aparece com `adminEditHref`; ausente sem ele; `aria-label`
  correto com o título da academia; `href` correto; `GymImage` continua renderizando.
- **`GymDetailPage`** (integração): usuário admin vê o link de edição com o href
  esperado; não-admin não vê.

## Fora de Escopo

- Alterações na tela de edição em si (`/admin/academias/[id]/editar`).
- Botão de exclusão de academia.
- Novas rotas ou guards.
- Alterações no `GymCard` ou `GymResults` (já implementados).
