# Task 3: Verificação visual com playwright + quality gate

**Status:** DONE
**PRD:** N/A
**Spec:** `../specs/ux-contrast-fixes-design.md`

## Visão Geral

Capturar screenshots após fixes em dark e light mode para confirmar contraste corrigido. Executar quality gate completo.

## Arquivos

- Test: screenshots via playwright-cli (não persistidos no repo)

### Conformidade com as Skills Padrão

- `playwright-cli`: verificação visual de contraste pós-fix

## Passos

- [ ] **Step 1: Garantir dev server ativo**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```

Esperado: `200`. Se offline, rodar `pnpm --filter frontend dev` e aguardar.

- [ ] **Step 2: Abrir browser e definir dark mode**

```bash
playwright-cli open http://localhost:3000
playwright-cli localstorage-set theme dark
playwright-cli reload
```

- [ ] **Step 3: Screenshot home em dark mode — verificar hover do botão Entrar**

```bash
playwright-cli hover "getByTestId('cta-login')"
playwright-cli screenshot --filename=/tmp/fix-home-dark-hover.png
```

Esperado: botão com fundo lilás e **texto escuro** (quase preto `#0e0c1f`) — não branco.

- [ ] **Step 4: Navegar para /assinatura em dark mode**

Usar credenciais de conta existente. Se necessário relogar:

```bash
playwright-cli goto http://localhost:3000/login
playwright-cli fill "getByRole('textbox', { name: 'E-mail' })" "testuser@demo.com"
playwright-cli fill "getByRole('textbox', { name: 'Senha' })" "TestPass123!"
playwright-cli click "getByTestId('login-submit')"
playwright-cli goto http://localhost:3000/assinatura
```

- [ ] **Step 5: Screenshot /assinatura em dark mode**

```bash
playwright-cli screenshot --filename=/tmp/fix-assinatura-dark.png
```

Esperado: DemoBanner com fundo lilás e texto escuro legível (não branco sobre lilás).

- [ ] **Step 6: Trocar para light mode e screenshot /assinatura**

```bash
playwright-cli localstorage-set theme light
playwright-cli reload
playwright-cli screenshot --filename=/tmp/fix-assinatura-light.png
```

Esperado: DemoBanner com fundo lilás e texto navy (`#1b1938`) — texto secundário também legível.

- [ ] **Step 7: Fechar browser**

```bash
playwright-cli close
```

- [ ] **Step 8: Quality gate completo**

```bash
cd apps/frontend && pnpm lint:fix && pnpm tsc:check && pnpm test && pnpm build
```

Esperado: todos os 4 comandos passam com zero erros.

## Critérios de Sucesso

- Screenshot dark mode: DemoBanner com texto escuro visível sobre fundo lilás
- Screenshot dark mode: botão "Entrar" hover com texto escuro sobre fundo lilás
- Screenshot light mode: texto secundário do DemoBanner legível (não apagado)
- `pnpm lint:fix && pnpm tsc:check && pnpm test && pnpm build` — 100% pass
