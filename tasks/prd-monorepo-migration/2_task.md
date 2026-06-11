# Tarefa 2.0: Migrar backend para `apps/backend/`

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Mover todos os arquivos do backend da raiz do repositório para `apps/backend/` preservando o
histórico git. Ajustar o `name` no `package.json` do backend para `"backend"`. Garantir que todos
os caminhos relativos internos (tsconfig paths, biome, prisma, scripts) continuam funcionando a
partir do novo local. Ao final, o `pnpm --filter backend test:run` e `pnpm --filter backend build`
devem passar.

<skills>
### Conformidade com Skills Padrões

- **`no-workarounds`** — usar `git mv` para preservar histórico; não copiar/deletar
- **`systematic-debugging`** — se algum path quebrar, investigar a causa raiz antes de corrigir
</skills>

<requirements>
- Todos os arquivos atuais da raiz (exceto `pnpm-workspace.yaml`, `package.json` raiz, `turbo.json` e `.git`) devem estar em `apps/backend/`
- O histórico git dos arquivos deve ser preservado (usar `git mv`)
- `apps/backend/package.json` deve ter `"name": "backend"`
- `pnpm --filter backend test:run` deve passar (todos os testes unitários)
- `pnpm --filter backend build` deve passar
- `pnpm --filter backend tsc:check` deve passar sem erros
</requirements>

## Subtarefas

- [ ] 2.1 Criar diretório `apps/` e `apps/backend/` no repositório
- [ ] 2.2 Mover todos os arquivos relevantes da raiz para `apps/backend/` usando `git mv`
- [ ] 2.3 Adicionar `"name": "backend"` ao `apps/backend/package.json`
- [ ] 2.4 Verificar se `tsconfig.json` paths (`@/*`, `test/*`) continuam corretos relativos ao novo local
- [ ] 2.5 Verificar se `biome.json` e `.env*` estão em `apps/backend/` e funcionando
- [ ] 2.6 Verificar se `prisma/schema.prisma` e scripts prisma continuam funcionando
- [ ] 2.7 Executar `pnpm install` na raiz para re-linkar workspaces
- [ ] 2.8 Executar `pnpm --filter backend tsc:check` e corrigir eventuais erros de path
- [ ] 2.9 Executar `pnpm --filter backend test:run`

## Detalhes de Implementação

Ver seção **"Sequenciamento de Desenvolvimento"** e **"Riscos Conhecidos"** na `techspec.md`.

Arquivos que devem permanecer na raiz (NÃO mover):
- `pnpm-workspace.yaml`
- `package.json` (raiz — criado na tarefa 1.0)
- `turbo.json`
- `.git/`
- `node_modules/` (será recriado pelo `pnpm install`)

Arquivos que devem ir para `apps/backend/`:
- `src/`, `test/`, `prisma/`, `scripts/`, `docs/`, `build/`, `tasks/`
- `package.json` (do backend), `tsconfig.json`, `biome.json`, `tsup.config.ts`
- `.env`, `.env.*`, `.gitignore`, `Dockerfile`, `compose.yaml`
- Demais arquivos de configuração do backend

## Critérios de Sucesso

- `git log --follow apps/backend/src/main.ts` mostra histórico preservado
- `pnpm --filter backend test:run` passa sem erros
- `pnpm --filter backend build` gera artefatos em `apps/backend/build/`
- `pnpm --filter backend tsc:check` sem erros de TypeScript
- Nenhum `import` interno do backend foi quebrado

## Testes da Tarefa

- [ ] `pnpm --filter backend test:run` — todos os testes unitários passam
- [ ] `pnpm --filter backend tsc:check` — sem erros de tipo
- [ ] `pnpm --filter backend build` — build gerado com sucesso
- [ ] `git log --follow apps/backend/src/main.ts` — histórico preservado

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- `apps/backend/` (movido da raiz)
- `apps/backend/package.json` (modificado — adicionar `name`)
- `apps/backend/tsconfig.json`
- `apps/backend/biome.json`
- `apps/backend/scripts/generate-client.ts`
