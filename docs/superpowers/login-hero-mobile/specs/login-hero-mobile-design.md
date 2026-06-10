---
created_at: "2026-06-10T12:37:15-03:00"
updated_at: "2026-06-10T12:37:15-03:00"
---

# Design — Hero da Tela de Login Adaptado para Mobile

## Visão Geral

Hoje a coluna `<aside>` do hero da tela de login (`/login`) — que contém o título "Treine onde você estiver." e as estatísticas de parcerias (312 academias parceiras, 48k check-ins por mês, 4.9 avaliação média) — é completamente ocultada em viewports ≤ 860px pelo utilitário `max-[860px]:hidden`. No mobile resta apenas o formulário, perdendo a mensagem de marca e a prova social.

A correção traz esse conteúdo de volta no mobile como um **bloco compacto posicionado acima do formulário** (arranjo escolhido visualmente — "Opção A"). Os dados das estatísticas passam a viver em um único array (`LOGIN_STATS`) no escopo do módulo, consumido tanto pelo aside desktop quanto pelo novo bloco mobile, eliminando duplicação de dados. A mudança é confinada a `apps/frontend/src/app/(public)/login/page.tsx`.

**Escopo:**

| Incluso | Excluído |
|---|---|
| `const LOGIN_STATS` compartilhado no módulo | Mudanças no `PublicShell` |
| Aside desktop renderizando as stats a partir do array | Outras telas públicas (cadastro, recuperar-senha, redefinir-senha, ativar) |
| Novo bloco hero mobile (`hidden max-[860px]:flex`) acima do formulário | Cores/tipografia base do design system |
| Ajuste dos testes que asseguram o conteúdo do hero | Novos componentes, novos arquivos, novas dependências npm |
| | Telas autenticadas (cobertas por `PageContainer`) |

---

## Características Arquiteturais

**Priorizadas (top 3):**

| Característica | Por quê (preocupação de domínio) | Critério mensurável |
|---|---|---|
| **Não-regressão** | O layout desktop (≥ 861px) e o colapso de coluna única no mobile não podem mudar de comportamento | Aside desktop visualmente idêntico ao atual; layout de 1 coluna ≤ 860px permanece intacto |
| **Manutenibilidade** | Os valores das estatísticas não podem divergir entre desktop e mobile | Valores `312` / `48k` / `4.9` e seus labels definidos em **um único lugar** (`LOGIN_STATS`) |
| **Consistência visual** | O bloco mobile deve usar os mesmos tokens cromáticos e tipográficos do hero desktop | Números com `text-accent` + `font-mono tabular-nums`; separadores com `border-border` |

**Consideradas, não priorizadas:** performance (mudança puramente CSS/markup, impacto nulo), acessibilidade (sem alteração de semântica, ordem de foco ou de leitura — o bloco mobile é conteúdo informativo precedendo o formulário).

---

## Componentes

Nenhum novo arquivo é criado. Todas as mudanças são inline em `LoginForm`, dentro de `login/page.tsx`.

### 1. `LOGIN_STATS` (dado compartilhado)

Array no escopo do módulo (fonte única de verdade das estatísticas):

```tsx
const LOGIN_STATS = [
  { value: "312", label: "academias parceiras" },
  { value: "48k", label: "check-ins por mês" },
  { value: "4.9", label: "avaliação média" },
] as const
```

### 2. Aside desktop (refatoração sem mudança visual)

Os três blocos de estatística hardcoded passam a ser renderizados via `LOGIN_STATS.map(...)`, com `key` no `label`. As classes visuais permanecem idênticas às atuais — número `font-mono text-3xl font-bold text-accent tabular-nums`, label `max-w-[110px] text-xs text-muted-foreground dark:text-white/55`. O wrapper segue `flex flex-wrap gap-9`, e o aside mantém `max-[860px]:hidden`.

### 3. Bloco hero mobile (novo)

Inserido como **primeiro filho** do wrapper `mx-auto flex w-full max-w-[400px] flex-col gap-8` da coluna do formulário, para alinhar com a largura do form. Visível apenas no mobile via `hidden max-[860px]:flex flex-col`. Conteúdo:

- **Título compacto:** "Treine onde **você** estiver." — `font-display`, peso `font-bold`, tamanho compacto (≈ `text-2xl`/`text-3xl`), com `<span className="text-accent">você</span>`.
- **Linha de estatísticas:** `flex flex-wrap gap-6` mapeando `LOGIN_STATS` — número `font-mono text-2xl font-bold text-accent tabular-nums`, label `text-xs text-muted-foreground`.
- **Separador:** `border-b border-border pb-*` para distinguir o bloco do formulário (como no mockup aprovado).

