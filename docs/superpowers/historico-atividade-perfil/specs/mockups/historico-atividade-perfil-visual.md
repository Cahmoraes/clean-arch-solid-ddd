# Histórico de Atividades no Perfil — Especificação Visual (artefato curado)

## Prose / intenção de design

Opção aprovada no mockup do companion: **B — Aba "Atividade"**. A tela `/perfil` deixa de ser uma página de rolagem única e vira **tabbed**: duas abas, `Visão geral` | `Atividade`, no padrão já usado pelo `UserDetailTabs` do painel admin. A aba "Atividade" renderiza o feed de atividades **dentro de um card de largura total** abaixo do header da página, com o mesmo visual da `ActivityTab` admin.

- **Estrutura da página:** header (Eyebrow "Conta" → título "Meu perfil") mantido; a tab row fica logo abaixo do header; o conteúdo da aba "Visão geral" é o grid 2-col atual (`ProfileCard` | `MetricCard`); o conteúdo da aba "Atividade" é um card full-width com o feed.
- **Feed (mesmos detalhes da tela admin):** agrupamento por data ("Hoje", "Ontem", data completa), ícone circular por categoria, descrição + horário (subtle, menor), últimos 20 itens, sem paginação.
- **Carregamento lazy:** o feed só busca quando a aba "Atividade" é aberta (`enabled: activeTab === "atividade"`), espelhando o `UserDetailTabs` admin. Estados de loading (skeleton), erro (inline, distinto do vazio) e vazio (`EmptyState`) herdados da `ActivityTab`.

## Core markup (representativo)

```tsx
// features/profile — página /perfil tabbed
<PageContainer>
  <Eyebrow>Conta</Eyebrow>
  <h1>Meu perfil</h1>
  <Tabs value={activeTab} onValueChange={setActiveTab}>
    <TabsList>
      <TabsTrigger value="overview">Visão geral</TabsTrigger>
      <TabsTrigger value="activity">Atividade</TabsTrigger>
    </TabsList>
    <TabsContent value="overview">
      <div className="grid [grid-template-columns:1.5fr_1fr] gap-[18px]">
        <ProfileCard />
        <MetricCard />
      </div>
    </TabsContent>
    <TabsContent value="activity">
      <ActivityTab
        events={activityEvents}
        isLoading={isLoading}
        isError={isError}
      />
    </TabsContent>
  </Tabs>
</PageContainer>
```

```tsx
// features/activity — hook compartilhado
const { data, isPending, isError } = useUserActivity(undefined, {
  enabled: activeTab === "activity",
});
```

## Design tokens aplicados (VOLT, tema escuro)

- Card: `bg-card` (#161616), `border-border` (#2a2a2a), radius `--radius-lg` (22px), `shadow-sm`.
- Tab pill ativa: `bg-accent` (#39e58c) com texto `accent-foreground` (#0a0a0a); inativa: `bg-surface-2` (#1d1d1d) com texto `muted-foreground`.
- Ícone por categoria (32px `rounded-full`): check-in `bg-accent/16` + `text-accent`; segurança `bg-warning-soft` + `text-warning` (#ffb443); conta/perfil/role/status `bg-surface-3` (#242424) + `text-muted-foreground`.
- Group headers: `text-[11px] uppercase tracking-[.04em]` `text-subtle` (#6f6f68); descrição `text-sm text-foreground`; horário `text-xs text-muted-foreground`.
- Skeleton: `animate-pulse rounded-[12px] bg-muted`.

## Fonte de design original

Nenhuma — layout definido via mockup do companion (opção B, aba "Atividade"). A fidelidade final é construída na task de implementação do frontend.

## Nota de fidelidade

O mockup é um *norte*, não o pixel-final. A implementação usa os componentes reais do projeto (Tabs do shadcn/ui, `PageContainer`, `Card`, `EmptyState`, `Skeleton`) e `lucide-react` para os ícones do feed.