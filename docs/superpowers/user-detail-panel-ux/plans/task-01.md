# Task 1: Sticky layout no UserDetailContainer [FR-001, FR-002, FR-003, FR-004]

**Status:** DONE
**PRD:** `../prd/prd-user-detail-panel-ux.md`
**Spec:** `../specs/user-detail-panel-ux-design.md`
**Tier:** cheap
**Depends on:** N/A

## Visão Geral

Adiciona classes Tailwind CSS ao wrapper desktop do `UserDetailContainer` para que o painel de detalhes (a) fique ancorado no viewport enquanto a lista de usuários rola (sticky), (b) nunca exceda a altura do viewport e (c) não exiba espaço vazio abaixo do conteúdo. O comportamento mobile (Dialog) não é alterado.

A causa raiz do espaço vazio é que CSS Grid estica filhos para preencher a linha (`align-items: stretch` por padrão). `md:self-start` desativa esse comportamento.

## Arquivos

- Modify: `apps/frontend/src/features/admin/components/user-detail/user-detail-container.tsx`
- Test: `apps/frontend/src/features/admin/components/user-detail/user-detail-container.test.tsx`

### Conformidade com as Skills Padrão

- `tailwindcss`: aplicar classes de posicionamento (`sticky`, `self-start`, `max-h`, `overflow-y-auto`) no wrapper desktop
- `code-style`: seguir padrão de classes Tailwind do projeto (ordem, prefixos `md:`)
- `refactoring`: mudança pontual no JSX — sem alterar lógica, props ou hierarquia

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/user-detail-panel-ux-visual.md` (Section 1 — Layout sticky do painel)
- **Fonte de design original:** Screenshot fornecida pelo usuário mostrando espaço vazio marcado em vermelho — sem URL de ferramenta de design; seguir o mockup curado
- **Confirmar com o usuário:** existe alguma fonte de design adicional (Figma, URL) para esta tela além da screenshot?
- **Ferramentas de fidelidade visual:** nenhuma configurada neste repo para este componente; construir manualmente a partir do mockup curado
- **Decisões visuais já tomadas (não refazer):** `md:self-start md:sticky md:top-4 md:max-h-[calc(100vh-2rem)] md:overflow-y-auto` no wrapper desktop; prefixo `md:` preserva mobile inalterado

## Passos

- **Step 0: Confirm design source & fidelity tools**

  Ler `### Fidelidade Visual` acima. A fonte de design é a screenshot do usuário — sem URL de ferramenta de design. Confirmar com o usuário se há uma fonte adicional (ex.: Figma). Se não há fonte ou ferramentas de fidelidade configuradas, implementar diretamente a partir do mockup curado em `../specs/mockups/user-detail-panel-ux-visual.md`.

- **Step 1: Escrever testes falhando que verificam as classes sticky**

  Abrir `apps/frontend/src/features/admin/components/user-detail/user-detail-container.test.tsx` e adicionar ao `describe("UserDetailContainer", ...)` existente os dois testes abaixo (após os testes já existentes):

  ```tsx
  test("no desktop com usuário, o wrapper tem classes sticky e max-height", () => {
    isDesktopMock.mockReturnValue(true)
    const { container } = renderContainer(buildUser())
    // DesktopView retorna <div className="..."> como root quando user !== null
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toContain("md:self-start")
    expect(wrapper.className).toContain("md:sticky")
    expect(wrapper.className).toContain("md:top-4")
    expect(wrapper.className).toContain("md:max-h-[calc(100vh-2rem)]")
    expect(wrapper.className).toContain("md:overflow-y-auto")
  })

  test("no desktop sem usuário (EmptyState), o wrapper NÃO tem classe sticky", () => {
    isDesktopMock.mockReturnValue(true)
    const { container } = renderContainer(null)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).not.toContain("md:sticky")
  })
  ```

- **Step 2: Rodar os testes e verificar que falham**

  ```bash
  pnpm --filter frontend test -- --run "user-detail-container"
  ```

  Expected: FAIL — os testes novos falham porque as classes ainda não existem no wrapper.

- **Step 3: Implementar as classes sticky no wrapper desktop**

  Abrir `apps/frontend/src/features/admin/components/user-detail/user-detail-container.tsx`.

  Localizar a função `DesktopView`. Dentro do branch `if (!user)` está o `EmptyState` — não alterar. Alterar o `return` do branch com usuário:

  ```tsx
  // Antes:
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <UserDetailPanel
        user={user}
        onClose={onClose}
        onUserPatched={onUserPatched}
      />
    </div>
  )

  // Depois:
  return (
    <div className="rounded-lg border border-border bg-card p-5 md:self-start md:sticky md:top-4 md:max-h-[calc(100vh-2rem)] md:overflow-y-auto">
      <UserDetailPanel
        user={user}
        onClose={onClose}
        onUserPatched={onUserPatched}
      />
    </div>
  )
  ```

  Nenhuma outra mudança no arquivo.

- **Step 4: Rodar os testes e verificar que passam**

  ```bash
  pnpm --filter frontend test -- --run "user-detail-container"
  ```

  Expected: PASS — todos os testes do describe passam, incluindo os dois novos.

- **Step 5: Verificar que nenhum teste de regressão foi quebrado**

  ```bash
  pnpm --filter frontend test -- --run
  ```

  Expected: sem falhas novas. O mobile (Dialog) continua inalterado — o segundo teste confirma que `EmptyState` não recebe sticky.

- **Step 6: Rodar lint e typecheck**

  ```bash
  pnpm --filter frontend lint:fix
  pnpm --filter frontend tsc:check
  ```

  Expected: zero erros em ambos.

- **Step 7: Commit**

  ```bash
  git add apps/frontend/src/features/admin/components/user-detail/user-detail-container.tsx \
          apps/frontend/src/features/admin/components/user-detail/user-detail-container.test.tsx
  git commit -m "feat(admin): painel de detalhes sticky com altura limitada ao viewport"
  ```

## Critérios de Sucesso

- **FR-001**: o painel de detalhes tem `md:sticky` aplicado e permanece visível no viewport em qualquer posição de scroll no breakpoint `md`+
- **FR-002**: `md:max-h-[calc(100vh-2rem)]` impede o painel de exceder a altura do viewport
- **FR-003**: `md:self-start` desabilita o stretch do Grid, eliminando o espaço vazio abaixo do conteúdo
- **FR-004**: o `MobileView` (Dialog) não é alterado; o teste de `EmptyState` confirma ausência de `md:sticky` fora do branch com usuário
- Dois novos testes passam; nenhum teste existente quebra
- `tsc:check` e `lint:fix` sem erros
