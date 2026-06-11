# Task 3: Limpar credenciais Supabase expostas no .env.example

**Status:** DONE
**PRD:** N/A
**Spec:** N/A — ver `apps/backend/reports/security-review-2026-05-11.md` → HIGH-1

## Visão Geral

O arquivo `.env.example` (commitado no git) contém credenciais reais do Supabase em comentário: `postgres.iyvpfsmaxownspuodeyc:SSEPd8GMEOzo2hwt`. Qualquer pessoa com acesso ao repositório pode usar essas credenciais. A correção é substituir pelas linhas por placeholders genéricos.

> ⚠️ **Ação manual necessária ANTES desta task:** Rotacionar a senha do banco Supabase em [app.supabase.com](https://app.supabase.com) → Settings → Database → Reset database password. Esta task apenas limpa o arquivo — a senha exposta precisa ser invalidada.

## Arquivos

- Modify: `apps/backend/.env.example`

<skills>
### Compliance with Standard Skills

- `no-workarounds`: remover as credenciais do arquivo e não apenas adicionar `.env.example` ao `.gitignore`.
</skills>

## Passos

- [ ] **Step 1: Confirmar as linhas a substituir**

Run:
```bash
grep -n "supabase\|SSEPd8\|iyvpfsmaxownspuodeyc" apps/backend/.env.example
```
Expected: duas linhas comentadas com as credenciais reais.

- [ ] **Step 2: Substituir as linhas por placeholders**

Em `apps/backend/.env.example`, localizar e substituir as linhas do Supabase:

```
# ANTES:
# DATABASE_URL=postgresql://postgres.iyvpfsmaxownspuodeyc:SSEPd8GMEOzo2hwt@aws-0-us-east-1.pooler.supabase.com:6543/postgres?schema=public&sslmode=require&pgbouncer=true
# DIRECT_URL=postgresql://postgres.iyvpfsmaxownspuodeyc:SSEPd8GMEOzo2hwt@aws-0-us-east-1.pooler.supabase.com:5432/postgres?schema=public&sslmode=require

# DEPOIS:
# DATABASE_URL=postgresql://USER:PASSWORD@HOST:6543/postgres?schema=public&sslmode=require&pgbouncer=true
# DIRECT_URL=postgresql://USER:PASSWORD@HOST:5432/postgres?schema=public&sslmode=require
```

- [ ] **Step 3: Verificar que não há mais credenciais reais no arquivo**

Run:
```bash
grep -n "SSEPd8\|iyvpfsmaxownspuodeyc" apps/backend/.env.example
```
Expected: nenhuma saída.

- [ ] **Step 4: Confirmar commits com credenciais no histórico**

Run:
```bash
git --no-pager log --all --oneline -- apps/backend/.env.example | while read sha msg; do
  if git show "$sha:apps/backend/.env.example" 2>/dev/null | grep -q "SSEPd8\|iyvpfsmaxownspuodeyc"; then
    echo "CONTÉM CREDENCIAL: $sha $msg"
  fi
done
```
Expected: 3 commits identificados (6e24787, ca9c9be, b6fc850).

- [ ] **Step 5: Commit a remoção dos placeholders antes do expurgo**

```bash
cd apps/backend
git add .env.example
git commit -m "fix(security): replace exposed Supabase credentials with placeholders

Replaces real Supabase connection strings in .env.example with
generic USER:PASSWORD@HOST placeholders.

HIGH-1 from security-review-2026-05-11

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

- [ ] **Step 6: Criar arquivo de substituições para git-filter-repo**

> ⚠️ **AÇÃO DESTRUTIVA — reescreve todo o histórico git.** Todos que clonaram o repositório precisarão re-clonar ou fazer `git fetch --all && git reset --hard origin/main` após o force-push.

Criar o arquivo de substituições (fora do repositório para não ser commitado):

```bash
cat > /tmp/git-credentials-replacements.txt << 'EOF'
SSEPd8GMEOzo2hwt==>REDACTED_PASSWORD
iyvpfsmaxownspuodeyc==>REDACTED_PROJECT_ID
EOF
```

- [ ] **Step 7: Executar git-filter-repo para expurgar as credenciais do histórico**

Run (a partir da raiz do repositório):
```bash
cd /home/cahmoraes/projects/estudo/clean-arch-solid-ddd
git filter-repo --replace-text /tmp/git-credentials-replacements.txt --force
```

Expected: saída mostrando reescrita dos commits. Exemplo:
```
Parsed 42 commits
New history written in X.YZs; now repacking/cleaning...
Repack completed
```

- [ ] **Step 8: Verificar que as credenciais foram removidas do histórico**

Run:
```bash
git --no-pager log --all -p -- apps/backend/.env.example | grep -E "SSEPd8|iyvpfsmaxownspuodeyc" | head -5
```
Expected: **nenhuma saída** — as credenciais foram substituídas por `REDACTED_PASSWORD` e `REDACTED_PROJECT_ID` em todo o histórico.

- [ ] **Step 9: Verificar que o arquivo atual ainda está correto**

Run:
```bash
grep -n "SSEPd8\|iyvpfsmaxownspuodeyc\|REDACTED" apps/backend/.env.example
```
Expected: as linhas mostram `REDACTED_PROJECT_ID` e `REDACTED_PASSWORD` nos comentários de exemplo (resultado do filter-repo no commit mais recente).

Se necessário, ajustar manualmente para o formato de placeholder genérico preferido:
```
# DATABASE_URL=postgresql://USER:PASSWORD@HOST:6543/postgres?schema=public&sslmode=require&pgbouncer=true
# DIRECT_URL=postgresql://USER:PASSWORD@HOST:5432/postgres?schema=public&sslmode=require
```

- [ ] **Step 10: Limpar arquivo temporário**

```bash
rm /tmp/git-credentials-replacements.txt
```

- [ ] **Step 11: Commit (se Step 9 exigiu ajuste manual)**

```bash
cd apps/backend
git add .env.example
git commit -m "fix(security): normalize Supabase placeholder format in .env.example

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

- [ ] **Step 12: Force push para o remote**

> ⚠️ Confirmar com o time antes de executar em repositórios compartilhados.

```bash
git push --force-with-lease origin $(git branch --show-current)
```

## Critérios de Sucesso

- `.env.example` não contém `SSEPd8GMEOzo2hwt` nem `iyvpfsmaxownspuodeyc`
- As linhas de exemplo do Supabase existem como comentários com placeholders genéricos
- `git log --all -p -- apps/backend/.env.example | grep SSEPd8` → **nenhuma saída** (histórico limpo)
- Force push realizado para o remote
- Senha do Supabase foi rotacionada manualmente (verificar com o responsável)
