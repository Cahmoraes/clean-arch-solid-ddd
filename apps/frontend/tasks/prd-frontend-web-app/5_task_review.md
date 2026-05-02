# Task Review — 5.0 F1 Autenticação (telas e fluxos)

**Data:** 2025-11-28
**Reviewer:** task-reviewer (sub-agente embutido em executar-task)
**Escopo:** `apps/frontend` — schemas Zod e mutations React Query de auth, telas `/login`, `/cadastro`, `/ativar/[token]`, `/perfil/senha`, integração de logout no `AuthenticatedShell`, toast de sessão expirada no fluxo de forced-logout, primitive `FormField` extraído.

## Sumário

- ✅ Build (`pnpm build`): sucesso — todas as páginas geradas (`/login`, `/cadastro`, `/perfil/senha` static; `/ativar/[token]` dinâmica)
- ✅ TypeScript (`pnpm tsc:check`): sem erros
- ✅ Lint (`pnpm lint` / Biome): sem erros (após extração de `FormField` e `useActivationViewState` para reduzir cognitive complexity)
- ✅ Testes (`pnpm test`): **93/93 passando** em 23 arquivos (anteriores 79 + 14 novos)
- ✅ Todas as 9 subtarefas concluídas
- ✅ Todos os 7 testes obrigatórios da task implementados e verdes

## Arquivos Revisados

| Arquivo | Status | Problemas |
|---------|--------|-----------|
| `src/features/auth/schemas/index.ts` | ✅ OK | 0 |
| `src/features/auth/schemas/index.test.ts` | ✅ OK | 0 |
| `src/features/auth/api/index.ts` | ✅ OK | 0 |
| `src/features/auth/api/index.test.tsx` | ✅ OK | 0 |
| `src/components/ui/form-field.tsx` | ✅ OK | 0 |
| `src/app/(public)/login/page.tsx` | ✅ OK | 0 |
| `src/app/(public)/login/page.test.tsx` | ✅ OK | 0 |
| `src/app/(public)/cadastro/page.tsx` | ✅ OK | 0 |
| `src/app/(public)/cadastro/page.test.tsx` | ✅ OK | 0 |
| `src/app/(public)/ativar/[token]/page.tsx` | ✅ OK | 0 |
| `src/app/(public)/ativar/[token]/page.test.tsx` | ✅ OK | 0 |
| `src/app/(authenticated)/perfil/senha/page.tsx` | ✅ OK | 0 |
| `src/app/(authenticated)/perfil/senha/page.test.tsx` | ✅ OK | 0 |
| `src/components/layout/AuthenticatedShell.tsx` | ✅ OK | 0 |
| `src/components/layout/AuthenticatedShell.test.tsx` | ✅ OK | 0 |
| `src/lib/api.ts` | ✅ OK | 0 |
| `src/test/render.tsx` | ✅ OK | 0 |

## Verificações dos Critérios de Sucesso

