# Task 3: Paleta de comandos e notificações

**Status:** DONE

**PRD:** N/A

**Spec:** `../specs/pixel-art-icons-design.md`

**Tier:** standard

**Depends on:** task-01

## Visão Geral

Migra a paleta de comandos e o sino, o dropdown e o item de notificação de `lucide-react` para `@/components/ui/pixel-icons`. Os tamanhos já estão na grade (`h-4`/`h-5`), então a troca é de import, com um ajuste de tipo em `notification-item.tsx` (o alias `NotificationIcon` deixa de depender do tipo do lucide). Cada tipo de notificação continua com um glifo visualmente distinto.

## Arquivos

- Modify: `apps/frontend/src/components/command-palette/navigation-group.tsx`
- Modify: `apps/frontend/src/components/command-palette/gym-group.tsx`
- Modify: `apps/frontend/src/components/command-palette/user-group.tsx`
- Modify: `apps/frontend/src/components/command-palette/command-palette.tsx`
- Modify: `apps/frontend/src/components/notification/notification-bell.tsx`
- Modify: `apps/frontend/src/components/notification/notification-dropdown.tsx`
- Modify: `apps/frontend/src/components/notification/notification-item.tsx`
- Test: `apps/frontend/src/components/notification/notification-item.test.tsx`

## Interfaces

- **Consome:** de `@/components/ui/pixel-icons` (task-01): `Building2`, `CheckCircle`, `CreditCard`, `LayoutDashboard`, `User`, `Users`, `Wallet`, `Search`, `Bell`, `BellOff`, `Megaphone`, `ShieldAlert`, `Tag`, `Trash2`, `XCircle` e o tipo `PixelIcon = ComponentType<SVGProps<SVGSVGElement>>`. Cada componente aceita `className` e `aria-hidden`; é atribuível a `ElementType`.
- **Produz:** N/A (`navigation-group.tsx` segue com `icon: ElementType`; `NotificationIcon` passa a ser `PixelIcon`, tipo local não exportado).

### Skills a invocar

- `tailwindcss`: as classes `h-4 w-4`/`h-5 w-5` ficam como estão (16px e 20px na grade).
- `wcag-audit-patterns`: ícones decorativos com `aria-hidden`; botão só-ícone (sino, excluir) mantém `aria-label`.
- `test-antipatterns`: o teste compara o markup real renderizado por tipo, sem mock de ícone.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/pixel-art-icons-visual.md` (baseline de tamanho e estados; é norte, não pixel-final)
- **Fonte de design original:** nenhuma; seguir o mockup curado
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para esta tela?
- **Ferramentas de fidelidade visual (descobrir no ambiente):** skills `playwright-cli`, `run` e a automação de navegador `claude-in-chrome`, descobertas por descrição e nunca fixadas; se nenhuma servir, construir manualmente a partir do mockup
- **Decisões visuais já tomadas (não refazer):** ícones pequenos (paleta, notificações) em 16px (`h-4 w-4`), 20px onde já é `h-5`; `currentColor`, cores de tom das notificações inalteradas; `crispEdges`, sem `stroke`, nunca glow.

## Passos

- **Step 0: Confirm design source & fidelity tools**

Leia a fonte de design e as ferramentas de fidelidade já registradas em `### Fidelidade Visual`. Confirme com o usuário se existe fonte de design original; a ausência é resposta válida e roteia para a implementação manual contra o mockup `../specs/mockups/pixel-art-icons-visual.md`. Só redescubra ferramentas se o campo estiver em branco.

- **Step 1: Review Focus: Tipos de notificação (aprovado, rejeitado, alerta, promoção, aviso) → cada um continua com ícone visualmente distinto, não todos iguais — Write the failing test**

Em `apps/frontend/src/components/notification/notification-item.test.tsx`, ao final do arquivo, acrescente:

```tsx
describe("NotificationItem: ícone por tipo", () => {
	const TYPES: ReadonlyArray<NotificationItemData["type"]> = [
		"CHECK_IN_APPROVED",
		"CHECK_IN_REJECTED",
		"SECURITY_ALERT",
		"PROMOTION",
		"NOTICE",
	]

	function readIcon(type: NotificationItemData["type"]) {
		const { unmount } = renderItem(makeNotification({ id: type, type }))
		const svg = getMainButton().querySelector("svg")
		if (!svg) throw new Error(`sem svg para ${type}`)
		const reading = {
			markup: svg.innerHTML,
			shapeRendering: svg.getAttribute("shape-rendering"),
			ariaHidden: svg.getAttribute("aria-hidden"),
		}
		unmount()
		return reading
	}

	test("os 5 tipos renderizam ícone pixel-art nítido e decorativo", () => {
		for (const type of TYPES) {
			const icon = readIcon(type)
			expect(icon.shapeRendering).toBe("crispEdges")
			expect(icon.ariaHidden).toBe("true")
		}
	})

	test("cada tipo de notificação tem um ícone com markup distinto dos demais", () => {
		const markups = TYPES.map((type) => readIcon(type).markup)
		expect(new Set(markups).size).toBe(TYPES.length)
	})
})
```

- **Step 2: Run test to verify it fails**

