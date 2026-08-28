# Task 3: Navegar páginas no perfil e renderizar os estados da lista [FR-005, FR-006]

**Status:** DONE
**PRD:** `../prd/prd-paginacao-historico-atividade-perfil.md`
**Spec:** `../specs/paginacao-historico-atividade-perfil-design.md`
**Tier:** standard
**Depends on:** task-02

## Visão Geral

Conectar a resposta paginada à aba **Atividade** do perfil. A página selecionada será lida e escrita em `?page=N`, a query key distinguirá cada página, a troca manterá os dados anteriores durante o carregamento e a tela usará `NumberedPagination` com a direção visual aprovada.

## Arquivos

- Modify: `apps/frontend/src/features/activity/api/use-user-activity.ts`
- Modify: `apps/frontend/src/features/activity/components/activity-tab.tsx`
- Modify: `apps/frontend/src/app/(authenticated)/perfil/page.tsx`
- Modify: `apps/frontend/src/features/admin/components/user-detail/user-detail-panel.tsx` (preservar o uso administrativo)
- Modify: `apps/frontend/src/app/(authenticated)/perfil/perfil-volt.test.tsx` (preservar o contrato visual existente)
- Test: `apps/frontend/src/features/activity/api/use-user-activity.test.tsx`
- Test: `apps/frontend/src/features/activity/components/activity-tab.test.tsx`
- Test: `apps/frontend/src/app/(authenticated)/perfil/page.test.tsx`

### Conformidade com as Skills Padrão

- `tanstack-query-best-practices`: incluir `page` na query key, usar `placeholderData: keepPreviousData` e preservar cache separado por página.
- `vercel-react-best-practices`: manter a leitura condicional da atividade, evitar efeitos redundantes e atualizar somente os search params necessários.
- `tailwindcss`: preservar a escala, tokens e responsividade existentes ao posicionar o resumo e os controles do pager.
- `shadcn`: reutilizar `NumberedPagination` e seus estados acessíveis em vez de criar controles duplicados.
- `impeccable`: implementar a hierarquia, espaçamento, tokens e estados aprovados no mockup sem reabrir a direção visual.
- `typescript-advanced`: transportar os tipos OpenAPI gerados para hook, props e resposta sem DTOs paralelos ou casts inseguros.
- `vitest`: manter testes Vitest com happy-dom, MSW e Testing Library nos arquivos já existentes.
- `test-antipatterns`: testar URL, query key e renderização observável, sem adicionar APIs de produção apenas para facilitar as asserções.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/paginacao-historico-atividade-perfil-visual.md`
- **Fonte de design original:** nenhuma; seguir o mockup curado.
- **Confirmar com o usuário:** não há fonte externa pendente; se surgir uma nova fonte durante a execução, registrar a decisão antes de substituir o mockup.
- **Ferramentas de fidelidade visual:** nenhuma ferramenta de design-to-code é necessária; construir manualmente com os componentes existentes. `impeccable` pode revisar a composição e `agent-browser` pode inspecionar a tela se uma validação visual for necessária.
- **Decisões visuais já tomadas:** tema dark VOLT; card com raio de 22px; título/legenda no cabeçalho; eventos agrupados por data; resumo “Exibindo 1–20 de N atividades” à esquerda; paginação numerada à direita e abaixo do resumo em telas estreitas; controles ocultos quando `totalPages <= 1`; accent `#39e58c`.

## Passos

- **Step 0: Confirm design source & fidelity tools**

Confirmar que não existe fonte visual externa adicional e implementar contra `../specs/mockups/paginacao-historico-atividade-perfil-visual.md`. Reutilizar `NumberedPagination`, os tokens dark VOLT e os estados já existentes de `ActivityTab`; não rederivar layout ou criar um pager novo.

- **Step 1: Write the failing test**

No teste do hook, incluir `page` na chamada e verificar query key e query string:

