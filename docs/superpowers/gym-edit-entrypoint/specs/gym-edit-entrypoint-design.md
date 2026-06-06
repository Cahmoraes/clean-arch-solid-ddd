---
created_at: "2026-06-06T16:16:58-03:00"
updated_at: "2026-06-06T16:18:00-03:00"
---

# Design — Ponto de entrada para edição de academia

## Contexto

A feature `gym-image-upload` entregou a tela de edição de academia em
`/admin/academias/[id]/editar` (task-17), totalmente funcional: carrega a academia
via `useGymById`, valida com `createGymSchema`, salva via `useUpdateGym` e troca a
imagem via `useSetGymImage`. O backend expõe `PUT /gyms/:gymId` protegido para admin.

O gap: **não existe nenhum ponto de entrada na interface** que leve o admin até essa
tela. A feature existe mas é inacessível via navegação. Este design cobre apenas a
criação desse ponto de entrada.

## Característica Arquitetural Priorizada

1. **Manutenibilidade** — o `GymCard` permanece um componente de apresentação puro,
   dirigido por props, sem acoplamento ao auth store.
2. **Usabilidade** — acesso à edição descobrível e funcional inclusive em touch (onde
   hover não existe).
3. **Segurança (higiene)** — o ícone é conveniência visual; a proteção real já existe
   (rota sob `AdminGuard` no frontend + backend recusa `PUT` de não-admin). Esconder o
   botão é UX, não controle de acesso.

## Componentes e Fluxo de Dados

O sinal "usuário é admin" já vive na página `/academias` — ela renderiza o botão
"Cadastrar" condicionalmente com `useAuthStore((s) => s.user?.role === "ADMIN")`.
Reaproveita-se esse mesmo ponto, fazendo o href de edição fluir para baixo:

```
/academias/page.tsx          → já tem isAdmin via useAuthStore
   │ passa isAdmin
   ▼
GymResults                   → para cada gym, monta o href de edição quando isAdmin
   │ passa adminEditHref={`/admin/academias/${gym.id}/editar`}
   ▼
GymCard                      → se receber adminEditHref, renderiza o botão sobreposto
```

### Responsabilidades

- **`/academias/page.tsx`** — fonte do sinal de admin (já existente). Repassa `isAdmin`
  para `GymResults`.
- **`GymResults`** — recebe `isAdmin`; para cada item, deriva
  `adminEditHref` (`/admin/academias/${gym.id}/editar`) e o repassa ao `GymCard`.
  Quando `isAdmin` é falso, não passa o href.
- **`GymCard`** — recebe prop opcional `adminEditHref?: string`. Se presente, renderiza
  o botão de edição sobreposto; se ausente, não. **Não chama `useAuthStore`** — fica
  agnóstico de autenticação, testável apenas com props.

## Decisões Arquiteturais (ADR-lite)

### ADR-1 — GymCard dirigido por prop, não por auth store

**Decisão:** o `GymCard` expõe `adminEditHref?: string` em vez de consultar o auth store
internamente.

**Trade-off:** exige que a página/`GymResults` repasse o href (um pouco mais de
plumbing) — em troca, o card permanece desacoplado do auth, testável sem mock de store,
e reutilizável em contextos onde a regra de exibição seja diferente.

### ADR-2 — Segundo `<Link>` irmão fora do `<Link>` principal (resolve link aninhado)

**Decisão:** a raiz do `GymCard` deixa de ser o `<Link>` e passa a ser um
`<div className="relative">`. Dentro dele, dois **irmãos** no DOM: o `<Link>` existente
(card inteiro, comportamento preservado) e um segundo `<Link href={adminEditHref}>`
estilizado como botão, posicionado `absolute` no canto superior direito com `z-index`
acima do link principal.

**Trade-off:** mexer na estrutura raiz do card é mais invasivo que uma adição isolada —
mas é a única forma válida de ter dois alvos de clique, já que HTML proíbe `<a>` aninhado
em `<a>`. Como são irmãos (não aninhados), o clique no ícone não dispara a navegação do
card; dispensa `stopPropagation` e não quebra a hidratação.

Optou-se por um segundo `<Link>` em vez de `<button>` + `useRouter`: assim o `GymCard`
permanece sem `"use client"`/hooks (não vira client component só por causa do botão), a
navegação é acessível nativamente (ctrl+click abre em nova aba) e os testes verificam
apenas `href` — sem mock de router. O ícone é renderizado dentro do `<Link>` de edição.

### ADR-3 — Botão sempre visível para admin (não apenas no hover)

**Decisão:** o botão é renderizado sempre que `adminEditHref` está presente, com fundo
semi-transparente (`bg-background/80 backdrop-blur`) para legibilidade sobre a imagem.

**Trade-off:** ligeiramente mais "presente" visualmente que um affordance só-no-hover —
em troca, funciona em touch (sem hover) e é mais descobrível.

## Acessibilidade

- `aria-label="Editar academia {título}"`.
- Ícone `Pencil` do `lucide-react` (já em uso no projeto).
- Botão posicionado no canto superior **direito**; o badge "Disponível" fica à esquerda
  — sem sobreposição.

## Riscos

- 🟡 **Mudança na raiz do `GymCard`** (de `<Link>` para `<div>`) toca um componente
  central. *Mitigação:* manter o `<Link>` interno idêntico ao atual e cobrir com teste
  garantindo que o card continua navegável para o detalhe.
- 🟢 **Sobreposição visual com o badge** — evitada por posicionamento em cantos opostos.

## Tratamento de Erros

Sem novos caminhos de erro neste escopo: a navegação é um `<Link>` client-side e a tela
de destino já trata loading/erro/404 via `useGymById`. O backend já recusa edição de
não-admin (defesa real, independente do botão).

## Testes

- **`GymCard`**: botão aparece com `adminEditHref`; ausente sem ele; `aria-label`
  correto; `router.push` chamado com o href ao clicar; card continua sendo link de
  detalhe.
- **`GymResults`**: repassa `adminEditHref` quando `isAdmin`; omite quando não.
- **`/academias` page**: caso admin renderiza o ícone nos cards.

## Fora de Escopo

- Página de listagem admin dedicada (a edição já fica acessível via `/academias`).
- Botão de exclusão de academia (não há endpoint).
- Alterações na tela de edição em si (já pronta e funcional).
- Lógica de detecção de admin nova (reaproveita o padrão existente em `/academias`).
