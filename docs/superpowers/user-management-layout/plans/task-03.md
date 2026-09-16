# Task 3: Organizar painel de detalhe e abas de contexto [FR-009, FR-010, FR-011]

**Status:** DONE
**PRD:** `../prd/prd-user-management-layout.md`
**Spec:** `../specs/user-management-layout-design.md`
**Tier:** cheap
**Depends on:** N/A

## Visão Geral

`PermissionsTab` já existe, implementado e testado isoladamente (`permissions-tab.tsx` +
`permissions-tab.test.tsx`), mas está órfão: nenhum componente o importa. `UserDetailPanel`
hoje renderiza só duas abas ("Detalhes" e "Atividade") e há inclusive um teste explícito
afirmando que a aba "Permissões" **não** existe. Esta task conecta o componente já pronto como
uma terceira aba ("Permissões"), reaproveitando os dados de permissão e os callbacks de
confirmação que `useUserDetailActions` já calcula e expõe (`actions.permissions.*`,
`actions.flags.isPending`, `actions.confirm.setPromoteOpen`/`setDemoteOpen`) — nenhuma nova API
é criada, apenas a fiação (wiring) que faltava.

## Arquivos

- Modify: `apps/frontend/src/features/admin/components/user-detail/user-detail-panel.tsx`
- Test: `apps/frontend/src/features/admin/components/user-detail/user-detail-panel.test.tsx`

### Conformidade com as Skills Padrão

- `shadcn`: a nova `TabsTrigger`/`TabsContent` segue exatamente o mesmo padrão Radix Tabs já
  usado pelas abas "Detalhes" e "Atividade" no mesmo arquivo.
- `refactoring`: esta task é, por definição, uma reorganização — mover um componente já
  testado (`PermissionsTab`) de órfão para conectado — sem alterar o comportamento de domínio
  de nenhum dos dois lados (nem `PermissionsTab`, nem `useUserDetailActions`).
- `typescript-advanced`: os props repassados (`canPromoteToAdmin`, `canDemoteFromAdmin`,
  `isPending`, `onPromote`, `onDemote`) já existem tipados em `PermissionsTabProps` e em
  `UserDetailActions["permissions"]`/`["flags"]` — a conexão é checada estaticamente pelo
  `tsc`, sem `any`.
- `vitest` / `test-antipatterns`: o teste novo verifica o fluxo observável pelo usuário
  (clicar na aba, ver o texto da role atual, clicar em "Tornar Administrador", ver o diálogo
  de confirmação abrir) — não inspeciona estado interno do hook.

## Passos

- **Step 1: Write the failing test**

Em `user-detail-panel.test.tsx`, atualizar o teste que afirmava a ausência da aba e adicionar
um teste de integração para o fluxo de promoção:

```tsx
test("exibe nome, e-mail e as três abas", () => {
  renderPanel(buildUser())
  const header = within(screen.getByRole("banner"))
  expect(header.getByText("João Damasio")).toBeInTheDocument()
  expect(screen.getByRole("tab", { name: "Detalhes" })).toBeInTheDocument()
  expect(screen.getByRole("tab", { name: "Permissões" })).toBeInTheDocument()
  expect(screen.getByRole("tab", { name: "Atividade" })).toBeInTheDocument()
})

test("FR-010/FR-011: aba Permissões exibe a role atual e aciona a confirmação de promoção/rebaixamento", async () => {
  const user = userEvent.setup()
  useAuthStore
    .getState()
    .setSession(
      makeTestJwt({ sub: "root-id", role: "ADMIN", isSuperAdmin: true }),
    )
  renderPanel(buildUser({ id: "target-id", role: "MEMBER" }))

  await user.click(screen.getByRole("tab", { name: "Permissões" }))
  expect(
    screen.getByText("Acesso somente às próprias informações."),
  ).toBeInTheDocument()

  await user.click(
    screen.getByRole("button", { name: /tornar administrador/i }),
  )
  expect(
    screen.getByRole("heading", { name: /tornar administrador/i }),
  ).toBeInTheDocument()
})
```

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/features/admin/components/user-detail/user-detail-panel.test.tsx`
Expected: FAIL — `screen.getByRole("tab", { name: "Permissões" })` não encontra nenhum
elemento, porque `UserDetailTabs` só renderiza as abas "detalhes" e "atividade".

- **Step 3: Write minimal implementation**

Em `user-detail-panel.tsx`, importar `PermissionsTab` e adicionar a terceira aba entre
"Detalhes" e "Atividade", repassando exatamente os campos que `useUserDetailActions` já
calcula:

```tsx
import { PermissionsTab } from "./permissions-tab"

