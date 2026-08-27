# Tarefas: Acessibilidade WCAG 2.2 em todo o frontend

**Spec:** `../specs/acessibilidade-frontend-design.md`
**PRD:** `../prd/prd-acessibilidade-frontend.md`

**Goal:** Fechar os 25 critérios / 59 ocorrências WCAG 2.2 mapeados pela auditoria (inputs, imagens, botões, foco, skip-link, `font-size`) em `apps/frontend`, generalizando o padrão de indicador de obrigatoriedade e de foco já validado em produção pela feature `contato-acessibilidade`.

**Architecture:** Correções pontuais de markup/ARIA/CSS em componentes existentes — nenhum componente novo é criado, nenhum contrato de API muda. A técnica de "anel duplo" (D2) e o novo token de borda (D7) ficam centralizados em `apps/frontend/src/app/globals.css` (token global + utility Tailwind reutilizável), consumidos pelas primitivas de UI (`button`, `input`, `checkbox`, `field-shell`) e por overrides locais em features (`gym-location-picker`, `check-in-search-input`, `search-bar`, `command-palette`). A suíte e2e de acessibilidade (`axe-core`) ganha cobertura de `/admin/usuarios` e `/assinatura`.

**Tech Stack:** Next.js 16 (App Router) / React 19, Tailwind CSS v4 (`@theme`, `@utility`), Radix UI via shadcn/ui, Vitest + Testing Library + MSW (unitário), Playwright + `@axe-core/playwright` (e2e).

---

## Tarefas

- [x] 1. Tokens globais de acessibilidade em `globals.css` (anel de foco duplo + utility + `font-size` em `rem`) [FR-003, FR-005] → `task-01.md`
- [x] 2. `CardTitle` — heading semântico por padrão com prop `as` [FR-009] → `task-02.md`
- [x] 3. `PaginationLink` — `href` obrigatório + ícones decorativos ocultos [FR-007, FR-010] → `task-03.md`
- [x] 4. `gym-image-uploader` — rótulo associado ao input de imagem [FR-001] → `task-04.md`
- [x] 5. `gym-cnpj-field` — indicador de obrigatoriedade acessível [FR-002] → `task-05.md`
- [x] 6. `EditProfileModal` — indicador de obrigatoriedade acessível no nome [FR-002] → `task-06.md`
- [x] 7. `details-edit-form` — indicador de obrigatoriedade + ícones decorativos ocultos [FR-002, FR-007] → `task-07.md`
- [x] 8. `at-risk-alert-zone` — ícones decorativos ocultos de leitores de tela [FR-007] → `task-08.md`
- [x] 9. `public-shell` — skip-link para o conteúdo principal [FR-004] → `task-09.md`
- [x] 10. `authenticated-shell` — skip-link para o conteúdo principal [FR-004] → `task-10.md`
- [x] 11. `segmented-control` — `aria-label` por item [FR-006] → `task-11.md`
- [x] 12. `button` — anel de foco duplo + documentação de `size="icon"` [FR-003] → `task-12.md`
- [x] 13. `input` — anel de foco duplo + borda com contraste [FR-003, FR-011] → `task-13.md`
- [x] 14. `checkbox` — anel de foco duplo + borda + alvo de toque + `CheckIcon` oculto [FR-003, FR-011, FR-008, FR-007] → `task-14.md`
- [x] 15. `field-shell` — anel de foco duplo no campo mascarado (`MASKED_INPUT_CLASS`) [FR-003] → `task-15.md`
- [x] 16. `gym-location-picker` — indicador de obrigatoriedade + anel de foco duplo [FR-002, FR-003] → `task-16.md`
- [x] 17. `check-in-search-input` — rótulo acessível + anel de foco duplo + alvo de toque do botão "Limpar" [FR-001, FR-003, FR-008] → `task-17.md`
- [x] 18. `search-bar` — rótulo acessível (com correção do bug de `aria-label` perdido) + anel de foco duplo [FR-001, FR-003] → `task-18.md`
- [x] 19. `command-palette` — anel de foco duplo no campo de busca e no container [FR-003] → `task-19.md`
- [x] 20. `academias/page` — `aria-label` por item no toggle de visualização [FR-006] → `task-20.md`
- [x] 21. `accessibility.spec.ts` — cobertura e2e de `/admin/usuarios` e `/assinatura` [FR-001, FR-002, FR-003, FR-004, FR-007, FR-009, FR-010, FR-011] → `task-21.md`

## Ondas de Execução

- **Wave 1** (parallel): 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11
- **Wave 2** (parallel): 12, 13, 14, 15, 16, 17, 18, 19, 20
- **Wave 3** (sequential): 21
