---
created_at: "2026-08-26T14:57:46-03:00"
updated_at: "2026-08-26T14:57:46-03:00"
---

# Design — Acessibilidade WCAG 2.2 em todo o frontend (inputs, imagens, botões, shell, design system)

## Visão Geral

Esta feature mapeia, via auditoria real contra WCAG 2.2 (skill `wcag-audit-patterns`, `--mode review`), todos os achados de acessibilidade em inputs, imagens e botões do `apps/frontend`, mais dois itens de camada diferente que já haviam sido deferidos duas vezes por features anteriores (`contato-acessibilidade`): o skip-link do shell (2.4.1) e o `font-size` fixo em px do design system (1.4.4).

**Esta rodada não implementa** — produz o inventário completo, as decisões arquiteturais e os riscos que alimentam a fase de planejamento (`super.writing-plans`).

Quatro subagentes rodaram a skill `wcag-audit-patterns` em paralelo, restritos aos critérios relevantes para inputs/imagens/botões/foco/skip-link/font-size (não a matriz completa de 55 critérios). Resultado consolidado: **25 itens de critério, 59 ocorrências**, persistidos em 4 relatórios separados:

- `research/audit-primitivas-compartilhadas.md` — `components/ui/{button,input,label,form-field,field-shell,checkbox,card,pagination}.tsx` (8 itens, 21 problemas)
- `research/audit-gyms-check-ins.md` — `features/gyms`, `features/check-ins`, `academias/**` (7 itens, 17 problemas)
- `research/audit-admin-outros.md` — `admin`, `assinatura`, `profile`, notificações, `search-bar`, `command-palette` (6 itens, 14 problemas)
- `research/audit-shell-css-global.md` — `public-shell.tsx`, `authenticated-shell.tsx`, `globals.css` (4 itens, 7 problemas)

Precedente direto: `contato-acessibilidade` (QA PASS) já validou o padrão de indicador de obrigatoriedade (traço sutil + `aria-required` + `sr-only`) e o reforço de foco, escopados a um único componente. Esta feature generaliza essas decisões para toda a aplicação, com dois desvios explícitos (D2, D6 — ver Decisões Arquiteturais).

## Características Arquiteturais

**Priorizadas (top 3):**

| Característica | Por quê (preocupação de domínio) | Critério mensurável |
|---|---|---|
| Acessibilidade | Objetivo direto — conformidade WCAG 2.2 nos 3 tipos de elemento + shell + tokens globais | As 59 ocorrências fecham (viram correção) ou viram risco aceito explicitamente documentado; nenhum achado fica sem dono |
| Consistência | Reaproveitar decisões já validadas (`contato-acessibilidade`) generalizando-as, em vez de inventar padrão novo | Padrão de indicador/foco idêntico em todos os formulários após a migração |
| Manutenibilidade | A migração dos `<input>` crus para `Input`/`FormField` compartilhado só compensa se blindar campos futuros | Novo campo criado com `FormField`/`FieldShell` herda conformidade sem trabalho extra |

**Consideradas, não priorizadas:** performance (mudanças são atributos/CSS, sem impacto de runtime relevante); disponibilidade (não altera nenhum endpoint/contrato).

## Especificação Visual

**Artefato curado:** `mockups/acessibilidade-frontend-visual.md`

**Fonte de design original:** Nenhuma; opções comparadas via mockup do companion, gerado a partir dos tokens reais do projeto.

**Decisão visual validada:** técnica de "anel duplo" para o indicador de foco (ver D2 abaixo) — escolhida entre 3 opções renderizadas lado a lado (atual / anel escuro sólido / anel duplo) sobre um botão e um input reais do design system, no tema claro (onde o problema de contraste existe).

**Fidelidade:** o mockup é um *norte* — a espessura exata do gap/contorno e a confirmação de contraste renderizado (Tailwind v4 mistura em `oklab`) são construídas na implementação.

## Estrutura de Componentes

- **Primitivas compartilhadas** (`components/ui/`): `button.tsx`, `input.tsx`, `checkbox.tsx` recebem o novo token de foco (D2); `pagination.tsx` recebe `href` obrigatório (D5); `card.tsx` (`CardTitle`) passa a renderizar heading semântico (D5); `form-field.tsx`/`field-shell.tsx` mantêm o traço de obrigatoriedade como está (D6).
- **Migração de inputs** (D1): `gym-image-uploader.tsx`, `check-in-search-input.tsx`, `search-bar.tsx`, `command-palette.tsx`, `gym-cnpj-field.tsx`, `gym-location-picker.tsx`, `assinatura/page.tsx` passam a usar `Input`/`Label`/`FormField`/`FieldShell` em vez de `<input>` cru.
- **Shell** (D3): `public-shell.tsx`, `authenticated-shell.tsx` ganham skip-link + `id="main-content"` no `<main>`.
- **Design system** (D2, D4): `globals.css` — token `*:focus-visible` (anel duplo) e `body { font-size }` (rem).
- **Correções pontuais** (sem decisão arquitetural própria, listadas nos 4 relatórios de auditoria): `aria-hidden` em ícones decorativos sem marcação (`at-risk-alert-zone.tsx`, `details-edit-form.tsx`, `segmented-control.tsx`), `aria-label` por item no toggle de visualização de `academias/page.tsx`, alvo de toque do botão "Limpar busca" em `check-in-search-input.tsx`.
- Nenhum componente novo é criado.

