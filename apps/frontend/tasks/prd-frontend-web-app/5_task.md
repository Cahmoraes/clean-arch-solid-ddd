# Tarefa 5.0: F1 — Autenticação (telas e fluxos)

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Implementar todas as telas e fluxos de autenticação: cadastro, ativação de conta, login, logout e alteração de senha. Esta task usa a infra de auth (task 3.0) e os primitivos de UI (task 2.0) e desbloqueia todas as features autenticadas.

<skills>
### Conformidade com Skills Padrões

- `tdd` — implementar hooks e telas de auth com testes primeiro
- `zod` — schemas de validação para todos os formulários de auth
- `tanstack-query-best-practices` — mutations de login, cadastro, logout com invalidação correta
- `test-antipatterns` — MSW para mockar HTTP; não mockar React Query
- `typescript-advanced` — tipos derivados de `paths` para request/response bodies
</skills>

<requirements>
- Tela `/login`: formulário email + senha, validação Zod, mensagem clara em 401, redireciona para `/academias` após sucesso (RF-03)
- Tela `/cadastro`: formulário nome + email + senha, validação Zod alinhada ao backend, feedback de sucesso com instrução de ativar e-mail (RF-01)
- Tela `/ativar/[token]`: aceita token na URL, chama endpoint de ativação, exibe feedback de sucesso ou erro (RF-02)
- Tela `/perfil/senha` (autenticada): campos senha atual + nova senha + confirmação, validação Zod (RF-05)
- Ação de logout disponível no menu do `AuthenticatedShell`: chama `POST /sessions/logout`, limpa store, redireciona para `/login` (RF-04)
- Sessão renovada automaticamente via `token-refresh` (RF-06)
- Falha definitiva de refresh redireciona para `/login` com toast informativo (RF-07)
- Rotas autenticadas inacessíveis a visitantes via `middleware.ts` (RF-08)
- Schemas Zod em `src/features/auth/schemas/` exportados para reuso
</requirements>

## Subtarefas

- [x] 5.1 Criar `src/features/auth/schemas/` com `loginSchema`, `signupSchema`, `activateSchema`, `changePasswordSchema`
- [x] 5.2 Criar `src/features/auth/api/` com mutations: `useLogin`, `useSignup`, `useActivateAccount`, `useLogout`, `useChangePassword`
- [x] 5.3 Criar tela `src/app/(public)/login/page.tsx` com formulário React Hook Form + Zod
- [x] 5.4 Criar tela `src/app/(public)/cadastro/page.tsx` com formulário e feedback pós-cadastro
- [x] 5.5 Criar tela `src/app/(public)/ativar/[token]/page.tsx` que lê o token da URL e aciona a mutation de ativação
- [x] 5.6 Criar tela `src/app/(authenticated)/perfil/senha/page.tsx` com formulário de alteração de senha
- [x] 5.7 Integrar ação de logout no `AuthenticatedShell` (via `useLogout` mutation)
- [x] 5.8 Adicionar toast de "sessão expirada" disparado pelo `auth-fetch-middleware` ao redirecionar para `/login`
- [x] 5.9 Adicionar handlers MSW em `src/test/msw/handlers.ts` para: `POST /users`, `PATCH /users/activate`, `PATCH /users/me/change-password`

## Detalhes de Implementação

Ver `techspec.md` → seção **Endpoints de API** (RF-01 a RF-08), **Design de Implementação** (schemas Zod, mutations), e **Fluxo de dados**.

## Critérios de Sucesso

- Login com credenciais válidas armazena token no `auth-store` e redireciona para `/academias`
- Login com credenciais inválidas exibe mensagem amigável (não "401 Unauthorized")
- Cadastro exibe mensagem de ativar e-mail após sucesso
- Ativação com token válido exibe confirmação; token inválido exibe erro descritivo
- Logout limpa store e redireciona para `/login`
- Alteração de senha com campos incompatíveis bloqueada pela validação Zod no cliente
- Visitante que acessa rota autenticada é redirecionado para `/login`

## Testes da Tarefa

- [x] Teste de unidade: `loginSchema` rejeita email inválido e senha abaixo do mínimo
- [x] Teste de unidade: `signupSchema` valida nome, email e força de senha
- [x] Teste de unidade: `useLogin` atualiza `auth-store` ao receber token do MSW
- [x] Teste de integração: tela de login — submit feliz redireciona; erro 401 mostra mensagem amigável
- [x] Teste de integração: tela de cadastro — submit feliz exibe instrução de ativação
- [x] Teste de integração: tela de ativação — token válido exibe sucesso; token inválido exibe erro
- [x] Teste de integração: logout — clique no botão limpa store e navega para `/login`

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- `apps/frontend/src/features/auth/schemas/`
- `apps/frontend/src/features/auth/api/`
- `apps/frontend/src/app/(public)/login/page.tsx`
- `apps/frontend/src/app/(public)/cadastro/page.tsx`
- `apps/frontend/src/app/(public)/ativar/[token]/page.tsx`
- `apps/frontend/src/app/(authenticated)/perfil/senha/page.tsx`
- `apps/frontend/src/components/layout/AuthenticatedShell.tsx`
- `apps/frontend/src/test/msw/handlers.ts`