| Critério (RF / 5_task.md) | Status | Evidência |
|---------------------------|--------|-----------|
| Login com credenciais válidas armazena token no `auth-store` e redireciona para `/academias` | ✅ | `useLogin` chama `useAuthStore.setState(...).setSession(token)`; LoginForm faz `router.replace(redirect ?? "/academias")`; teste `submete credenciais válidas e redireciona para /academias` valida ambos |
| Login com credenciais inválidas exibe mensagem amigável (não "401 Unauthorized") | ✅ | `loginErrorMessage` → "E-mail ou senha incorretos."; teste `exibe mensagem amigável (sem 401) ao receber credenciais inválidas` confirma `text` não contém "401" |
| Cadastro exibe mensagem de ativar e-mail após sucesso (RF-01) | ✅ | `SuccessView` mostra "Enviamos instruções de ativação para …"; teste `exibe instrução de ativação após cadastro bem-sucedido` |
| Ativação com token válido exibe confirmação; token inválido exibe erro descritivo (RF-02) | ✅ | `ActivateAccountPage` valida UUID via Zod e exibe `activate-success` ou `activate-error`; cobertos por 3 testes |
| Logout limpa store e redireciona para `/login` (RF-04) | ✅ | `useLogout` chama `POST /sessions/logout` e `clear()` em `finally`; AuthenticatedShell invoca `logout.mutate(..., { onSettled: () => router.replace("/login") })`; teste `logout limpa o store e redireciona para /login` (com `waitFor`) |
| Alteração de senha com campos incompatíveis bloqueada pela validação Zod no cliente (RF-05) | ✅ | `changePasswordSchema.refine` valida confirmação; teste `bloqueia submissão quando confirmação diverge` |
| Visitante que acessa rota autenticada é redirecionado para `/login` (RF-08) | ✅ | `middleware.ts` Edge (Task 3) redireciona `/perfil/:path*` etc. quando cookie ausente; coberto por `middleware.test.ts` (3 testes pré-existentes) |
| Toast "sessão expirada" no forced-logout (RF-07) | ✅ | `handleForcedLogout` em `src/lib/api.ts` chama `toast.error("Sua sessão expirou. Faça login novamente.")` antes do redirect |
| Schemas Zod em `src/features/auth/schemas/` exportados para reuso | ✅ | `loginSchema`, `signupSchema`, `activateSchema`, `changePasswordSchema` + `LoginInput`, `SignupInput`, `ActivateInput`, `ChangePasswordInput` |
| Validação Zod e RHF em todos os formulários | ✅ | Todas as quatro telas usam `useForm({ resolver: zodResolver(...) })` |

## Conformidade com Skills

- **tanstack-query-best-practices**: mutations isoladas em `features/auth/api`, sem `retry` para mutações (pega o default do `query-client.ts`); efeitos colaterais (clear store, set session) ocorrem dentro do `mutationFn` (sem `onSuccess`/`onError` redundantes); chamadas tipadas via `openapi-fetch` reaproveitam `paths` de `@repo/api-types`.
- **zod**: schemas curtos, com mensagens em PT-BR localizadas, refinements para invariantes cruzadas (`newPassword === confirmPassword`, `currentPassword !== newPassword`); tipos derivados via `z.infer` evitando duplicação.
- **typescript-advanced**: `UseMutationResult<TData, TError, TVars>` explícito; tipos estrangeiros do backend não duplicados; `ActivationViewState` é union discriminada (estado finito) que torna o renderer livre de booleans encadeados.
- **test-antipatterns**: nenhum mock de hook próprio nem de React Query. Apenas `next/navigation` (boundary externo) é mockado nos testes de componente que dependem de `useRouter`/`useSearchParams`/`useParams`. MSW intercepta HTTP real-istically. O `auth-store` real é manipulado diretamente — comportamento real, não dublê.
- **tdd**: cada arquivo de schema/mutation tem teste irmão; integration tests cobrem o fluxo do usuário pelo formulário e o efeito observável (redirect, alert acessível, store atualizado).
- **ui-ux-pro-max**: aderência ao DESIGN.md mantida — `Input` pill (rounded-full), Button preto/branco/outline, paleta `pure-black/near-black/pure-white/snow/light-gray/mid-gray/stone`, `rounded-[12px]` para containers de erro, zero sombras/gradientes, foco-ring nativo do Tailwind preservado.
- **no-workarounds**: nenhuma supressão de tipo, lint ou teste. Erros de complexidade do Biome resolvidos por refactor (extração de `FormField` e `useActivationViewState`), não por `// biome-ignore`. O Suspense exigido pelo Next 16 para `useSearchParams` foi adicionado como boundary real, não com `?.` ou `try/catch`.

## Findings

### CRITICAL
Nenhum.

### MAJOR
Nenhum.

### MINOR