## Decisões Arquiteturais

### D1. Migração dos `<input>` crus para `Input`/`Label`/`FormField` compartilhados

- **Contexto:** ~7 arquivos com `<input>` cru espalhados por features (gyms, check-ins, admin, assinatura, search-bar, command-palette), sem herdar nenhuma correção futura de acessibilidade.
- **Decisão:** cada ocorrência migra para os componentes `Input`/`FormField`/`FieldShell` já existentes em `components/ui/`.
- **Justificativa técnica:** consolida a conformidade num único ponto de manutenção.
- **Justificativa de negócio:** suporta a característica de Manutenibilidade — evita que cada novo formulário reintroduza os mesmos gaps.
- **Trade-offs aceitos:** diff maior agora (troca de elemento, não só atributo); risco de regressão em integrações específicas (`IMaskInput` em `gym-cnpj-field.tsx`, `<input type="range">` de zoom, `<input type="file">`) — ver Riscos.

### D2. Anel de foco — técnica de anel duplo, sem depender de `--color-ring`

- **Contexto:** achado `1.4.11`/`2.4.7` — nenhum verde da paleta atual atinge 3:1 de contraste contra fundos claros, em nenhuma opacidade (testado de 55% a 100%, incluindo o tom mais escuro `--color-primary-strong`).
- **Decisão:** substituir `outline`/`ring` baseados em `--color-ring` por `box-shadow: 0 0 0 3px var(--color-background), 0 0 0 6px var(--color-foreground)`, no token global `*:focus-visible` e nos overrides locais de `button.tsx`, `input.tsx`, `checkbox.tsx`. Validado visualmente com o usuário (ver Especificação Visual).
- **Justificativa técnica:** ≥16:1 de contraste em qualquer fundo/tema, sem precisar recalibrar `--color-ring` por tema.
- **Justificativa de negócio:** resolve o achado sem introduzir uma segunda paleta de cor "só para foco", mantendo consistência visual entre temas.
- **Trade-offs aceitos:** muda a aparência do foco em toda a aplicação (efeito colateral desejado, mas visível a usuários que já conhecem o padrão atual); risco de clipping em elementos com `overflow:hidden`/raio de borda muito fechado — ver Riscos.

### D3. Skip-link nos dois shells

- **Contexto:** achado `2.4.1`, deferido duas vezes por `contato-acessibilidade` como "camada diferente" (shell vs. componente).
- **Decisão:** link `sr-only focus:not-sr-only` como primeiro filho de `public-shell.tsx` e `authenticated-shell.tsx`, apontando para `id="main-content"` adicionado ao `<main>` de cada um. Texto: "Pular para o conteúdo principal".
- **Justificativa técnica:** padrão Tailwind (`sr-only`/`focus:not-sr-only`) já usado no ecossistema shadcn; não exige biblioteca nova.
- **Justificativa de negócio:** fecha uma dívida de acessibilidade que se arrastava desde a primeira feature de acessibilidade do projeto.
- **Trade-offs aceitos:** nenhum — mudança aditiva, sem impacto em layout existente (elemento é `sr-only` fora do foco).

### D4. `font-size` global de `body` — px para rem

- **Contexto:** achado `1.4.4`, `globals.css:139`, também deferido duas vezes.
- **Decisão:** `font-size: 15px` → `font-size: 0.9375rem` no seletor `body`.
- **Justificativa técnica:** confirmado analiticamente que `body` não é a base do `rem` (a base é `html`, sem override) e nenhum outro seletor do arquivo depende do valor de `body` — conversão sem efeito cascata, tamanho computado idêntico hoje.
- **Justificativa de negócio:** fecha a segunda dívida de acessibilidade deferida, sem risco de quebra visual.
- **Trade-offs aceitos:** nenhum — mudança é transparente até o usuário ajustar preferências de fonte do navegador/SO, quando passa a funcionar como esperado.

### D5. Riscos estruturais das primitivas — abordagem "meio-termo"

