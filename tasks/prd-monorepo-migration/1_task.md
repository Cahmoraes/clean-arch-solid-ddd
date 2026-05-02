# Tarefa 1.0: Configurar fundação do monorepo

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Preparar a raiz do repositório como monorepo declarando os workspaces no `pnpm-workspace.yaml`,
criando o `turbo.json` com o pipeline de tarefas e o `package.json` raiz com os scripts unificados
(`dev`, `build`, `test`, `lint`, `generate:types`). Esta tarefa não move nenhum arquivo existente —
apenas configura a infraestrutura de orquestração.

<skills>
### Conformidade com Skills Padrões

- **`no-workarounds`** — qualquer ajuste de paths deve usar a solução correta, sem hacks
</skills>

<requirements>
- `pnpm-workspace.yaml` deve declarar `apps/*` e `packages/*` como workspaces
- `turbo.json` deve ter as tasks: `build`, `dev`, `test`, `lint`, `generate:types`
- `package.json` raiz deve ter `turbo` como devDependency e scripts que delegam ao Turborepo
- O `onlyBuiltDependencies` atual do `pnpm-workspace.yaml` deve ser preservado
</requirements>

## Subtarefas

- [ ] 1.1 Atualizar `pnpm-workspace.yaml` adicionando `apps/*` e `packages/*`
- [ ] 1.2 Criar `turbo.json` na raiz com pipeline conforme a techspec
- [ ] 1.3 Criar `package.json` na raiz com `name: "monorepo"`, `private: true`, scripts raiz e `turbo` como devDependency
- [ ] 1.4 Executar `pnpm install` na raiz para verificar que não há erros de resolução

## Detalhes de Implementação

Ver seções **"turbo.json (raiz)"** e **"pnpm-workspace.yaml (raiz)"** na `techspec.md`.

O `package.json` raiz deve conter apenas:
- `name`, `private: true`, `packageManager`
- `devDependencies`: `{ "turbo": "latest" }`
- `scripts`: `dev`, `build`, `test`, `lint`, `generate:types`

## Critérios de Sucesso

- `pnpm install` na raiz termina sem erros
- `turbo --version` funciona após instalação
- `pnpm-workspace.yaml` lista corretamente `apps/*` e `packages/*`
- Nenhum arquivo do backend foi movido ou alterado

## Testes da Tarefa

- [ ] `pnpm install` sem erros na raiz
- [ ] `cat turbo.json` confirma todas as 5 tasks (`build`, `dev`, `test`, `lint`, `generate:types`)
- [ ] `cat pnpm-workspace.yaml` confirma os dois padrões de workspace

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- `pnpm-workspace.yaml` (modificado)
- `package.json` (novo — raiz)
- `turbo.json` (novo)