1. **`useLogout` chama backend mas não invalida cache do React Query.** Quando integrarmos a primeira query autenticada (Task 6.0 — `useMe`), pode existir um `cachedData` "fantasma" do usuário anterior persistido no `QueryClient`. Recomendação para a Task 6: adicionar `queryClient.clear()` (ou `queryClient.removeQueries({ queryKey: ['me'] })`) no `onSettled` da mutação. Não bloqueador hoje porque ainda não há queries autenticadas montadas.

2. **`FormField` aceita props arbitrárias mas hoje sempre renderiza `<Input>` pill.** Se em futuras telas precisarmos de `<textarea>` ou tipos especiais (currency, mask), o componente precisará ser generalizado. Custo trivial; nenhuma ação necessária agora.

3. **Mensagem de toast de sessão expirada é disparada por `handleForcedLogout` apenas quando `window.location.pathname !== "/login"`.** A guarda evita "loop" de toasts se o refresh falhar enquanto o usuário já está na tela de login, mas significa que um forced-logout durante uma navegação para `/login` não exibiria o toast. Comportamento aceitável; documentado para revisão futura.

4. **`ativar/[token]` dispara a mutation via `useEffect` com `useRef` triggered.** Funciona, mas em React 19 com Strict Mode (não habilitado neste projeto) o efeito rodaria duas vezes no dev. O `triggered.current` deduplica corretamente. Alternativa mais idiomática (mas não suportada hoje pelo Next 16 client) seria um Server Action ou `useTransition`. Não bloqueador.

### POSITIVE

- **Cobertura de teste densa em pouco código.** 14 novos testes (5 schemas + 2 hook + 7 integration) elevam a suíte de 79 → 93 verde, exercitando happy-path, validação client, erros 401/409/400 e o efeito real no store/route.
- **`ApiError` propagado e mapeado por status nos catches dos onSubmit.** Mensagens específicas por status (401 login, 409 cadastro, 401 change-password, 400/422 ativação) acima do fallback genérico do `mapStatusToMessage`. Cumpre RF-24 sem inventar texto técnico.
- **Toast de sessão expirada centralizado em `lib/api.ts`.** O middleware de auth (`auth-fetch-middleware`) e o scheduler proativo (`token-refresh`) já compartilhavam um único `onForcedLogout`; agora ele é uma função nomeada `handleForcedLogout` que primeiro chama `toast.error(...)` e só depois redireciona. Cumpre RF-07 sem duplicar lógica.
- **`useSearchParams` envolvido em `Suspense`.** Atende ao requisito de Next 16 sem hack; o fallback do Suspense (`<div data-testid="login-loading" aria-busy="true" />`) é minimalista e acessível.
- **`makeTestJwt` adicionado em `src/test/render.tsx`.** Helper reutilizável que permite testes integrarem o fluxo `setSession` real do `auth-store` (que decodifica JWT) sem inventar mocks. Já será reutilizado pela Task 6.0 (testes de queries autenticadas).
- **`AuthenticatedShell` agora consome `useLogout` mutation.** Antes apenas chamava `clear()` localmente — agora invoca o endpoint real do backend (`POST /sessions/logout`), garantindo revogação de refresh-token server-side, com fallback `finally` que ainda limpa store mesmo se backend falhar.
- **`ActivationViewState` como union discriminada.** Substitui encadeamento de `if (isError) ... else if (isSuccess) ...` por estado finito; torna o renderer trivial e facilita testes baseados em estado.
- **Acessibilidade preservada.** Todos os formulários têm `<label htmlFor>`, `aria-invalid`, `aria-describedby` apontando para `role="alert"` quando há erro; CTAs com `data-testid` semânticos; `aria-busy` durante mutation.

## Conclusão

**APROVADO.** Task 5.0 entregue dentro dos critérios do PRD/TechSpec/DESIGN, sem achados CRITICAL/MAJOR. Os 4 itens MINOR são oportunidades de polimento (cache invalidation na Task 6, generalização do FormField, observação de UX de toast). Pronto para destravar tasks 6.0 (Perfil/Métricas), 7.0 (Academias) e demais features autenticadas que dependem do fluxo de auth funcional.
