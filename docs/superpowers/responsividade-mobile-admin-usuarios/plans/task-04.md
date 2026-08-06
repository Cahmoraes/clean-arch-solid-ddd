# Task 4: Header do `authenticated-shell`: duas instâncias de cada componente

**Status:** DONE
**PRD:** N/A
**Spec:** `../specs/responsividade-mobile-admin-usuarios-design.md`
**Tier:** standard
**Depends on:** task-02, task-03

## Visão Geral

O header em `authenticated-shell.tsx` hoje renderiza UMA instância de `SearchBar` e UMA de `ThemeToggle`. Troca isso por DUAS instâncias de cada — uma "completa" visível acima de 560px (`max-[560px]:hidden`) e uma "compacta" visível abaixo de 560px (`hidden max-[560px]:flex`), usando as props `compact` adicionadas nas Tasks 2 e 3. Segue o mesmo padrão CSS-only já usado hoje pelo `SearchBar` completo (`max-[560px]:hidden`), sem hook de media query novo. Como as duas instâncias de `ThemeToggle` ficam montadas simultaneamente no DOM (uma escondida via CSS), o teste existente que localiza o toggle por `getByRole("button", { name: /modo/i })` (que assume uma única instância) precisa mudar para `getAllByRole`. `SearchBar` é puramente apresentacional e `ThemeToggle` só tem um `useEffect` local de guarda de hidratação (`mounted`), sem side-effect global compartilhado — montar as duas instâncias simultaneamente é seguro; ainda assim, confirmar a ausência de efeito duplicado (ex. listener, analytics) faz parte dos Critérios de Sucesso desta task (R3 do spec).

## Arquivos

- Modify: `apps/frontend/src/components/layout/authenticated-shell.tsx`
- Test: `apps/frontend/src/components/layout/authenticated-shell.test.tsx`
- Modify: `docs/superpowers/global-command-palette/qa/evidence/us-001-usurio-autenticado-abrir-um-palette/us-001-navigation-palette-open-close.acceptance.test.tsx` (teste de aceitação de outra feature já entregue, que renderiza o `AuthenticatedShell` real — quebra com a mudança desta task; ver Step 5.5)

### Conformidade com as Skills Padrão

- `tailwindcss`: reaproveita o padrão CSS-only `max-[560px]:hidden` / `hidden max-[560px]:flex` já usado no `SearchBar` completo hoje — a skill cobre esse padrão de breakpoints arbitrários no Tailwind v4.
- `vercel-react-best-practices`: o header passa a montar duas instâncias do mesmo componente simultaneamente (uma oculta via CSS) — a skill cobre implicações de performance/render de múltiplas instâncias de Client Components no mesmo componente Next.js.
- `vercel-composition-patterns`: o header compõe duas variantes (`compact`/completa) do mesmo componente lado a lado — a skill cobre como estruturar essa composição sem duplicar lógica entre as instâncias.
- `test-antipatterns`: o teste existente que assume uma única instância de `ThemeToggle` precisa ser reescrito para múltiplas instâncias (`getAllByRole`) em vez de acoplar-se à contagem antiga — a skill orienta a evitar essa fragilidade.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/responsividade-mobile-admin-usuarios-visual.md` (seção "Header (<560px)") — baseline: `<header class="app-header">` com botão de busca (`w-[38px] h-[38px]`) + `ThemeToggle` redondo (`w-9 h-9`) + `NotificationBell`/`Avatar` inalterados.
- **Fonte de design original:** nenhuma; layout definido apenas via mockup do companion visual desta sessão, a partir de screenshots reais do app.
- **Confirmar com o usuário:** não aplicável — spec e mockup já registram que não há fonte de design original (Figma/export); nada a confirmar além disso.
- **Ferramentas de fidelidade visual (descobrir no ambiente):** nenhuma ferramenta de design-to-code dedicada configurada neste repo; usar a skill `playwright-cli` (ou `claude-in-chrome`, se disponível na sessão) para abrir `pnpm --filter frontend dev` e conferir visualmente o header em 414px, 560px e ≥768px — construção manual a partir do mockup.
- **Decisões visuais já tomadas (não refazer):** duas instâncias de `SearchBar` (padrão `max-[560px]:hidden` / `hidden max-[560px]:flex`) e duas de `ThemeToggle` (mesmo padrão); `NotificationBell` (38-42px) e `Avatar` (32-36px) mantêm tamanho atual em qualquer largura, sem trocar de variante.

## Passos

- **Step 0: Confirmar fonte de design e ferramentas de fidelidade**

Releia a subseção `### Fidelidade Visual` acima. Não há fonte de design original a confirmar (já registrado no spec). Verifique se `playwright-cli` ou `claude-in-chrome` estão disponíveis nesta sessão; se nenhuma estiver, a verificação visual é feita rodando `pnpm --filter frontend dev` e inspecionando manualmente o header em 414px, 560px e ≥768px.

