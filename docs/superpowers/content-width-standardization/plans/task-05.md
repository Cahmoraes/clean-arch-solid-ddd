# Task 5: Verificação visual (borda esquerda) + auth intacta + gate final [RF-010, RF-015, RF-016]

**Status:** DONE
**PRD:** `../prd/prd-content-width-standardization.md`
**Spec:** `../specs/content-width-standardization-design.md`
**Depends on:** task-02, task-03, task-04

## Visão Geral

Verificar que o objetivo foi alcançado: a borda esquerda do conteúdo é idêntica (±2px) em todas as telas autenticadas (RF-010), as telas públicas de auth não foram tocadas (RF-015), e nenhum wrapper raiz autenticado retém o padrão ad-hoc removido (RF-016). Fechar com o gate completo do projeto.

## Arquivos

- Read-only: telas autenticadas migradas (verificação)
- Read-only: `apps/frontend/src/app/(public)/**` (confirmar intactas)

### Conformidade com as Skills Padrão

- use skill `playwright-cli`: medição de `getBoundingClientRect().left` do `<h1>` em cada tela.
- use skill `no-workarounds`: se a borda divergir, corrigir a causa (tier/wrapper errado), não mascarar a medição.

## Passos

- **Step 1: Garantir o dev server rodando**

Run: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000` (esperado `200`). Se não, subir: `pnpm --filter frontend dev` em background e aguardar `200`.

- **Step 2: Assertir que nenhum wrapper raiz autenticado retém o padrão ad-hoc (RF-016)**

Run:

```bash
grep -rn "mx-auto flex w-full max-w" "apps/frontend/src/app/(authenticated)"
```

Expected: **zero ocorrências** (todos os wrappers raiz foram migrados para `PageContainer`).

- **Step 3: Assertir que as telas públicas de auth não foram alteradas (RF-015)**

Run:

```bash
git diff --name-only origin/main...HEAD -- "apps/frontend/src/app/(public)"
grep -rln "PageContainer" "apps/frontend/src/app/(public)" || echo "OK: nenhum import de PageContainer em (public)"
```

Expected: nenhum arquivo de `(public)` na lista de alterações relacionada a esta feature; nenhum import de `PageContainer` em `(public)`.

- **Step 4: Medir a borda esquerda do `<h1>` em cada tela autenticada (RF-010)**

Logar como admin e medir. Sequência `playwright-cli`:

```bash
playwright-cli open http://localhost:3000/login
playwright-cli resize 1440 900
# preencher e enviar login (refs vêm do snapshot; e-mail/senha de seed)
playwright-cli fill "getByRole('textbox', { name: 'E-mail' })" "admin@admin.com"
playwright-cli fill "getByRole('textbox', { name: 'Senha' })" "admin@admin" --submit
```

Depois, para cada rota abaixo, medir o `left` do primeiro `<h1>` dentro do `<main>`:

```bash
for url in /inicio /academias /check-ins /perfil /assinatura /admin/usuarios /admin/check-ins /admin/academias/nova; do
  playwright-cli goto "http://localhost:3000$url" >/dev/null
  sleep 2
  playwright-cli --raw eval "Math.round(document.querySelector('main h1').getBoundingClientRect().left)"
done
```

Expected: todos os valores **iguais entre si com variação ≤ 2px**. (As telas wide/default/narrow devem compartilhar a mesma borda esquerda; só o limite à direita muda.)

> Se algum valor divergir > 2px, investigar o wrapper daquela tela — provavelmente reteve `mx-auto`, `px-*` próprio, ou não foi migrado. Corrigir na task de migração correspondente (2/3/4), não aqui.

- **Step 5: Capturar screenshots de evidência (antes/depois opcional)**

```bash
for url in inicio:/inicio academias:/academias check-ins:/check-ins admin-academias-nova:/admin/academias/nova; do
  name="${url%%:*}"; path="${url##*:}"
  playwright-cli goto "http://localhost:3000$path" >/dev/null; sleep 2
  playwright-cli screenshot --filename="/tmp/cws-$name.png" >/dev/null
done
playwright-cli close
```

Inspecionar as imagens: a borda esquerda do título deve estar visualmente alinhada entre as telas.

- **Step 6: Gate completo do projeto**

Run: `pnpm --filter frontend lint:fix && pnpm --filter frontend tsc:check && pnpm --filter frontend test && pnpm --filter frontend build`
Expected: lint zero issues; tsc zero erros; todos os testes passando; build com sucesso.

- **Step 7: Commit (se houver ajustes nos passos anteriores)**

```bash
git add -A
git commit -m "test(frontend): verify content width standardization (left-edge parity)"
```

> Se nenhuma alteração de código foi necessária (apenas verificação), não há commit — registrar os valores medidos no relatório de conclusão.

## Critérios de Sucesso

- Borda esquerda do `<h1>` idêntica (≤ 2px de variação) em 100% das telas autenticadas medidas (RF-010).
- `grep "mx-auto flex w-full max-w"` em `(authenticated)` retorna zero (RF-016).
- Telas públicas de auth intactas — sem import de `PageContainer` (RF-015).
- Gate completo (lint + tsc + test + build) 100%.
