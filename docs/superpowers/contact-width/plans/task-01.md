# Task 1: Aplicar max-w-xl na seção de contato

**Status:** DONE
**PRD:** N/A
**Spec:** `../specs/contact-width-design.md`
**Tier:** cheap
**Depends on:** N/A

## Visão Geral

Aplicar a mesma largura máxima da seção "Escolha seu plano" (`PlansSectionHero`) à seção de contato (`ContactSection`), alterando apenas o `className` do elemento raiz.

## Arquivos

- Modify: `apps/frontend/src/features/contact/components/contact-section.tsx`
- Test: `apps/frontend/src/features/contact/components/contact-section.test.tsx`

> **Nota de reach:** `apps/frontend/src/app/(public)/page.tsx` importa `ContactSection`, mas a alteração é puramente aditiva (adição de classe CSS) e não muda assinatura, tipo ou DTO exportado. Nenhuma modificação na página importadora é necessária.

### Conformidade com as Skills Padrão

- `ui-ux-pro-max`: a task altera layout/espessura visual de uma seção da landing; validar hierarquia e espaçamento.
- `tailwindcss`: a mudança usa utilitários Tailwind (`max-w-xl`, `mx-auto`, `w-full`); aplicar corretamente sem conflitos.
- `vercel-react-best-practices`: manter componente React simples, sem efeitos colaterais, preservando acessibilidade (`aria-labelledby`).
- `vitest`: rodar testes unitários afetados após a alteração.
- `test-antipatterns`: não adicionar métodos ou mocks apenas para testes; validar comportamento real do componente.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/contact-width-visual.md`
- **Fonte de design original:** nenhuma; seguir o mockup curado aprovado pelo usuário.
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para esta tela? (Resposta esperada: não — o mockup do companion é a única referência.)
- **Ferramentas de fidelidade visual (descobrir no ambiente):** nenhuma design-to-code configurada; construir manualmente a partir do mockup.
- **Decisões visuais já tomadas (não refazer):**
  - Aplicar `max-w-xl` ao elemento `<section>` raiz do `ContactSection`.
  - Manter `mx-auto w-full` para centralizar e preservar responsividade abaixo do limite máximo.
  - Espelhar `PlansSectionHero`, que já usa `className="mx-auto w-full max-w-xl"`.

## Passos

1. **Abrir o arquivo alvo.**
   `apps/frontend/src/features/contact/components/contact-section.tsx`

2. **Alterar o `className` da `<section>` raiz.**
   De:
   ```tsx
   <section aria-labelledby="contact-heading" className="mx-auto w-full">
   ```
   Para:
   ```tsx
   <section aria-labelledby="contact-heading" className="mx-auto w-full max-w-xl">
   ```

3. **Rodar o linter/formatador no frontend.**
   ```bash
   cd apps/frontend
   pnpm lint:fix
   ```

4. **Rodar a verificação de tipos.**
   ```bash
   pnpm tsc:check
   ```

5. **Rodar os testes unitários afetados.**
   ```bash
   pnpm test -- --run
   ```
   Se algum snapshot quebrar por conta da nova classe, analisar se a alteração é esperada e, em caso positivo, atualizar o snapshot com `pnpm test -- --run -u` (ou o comando equivalente do projeto).

6. **Validar visualmente.**
   ```bash
   pnpm dev
   ```
   Acessar `http://localhost:3000` e conferir que a seção "Fale conosco" tem a mesma largura máxima da seção "Escolha seu plano".

7. **(Opcional) Parar o dev server.**
   `Ctrl+C` no terminal do `pnpm dev` após a validação.

## Critérios de Sucesso

- [x] O `className` da `<section>` em `contact-section.tsx` contém `max-w-xl`.
- [x] `pnpm lint:fix` passa sem issues.
- [x] `pnpm tsc:check` passa sem erros.
- [x] `pnpm test -- --run` passa (com snapshots atualizados se necessário).
- [x] Na landing, a seção de contato está visualmente alinhada em largura com a seção de planos.