```tsx
server.use(
	http.get(`${apiBaseUrl}/users/me/activity`, ({ request }) => {
		expect(new URL(request.url).searchParams.get("page")).toBe("2")
		return HttpResponse.json({
			events: [],
			pagination: { page: 2, pageSize: 20, total: 21, totalPages: 2 },
		})
	}),
)

const { result } = renderHook(
	() => useUserActivity(undefined, { page: 2 }),
	{ wrapper: wrapper() },
)

await waitFor(() => expect(result.current.isSuccess).toBe(true))
expect(userActivityQueryKey(undefined, 2)).toEqual(["user-activity", "me", 2])
```

No teste de `ActivityTab`, verificar resumo, página atual e `NumberedPagination`; no teste da página, abrir a aba Atividade com `?page=2`, confirmar a requisição e clicar na página 3 para verificar a URL. Adicionar cenário com `totalPages=1` sem pager e cenário de página vazia usando o texto de estado vazio existente.

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/features/activity/api/use-user-activity.test.tsx src/features/activity/components/activity-tab.test.tsx src/app/'(authenticated)'/perfil/page.test.tsx`

Expected: FAIL because the hook does not accept `page`, the query key does not distinguish pages and `ActivityTab`/`ProfilePage` do not render or update pagination.

- **Step 3: Write minimal implementation**

Estender `UseUserActivityOptions` com `page?: number`, fazer `userActivityQueryKey(userId, page = 1)` retornar `["user-activity", userId ?? "me", page]`, enviar `params.query.page` somente para o endpoint `/users/me/activity` e usar `placeholderData: keepPreviousData`. O hook deve retornar a resposta paginada; adaptar `user-detail-panel.tsx` para consumir `events` sem exibir paginação administrativa. Preservar a assinatura exportada e as props do painel/container, confirmar o consumidor `user-detail-container.tsx` e o teste de evidência administrativa, e não exigir alteração funcional nesses importadores.

Na página de perfil, ler `page` com `useSearchParams`, normalizar ausência para 1, manter os demais parâmetros com `new URLSearchParams(searchParams.toString())` e usar `router.replace` para atualizar somente `page`. Passar `page`, `events`, `pagination` e `onPageChange` ao `ActivityTab`, preservando a busca lazy quando a aba Atividade é aberta.

No `ActivityTab`, aceitar `pagination` e `onPageChange`, renderizar `NumberedPagination` com `page`, `totalPages` e `testIdPrefix="activity"`, condicionar a renderização a `totalPages > 1` e manter loading/error/empty. Aplicar o mockup curado ao rodapé do card, incluindo resumo, alinhamento responsivo, rótulos acessíveis e destaque da página atual.

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/features/activity/api/use-user-activity.test.tsx src/features/activity/components/activity-tab.test.tsx src/app/'(authenticated)'/perfil/page.test.tsx`

Expected: PASS for query key/request page, URL synchronization, lazy loading, metadata, pager visibility, empty state and accessible page controls.

- **Step 5: Commit** *(sequential execution only)*

```bash
git add apps/frontend/src/features/activity/api/use-user-activity.ts apps/frontend/src/features/activity/components/activity-tab.tsx apps/frontend/src/app/'(authenticated)'/perfil/page.tsx apps/frontend/src/features/admin/components/user-detail/user-detail-panel.tsx apps/frontend/src/app/'(authenticated)'/perfil/perfil-volt.test.tsx apps/frontend/src/features/activity/api/use-user-activity.test.tsx apps/frontend/src/features/activity/components/activity-tab.test.tsx apps/frontend/src/app/'(authenticated)'/perfil/page.test.tsx
git commit -m "Adicionar paginacao ao historico do perfil"
```

## Critérios de Sucesso

- FR-005: `page` permanece na URL, diferencia o cache e controla a navegação numerada sem refazer a busca quando a aba está inativa.
- FR-006: uma página vazia mantém o estado vazio sem erro; uma única página não exibe controles.
- A aba segue o mockup curado em tema dark, hierarquia, espaçamento, responsividade e acessibilidade.