- **Step 1: Escrever os testes que falham**

Em `apps/frontend/src/components/layout/authenticated-shell.test.tsx`, substitua o teste `"renderiza o toggle de tema na topbar"` por:

```tsx
test("renderiza as duas instâncias do toggle de tema (completa e compacta) na topbar", () => {
	setRole("MEMBER")
	renderWithProviders(
		<AuthenticatedShell>
			<p>conteúdo</p>
		</AuthenticatedShell>,
	)
	expect(screen.getAllByRole("button", { name: /modo/i })).toHaveLength(2)
})
```

E adicione um novo teste ao mesmo `describe`:

```tsx
test("renderiza duas instâncias de busca (completa e compacta) na topbar", () => {
	setRole("MEMBER")
	renderWithProviders(
		<AuthenticatedShell>
			<p>conteúdo</p>
		</AuthenticatedShell>,
	)
	expect(
		screen.getByRole("button", { name: /buscar\.\.\./i }),
	).toBeInTheDocument()
	expect(screen.getByRole("button", { name: "Buscar" })).toBeInTheDocument()
})
```

- **Step 2: Rodar os testes para confirmar que falham**

Run: `pnpm --filter frontend exec vitest run src/components/layout/authenticated-shell.test.tsx`
Expected: FAIL — `"renderiza as duas instâncias do toggle de tema..."` falha porque hoje só existe 1 `ThemeToggle` (`getAllByRole` retorna array de tamanho 1, não 2). `"renderiza duas instâncias de busca..."` falha porque o botão com nome acessível `"Buscar"` (a variante compacta) ainda não existe. Os demais testes já existentes no arquivo continuam passando.

- **Step 3: Adicionar as duas instâncias de cada componente no header**

Em `apps/frontend/src/components/layout/authenticated-shell.tsx`, troque o bloco do `<header>`:

```tsx
<header className="sticky top-0 z-30 flex items-center gap-4 border-b border-border bg-background/80 px-8 py-4 backdrop-blur-md max-[560px]:px-4">
	<SearchBar
		showShortcut
		placeholder="Buscar..."
		aria-label="Buscar"
		className="max-w-[460px] flex-1 max-[560px]:hidden"
		onActivate={() => setIsCommandPaletteOpen(true)}
	/>
	<SearchBar
		compact
		placeholder="Buscar..."
		className="hidden max-[560px]:flex"
		onActivate={() => setIsCommandPaletteOpen(true)}
	/>
	<div className="ml-auto flex items-center gap-3">
		<ThemeToggle className="max-[560px]:hidden" />
		<ThemeToggle compact className="hidden max-[560px]:flex" />
		<NotificationBell />
		<Link href="/perfil" aria-label="Ir para perfil">
			<Avatar name={meData?.name} size="sm" />
		</Link>
	</div>
</header>
```

(Mudanças: adiciona uma segunda `SearchBar` com `compact` e `className="hidden max-[560px]:flex"`; adiciona `className="max-[560px]:hidden"` ao `ThemeToggle` completo existente e uma segunda `ThemeToggle` com `compact` e `className="hidden max-[560px]:flex"`; `NotificationBell`, `Link`/`Avatar` não mudam.)

- **Step 4: Rodar os testes para confirmar que passam**

Run: `pnpm --filter frontend exec vitest run src/components/layout/authenticated-shell.test.tsx`
Expected: PASS — os 12 testes do arquivo passam (10 já existentes + 2 novos/ajustados).

- **Step 5: Verificação manual do header em 414px, 560px e ≥768px**

Não há teste automatizado que cubra qual instância fica visível em cada largura (`max-[560px]:hidden`/`hidden max-[560px]:flex` dependem do viewport real, não simulável em `happy-dom`). Rode `pnpm --filter frontend dev`, acesse `/admin/usuarios` autenticado e confirme:
1. Em 414px: aparecem só o botão-ícone de busca e o `ThemeToggle` redondo; `NotificationBell`/`Avatar` no tamanho de sempre.
2. Em 560px (limiar): mesmo comportamento de 414px — `max-[560px]` casa em exatamente 560px de largura, então a variante compacta ainda aparece nessa largura; a completa só volta a partir de 561px.
3. Em ≥768px: aparecem só o `SearchBar` completo e o `ThemeToggle` em pill, idêntico ao header antes da mudança.
4. Incluir também 896×414 (paisagem) e o painel de detalhes de usuário com o teclado virtual aberto sobre o formulário de edição.

