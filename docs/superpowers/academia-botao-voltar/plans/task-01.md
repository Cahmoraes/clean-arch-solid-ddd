# Task 1: Adicionar link voltar e renomear botão cancelar na edição de academia

**Status:** PENDING
**PRD:** N/A
**Spec:** `../specs/academia-botao-voltar-design.md`
**Tier:** cheap
**Depends on:** N/A

## Visão Geral

Implementar a mudança aprovada na tela de edição de academia: adicionar um link "Voltar para a busca" no topo da página (replicando o padrão da tela de detalhes) e renomear o botão "Cancelar" no final do formulário para "Descartar alterações". Atualizar os testes existentes para refletir os novos textos e cobrir o novo link.

## Arquivos

- Modify: `apps/frontend/src/app/(authenticated)/admin/academias/[id]/editar/page.tsx`
- Test: `apps/frontend/src/app/(authenticated)/admin/academias/[id]/editar/page.test.tsx`

### Conformidade com as Skills Padrão

- `shadcn`: usar componente `Button` já presente no arquivo; manter variant `outline` para a ação secundária.
- `tailwindcss`: replicar classes do link de voltar da tela de detalhes (`inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground`).
- `vercel-react-best-practices`: usar `next/link` para navegação client-side, seguindo o padrão do projeto.
- `vitest`: atualizar e adicionar testes no arquivo de teste existente.
- `test-antipatterns`: manter testes contra comportamento real do usuário (renderização, navegação), não contra detalhes de implementação internos.
- `ui-ux-pro-max`: manter consistência visual com a tela de detalhes e hierarquia clara (link secundário no topo, título principal abaixo).

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/academia-botao-voltar-visual.md`
- **Fonte de design original:** Nenhuma; seguir o mockup curado e replicar o padrão já existente na tela de detalhes (`/academias/[id]`).
- **Confirmar com o usuário:** não se aplica — não há fonte externa.
- **Ferramentas de fidelidade visual:** nenhuma configurada; construir manualmente a partir do mockup e do padrão existente.
- **Decisões visuais já tomadas:** link no topo, acima do título, com ícone `ArrowLeft` + texto "Voltar para a busca" em tom muted; botão inferior renomeado para "Descartar alterações".

## Passos

- **Step 0: Confirm design source & fidelity tools**

  Não há fonte de design original além do mockup curado e do padrão existente na tela de detalhes. Nenhuma ferramenta de design-to-code ou teste visual está configurada. Implementar manualmente conforme o spec e o mockup.

- **Step 1: Write the failing tests**

  Em `apps/frontend/src/app/(authenticated)/admin/academias/[id]/editar/page.test.tsx`, adicione um teste para o novo link de voltar e atualize os testes que mencionam "Cancelar" para "Descartar alterações".

  Adicione após os imports e antes dos demais testes:

  ```tsx
  test("deve renderizar o link Voltar para a busca", async () => {
    renderPage();
    const backLink = await screen.findByTestId("gym-edit-back-link");
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute("href", "/academias");
    expect(backLink).toHaveTextContent("Voltar para a busca");
  });
  ```

  Atualize o teste existente de renderização do botão de cancelamento para:

  ```tsx
  test("deve renderizar o botão Descartar alterações com variant outline", async () => {
    renderPage();
    const cancelBtn = await screen.findByRole("button", { name: /descartar alterações/i });
    expect(cancelBtn).toBeInTheDocument();
    expect(cancelBtn).toHaveClass("border-border");
  });
  ```

  Atualize o teste existente de navegação do botão de cancelamento para:

  ```tsx
  test("deve navegar para /academias ao clicar em Descartar alterações", async () => {
    const { user } = renderPage();
    const cancelBtn = await screen.findByRole("button", { name: /descartar alterações/i });
    await user.click(cancelBtn);
    expect(mockPush).toHaveBeenCalledWith("/academias");
  });
  ```

- **Step 2: Run tests to verify they fail**

  Run: `pnpm --filter frontend test -- --run page.test.tsx`

  Expected: FAIL — `Unable to find element with test ID "gym-edit-back-link"` e/ou `Unable to find role="button" with name /descartar alterações/i`.

- **Step 3: Write minimal implementation**

  Em `apps/frontend/src/app/(authenticated)/admin/academias/[id]/editar/page.tsx`, faça as seguintes alterações.

  Adicione os imports no topo do arquivo:

  ```tsx
  import { ArrowLeft } from "lucide-react";
  import Link from "next/link";
  ```

  No componente `AdminEditarAcademiaPage`, insira o link de voltar acima do `<header>`:

  ```tsx
  <Link
    href="/academias"
    data-testid="gym-edit-back-link"
    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
  >
    <ArrowLeft aria-hidden className="h-4 w-4" />
    Voltar para a busca
  </Link>
  ```

  No componente `EditGymForm`, altere o texto do botão de cancelamento:

  ```tsx
  <Button
    type="button"
    variant="outline"
    data-testid="gym-form-cancel"
    onClick={() => router.push("/academias")}
  >
    Descartar alterações
  </Button>
  ```

- **Step 4: Run tests to verify they pass**

  Run: `pnpm --filter frontend test -- --run page.test.tsx`

  Expected: PASS — todos os testes do arquivo passam.

- **Step 5: Run lint/type-check on the changed file**

  Run: `pnpm --filter frontend tsc:check`
  Run: `pnpm --filter frontend lint:fix`

  Expected: zero erros e zero issues do Biome.

- **Step 6: Commit**

  ```bash
  git add apps/frontend/src/app/(authenticated)/admin/academias/\[id\]/editar/page.tsx
  git add apps/frontend/src/app/(authenticated)/admin/academias/\[id\]/editar/page.test.tsx
  git commit -m "feat: add back link and rename cancel button on gym edit page

  Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
  ```

## Critérios de Sucesso

- [ ] O link "Voltar para a busca" é renderizado no topo da página de edição, com `href="/academias"` e `data-testid="gym-edit-back-link"`.
- [ ] O link usa o ícone `ArrowLeft` e as mesmas classes de estilo da tela de detalhes.
- [ ] O botão inferior do formulário exibe o texto "Descartar alterações".
- [ ] Todos os testes de `page.test.tsx` passam.
- [ ] `pnpm --filter frontend tsc:check` e `pnpm --filter frontend lint:fix` passam sem issues.