- **Contexto:** três achados são riscos de fundação, não falhas ativas: `Button` `size="icon"` não exige `aria-label` por tipo; `PaginationLinkProps.href` é opcional; `CardTitle` renderiza `<div>` em vez de heading semântico.
- **Decisão:** `PaginationLinkProps.href` vira obrigatório (tipo); `CardTitle` renderiza `<h3>` por padrão, com prop `as` para o consumidor sobrescrever o nível; `Button` fica apenas documentado (JSDoc no componente + regra no `AGENTS.md` de UI: "`size=icon` exige `aria-label`"), sem enforcement de tipo.
- **Justificativa técnica:** `PaginationLink`/`CardTitle` têm baixo risco de quebra (nenhum uso ativo encontrado sem `href`; `as` evita quebra de hierarquia); `Button` é usado em ~37 pontos e um enforcement de tipo indiscriminado quebraria compilação em call sites hoje corretos só por convenção não verificada.
- **Justificativa de negócio:** fecha 2 dos 3 riscos de fundação sem introduzir um breaking change de alto raio de impacto no componente mais usado do design system.
- **Trade-offs aceitos:** `Button` `size="icon"` sem `aria-label` continua sendo possível de escrever sem erro de compilação — risco aceito conscientemente, mitigado só por documentação (ver Riscos).

### D6. Indicador de obrigatoriedade — traço sutil mantido (decisão preservada)

- **Contexto:** achado `3.3.2` em `form-field.tsx`/`field-shell.tsx` reabre a decisão D1 de `contato-acessibilidade`, que rejeitou deliberadamente asterisco/frase visível por peso visual.
- **Decisão:** manter o traço sem símbolo/texto visível — decisão original preservada, mesmo generalizando para toda a aplicação.
- **Justificativa técnica:** a semântica de obrigatoriedade já é carregada por `aria-required` + texto `sr-only`, não pelo traço — o traço é reforço visual, não a fonte de verdade de acessibilidade.
- **Justificativa de negócio:** mantém a identidade visual "clean" definida no redesign VOLT, evitando reabrir uma decisão visual já validada em produção (QA PASS).
- **Trade-offs aceitos:** usuário sem contexto pode não reconhecer o traço isoladamente como "campo obrigatório" — risco aceito e registrado, não pendência.

## Riscos

| Risco | Impacto (1-3) | Probabilidade (1-3) | Score | Mitigação |
|---|---|---|---|---|
| Anel duplo (`box-shadow`) sofre clipping em elementos com `overflow:hidden` ou raio de borda muito fechado | 2 | 2 | 4 🟡 | Validação manual por componente afetado na task de implementação; ajustar `outline-offset`/gap caso a caso |
| Migração de `<input>` cru quebra integrações específicas (`IMaskInput`, `<input type="range">`, `<input type="file">`) | 2 | 2 | 4 🟡 | Migrar campo por campo com teste de unidade cobrindo o comportamento específico antes/depois |
| `CardTitle` virando `<h3>` por padrão altera a árvore de headings em páginas com hierarquia própria | 2 | 2 | 4 🟡 | Prop `as` permite override; levantamento de hierarquia por página fica para a task de planejamento |
| `PaginationLink.href` obrigatório é breaking change de tipo | 2 | 1 | 2 🟢 | `tsc:check` pega qualquer quebra antes de merge; auditoria não encontrou uso ativo sem `href` |
| `Button size="icon"` sem enforcement de tipo — nada impede um botão-ícone futuro sem `aria-label` | 2 | 2 | 4 🟡 | Documentado em JSDoc + `AGENTS.md` de UI; risco aceito conscientemente (D5) |
| Traço de obrigatoriedade sem símbolo/texto visível pode não ser reconhecido isoladamente | 1 | 2 | 2 🟢 | Decisão preservada (D6); mitigado por `aria-required`+`sr-only`, não pelo visual |

## Testes

- **Unitários:** estender o padrão de `contact-form.test.tsx` (`getByRole`, `toHaveAttribute("aria-required", ...)`) para cada campo migrado (D1): `gym-cnpj-field`, `gym-location-picker`, `check-in-search-input`, `search-bar`, `EditProfileModal`, `details-edit-form`. Novo teste de tipo para `PaginationLink` (compilação falha sem `href`) e de renderização para `CardTitle` (`<h3>` por padrão, aceita `as`).
- **E2E de acessibilidade:** estender `apps/frontend/e2e/accessibility.spec.ts` (já roda `AxeBuilder` com tags `wcag2a/wcag2aa/wcag21a/wcag21aa`, falha em `critical`/`serious`) para cobrir `/academias`, `/check-ins`, `/admin/usuarios`, `/assinatura`, perfil.
- **Verificação manual/QA (fora do runner automatizado):** contraste do anel duplo nos dois temas; reflow do skip-link em 320px; navegação completa por Tab em cada página migrada; contraste real de ícones herdando `currentColor`; alvo de toque de sliders/checkbox; sobreposição de `Link`s absolutos em cards de academia (todos listados como "Pendente de runtime" nos 4 relatórios de auditoria).
