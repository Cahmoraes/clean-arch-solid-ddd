# Task 1: Rotação da PRIVATE_KEY e Remoção dos .env do Git

**Status:** DONE
**PRD:** N/A
**Spec:** `../../../../apps/backend/reports/security-review-2026-05-18.md`

## Visão Geral

A chave simétrica HS256 `6d413cc366561bbeba5eac874e96ee3336bc4b7af6c3632b3dc56f889ff66e81` está commitada nos arquivos `apps/backend/.env.development` e `apps/backend/.env.test`. Qualquer pessoa com acesso ao repositório pode forjar JWTs para qualquer usuário, incluindo ADMIN.

Esta tarefa:
1. Gera uma nova `PRIVATE_KEY` (nunca exposta no git)
2. Atualiza os arquivos `.env` locais com a nova chave
3. Remove `.env.development` e `.env.test` do tracking do git
4. Adiciona esses arquivos ao `.gitignore` do backend
5. Cria um `.env.test.example` como template para novos desenvolvedores

> ⚠️ **IMPORTANTE:** Após esta tarefa, todos os JWT tokens emitidos com a chave antiga são invalidados automaticamente (qualquer request autenticado receberá 401 até que um novo token seja emitido). Em produção, isso força todos os usuários a fazer login novamente — isso é intencional e necessário para invalidar tokens potencialmente forjados.

## Arquivos

- Modify: `apps/backend/.env.test` (atualizar PRIVATE_KEY para nova chave gerada localmente)
- Modify: `apps/backend/.env.development` (atualizar PRIVATE_KEY para nova chave gerada localmente)
- Create: `apps/backend/.env.test.example`
- Modify: `apps/backend/.gitignore` (adicionar `.env.development` e `.env.test`)

### Conformidade com as Skills Padrão

- no-workarounds: não usar um placeholder temporário — gerar chave real imediatamente para que os testes passem localmente

## Passos

- [ ] **Step 1: Gerar nova PRIVATE_KEY**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copie o output (ex.: `a1b2c3d4...`) — será usada nos próximos passos. Nunca commite este valor.

- [ ] **Step 2: Atualizar PRIVATE_KEY no .env.test com a nova chave**

Abra `apps/backend/.env.test` e substitua a linha:
```
PRIVATE_KEY=6d413cc366561bbeba5eac874e96ee3336bc4b7af6c3632b3dc56f889ff66e81
```
pelo novo valor gerado no Step 1:
```
PRIVATE_KEY=<novo_valor_gerado>
```

O arquivo completo resultante deve ser (demais linhas inalteradas):
```
NODE_ENV=test
PORT=3333
HOST=0.0.0.0
PASSWORD_SALT=10
PRIVATE_KEY=<novo_valor_gerado>
CHECK_IN_EXPIRATION_TIME=20
JWT_EXPIRES_IN=10m
JWT_REFRESH_EXPIRES_IN=7d
REFRESH_TOKEN_NAME=refreshToken
ITEMS_PER_PAGE=20
AMQP_URL=amqp://localhost
DATABASE_PROVIDER='sqlite'
DATABASE_URL=postgresql://test:test@localhost:5432/test?schema=public
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
TTL=60
CORS_ORIGINS=
CRON_TIME_TO_UPDATE_CACHE=0 * * * *
```

> Nota: a linha `CRON_TIME_TO_UPDATE_CACHE` pode ser adicionada agora (antecipa a Task 5) ou depois. O schema terá um default ao final, então é opcional aqui.

- [ ] **Step 3: Atualizar PRIVATE_KEY no .env.development com a nova chave**

Abra `apps/backend/.env.development` e substitua:
```
PRIVATE_KEY='6d413cc366561bbeba5eac874e96ee3336bc4b7af6c3632b3dc56f889ff66e81'
```
pelo novo valor:
```
PRIVATE_KEY='<novo_valor_gerado>'
```

- [ ] **Step 4: Verificar que os testes unitários ainda passam com a nova chave**

