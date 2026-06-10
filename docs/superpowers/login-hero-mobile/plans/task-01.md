# Task 1: Extrair `LOGIN_STATS` e refatorar o aside desktop

**Status:** PENDING
**PRD:** N/A
**Spec:** `../specs/login-hero-mobile-design.md`
**Depends on:** N/A

## Visão Geral

Refatoração sem mudança visual: extrair os dados das três estatísticas do hero (`312`, `48k`, `4.9` e seus labels) para um array `LOGIN_STATS` no escopo do módulo, e fazer o `<aside>` desktop renderizar os três blocos a partir desse array via `.map()`. Isso estabelece a fonte única de dados que a Task 2 vai reaproveitar no bloco mobile. O comportamento e o visual desktop permanecem idênticos — os testes existentes são a rede de segurança.

## Arquivos

- Modify: `apps/frontend/src/app/(public)/login/page.tsx`

### Conformidade com as Skills Padrão

- use react: componente funcional, renderização de lista com `key` estável.
- use tailwindcss: preservar exatamente as classes utilitárias existentes do aside.
- use test-antipatterns: não alterar testes nesta task; eles são a rede de segurança do refactor.

## Passos

> **Convenção do projeto:** indentação com TAB (Biome). Aspas duplas. Os blocos de código abaixo usam tabs.

- **Step 1: Rodar os testes existentes para confirmar baseline verde**

Run: `pnpm --filter frontend test -- login`
Expected: PASS — `login-volt.test.tsx` e `page.test.tsx` todos verdes (incluindo `exibe o painel-marca com o hero` que usa `getByText(/Treine onde/i)`).

- **Step 2: Adicionar o array `LOGIN_STATS` no escopo do módulo**

Em `apps/frontend/src/app/(public)/login/page.tsx`, logo após a linha `const DEFAULT_REDIRECT = "/inicio"` (linha 17), inserir:

```tsx
const LOGIN_STATS = [
	{ value: "312", label: "academias parceiras" },
	{ value: "48k", label: "check-ins por mês" },
	{ value: "4.9", label: "avaliação média" },
] as const
```

- **Step 3: Substituir os três blocos hardcoded do aside pelo `.map()`**

Localizar o wrapper das estatísticas dentro do `<aside>` (atualmente `<div className="flex flex-wrap gap-9">` com três `<div className="flex flex-col gap-0.5">` hardcoded — linhas 84-109) e substituí-lo inteiro por:

```tsx
<div className="flex flex-wrap gap-9">
	{LOGIN_STATS.map((stat) => (
		<div key={stat.label} className="flex flex-col gap-0.5">
			<span className="font-mono text-3xl font-bold text-accent tabular-nums">
				{stat.value}
			</span>
			<span className="max-w-[110px] text-xs text-muted-foreground dark:text-white/55">
				{stat.label}
			</span>
		</div>
	))}
</div>
```

As classes utilitárias são idênticas às atuais — só os valores/labels passam a vir do array. O título `<h2>` do aside permanece inalterado.

- **Step 4: Rodar lint e type-check**

Run: `pnpm --filter frontend lint:fix && pnpm --filter frontend tsc:check`
Expected: zero problemas no Biome; zero erros de tipo.

- **Step 5: Rodar os testes novamente (devem continuar verdes — refactor sem mudança de comportamento)**

Run: `pnpm --filter frontend test -- login`
Expected: PASS — mesmos testes verdes do Step 1. `getByText(/Treine onde/i)` ainda encontra exatamente uma ocorrência (o aside continua sendo o único bloco com o hero).

- **Step 6: Commit**

```bash
git add apps/frontend/src/app/\(public\)/login/page.tsx
git commit -m "refactor(login): extract LOGIN_STATS array for the hero stats"
```

## Critérios de Sucesso

- `LOGIN_STATS` definido no escopo do módulo com os três pares `{ value, label }` exatos.
- O `<aside>` desktop renderiza as três estatísticas via `.map()` com `key={stat.label}`, sem nenhuma mudança visual.
- `pnpm --filter frontend lint:fix`, `tsc:check` e `test -- login` passam 100%.
- Nenhum arquivo de teste foi modificado nesta task.
