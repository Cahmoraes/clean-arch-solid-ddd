# Task 2: Cards de contato focáveis (alvo de toque + foco visível)

**Status:** PENDING
**PRD:** N/A
**Spec:** `../specs/contato-acessibilidade-design.md`
**Tier:** standard
**Depends on:** N/A

## Visão Geral

Os dois cards de contato (e-mail e "Resposta em até 24h") têm hoje um alvo de toque pequeno: no card de e-mail, só o texto do link `mailto:` é clicável/focável (achado 2.5.8 — alvo abaixo do mínimo recomendado); o card de resposta não é focável. Esta task torna o card de e-mail inteiro clicável (via um `<a>` cujo hit-area cobre todo o card, com foco visível reforçado sobre o card inteiro) e torna o card de resposta focável por teclado (consistência visual/interação entre os dois cards, decisão registrada em D2 do spec).

## Arquivos

- Modify: `apps/frontend/src/features/contact/components/contact-section.tsx`
- Test: `apps/frontend/src/features/contact/components/contact-section.test.tsx`

### Conformidade com as Skills Padrão

- `tailwindcss`: classes utilitárias novas (`relative`, `after:absolute after:inset-0`, `focus-visible:after:ring-*`) precisam seguir as convenções v4 já usadas no projeto.
- `shadcn`: `Card`/`CardContent` seguem o padrão shadcn (`cn(base, className)` + spread de props); o `tabIndex`/`role`/`aria-label` adicionados ao `Card` devem passar pelo spread já existente, sem alterar `card.tsx`.
- `wcag-audit-patterns`: a implementação precisa satisfazer o critério 2.5.8 (tamanho do alvo) e reforçar 2.4.7/1.4.11 (foco visível com contraste), conforme a auditoria que originou esta feature.
- `test-antipatterns`: os novos testes devem seguir os padrões já usados no arquivo (`renderWithProviders`, queries por `getByRole`, sem detalhes de implementação).

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/contato-acessibilidade-visual.md` (cards de contato como elementos focáveis por inteiro, com contorno de foco visível)
- **Fonte de design original:** nenhuma; seguir o mockup curado (definido via companion visual do brainstorming)
- **Confirmar com o usuário:** não aplicável — não há fonte de design externa para esta tela, já confirmado durante o brainstorming
- **Ferramentas de fidelidade visual (descobrir no ambiente):** nenhuma ferramenta de design-to-code/teste visual conectada neste repo no momento do plano; construir manualmente a partir do mockup curado
- **Decisões visuais já tomadas (não refazer):** card de e-mail — o link cobre visualmente o card inteiro (técnica "stretched link": `<a>` com `after:absolute after:inset-0` sobre o `Card` com `position: relative`) e o anel de foco (`ring-primary`) é aplicado ao pseudo-elemento (`focus-visible:after:ring-2`) para contornar o card inteiro, não só o texto; card de resposta — vira um `role="group"` focável (`tabIndex={0}`) com `aria-label` descritivo e anel de foco direto no card.

## Passos

- **Step 1: Escrever o teste que falha — card de e-mail com hit-area/foco cobrindo o card inteiro**

```tsx
// apps/frontend/src/features/contact/components/contact-section.test.tsx
// adicionar dentro do describe("ContactSection", () => { ... }), após o teste existente

test("card de e-mail tem alvo de toque e foco cobrindo o card inteiro", () => {
	renderWithProviders(<ContactSection />)
	const emailLink = screen.getByRole("link", { name: CONTACT_EMAIL })
	expect(emailLink).toHaveClass("after:absolute", "after:inset-0")
	expect(emailLink).toHaveClass(
		"focus-visible:after:ring-2",
		"focus-visible:after:ring-primary",
	)
	expect(emailLink.closest('[data-slot="card"]')).toHaveClass("relative")
})
```

- **Step 2: Rodar o teste para confirmar que falha**

Run: `cd apps/frontend && npx vitest run src/features/contact/components/contact-section.test.tsx -t "card de e-mail tem alvo de toque"`
Expected: FAIL — classes `after:absolute`/`focus-visible:after:ring-2` ausentes no link; `Card` sem `relative`

- **Step 3: Escrever o teste que falha — card de resposta focável**

```tsx
// apps/frontend/src/features/contact/components/contact-section.test.tsx
// adicionar logo após o teste do Step 1