- **Step 5.5: Corrigir teste de aceitação de outra feature quebrado por esta mudança**

O arquivo `docs/superpowers/global-command-palette/qa/evidence/us-001-usurio-autenticado-abrir-um-palette/us-001-navigation-palette-open-close.acceptance.test.tsx` (feature `global-command-palette`, já entregue) renderiza o `AuthenticatedShell` real e usa `screen.getByRole("button", { name: /buscar/i })` para localizar o botão da `SearchBar`, no teste `"clicar no SearchBar chama onActivate e abre palette"`. Com o Step 3 desta task, passam a existir DUAS instâncias de `SearchBar` montadas simultaneamente (nome acessível `"Buscar..."` na completa, `"Buscar"` na compacta) — o regex `/buscar/i` casa com as duas, e `getByRole` lança "found multiple elements". Restrinja o seletor à variante completa:

```tsx
const searchBtn = screen.getByRole("button", { name: /buscar\.\.\./i })
```

(Única mudança nesse arquivo: `name: /buscar/i` → `name: /buscar\.\.\./i` na linha do teste `"clicar no SearchBar chama onActivate e abre palette"`; nada mais no arquivo muda.)

**Limitação de verificação conhecida (documentada, não um erro desta task):** este arquivo roda por um config próprio (`vitest.evidence.config.ts` no mesmo diretório), que não está associado a nenhum script `package.json`/turbo (mesma situação de outras 5 configs equivalentes no repo, sob `qa/evidence/`). Esse config fica fora da árvore de `apps/frontend`; sob o modo estrito do pnpm (sem hoist do plugin React do Vite para a raiz do monorepo), a resolução desse plugin falha em qualquer forma de invocação isolada testada — limitação pré-existente do harness de evidence dessa feature, não introduzida por esta task. Corrigi-la (ex.: mover o config para dentro de `apps/frontend` ou ajustar a estratégia de resolução do pnpm) está fora do escopo deste plano puramente visual. A verificação desta correção específica é feita por revisão estática: o regex ajustado casa apenas com o nome acessível `"Buscar..."` (variante completa) e não com `"Buscar"` (variante compacta, sem reticências) — mesma lógica já validada e coberta por teste executável no Step 1/Step 4 desta task para `authenticated-shell.test.tsx`.

- **Step 6: Commit**

```bash
git add apps/frontend/src/components/layout/authenticated-shell.tsx apps/frontend/src/components/layout/authenticated-shell.test.tsx docs/superpowers/global-command-palette/qa/evidence/us-001-usurio-autenticado-abrir-um-palette/us-001-navigation-palette-open-close.acceptance.test.tsx
git commit -m "feat(frontend): adiciona variantes compactas de busca e tema no header mobile"
```

## Critérios de Sucesso

- O header monta duas instâncias de `SearchBar` (completa `max-[560px]:hidden`, compacta `hidden max-[560px]:flex`) e duas de `ThemeToggle` (mesmo padrão).
- Abaixo de 560px, a busca abre o Command Palette via o botão-ícone compacto; acima de 560px, via a busca completa — ambas chamando o mesmo `onActivate`.
- O teste de header ajustado usa `getAllByRole` para tolerar as duas instâncias de `ThemeToggle` simultâneas no DOM.
- Em telas ≥768px, o header é visualmente idêntico ao anterior à mudança (verificado manualmente).
- `pnpm --filter frontend exec vitest run src/components/layout/authenticated-shell.test.tsx` passa com os 12 testes do arquivo.
- O teste de aceitação `us-001-navigation-palette-open-close.acceptance.test.tsx` (feature `global-command-palette`) não quebra com as duas instâncias de `SearchBar`: seletor restrito a `/buscar\.\.\./i`, casando só com a variante completa.
- Confirmado (manualmente, junto à verificação do Step 5) que montar as duas instâncias de `SearchBar`/`ThemeToggle` simultaneamente não duplica nenhum efeito colateral (listener, chamada de analytics, etc.) — nenhum dos dois componentes tem side-effect global além do `useEffect` local de hidratação do `ThemeToggle`.
