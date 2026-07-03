# Task 9: Frontend — Corrigir scroll do menu lateral (`min-h-0`)

**Status:** DONE
**PRD:** N/A
**Spec:** ../specs/normalizar-menu-e-paginacao-design.md
**Tier:** cheap
**Depends on:** N/A

## Visão Geral

Corrigir o bug em que o menu lateral (`authenticated-shell.tsx`) não permanece fixo/visível ao rolar telas internas com bastante conteúdo (ex.: `/admin/usuarios`). A causa raiz é a ausência da classe Tailwind `min-h-0` em um ou mais containers flex ancestrais da área de conteúdo scrollável — o comportamento padrão de flex items é `min-height: auto`, que impede o item de encolher abaixo do tamanho do seu conteúdo, quebrando o `overflow-y: auto` interno e fazendo a página inteira (incluindo o menu lateral) rolar junto em vez de apenas a área de conteúdo. A correção é puramente estrutural (classes Tailwind), sem lógica nova.

## Arquivos

- Modify: `apps/frontend/src/components/layout/authenticated-shell.tsx`

### Conformidade com as Skills Padrão

- `systematic-debugging`: antes de aplicar qualquer correção, reproduza/confirme a causa raiz lendo a árvore real de containers flex do arquivo — não assuma qual container específico precisa da classe sem inspecionar o código real primeiro.
- `no-workarounds`: a correção deve atacar a causa raiz (falta de `min-h-0` na cadeia flex correta) e não um paliativo como `overflow: hidden` forçado no body, `position: fixed` manual no menu, ou JavaScript de scroll sincronizado — essas seriam gambiarras que mascaram o sintoma sem corrigir o modelo de flexbox subjacente.
- `tailwindcss`: usar a classe utilitária `min-h-0` (equivalente a `min-height: 0`) no(s) container(s) flex correto(s), sem introduzir CSS customizado fora do sistema de utilitários já usado no arquivo.
- `test-antipatterns`: não inventar um teste automatizado de scroll visual que não existe hoje no repositório (YAGNI) — se não há teste de layout cobrindo isso, a verificação é manual e deve ser declarada como tal.
- `vitest`: caso exista algum teste de snapshot/estrutura de `authenticated-shell.tsx` já existente no repositório, rodá-lo para garantir que a mudança de classes não quebre asserções de estrutura DOM.

## Passos

- **Step 1: Investigar a causa raiz — identificar a cadeia de containers flex (não presuma, leia o arquivo real)**

Abra `apps/frontend/src/components/layout/authenticated-shell.tsx` e identifique a cadeia de containers flex entre o elemento que tem o scroll (o elemento com `overflow-y-auto` ou equivalente na área de conteúdo principal) até a raiz do componente. Para cada ancestral direto que seja um container flex (`flex`, `flex-1`, `flex-col`, `flex-row` etc.) e que hoje NÃO tenha `min-h-0` (ou `min-h-full`/`min-h-screen` que já resolveria o mesmo problema de outra forma), anote o elemento como candidato à correção, começando pelo mais próximo do elemento scrollável e subindo em direção à raiz.

Confirme a hipótese observando também se o container raiz do shell tem uma altura definida (ex.: `h-screen` ou `h-dvh`) — sem uma altura explícita no topo da árvore, `min-h-0` sozinho nos descendentes não resolve o problema, porque não há uma altura de referência para o `overflow-y-auto` calcular contra. Se a altura no topo já existe, prossiga apenas adicionando `min-h-0` aos ancestrais flex intermediários identificados.

- **Step 2: Verificação manual do bug ANTES da correção (baseline)**

Não há teste automatizado de scroll visual existente no repositório cobrindo este cenário — a verificação é manual, seguindo `systematic-debugging` (reproduzir antes de corrigir):

Run: `pnpm --filter frontend dev`

Acesse `/admin/usuarios` no navegador com dados suficientes para gerar scroll vertical (a listagem de usuários paginada já deve ter conteúdo suficiente; se necessário, redimensione a janela do navegador para uma altura menor para forçar overflow). Role a área de conteúdo e CONFIRME o bug: o menu lateral rola junto com o conteúdo em vez de permanecer fixo/visível. Documente esse comportamento como a reprodução da causa raiz antes de prosseguir para a correção.

