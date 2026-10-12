# Tarefas: Botão Google customizado (auth-code)

**Spec:** `../specs/google-custom-signin-button-design.md`

**PRD:** `../prd/prd-google-custom-signin-button.md`

---

## Tarefas

- [ ] 1. Provider Google troca authorization code por tokens → `task-01.md`
- [ ] 2. Controllers de sessão e reautenticação aceitam `{ code }` → `task-02.md`
- [ ] 3. Componente de ícone do logo G oficial → `task-03.md`
- [ ] 4. Botão "Continuar com Google" customizado com design system → `task-04.md`
- [ ] 5. Mutações e telas passam a enviar o authorization code → `task-05.md`

## Restrições Globais

- Nenhum token do Google atravessa o browser: o app manda authorization code e o backend troca com `GOOGLE_CLIENT_SECRET` (spec, ## Fronteiras e Contratos)
- `verifyIdToken` sempre com `audience = GOOGLE_CLIENT_ID`; code inválido, expirado ou já usado vira `401` (spec, D1)
- Rótulo único "Continuar com Google" nas 3 telas: login, cadastro e perfil › senha (spec, ## Especificação Visual)
- Botão usa `Button` do design system com `variant="outline"`, `font-display`, altura 40px e largura máxima 400px (spec, ## Especificação Visual)
- Logo G oficial multicolorido em 20px (`h-5`), sem monocromia, distorção ou redesenho; arquivo entra na allowlist de `src/test/no-literal-colors.test.ts` (spec, D1)
- Regras de conta permanecem as de `mixed-login-external-accounts`: sem linking silencioso por e-mail, `409 external_account_link_required` (spec, ## Escopo)
- `AuthenticateWithGoogleUseCase` não muda a regra de resolução de usuário, os eventos nem a emissão de JWT (spec, ## Componentes)
- `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` ausentes no backend fazem a verificação falhar sem chamada ao Google (spec, ## Falhas e Erros)

## Foco de Revisão

- Code válido porém já consumido: o provider precisa devolver `InvalidGoogleTokenError` (não um erro genérico) para que a resposta siga `401` — `task-01`
- `GoogleAuthProviderImpl` deve falhar antes de qualquer chamada HTTP quando o env estiver ausente — `task-01`
- O corpo antigo `{ idToken }` precisa cair em `400` de validação, não em falha de provider — `task-02`
- `CreatePasswordReauthGrantUseCase` continua devolvendo grant de 300 s e recusando reuso — `task-02`
- Google não devolvendo `code` nem `email_verified` no payload: o botão não pode quebrar o ciclo de loading — `task-04`