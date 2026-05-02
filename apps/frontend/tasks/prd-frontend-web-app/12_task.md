# Tarefa 12.0: Testes E2E críticos + auditoria de acessibilidade

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Implementar os testes E2E críticos com Playwright rodando contra o backend real, cobrindo os fluxos de maior risco do produto. Realizar auditoria de acessibilidade com axe-core nas telas críticas. Para depurar falhas, usar `playwright-cli` para se conectar à sessão e inspecionar interativamente.

<skills>
### Conformidade com Skills Padrões

- `playwright-cli` — rodar testes com `PLAYWRIGHT_HTML_OPEN=never npx playwright test`, depurar falhas com `--debug=cli` + `playwright-cli attach <session>`; cada ação do CLI gera código TypeScript copiável para o spec
- `no-workarounds` — corrigir causa-raiz de falhas E2E; não pular assertions
- `test-antipatterns` — testar fluxos reais contra o backend; não mockar o backend em E2E
</skills>

<requirements>
- Playwright configurado com `webServer` levantando frontend (`pnpm --filter frontend dev`) e backend (`pnpm --filter backend dev`)
- Fluxo 1 — **Onboarding completo**: cadastro → (ativação por token manual ou endpoint direto) → login → busca de academia → check-in → confirmação visual
- Fluxo 2 — **Admin valida check-in**: login como admin → navegar para `/admin/check-ins` → clicar "Validar" em check-in pendente → confirmar feedback visual de sucesso
- Fluxo 3 — **Renovação transparente de sessão**: login → simular expiração do access token (token com TTL curto no backend de teste ou interceptação de refresh) → realizar ação autenticada → confirmar que continua autenticado sem logout forçado
- Auditoria de acessibilidade com `@axe-core/playwright` nas telas: login, cadastro, `/academias`, `/perfil`, `/check-ins`
- Foco de teclado visível em todos os elementos interativos auditados
</requirements>

## Subtarefas

- [x] 12.1 Finalizar/validar `playwright.config.ts` com `webServer` para frontend + backend, `baseURL`, `retries: 1`, timeout adequado
- [x] 12.2 Instalar `@axe-core/playwright` como devDependency
- [x] 12.3 Criar `apps/frontend/e2e/onboarding.spec.ts` cobrindo fluxo completo: cadastro → ativação → login → check-in
- [x] 12.4 Criar `apps/frontend/e2e/admin-validate-checkin.spec.ts` cobrindo fluxo admin de validação
- [x] 12.5 Criar `apps/frontend/e2e/session-refresh.spec.ts` cobrindo renovação transparente de sessão
- [x] 12.6 Criar `apps/frontend/e2e/accessibility.spec.ts` com varredura axe-core nas telas críticas
- [x] 12.7 Criar helper `apps/frontend/e2e/helpers/auth.ts` com funções `loginAs(page, role)` para reutilização entre specs
- [x] 12.8 Adicionar script `e2e` no `package.json` executando `PLAYWRIGHT_HTML_OPEN=never npx playwright test`

## Detalhes de Implementação

Ver `techspec.md` → seção **Testes de E2E** (fluxos, configuração de ambiente) e **Riscos Conhecidos** (acessibilidade vs paleta monocromática).

**Como rodar e depurar:**

```bash
# Rodar todos os testes E2E
PLAYWRIGHT_HTML_OPEN=never npx playwright test

# Depurar um teste específico com playwright-cli
PLAYWRIGHT_HTML_OPEN=never npx playwright test e2e/onboarding.spec.ts --debug=cli
# Aguardar "Debugging Instructions" com nome da sessão, então:
playwright-cli attach <session-name>
```

Cada ação executada via `playwright-cli` gera código TypeScript correspondente que pode ser copiado diretamente para o spec.

## Critérios de Sucesso

- Todos os 3 fluxos críticos passam sem flakiness em 2 runs consecutivos
- Auditoria axe-core não reporta violações críticas (`critical` ou `serious`) nas telas auditadas
- Foco de teclado visível em: inputs, botões, links de navegação
- `pnpm e2e` termina com código 0 em CI
- Relatório HTML do Playwright gerado em `playwright-report/`

## Testes da Tarefa

- [x] E2E: `onboarding.spec.ts` — cadastro → ativação → login → check-in passa
- [x] E2E: `admin-validate-checkin.spec.ts` — admin valida check-in e vê confirmação
- [x] E2E: `session-refresh.spec.ts` — sessão renovada sem interrupção visível
- [x] E2E: `accessibility.spec.ts` — zero violações críticas/sérias nas telas auditadas
- [x] Checklist manual: navegar pelas telas principais usando apenas teclado (Tab, Enter, Esc) e confirmar foco sempre visível

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- `apps/frontend/playwright.config.ts`
- `apps/frontend/e2e/onboarding.spec.ts`
- `apps/frontend/e2e/admin-validate-checkin.spec.ts`
- `apps/frontend/e2e/session-refresh.spec.ts`
- `apps/frontend/e2e/accessibility.spec.ts`
- `apps/frontend/e2e/helpers/auth.ts`
- `apps/frontend/package.json`
