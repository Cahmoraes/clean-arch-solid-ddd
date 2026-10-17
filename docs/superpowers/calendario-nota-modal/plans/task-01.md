# Task 1: Adicionar o ícone Save ao conjunto de ícones do projeto

**Status:** PENDING

**PRD:** N/A

**Spec:** `../specs/calendario-nota-modal-design.md`

**Tier:** standard

## Visão Geral

O botão Salvar do novo modal usa um disquete, e o conjunto de ícones do projeto (pixelarticons vendorizado) ainda não tem um ícone de salvar. Esta task acrescenta `Save` pelo gerador oficial, sem editar o arquivo gerado à mão.

## Arquivos

- Modify: `apps/frontend/scripts/generate-pixel-icons.mjs`
- Modify (gerado): `apps/frontend/src/components/ui/pixel-icons.tsx`
- Test: `apps/frontend/src/components/ui/pixel-icons.test.tsx`

## Interfaces

- **Consome:** N/A
- **Produz:** `export const Save: PixelIcon` em `@/components/ui/pixel-icons` (mesmo formato dos demais: `(props) => <PixelSvg d="..." {...props} />`, `aria-hidden`, viewBox 24x24, `fill="currentColor"`)

### Skills a invocar

- `no-workarounds`: o arquivo é gerado; a correção é rodar o gerador, nunca editar o `.tsx` à mão.
- `test-antipatterns`: a lista `EXPECTED_EXPORTS` deve ser atualizada, sem testar detalhe de implementação.

## Passos

- **Step 1: Write the failing test**

Em `apps/frontend/src/components/ui/pixel-icons.test.tsx`, acrescente `"Save"` à lista ordenada `EXPECTED_EXPORTS`, entre `"RotateCcw"` e `"Search"`. O teste existente que compara os exports de `import * as pixelIcons` com essa lista passa a exigir `Save`. Acrescente também, no mesmo arquivo:

```tsx
test("AC-10 Save é exportado como ícone decorativo", () => {
	const { container } = render(<pixelIcons.Save />)
	expect(pixelIcons.Save).toBeDefined()
	expect(container.querySelector('svg[aria-hidden="true"]')).not.toBeNull()
})
```

- **Step 2: Run test to verify it fails**

Run: `cd apps/frontend && pnpm exec vitest run src/components/ui/pixel-icons.test.tsx`
Expected: FAIL, a lista esperada inclui `Save` e o módulo não a exporta.

- **Step 3: Adicionar `Save: "save"` ao `ICON_MAP` e regenerar**

Em `apps/frontend/scripts/generate-pixel-icons.mjs`, acrescente `Save: "save",` ao `ICON_MAP` entre `RotateCcw: "reload"` e `Search: "search"` (a ordem do mapa é só convenção, o renderizador ordena). Depois rode, a partir de `apps/frontend` (precisa de rede, a versão `PIXELARTICONS_VERSION` já é `2.4.1`):

Run: `cd apps/frontend && node scripts/generate-pixel-icons.mjs`

Confira o diff do arquivo gerado: `git diff --stat apps/frontend/src/components/ui/pixel-icons.tsx` deve mostrar só linhas acrescentadas, e `git diff apps/frontend/src/components/ui/pixel-icons.tsx` deve conter apenas o novo `export const Save`. Se o gerador falhar, ou o diff alterar qualquer outro ícone, pare e reporte: não escreva o `Save` à mão.

- **Step 4: Run test to verify it passes**

Run: `cd apps/frontend && pnpm exec vitest run src/components/ui/pixel-icons.test.tsx src/test/no-lucide.test.ts`
Expected: PASS

- **Step 5: Commit** *(só quando `workflow.auto_commit` for true)*

```bash
git add apps/frontend/scripts/generate-pixel-icons.mjs apps/frontend/src/components/ui/pixel-icons.tsx apps/frontend/src/components/ui/pixel-icons.test.tsx
git commit -m "feat(frontend): adicionar icone Save ao conjunto de pixel icons"
```

## Critérios de Sucesso

- AC-10 [unit]: WHEN o gerador de ícones é executado THEN `pixel-icons.tsx` passa a exportar `Save`, o diff do arquivo gerado só acrescenta esse ícone e `no-lucide.test.ts` continua passando
