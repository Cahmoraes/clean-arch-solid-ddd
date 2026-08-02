# Task 1: Restyle da seção (form full-width + cards de contato)

**Status:** DONE
**PRD:** N/A
**Spec:** `../specs/fale-conosco-restyle-design.md`
**Tier:** standard
**Depends on:** N/A

## Visão Geral

Reescreve o layout de `contact-section.tsx`: o formulário passa a ocupar a largura total da landing (remove o wrapper `max-w-xl` e o grid `md:grid-cols-2` com a coluna esquerda antiga). `h2` + subtítulo centralizados, `<ContactForm />` em linha cheia e 2 cards de contato (E-mail `contato@volt.com` + Resposta em até 24h) abaixo do form, em grid de 2 colunas no desktop e 1 no mobile. Cria o primeiro teste da seção. A lógica de envio permanece intacta.

## Arquivos

- Modify: `apps/frontend/src/features/contact/components/contact-section.tsx`
- Test: `apps/frontend/src/features/contact/components/contact-section.test.tsx` (criar)

### Conformidade com as Skills Padrão

- `shadcn`: usar a composição `Card`/`CardContent` conforme os padrões shadcn/ui do repo (base + `cn`/twMerge)
- `tailwindcss`: aplicar utilities Tailwind v4 (`grid`, `gap`, `sm:grid-cols-2`, tokens `border-border`/`bg-card`/`text-muted-foreground`) no layout full-width e nos cards

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/fale-conosco-restyle-visual.md` (baseline de layout/spacing/hierarquia/tokens)
- **Fonte de design original:** nenhuma; seguir o mockup curado
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para esta tela? (resposta esperada na execução: não)
- **Ferramentas de fidelidade visual:** nenhuma configurada no repo; construir manualmente a partir do mockup
- **Decisões visuais já tomadas (não refazer):** form full-width centralizado; 2 cards (E-mail + Resposta em até 24h) em `grid gap-4 sm:grid-cols-2` abaixo do form; cards com radius `xl` (22px), `border-border`, `bg-card`, ícones lucide `Mail`/`Clock`; `h2` + subtítulo centralizados.

## Passos

- **Step 0: Confirmar fonte de design & ferramentas de fidelidade**

  Ler a fonte de design e as ferramentas registradas acima. Confirmar com o usuário se existe uma fonte de design original (esperado: não). Sem fonte/ferramenta, construir manualmente a partir do mockup curado em `../specs/mockups/fale-conosco-restyle-visual.md`.

- **Step 1: Escrever o teste que falha**

  Criar `apps/frontend/src/features/contact/components/contact-section.test.tsx`:

  ```tsx
  import { render, screen } from "@testing-library/react"
  import { describe, expect, test } from "vitest"
  import { renderWithProviders } from "@/test/render"
  import { CONTACT_EMAIL } from "../constants"
  import { ContactSection } from "./contact-section"

  describe("ContactSection", () => {
  	test("exibe título, formulário e os dois cards de contato", () => {
  		renderWithProviders(<ContactSection />)
  		expect(
  			screen.getByRole("heading", { name: /fale conosco/i }),
  		).toBeInTheDocument()
  		expect(screen.getByLabelText(/nome/i)).toBeInTheDocument()
  		expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument()
  		expect(screen.getByLabelText(/mensagem/i)).toBeInTheDocument()
  		expect(screen.getByText(CONTACT_EMAIL)).toBeInTheDocument()
  		expect(screen.getByText("Em até 24h")).toBeInTheDocument()
  	})
  })
  ```

  Nota: `getByText("Em até 24h")` casa exatamente o valor do card "Resposta" (o subtítulo usa "em até 24h úteis", que é texto diferente).

- **Step 2: Rodar o teste para verificar que falha**

  Run: `pnpm --filter frontend test -- --run src/features/contact/components/contact-section.test.tsx`
  Expected: FAIL — `screen.getByText("Em até 24h")` não encontra o card (a seção atual não tem os cards) e/ou o arquivo de teste ainda não existe.

- **Step 3: Escrever a implementação mínima**

  Substituir o conteúdo de `apps/frontend/src/features/contact/components/contact-section.tsx` por:

  ```tsx
  import { Clock, Mail } from "lucide-react"
  import { Card, CardContent } from "@/components/ui/card"
  import { CONTACT_EMAIL } from "../constants"
  import { ContactForm } from "./contact-form"

  export function ContactSection() {
  	return (
  		<section
  			aria-labelledby="contact-heading"
  			className="mx-auto w-full"
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
  				<Card className="py-4">
  					<CardContent className="flex items-center gap-3">
  						<Mail className="size-4 shrink-0 text-accent" aria-hidden="true" />
  						<div>
  							<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
  								E-mail
  							</p>
  							<a
  								href={`mailto:${CONTACT_EMAIL}`}
  								className="text-sm font-medium text-foreground transition-colors hover:text-accent"
  							>
  								{CONTACT_EMAIL}
  							</a>
  						</div>
  					</CardContent>
  				</Card>
  				<Card className="py-4">
  					<CardContent className="flex items-center gap-3">
  						<Clock className="size-4 shrink-0 text-accent" aria-hidden="true" />
  						<div>
  							<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
  								Resposta
  							</p>
  							<p className="text-sm font-medium text-foreground">
  								Em até 24h
  							</p>
  						</div>
  					</CardContent>
  				</Card>
  			</div>
  		</section>
  	)
  }
  ```

  Observações:
  - `Card` merge de classes via `cn` (twMerge) — `className="py-4"` sobrescreve o `py-6` da base.
  - O contrato `aria-labelledby="contact-heading"`/`id="contact-heading"` é preservado (usado pela página).
  - Nenhum request HTTP acontece no mount — o teste não precisa de handler MSW.

- **Step 4: Rodar o teste para verificar que passa**

  Run: `pnpm --filter frontend test -- --run src/features/contact/components/contact-section.test.tsx`
  Expected: PASS (1 teste).

- **Step 5: Rodar os gates de qualidade**

  Run: `pnpm --filter frontend lint:fix`
  Expected: Biome com zero problemas.
  Run: `pnpm --filter frontend tsc:check`
  Expected: sem erros de tipo.
  Run: `pnpm --filter frontend test -- --run`
  Expected: suite completa do frontend passa (inclui `contact-form.test.tsx` e `use-send-contact.test.tsx`, que não devem regredir).
  Run: `pnpm --filter frontend build`
  Expected: build Next.js sem erros.

- **Step 6: Commit**

  ```bash
  git add apps/frontend/src/features/contact/components/contact-section.tsx apps/frontend/src/features/contact/components/contact-section.test.tsx
  git commit -m "feat(contact): full-width form and info cards in home section"
  ```

  Nota: por política do workspace, pedir permissão antes de commitar.

## Critérios de Sucesso

- `contact-section.tsx` renderiza o form em linha cheia (sem `max-w-xl`, sem `md:grid-cols-2`).
- Dois cards de contato abaixo do form: `contato@volt.com` (link mailto) e "Em até 24h".
- Contrato `aria-labelledby="contact-heading"` preservado.
- Novo teste `contact-section.test.tsx` passa; suite de testes, biome e tsc sem regressão.