> **Por que o título não é compartilhado:** o título desktop usa `text-[clamp(48px,7vw,92px)]` com quebra de linha (`<br />`) e o mobile usa um tamanho compacto sem quebra forçada. As apresentações divergem o bastante para que compartilhar o markup do título introduza condicionais de classe sem ganho real. Apenas os **dados** das estatísticas (que precisam ser idênticos) são compartilhados.

---

## Fluxo

Toggle de CSS puro, sem JavaScript de detecção de viewport (convenção do projeto):

```
≥ 861px:
  <div max-w-6xl>
    <div grid 2-col>
      <aside> [VISÍVEL]  Treine onde você estiver. + stats (do LOGIN_STATS)
      <div form-col>
        <div max-w-[400px]>
          [bloco mobile hidden]
          <header> Acesse sua conta / Entrar
          <form> ...

≤ 860px:
  <div max-w-6xl>
    <div grid 1-col>
      <aside> [HIDDEN]
      <div form-col>
        <div max-w-[400px]>
          [bloco mobile FLEX]  Treine onde você estiver. + stats (do LOGIN_STATS) + border-b
          <header> Acesse sua conta / Entrar
          <form> ...
```

O aside (`max-[860px]:hidden`) e o bloco mobile (`hidden max-[860px]:flex`) são mutuamente exclusivos — em nenhum viewport ambos aparecem nem ambos somem.

---

## Decisões Arquiteturais

### D1. Bloco mobile separado com array de dados compartilhado (Abordagem 1)

- **Contexto:** o hero desktop e o bloco mobile precisam das mesmas 3 estatísticas. Alternativas: (A) array compartilhado + bloco mobile dedicado; (B) bloco mobile com markup totalmente duplicado; (C) tornar o `<aside>` existente responsivo, sem segundo bloco.
- **Decisão:** Abordagem A — compartilhar apenas os *dados* (`LOGIN_STATS`); manter markups de desktop e mobile independentes.
- **Justificativa técnica:** desktop e mobile têm layouts visualmente distintos (coluna alta com título `clamp` enorme vs. faixa compacta). Compartilhar markup (C) exigiria overrides responsivos invasivos no aside e acoplaria as duas apresentações, com alto risco de regressão no hero desktop.
- **Justificativa de negócio:** os valores das estatísticas são copy de marketing que muda em conjunto; centralizá-los evita divergência silenciosa entre as duas telas (custo de manutenção e de credibilidade).
- **Trade-offs aceitos:** +1 bloco de markup e o título curto repetido entre aside e bloco mobile (custo baixo, JSX trivial) em troca de baixo acoplamento e fonte única dos dados.

### D2. Breakpoint `max-[860px]`

- **Contexto:** o projeto tem registro de duas convenções (`md` = 768px na feature `mobile-responsive-layout`; `max-[860px]` no código real do login e da sidebar).
- **Decisão:** usar `max-[860px]`, espelhando exatamente o ponto em que o aside já é ocultado.
- **Justificativa:** garante que o bloco mobile apareça precisamente quando o aside some — nunca os dois juntos, nunca nenhum. Mantém coerência interna do próprio arquivo.
- **Trade-offs aceitos:** diverge do breakpoint `md` documentado em outra feature; aceitável porque a consistência *dentro da tela de login* (toggle do aside) é o que importa para correção visual.

---

## Riscos

| Risco | Impacto (1-3) | Probabilidade (1-3) | Score | Mitigação |
|---|---|---|---|---|
| Testes do login (`login-volt.test.tsx` e afins) quebram: título e stats passam a existir **2x no DOM** (JSDOM ignora CSS de viewport), fazendo `getByText` lançar "multiple elements found" | 2 | 3 | 6 🔴 | Atualizar os asserts para `getAllByText` ou consultas escopadas por container (`within`) — task explícita no plano |
| `min-h-[calc(100vh-8rem)]` do grid gerar espaço vertical extra no mobile com o bloco no topo | 1 | 1 | 1 🟢 | Verificação visual em 360px e 768px; é o comportamento já existente da coluna do formulário |

---

## Error Handling

Não aplicável — mudança puramente de layout/CSS, sem novos caminhos de erro, dados ou chamadas de rede.

---

## Testing

- **Regressão crítica:** ajustar os testes que asseguram o conteúdo do hero para `getAllByText` ou consultas com `within` (escopo por bloco), já que o conteúdo de desktop e de mobile coexiste no DOM do JSDOM.
- **Novo teste:** asserir que o bloco hero mobile (título + 3 estatísticas) está presente no DOM.
- **Visual / manual:** verificar em 360px e 768px que o bloco compacto aparece acima do formulário com as 3 stats; verificar em 1440px que o aside desktop permanece idêntico; verificar em 860px (breakpoint) a transição entre aside e bloco mobile.
- **Gate do projeto:** `pnpm --filter frontend lint:fix` + `tsc:check` + `test` + `build` 100%.
