# Task 1: Logout como nav item na sidebar

**Status:** DONE
**PRD:** N/A
**Spec:** `../specs/frontend-ui-adjustments-design.md`
**Depends on:** N/A

## Visão Geral

Mover o botão de logout para dentro do `<nav>` da sidebar como um item de navegação estilizado de forma consistente com os demais links. O botão atual é um ícone oculto (`max-[860px]:hidden`) no rodapé do usuário — após esta task ele estará visível tanto no estado expandido (ícone + texto "Sair") quanto no colapsado (somente ícone centralizado), com cor muted que vira destructive no hover.

## Arquivos

- Modify: `apps/frontend/src/components/layout/authenticated-shell.tsx`
- Test: `apps/frontend/src/components/layout/authenticated-shell.test.tsx`

### Conformidade com as Skills Padrão

- code-style: convenções de componentes React, Tailwind, kebab-case
- no-workarounds: sem suprimir erros ou usar assertions de tipo

## Passos

- [ ] **Step 1: Escrever o teste que vai falhar**

Adicione o teste abaixo em `apps/frontend/src/components/layout/authenticated-shell.test.tsx`, dentro do `describe` existente:

```tsx
test("exibe o botão Sair na sidebar para MEMBER", () => {
  setRole("MEMBER")
  render(
    <AuthenticatedShell>
      <p>conteúdo</p>
    </AuthenticatedShell>,
  )
  expect(screen.getByRole("button", { name: /sair/i })).toBeInTheDocument()
})
```

- [ ] **Step 2: Rodar o teste para confirmar que falha**

```bash
cd apps/frontend && pnpm test -- --reporter=verbose -t "exibe o botão Sair"
```

Esperado: FAIL — `Unable to find an accessible element with the role "button" and name /sair/i`

- [ ] **Step 3: Implementar a mudança em authenticated-shell.tsx**

No arquivo `apps/frontend/src/components/layout/authenticated-shell.tsx`, faça **duas alterações**:

**3a — Adicionar o botão Sair no final do `<nav>` (logo antes de `</nav>`):**

Localizar o fechamento do `<nav>` (em torno da linha 145):
```tsx
				</nav>
```

Substituir por:
```tsx
				<button
					type="button"
					onClick={handleLogout}
					className="mt-auto flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors max-[860px]:justify-center text-sidebar-muted hover:bg-white/5 hover:text-destructive"
				>
					<LogOut className="h-[18px] w-[18px] flex-shrink-0" aria-hidden="true" />
					<span className="flex-1 max-[860px]:hidden">Sair</span>
				</button>
			</nav>
```

**3b — Remover o botão ícone do rodapé do usuário (linhas 159–166):**

Localizar e remover este bloco:
```tsx
				<button
					type="button"
					aria-label="Sair"
					onClick={handleLogout}
					className="inline-flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-md border border-sidebar-border text-sidebar-muted transition-colors hover:border-destructive hover:text-destructive max-[860px]:hidden"
				>
					<LogOut className="h-4 w-4" />
				</button>
```

- [ ] **Step 4: Rodar o teste para confirmar que passa**

```bash
cd apps/frontend && pnpm test -- --reporter=verbose -t "exibe o botão Sair"
```

Esperado: PASS

- [ ] **Step 5: Rodar a suite completa do componente**

```bash
cd apps/frontend && pnpm test -- --reporter=verbose authenticated-shell
```

Esperado: todos os testes PASS

- [ ] **Step 6: Lint + type check**

```bash
cd apps/frontend && pnpm lint:fix && pnpm tsc:check
```

Esperado: zero erros em ambos

- [ ] **Step 7: Commit**

```bash
git add apps/frontend/src/components/layout/authenticated-shell.tsx \
        apps/frontend/src/components/layout/authenticated-shell.test.tsx
git commit -m "feat(frontend): adiciona botão Sair como nav item na sidebar

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- Botão "Sair" visível na sidebar em ambos os estados (expandido e colapsado)
- Em modo expandido: exibe ícone `LogOut` + texto "Sair"
- Em modo colapsado (≤860px): exibe somente o ícone, centralizado
- Hover: cor muted → destructive (vermelho)
- Clicar chama `handleLogout`
- Teste `screen.getByRole("button", { name: /sair/i })` passa
- Todos os testes existentes do componente continuam passando
