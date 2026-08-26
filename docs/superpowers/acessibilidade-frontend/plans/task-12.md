# Task 12: `button` — anel de foco duplo + documentação de `size="icon"` [FR-003]

**Status:** PENDING
**PRD:** `../prd/prd-acessibilidade-frontend.md`
**Spec:** `../specs/acessibilidade-frontend-design.md`
**Tier:** standard
**Depends on:** task-01

## Visão Geral

Troca as classes de foco de `Button` (`buttonVariants` em `apps/frontend/src/components/ui/button.tsx`) pela utility `focus-ring-duplo` (criada pela task-01 em `globals.css`), aplicando a técnica de "anel duplo" com contraste ≥16:1 em qualquer fundo/tema, em vez do `ring`/`outline` atual baseado em `--color-ring`. Documenta também, via JSDoc no componente e uma linha nova em `apps/frontend/AGENTS.md`, a regra consciente de que `size="icon"` sem filho textual exige `aria-label`/`aria-labelledby` do consumidor — sem enforcement de tipo. A variante `size="icon"` já mede 40×40px (≥24px), portanto o critério WCAG 2.5.8 (alvo de toque) já é atendido sem mudança nesta task.

## Arquivos

- Modify: `apps/frontend/src/components/ui/button.tsx`
- Modify: `apps/frontend/src/components/ui/button.test.tsx`
- Modify: `apps/frontend/AGENTS.md`

### Conformidade com as Skills Padrão

- `shadcn`: `Button` é um componente shadcn/ui customizado (`cva` + `forwardRef` + `Slot`) — a mudança de classes de foco precisa respeitar o padrão de variantes já estabelecido.
- `tailwindcss`: a troca de `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2` por `focus-ring-duplo` é uma mudança de utility Tailwind v4 dentro de um array de classes `cva`.
- `wcag-audit-patterns`: a task implementa diretamente o critério WCAG 2.2 2.4.13 (aparência de foco) e documenta a decisão sobre nome acessível de botão ícone-only (4.1.2/2.5.3), domínio central da skill.
- `vercel-react-best-practices`: `Button` é um componente React de UI de base amplamente reutilizado — a mudança precisa preservar `forwardRef`, `displayName` e a API de `VariantProps` sem regressão de performance ou comportamento.
- `test-antipatterns`: o novo teste deve verificar a classe `focus-ring-duplo` via `toHaveClass` sobre o elemento real renderizado (não a string do objeto `cva`), evitando acoplamento à implementação interna de `buttonVariants`.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/acessibilidade-frontend-visual.md` (baseline de layout/spacing/hierarquia/tokens)
- **Fonte de design original:** Nenhuma — mockup gerado a partir dos tokens reais do projeto, comparado lado a lado no visual companion.
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para o anel de foco do componente `Button`? Se não houver, seguir o mockup curado.
- **Ferramentas de fidelidade visual (descobertas neste repositório):** nenhuma skill/MCP de design-to-code ou teste visual configurada — construir manualmente a partir do mockup curado.
- **Decisões visuais já tomadas (não refazer):** técnica de "anel duplo" (`box-shadow` de duas camadas — gap na cor de fundo + contorno escuro), validada visualmente com o usuário sobre um botão e um input reais, escolhida sobre "anel escuro sólido" por se adaptar melhor a fundos coloridos; ≥16:1 de contraste em qualquer fundo/tema, sem depender de `--color-ring`.

## Passos

- **Step 0: Confirm design source & fidelity tools**

  Leia a fonte de design e as ferramentas de fidelidade já registradas na subseção `### Fidelidade Visual` acima (o autor do plano já descobriu isso em tempo de planejamento). Confirme com o usuário se existe uma fonte de design original (ex.: URL) para o anel de foco do componente `Button` — só isso depende do usuário, por isso fica na execução. Neste repositório não há skill/MCP de design-to-code ou teste visual configurada; a implementação segue manualmente o mockup curado em `../specs/mockups/acessibilidade-frontend-visual.md`, reaproveitando a técnica de "anel duplo" já validada (não redesenhar) e já disponível como classe `focus-ring-duplo` (task-01).

  Esta etapa nunca bloqueia: "sem fonte / sem ferramenta disponível" é uma resposta válida que direciona para implementação manual a partir do mockup.

- **Step 1: Write the failing test**

Adicionar ao final do `describe("Button", ...)` existente em `apps/frontend/src/components/ui/button.test.tsx`:

```tsx
	test("deve aplicar o anel de foco duplo (focus-ring-duplo)", () => {
		render(<Button>Foco</Button>)
		expect(screen.getByRole("button", { name: /foco/i })).toHaveClass("focus-ring-duplo")
	})
```

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/components/ui/button.test.tsx -t "deve aplicar o anel de foco duplo"`
Expected: FAIL — o botão ainda tem `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2` em vez de `focus-ring-duplo`, então `toHaveClass("focus-ring-duplo")` falha.

- **Step 3: Write minimal implementation**

Em `apps/frontend/src/components/ui/button.tsx`, dentro do array de classes base de `buttonVariants`, trocar:

```tsx
		"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2",
```

por:

```tsx
		"focus-ring-duplo",
```

Adicionar comentário JSDoc acima de `ButtonProps`/`Button` documentando a regra de `size="icon"`:

```tsx
/**
 * Quando `size="icon"` é usado sem filho textual visível, o consumidor DEVE
 * fornecer `aria-label` ou `aria-labelledby` para que o botão tenha nome
 * acessível (WCAG 4.1.2 / 2.5.3). Esta é uma decisão consciente: não há
 * enforcement de tipo para essa regra — ver PRD `acessibilidade-frontend`.
 */
export interface ButtonProps
	extends ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof buttonVariants> {
	asChild?: boolean
}
```

Em `apps/frontend/AGENTS.md`, na seção `### Convenções e Práticas`, adicionar uma nova subseção logo após `### Design System` e antes de `### API Client`:

```markdown
### Acessibilidade

- **Botão ícone-only:** `Button size="icon"` sem filho textual exige `aria-label`/`aria-labelledby` — não há enforcement de tipo (decisão consciente, ver PRD `acessibilidade-frontend`).
```

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/components/ui/button.test.tsx -t "deve aplicar o anel de foco duplo"`
Expected: PASS

- **Step 5: Commit** *(sequential execution only — em uma wave paralela o orquestrador commita na barreira de integração. Se seu prompt indicar que você é um dos vários implementadores em uma árvore compartilhada, pule este passo e reporte os arquivos.)*

```bash
git add apps/frontend/src/components/ui/button.tsx apps/frontend/src/components/ui/button.test.tsx apps/frontend/AGENTS.md
git commit -m "feat: aplica anel de foco duplo no Button e documenta regra de aria-label em size=icon"
```

## Critérios de Sucesso

- `Button` renderiza com a classe `focus-ring-duplo` em vez de `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2` (FR-003).
- `apps/frontend/src/components/ui/button.test.tsx` passa com o novo teste `"deve aplicar o anel de foco duplo (focus-ring-duplo)"`.
- `ButtonProps`/`Button` têm um comentário JSDoc documentando que `size="icon"` sem filho textual exige `aria-label`/`aria-labelledby`.
- `apps/frontend/AGENTS.md` contém a nova regra de "Botão ícone-only" na seção `### Convenções e Práticas`.
- Nenhuma mudança na variante `size="icon"` (permanece `h-10 w-10 p-0`, 40×40px) — WCAG 2.5.8 já atendido, sem ação necessária.
