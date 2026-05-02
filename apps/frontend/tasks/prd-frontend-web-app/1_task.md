# Tarefa 1.0: Setup de testes e qualidade (Vitest + MSW + Playwright)

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Configurar toda a infraestrutura de testes do projeto: Vitest (unit/integration) com Testing Library + jsdom + MSW para mocking de HTTP, e Playwright para E2E. Esta task entrega a base que todas as demais tasks usarão para escrever e executar testes.

<skills>
### Conformidade com Skills Padrões

- `vitest` — setup de configuração, plugins e helpers
- `test-antipatterns` — disciplina ao usar MSW em vez de mocks de hooks
- `playwright-cli` — configuração do Playwright e uso do CLI para rodar/depurar testes E2E
- `no-workarounds` — preferir corrigir causa-raiz em problemas de configuração
</skills>

<requirements>
- Vitest configurado com jsdom, coverage e aliases `@/` apontando para `src/`
- Testing Library (`@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`) instalado e setup global aplicado
- MSW configurado com server para Node (testes) e service worker para browser (dev)
- Helper `render.tsx` com todos os providers necessários (QueryClientProvider, roteamento mock)
- Playwright configurado com `webServer` para frontend + backend
- Scripts no `package.json`: `test`, `test:ui`, `test:coverage`, `e2e`
- `biome.json` atualizado para ignorar artefatos de Playwright e gerados
</requirements>

## Subtarefas

- [ ] 1.1 Instalar dependências de dev: `vitest`, `@vitejs/plugin-react`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`, `msw`, `@playwright/test`
- [ ] 1.2 Criar `apps/frontend/vitest.config.ts` com ambiente jsdom, setup file, aliases e coverage
- [ ] 1.3 Criar `apps/frontend/src/test/setup.ts` com `@testing-library/jest-dom` e configuração do MSW server
- [ ] 1.4 Criar `apps/frontend/src/test/msw/handlers.ts` com handlers base (stubs vazios para cada endpoint do backend)
- [ ] 1.5 Criar `apps/frontend/src/test/render.tsx` com função `renderWithProviders` que envolve o componente em `QueryClientProvider` + roteamento mock
- [ ] 1.6 Criar `apps/frontend/playwright.config.ts` com `webServer` levantando frontend e backend, baseURL e configurações de retry
- [ ] 1.7 Adicionar scripts `test`, `test:ui`, `test:coverage`, `e2e` ao `package.json` do frontend
- [ ] 1.8 Atualizar `biome.json` para ignorar `playwright-report/`, `test-results/` e arquivos gerados

## Detalhes de Implementação

Ver `techspec.md` → seção **Abordagem de Testes** (Testes Unidade, Testes de Integração, Testes de E2E) e **Dependências Técnicas**.

## Critérios de Sucesso

- `pnpm test` executa sem erros (zero testes ainda, mas setup válido)
- `pnpm e2e` inicia Playwright sem falhas de configuração
- MSW intercepta chamadas HTTP em testes sem necessidade de mockar funções internas
- `renderWithProviders` aceita qualquer componente e o envolve nos providers corretos
- Coverage report gerado ao rodar `pnpm test:coverage`

## Testes da Tarefa

- [ ] Teste de unidade: criar um teste dummy que usa `renderWithProviders` e confirma que o componente renderiza dentro do `QueryClientProvider`
- [ ] Teste de integração: handler MSW responde corretamente a uma requisição fake e o helper de render captura o resultado
- [ ] E2E: `playwright.config.ts` válido — `npx playwright test --list` lista testes sem erro de configuração

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- `apps/frontend/vitest.config.ts`
- `apps/frontend/src/test/setup.ts`
- `apps/frontend/src/test/msw/handlers.ts`
- `apps/frontend/src/test/render.tsx`
- `apps/frontend/playwright.config.ts`
- `apps/frontend/package.json`
- `apps/frontend/biome.json`