```bash
pnpm --filter backend test:run
```

Esperado: todos os testes passam. Se houver falha relacionada a JWT, verifique se o valor foi salvo corretamente no `.env.test`.

- [ ] **Step 5: Criar arquivo .env.test.example como template**

Crie `apps/backend/.env.test.example` com o seguinte conteúdo (placeholder em vez da chave real):

```
# Copie este arquivo para .env.test e preencha os valores marcados como REPLACE_*
NODE_ENV=test
PORT=3333
HOST=0.0.0.0
PASSWORD_SALT=10
PRIVATE_KEY=REPLACE_WITH_SECURE_32_BYTE_HEX_KEY
CHECK_IN_EXPIRATION_TIME=20
JWT_EXPIRES_IN=10m
JWT_REFRESH_EXPIRES_IN=7d
REFRESH_TOKEN_NAME=refreshToken
ITEMS_PER_PAGE=20
AMQP_URL=amqp://localhost
DATABASE_PROVIDER=sqlite
DATABASE_URL=postgresql://test:test@localhost:5432/test?schema=public
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
TTL=60
CORS_ORIGINS=
CRON_TIME_TO_UPDATE_CACHE=0 * * * *
```

Para gerar uma chave válida:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

- [ ] **Step 6: Adicionar .env.development e .env.test ao .gitignore do backend**

Abra `apps/backend/.gitignore` e adicione ao final da seção de dotenv files:

```
.env.development
.env.test
```

O trecho final da seção ficará:
```
# dotenv environment variable files
.env
.env.development.local
.env.test.local
.env.production.local
.env.local
.env.development
.env.test
```

- [ ] **Step 7: Remover .env.development e .env.test do tracking do git**

```bash
cd /caminho/para/o/repo
git rm --cached apps/backend/.env.development apps/backend/.env.test
```

Esperado: output como:
```
rm 'apps/backend/.env.development'
rm 'apps/backend/.env.test'
```

Os arquivos locais continuam existindo no disco — apenas o tracking pelo git é removido.

- [ ] **Step 8: Auditar histórico do git para a chave comprometida**

```bash
git --no-pager log --all -p | grep -c "6d413cc366561bb"
```

Esperado: um número > 0 (a chave aparece no histórico). Isso é esperado e não é possível apagar sem reescrever o histórico do git (`git filter-repo`) — o que seria destrutivo para um repositório compartilhado. A mitigação correta é **rotacionar a chave** (já feito nos steps anteriores), não apagar o histórico.

> **Nota para o time:** Considere usar `git filter-repo --path apps/backend/.env.development --path apps/backend/.env.test --invert-paths` em um fork limpo se quiser remover do histórico, mas isso requer force-push e coordenação com todos os colaboradores. Para este exercício de estudo, a rotação de chave é suficiente.

- [ ] **Step 9: Commit**

```bash
git add apps/backend/.env.test.example apps/backend/.gitignore
git commit -m "security: rotate PRIVATE_KEY and remove .env files from git tracking

- Generate new HS256 signing key (old key 6d413cc... is now invalid)
- Remove .env.development and .env.test from git tracking
- Add .env.development and .env.test to .gitignore
- Add .env.test.example as template for new developers

BREAKING: all existing JWT tokens signed with the old key are now invalid.
Users will need to re-authenticate.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- `git ls-files apps/backend/.env.development apps/backend/.env.test` retorna vazio (arquivos não rastreados)
- `apps/backend/.gitignore` contém `.env.development` e `.env.test`
- `apps/backend/.env.test.example` existe com `PRIVATE_KEY=REPLACE_WITH_SECURE_32_BYTE_HEX_KEY`
- `pnpm --filter backend test:run` passa 100% com a nova chave
- A string `6d413cc366561bbeba5eac874e96ee3336bc4b7af6c3632b3dc56f889ff66e81` não aparece em nenhum arquivo atualmente rastreado pelo git
