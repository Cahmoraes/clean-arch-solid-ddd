# Tarefas: Acessibilidade da seção "Fale Conosco"

**Spec:** `../specs/contato-acessibilidade-design.md`
**PRD:** N/A

**Goal:** Adicionar indicação sutil de campo obrigatório, foco visível reforçado (contraste 3:1) e alvo de toque acessível na seção de contato da home, sem alterar a lógica de envio.

**Architecture:** Ajustes aditivos em componentes já existentes. `FormField`/`FieldShell` ganham um prop `required` opcional (retrocompatível, sem efeito quando omitido) que renderiza o indicador visual + `aria-required` + texto oculto para leitor de tela. `contact-form.tsx` reforça o anel de foco via `className` local (sem tocar nos componentes base `Input`/`Button`). `contact-section.tsx` torna os dois cards de contato focáveis/clicáveis por inteiro. Nenhum componente novo; nenhuma mudança de contrato de envio (`useSendContact`, schema Zod inalterados).

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4 (`cn` = `clsx` + `tailwind-merge`), react-hook-form + zod, Vitest + Testing Library (happy-dom).

---

## Tarefas

- [ ] 1. Indicador de obrigatoriedade + foco reforçado nos campos do formulário → `task-01.md`
- [ ] 2. Cards de contato focáveis (alvo de toque + foco visível) → `task-02.md`

## Ondas de Execução

- **Wave 1** (parallel): 1, 2

## Notas de Verificação

- **Mudanças em `FormField`/`FieldShell` são aditivas** (novo prop `required?: boolean`, `undefined` por padrão): os demais importadores (`admin/academias/*`, `perfil/senha`, `cadastro`, `login`, `recuperar-senha`, `redefinir-senha`, `weather-search-form`, `gym-cnpj-field`, `gym-phone-field`) não passam esse prop e continuam a renderizar exatamente como hoje — nenhum desses arquivos precisa de alteração ou re-teste nesta feature.
- **`app/(public)/page.tsx`** consome `<ContactSection />` sem props; a mudança interna do componente não afeta esse import.
- **Comando de verificação da barreira de integração** (única suíte afetada — nenhum arquivo de `apps/backend` é tocado por este plano):
  `cd apps/frontend && npx vitest run src/features/contact/components/contact-form.test.tsx src/features/contact/components/contact-section.test.tsx`