// dentro de UserDetailTabs, no <TabsList>:
<TabsList>
  <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
  <TabsTrigger value="permissoes">Permissões</TabsTrigger>
  <TabsTrigger value="atividade">Atividade</TabsTrigger>
</TabsList>

// novo <TabsContent>, logo após o de "detalhes":
<TabsContent value="permissoes">
  <PermissionsTab
    user={user}
    canPromoteToAdmin={actions.permissions.canPromoteToAdmin}
    canDemoteFromAdmin={actions.permissions.canDemoteFromAdmin}
    isPending={actions.flags.isPending}
    onPromote={() => actions.confirm.setPromoteOpen(true)}
    onDemote={() => actions.confirm.setDemoteOpen(true)}
  />
</TabsContent>
```

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/features/admin/components/user-detail/user-detail-panel.test.tsx`
Expected: PASS — todos os testes do arquivo passam, incluindo os dois atualizados/novos; o
diálogo de confirmação `PromoteConfirmationDialog` (já renderizado por `UserDetailPanel`,
controlado por `actions.confirm.promoteOpen`) abre normalmente ao clicar em "Tornar
Administrador" dentro da nova aba.

- **Step 5: Commit** *(sequential execution only — em uma wave paralela o orquestrador
  commita na barreira de integração; se seu prompt indicar que você é um de vários
  implementadores em uma árvore compartilhada, pule este passo e reporte os arquivos)*

```bash
git add apps/frontend/src/features/admin/components/user-detail/user-detail-panel.tsx apps/frontend/src/features/admin/components/user-detail/user-detail-panel.test.tsx
git commit -m "feat(admin-users): conectar a aba Permissões ao painel de detalhe"
```

### Fidelidade Visual

Fonte de referência: `../specs/mockups/user-management-layout-visual.md` (mockup curado). O
próprio mockup declara não existir fonte de design original externa ("Nenhuma fonte externa
— este documento é a referência normativa de layout"); ele funciona como um "norte" direcional
de estrutura (grid mestre-detalhe, abas dentro do painel), não como um comp pixel-perfect.

A aba "Permissões" já é renderizada pelo componente `PermissionsTab` existente, cujo visual
(badge de role via `RoleBadge`, texto descritivo, botões de ação) não muda nesta task — apenas
sua posição dentro de `UserDetailTabs` muda. Não há, portanto, novo estilo a validar
visualmente; a verificação de fidelidade se resume a confirmar que a nova `TabsTrigger`
"Permissões" segue o mesmo estilo (`data-state=active`, espaçamento, tipografia) das abas
irmãs já existentes, o que é garantido por reaproveitar o mesmo componente `TabsList`/`TabsTrigger`
do shadcn sem classes novas.

Ferramentas de fidelidade disponíveis neste ambiente, caso uma checagem visual manual seja
necessária durante a implementação: as skills `playwright-cli` e `agent-browser` (navegação e
captura de tela de `/admin/usuarios` em viewport real) e a skill `ui-ux-pro-max` (revisão de
hierarquia/densidade). Nenhuma ferramenta de diffing de imagem (ex.: Percy/Chromatic) está
configurada neste repositório — a validação visual, se executada, é manual via captura de
tela comparada à descrição do mockup.

## Critérios de Sucesso

- FR-009: `UserDetailPanel` exibe três abas — "Detalhes", "Permissões" e "Atividade" —
  coberto por `"exibe nome, e-mail e as três abas"`.
- FR-010: a aba "Permissões" exibe a role atual do usuário (rótulo e descrição) — coberto por
  `"FR-010/FR-011: aba Permissões exibe a role atual e aciona a confirmação de
  promoção/rebaixamento"` (asserção do texto `"Acesso somente às próprias informações."`).
- FR-011: acionar "Tornar Administrador"/"Remover Administrador" na aba Permissões abre o
  diálogo de confirmação correspondente — coberto pelo mesmo teste (clique no botão e
  asserção do heading do diálogo).
