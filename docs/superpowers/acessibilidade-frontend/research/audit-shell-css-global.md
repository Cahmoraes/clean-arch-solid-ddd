---
created_at: "2026-08-26T14:57:46-03:00"
updated_at: "2026-08-26T14:57:46-03:00"
---

# Auditoria WCAG 2.2 — Shell e CSS Global

**Escopo auditado**: `public-shell.tsx`, `authenticated-shell.tsx`, `globals.css`. Auditoria **parcial e proposital** — restrita a 2.4.1, landmark `<main>`, 1.4.4 e 2.4.7/1.4.11. Os outros ~51 critérios da matriz **não foram percorridos** e não devem ser lidos como aprovados; ficam fora de alcance por instrução explícita, não por ausência de problema.

---

## Falhas encontradas (4 itens, 7 problemas)

### 2.4.1 — Pular Blocos · A · 🟡 Médio · 4 problemas

Inventário: nenhum dos dois shells tem `<a href="#...">` como skip-link. Ambos têm landmarks (`header`, `nav`, `main`, `footer`/`aside`), então o gatilho catalogado é "mecanismo ausente", não "sem landmarks".

| Ocorrência | Local | Correção |
|---|---|---|
| `Mecanismo de pular blocos ausente nesta página.` | `apps/frontend/src/components/layout/public-shell.tsx` (root `<div data-testid="public-shell">`, linha 13) | Inserir skip-link como primeiro filho do container raiz |
| `<main>` presente mas sem `id` referenciável por skip-link | `public-shell.tsx:50` — `<main className="flex-1">{children}</main>` | Adicionar `id="main-content"` |
| `Mecanismo de pular blocos ausente nesta página.` | `apps/frontend/src/components/layout/authenticated-shell.tsx` (root `<div data-testid="authenticated-shell">`, linha 156) | Inserir skip-link como primeiro filho do container raiz |
| `<main>` presente mas sem `id` referenciável por skip-link | `authenticated-shell.tsx:319` — `<main className="flex-1 overflow-y-auto">` | Adicionar `id="main-content"` |

**Confirmação do landmark `<main>`**: cada shell tem exatamente **um** `<main>` (`public-shell.tsx:50`, `authenticated-shell.tsx:319`) — nenhum dos dois está duplicado nem ausente. O problema não é a existência do landmark, é a falta de (a) `id` nele e (b) um link âncora que aponte para esse `id` e apareça só no foco.

**Correção proposta — `public-shell.tsx`** (inserir logo após a abertura do `<div>` raiz, antes do `<header>`):

```tsx
<a
	href="#main-content"
	className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-accent-foreground"
>
	Pular para o conteúdo principal
</a>
```

e trocar a linha 50:
```tsx
<main id="main-content" className="flex-1">{children}</main>
```

**Correção proposta — `authenticated-shell.tsx`** (inserir como primeiro filho do `<div data-testid="authenticated-shell">`, antes do `<aside>`):

```tsx
<a
	href="#main-content"
	className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-accent-foreground"
>
	Pular para o conteúdo principal
</a>
```

e trocar a linha 319:
```tsx
<main id="main-content" className="flex-1 overflow-y-auto">
```

Texto sugerido "Pular para o conteúdo principal" (não genérico, nomeia o destino). `sr-only` + `focus:not-sr-only` é o padrão Tailwind para "visível só no foco". `z-50` evita que o link fique atrás do header sticky do shell autenticado (`z-30`).

Origem: **módulo** — corrigir direto no PR.

---

### 1.4.4 — Redimensionar Texto · AA · 🟢 Baixo · 1 problema

Trecho exato encontrado em `apps/frontend/src/app/globals.css:134-143`:

```css
body {
	min-height: 100%;
	background-color: var(--color-background);
	color: var(--color-foreground);
	font-family: var(--font-sans);
	font-size: 15px;
	line-height: 1.5;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
}
```

| Ocorrência | Local | Correção |
|---|---|---|
| `font-size em px fixo (15px) – considere usar rem/em para redimensionamento.` | `globals.css:139`, seletor `body` | `font-size: 0.9375rem;` |

**Seletor exato**: `body` (não é `html`, não é uma classe utilitária — é a regra base do documento dentro de `@layer base`).

**15px é a base do rem, ou um valor solto?** É um **valor solto**, não a base do rem. `rem` sempre resolve contra o `font-size` do elemento raiz (`<html>`), nunca contra `body`. O bloco `html` neste arquivo (linhas 129-132) só define `height` e `color-scheme`, sem tocar `font-size` — logo a base do `rem` continua sendo o padrão do navegador (tipicamente 16px, ajustável pelo usuário). Os `15px` do `body` afetam apenas o texto que herda diretamente dele sem receber uma classe de tamanho Tailwind — não influenciam nenhum cálculo `rem` usado em outro lugar do app.