test("card 'Resposta' é alcançável por teclado com foco visível", () => {
	renderWithProviders(<ContactSection />)
	const responseCard = screen.getByRole("group", {
		name: /resposta: em até 24h/i,
	})
	expect(responseCard.tabIndex).toBe(0)
	expect(responseCard).toHaveClass(
		"focus-visible:ring-2",
		"focus-visible:ring-primary",
	)
})
```

- **Step 4: Rodar o teste para confirmar que falha**

Run: `cd apps/frontend && npx vitest run src/features/contact/components/contact-section.test.tsx -t "card 'Resposta' é alcançável"`
Expected: FAIL — nenhum elemento com role "group" e o nome acessível "Resposta: Em até 24h" existe ainda

- **Step 5: Implementar os dois cards focáveis em `contact-section.tsx`**

```tsx
// apps/frontend/src/features/contact/components/contact-section.tsx
import { Clock, Mail } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { CONTACT_EMAIL } from "../constants"
import { ContactForm } from "./contact-form"

export function ContactSection() {
	return (
		<section
			aria-labelledby="contact-heading"
			className="mx-auto w-full max-w-xl"
		>
			<div className="flex flex-col items-center text-center">
				<h2
					id="contact-heading"
					className="mb-2 font-display text-3xl font-bold tracking-tight text-foreground"
				>
					Fale conosco
				</h2>
				<p className="mb-8 text-base text-muted-foreground">
					Tem alguma dúvida? Envie uma mensagem e nossa equipe responde em até
					24h úteis.
				</p>
			</div>
			<ContactForm />
			<div className="mt-8 grid gap-4 sm:grid-cols-2">
				<Card className="relative py-4 transition-colors hover:bg-muted/50">
					<CardContent className="flex items-center gap-3">
						<Mail className="size-4 shrink-0 text-accent" aria-hidden="true" />
						<div>
							<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
								E-mail
							</p>
							<a
								href={`mailto:${CONTACT_EMAIL}`}
								className="text-sm font-medium text-foreground after:absolute after:inset-0 after:rounded-xl after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-primary focus-visible:after:ring-offset-2"
							>
								{CONTACT_EMAIL}
							</a>
						</div>
					</CardContent>
				</Card>
				<Card
					tabIndex={0}
					role="group"
					aria-label="Resposta: Em até 24h"
					className="py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
				>
					<CardContent className="flex items-center gap-3">
						<Clock className="size-4 shrink-0 text-accent" aria-hidden="true" />
						<div>
							<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
								Resposta
							</p>
							<p className="text-sm font-medium text-foreground">Em até 24h</p>
						</div>
					</CardContent>
				</Card>
			</div>
		</section>
	)
}
```

- **Step 6: Rodar os dois testes novos para confirmar que passam**

Run: `cd apps/frontend && npx vitest run src/features/contact/components/contact-section.test.tsx -t "card de e-mail tem alvo de toque"`
Expected: PASS

Run: `cd apps/frontend && npx vitest run src/features/contact/components/contact-section.test.tsx -t "card 'Resposta' é alcançável"`
Expected: PASS

- **Step 7: Rodar toda a suíte deste arquivo para confirmar que nada quebrou**

Run: `cd apps/frontend && npx vitest run src/features/contact/components/contact-section.test.tsx`
Expected: PASS — o teste pré-existente ("exibe título, formulário e os dois cards de contato") + os 2 novos

- **Step 8: Commit** *(sequential execution only — em uma wave paralela, o orquestrador commita na barreira de integração. Se seu prompt disser que você é um dos vários implementadores em uma árvore compartilhada, pule este passo e reporte os arquivos.)*

```bash
git add apps/frontend/src/features/contact/components/contact-section.tsx apps/frontend/src/features/contact/components/contact-section.test.tsx
git commit -m "feat: torna os cards de contato focaveis e com foco visivel"
```

## Critérios de Sucesso

- O card de e-mail tem o alvo de clique/foco cobrindo a área visual do card inteiro (técnica stretched-link), não só o texto do link.
- O foco visível (`focus-visible`) do card de e-mail contorna o card inteiro (via `after:ring-*`), não apenas o texto pequeno do link.
- O card "Resposta em até 24h" é alcançável via `Tab` (`tabIndex={0}`) e expõe um nome acessível ("Resposta: Em até 24h" via `role="group"` + `aria-label`).
- Ambos os cards usam `focus-visible:ring-primary` (mesma cor/opacidade reforçada da Task 1) — consistência visual entre os dois.
- O teste pré-existente de `contact-section.test.tsx` continua passando sem alteração de asserção.
- Nenhuma mudança em `apps/frontend/src/components/ui/card.tsx` (a mudança fica local à seção de contato).