Run: `cd apps/frontend && pnpm exec vitest run src/components/notification/notification-item.test.tsx`
Expected: FAIL em `os 5 tipos renderizam ícone pixel-art nítido e decorativo` (o svg atual do lucide não tem `shape-rendering="crispEdges"`); o teste de markup distinto e os demais já existentes passam.

- **Step 3: Write minimal implementation (troca de imports)**

Em cada arquivo, troque o import; nada mais muda além do que está indicado.

1. `apps/frontend/src/components/command-palette/navigation-group.tsx` (linhas 4 a 12). Antes:

```tsx
import {
	Building2,
	CheckCircle,
	CreditCard,
	LayoutDashboard,
	User,
	Users,
	Wallet,
} from "lucide-react"
```

Depois: o mesmo bloco com a origem `from "@/components/ui/pixel-icons"`. O tipo `icon: ElementType` do arquivo não muda.

2. `apps/frontend/src/components/command-palette/gym-group.tsx` (linha 4). Antes: `import { Building2 } from "lucide-react"`. Depois: `import { Building2 } from "@/components/ui/pixel-icons"`.

3. `apps/frontend/src/components/command-palette/user-group.tsx` (linha 4). Antes: `import { User } from "lucide-react"`. Depois: `import { User } from "@/components/ui/pixel-icons"`.

4. `apps/frontend/src/components/command-palette/command-palette.tsx` (linha 5). Antes: `import { Search } from "lucide-react"`. Depois: `import { Search } from "@/components/ui/pixel-icons"`.

5. `apps/frontend/src/components/notification/notification-bell.tsx` (linha 3). Antes: `import { Bell } from "lucide-react"`. Depois: `import { Bell } from "@/components/ui/pixel-icons"`.

6. `apps/frontend/src/components/notification/notification-dropdown.tsx` (linha 3). Antes: `import { BellOff } from "lucide-react"`. Depois: `import { BellOff } from "@/components/ui/pixel-icons"`.

7. `apps/frontend/src/components/notification/notification-item.tsx` (linhas 3 a 10 e linha 20). Antes:

```tsx
import {
	CheckCircle,
	Megaphone,
	ShieldAlert,
	Tag,
	Trash2,
	XCircle,
} from "lucide-react"
```

Depois:

```tsx
import {
	CheckCircle,
	Megaphone,
	type PixelIcon,
	ShieldAlert,
	Tag,
	Trash2,
	XCircle,
} from "@/components/ui/pixel-icons"
```

E na linha 20. Antes: `type NotificationIcon = typeof CheckCircle`. Depois: `type NotificationIcon = PixelIcon`. O mapa `NOTIFICATION_TYPE_STYLE` não muda (CHECK_IN_APPROVED→CheckCircle, CHECK_IN_REJECTED→XCircle, SECURITY_ALERT→ShieldAlert, PROMOTION→Tag, NOTICE→Megaphone).

- **Step 4: Run test to verify it passes**

Run: `cd apps/frontend && pnpm exec vitest run src/components/notification/notification-item.test.tsx`
Expected: PASS (inclui os testes existentes de identificação visual do NOTICE, dot não lido, clique e exclusão).

- **Step 5: Rodar os testes dos demais arquivos tocados**

Run: `cd apps/frontend && pnpm exec vitest run src/components/notification/notification-dropdown.test.tsx`
Expected: PASS

Run: `cd apps/frontend && pnpm exec vitest run src/components/command-palette/command-palette.test.tsx`
Expected: PASS

Run: `cd apps/frontend && pnpm exec vitest run src/components/command-palette/navigation-group.test.tsx`
Expected: PASS

Run: `cd apps/frontend && pnpm exec vitest run src/components/command-palette/gym-group.test.tsx`
Expected: PASS

Run: `cd apps/frontend && pnpm exec vitest run src/components/command-palette/user-group.test.tsx`
Expected: PASS

- **Step 6: Verificar que nenhum import do pacote antigo restou nos arquivos da task**

Run: `rg -n "lucide-react" apps/frontend/src/components/command-palette apps/frontend/src/components/notification`
Expected: nenhuma linha de saída (código de saída 1 do `rg`).

- **Step 7: Conferência visual (manual, sem bloquear)**

Com a ferramenta descoberta no Step 0, abra a paleta de comandos (atalho de busca) e o dropdown de notificações e confira contra o mockup: glifos em 16px nítidos, cinco tipos de notificação com glifos e tons distintos, sino e sino desligado legíveis, tema claro e escuro. Registre desvios no relatório.

- **Step 8: Commit** *(somente quando `workflow.auto_commit` for true; caso contrário, pule e reporte os arquivos)*

```bash
git add apps/frontend/src/components/command-palette apps/frontend/src/components/notification
git commit -m "feat(frontend): paleta de comandos e notificações com ícones pixel-art

Claude-Session: https://claude.ai/code/session_01BSogrXaB7yr5wt3g9TGxXS"
```

## Critérios de Sucesso

- Os 7 arquivos importam ícones de `@/components/ui/pixel-icons` e nenhum cita `lucide-react`.
- Os cinco tipos de notificação renderizam svg pixel-art com markup distinto entre si.
- Os testes existentes de paleta e notificações seguem verdes.