- **Step 3: Aplicar a correção — adicionar `min-h-0` aos containers flex identificados**

Edite `apps/frontend/src/components/layout/authenticated-shell.tsx`, adicionando a classe `min-h-0` a cada ancestral flex direto identificado no Step 1 que hoje não a tem, começando pelo mais próximo do elemento scrollável. Exemplo do padrão de correção esperado (os nomes exatos de elementos/classes devem ser ajustados ao arquivo real):

```tsx
// antes (padrão hipotético, ajuste ao real):
// <div className="flex h-screen">
//   <aside className="w-64 shrink-0">{/* menu lateral */}</aside>
//   <div className="flex flex-1 flex-col">
//     <header>...</header>
//     <main className="flex-1 overflow-y-auto">{children}</main>
//   </div>
// </div>

// depois:
<div className="flex h-screen">
  <aside className="w-64 shrink-0">{/* menu lateral */}</aside>
  <div className="flex min-h-0 flex-1 flex-col">
    <header>...</header>
    <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
  </div>
</div>
```

Aplique `min-h-0` a TODOS os containers flex intermediários entre a raiz (`h-screen`/`h-dvh`) e o elemento com `overflow-y-auto`, não apenas ao elemento imediatamente pai do scroll — cada nível da cadeia flex que hoje falta `min-h-0` contribui para o bug, e pular um nível intermediário mantém o problema.

- **Step 4: Verificação manual da correção (confirmar que o bug foi resolvido)**

Com o servidor de dev já rodando (ou reiniciando-o, se necessário):

Run: `pnpm --filter frontend dev`

Acesse novamente `/admin/usuarios` com dados suficientes para gerar scroll vertical. Role a área de conteúdo e CONFIRME visualmente que o menu lateral agora permanece fixo/visível na tela enquanto apenas a área de conteúdo interno rola. Esta verificação manual é o critério de aceite final desta task, já que não existe teste automatizado de layout/scroll cobrindo este comportamento no repositório.

- **Step 5: Rodar tsc:check e lint:fix**

Run: `pnpm --filter frontend tsc:check`
Expected: PASS — sem erros de tipo (mudança é apenas de classes CSS/JSX, não deve introduzir erros de tipo).

Run: `pnpm --filter frontend lint:fix`
Expected: PASS — zero problemas reportados pelo Biome.

- **Step 6: Rodar qualquer teste existente de `authenticated-shell` (se houver) para garantir ausência de regressão estrutural**

Run: `pnpm --filter frontend test -- --run authenticated-shell`
Expected: PASS se existir suíte de teste para este componente; se o comando não encontrar nenhum arquivo de teste correspondente, isso é esperado (não crie um teste novo para este cenário — YAGNI, conforme `test-antipatterns`) e a verificação de aceite permanece a manual do Step 4.

- **Step 7: Commit**

```bash
git add apps/frontend/src/components/layout/authenticated-shell.tsx
git commit -m "fix(layout): adicionar min-h-0 na cadeia flex para corrigir scroll do menu lateral"
```

## Critérios de Sucesso

- A cadeia de containers flex entre a raiz (`h-screen`/`h-dvh`) e o elemento com `overflow-y-auto` em `authenticated-shell.tsx` tem `min-h-0` em cada ancestral flex intermediário que antes não tinha.
- Nenhuma gambiarra (overflow forçado no body, `position: fixed` manual, scroll sincronizado via JS) foi introduzida — a correção é exclusivamente via classes Tailwind na árvore de flex existente.
- Verificação manual confirma: em `/admin/usuarios` com conteúdo suficiente para gerar scroll, o menu lateral permanece fixo/visível enquanto a área de conteúdo rola de forma independente.
- `pnpm --filter frontend tsc:check` e `pnpm --filter frontend lint:fix` passam sem erros/problemas.
- Se existir suíte de teste para `authenticated-shell`, ela continua passando; caso não exista, nenhum teste novo foi criado para este cenário (YAGNI).