**Efeito de converter para rem** — trocar `font-size: 15px` por `font-size: 0.9375rem` (15 ÷ 16):
- O tamanho computado por padrão **não muda** (0.9375rem × 16px = 15px), nada quebra visualmente hoje.
- Passa a funcionar: se o usuário aumentar o "tamanho de fonte padrão" do navegador/SO, o texto que herda diretamente do `body` escala junto; hoje fica travado em 15px absolutos.
- Quebraria se a conversão não mantivesse a razão `15/16` (ex.: escrever `1rem` sem recalcular) — o tamanho base do documento mudaria para todo texto sem classe de tamanho explícita.
- Nenhum outro seletor do arquivo depende do valor de `body` para seu próprio cálculo de `rem` — todos os outros tamanhos vêm de utilitários Tailwind ancorados em `html`. Raio de impacto: contido ao texto sem classe de tamanho explícita.

Origem: **tokens do design system (interno ao projeto)** — corrigir no PR.

---

### 2.4.7 — Foco Visível · AA · 🟡 Médio · 1 problema

Regra exata em `apps/frontend/src/app/globals.css:177-180`:

```css
*:focus-visible {
	outline: 2px solid color-mix(in srgb, var(--color-ring) 55%, transparent);
	outline-offset: 2px;
}
```

- **Seletor**: `*:focus-visible` (universal, dentro de `@layer base`).
- **Valor de `--color-ring`**: `#39e58c` no tema claro (linha 53) e `#39e58c` no tema escuro (linha 110) — o mesmo valor nos dois temas, sem override em `.dark`.
- **`outline: none` em qualquer lugar do arquivo**: busca completa — **nenhuma ocorrência**. Não há reset de foco no arquivo.

| Ocorrência | Local | Correção |
|---|---|---|
| `Indicador de foco potencialmente sutil (outline fino/transparente).` | `globals.css:178`, seletor `*:focus-visible` | Ver cálculo de contraste abaixo — o problema não é espessura (2px é adequado), é a cor efetiva contra fundos claros |

Origem: **tokens do design system (interno ao projeto)** — corrigir no PR.

---

### 1.4.11 — Contraste Não-Textual · AA · 🟠 Alto · 1 problema

Cálculo de contraste (WCAG relative luminance) a partir dos tokens declarados no arquivo:

| Fundo (tema claro) | Cor composta do outline | Contraste vs. fundo |
|---|---|---|
| `--color-background` `#f1f1ec` | `rgb(140,234,183)` | **1.27:1** |
| `--color-surface` `#ffffff` (cards) | `rgb(146,241,192)` | **1.35:1** |
| `--color-background` `#080808` (tema escuro) | `rgb(35,130,81)` | 4.18:1 |
| `--color-card` `#161616` (tema escuro) | `rgb(41,136,87)` | 4.10:1 |

Mínimo exigido por 1.4.11 para indicadores de foco: **3:1**. Tema escuro passa com folga (~4.1–4.2:1). **Tema claro reprova por larga margem** (1.27–1.35:1).

Variando o alfa do `color-mix` de 55% a 100% (opaco): contraste sobe apenas até **1.65:1** contra `--color-surface` — ainda reprova. Mesmo `--color-primary-strong` (`#22c976`, o verde mais escuro da paleta) mede só 1.91–2.17:1. **Nenhum verde da paleta atual do tema claro atinge 3:1 contra os fundos claros**, em nenhuma opacidade — o problema é de matiz/luminosidade, não de opacidade.

| Ocorrência | Local | Correção |
|---|---|---|
| Indicador de foco (`*:focus-visible`, `--color-ring: #39e58c`) com contraste ~1.27–1.35:1 contra `--color-background`/`--color-surface` no tema claro — abaixo do mínimo de 3:1. | `globals.css:53` (token) e `globals.css:177-180` (regra) | **Decidido no design (Seção 1, mockup validado):** técnica de **anel duplo** — `box-shadow: 0 0 0 3px var(--color-background), 0 0 0 6px var(--color-foreground)` — substitui o `outline` verde translúcido por um contorno que usa a cor de fundo como "gap" e um contorno escuro por fora, atingindo ≥16:1 em qualquer fundo, sem depender de `--color-ring` |

Origem: **tokens do design system (interno ao projeto)** — corrigir no PR. Mesmo defeito atravessa 2.4.7 e 1.4.11 (cascata) — duas ocorrências, uma causa raiz.

---

## `N/A` justificados

Nenhum dos quatro critérios solicitados foi marcado N/A — todos tinham inventário aplicável nos três arquivos do escopo.

## Pendente de runtime

- **Verificação visual final do anel duplo** — confirmar no DevTools/eyedropper, nos dois temas, que a técnica `box-shadow` escolhida no design renderiza como esperado (sem clipping em cantos arredondados/`overflow:hidden`).
- **Reflow do skip-link em 320px de largura** — depois de implementada a correção de 2.4.1, confirmar no navegador que o link, ao receber foco, não é cortado nem sobreposto pelo header sticky do `authenticated-shell.tsx` (`z-30`) em viewports estreitas.
