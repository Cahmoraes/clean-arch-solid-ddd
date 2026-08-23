# Tarefas: Acessibilidade da seção "Fale Conosco"

**Spec:** `../specs/contato-acessibilidade-design.md`
**PRD:** N/A

**Goal:** Adicionar indicação sutil de campo obrigatório, foco visível reforçado (contraste 3:1) e alvo de toque acessível na seção de contato da home, sem alterar a lógica de envio.

**Architecture:** Ajustes aditivos em componentes já existentes. `FormField`/`FieldShell` ganham um prop `showRequiredIndicator` opcional (retrocompatível, sem efeito quando omitido) que renderiza o indicador visual + `aria-required` + texto oculto para leitor de tela. Nome escolhido (em vez de `required`) para não colidir com o atributo HTML nativo `required` — ver Notas de Verificação. `contact-form.tsx` reforça o anel de foco via `className` local (sem tocar nos componentes base `Input`/`Button`). `contact-section.tsx` torna os dois cards de contato focáveis/clicáveis por inteiro. Nenhum componente novo; nenhuma mudança de contrato de envio (`useSendContact`, schema Zod inalterados).

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4 (`cn` = `clsx` + `tailwind-merge`), react-hook-form + zod, Vitest + Testing Library (happy-dom).

---

## Tarefas

- [x] 1. Indicador de obrigatoriedade + foco reforçado nos campos do formulário → `task-01.md`
- [x] 2. Cards de contato focáveis (alvo de toque + foco visível) → `task-02.md`

## Ondas de Execução

- **Wave 1** (parallel): 1, 2

## Notas de Verificação

- **Desvio do plano encontrado na barreira de integração:** o plano original nomeava o novo prop `required`. Isso colidiu com o atributo HTML nativo `required`, que `weather-search-form.tsx` já passava a `FormField` via spread — a suíte completa (144 arquivos) pegou 4 testes quebrados em `clima/page.test.tsx` e `weather-search-form.test.tsx` (label duplicando "(obrigatório)" e o `required` nativo deixando de chegar no `<input>`). Root-cause via `super.systematic-debugging`: renomeado para `showRequiredIndicator` nos 4 arquivos do write-set da task 1 — sem colisão, `required` nativo volta a fluir normal para quem já o usava.
- **Mudanças em `FormField`/`FieldShell` são aditivas** (novo prop `showRequiredIndicator?: boolean`, `undefined` por padrão): os demais importadores (`admin/academias/*`, `perfil/senha`, `cadastro`, `login`, `recuperar-senha`, `redefinir-senha`, `gym-cnpj-field`, `gym-phone-field`) não passam esse prop e continuam a renderizar exatamente como hoje — nenhum desses arquivos precisou de alteração. `weather-search-form.tsx` também não foi alterado (o fix foi só no nome do prop novo).
- **`app/(public)/page.tsx`** consome `<ContactSection />` sem props; a mudança interna do componente não afeta esse import.
- **Comando de verificação da barreira de integração** (única suíte afetada — nenhum arquivo de `apps/backend` é tocado por este plano):
  `cd apps/frontend && npx vitest run src/features/contact/components/contact-form.test.tsx src/features/contact/components/contact-section.test.tsx`
