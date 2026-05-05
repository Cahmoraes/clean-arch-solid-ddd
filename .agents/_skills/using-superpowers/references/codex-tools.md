# Mapeamento de Ferramentas do Codex

Skills usam nomes de ferramentas do Claude Code. Quando você encontrar esses em uma skill, use o equivalente da sua plataforma:

| Referência na Skill | Equivalente no Codex |
|--------------------|---------------------|
| `Task` tool (despachar subagente) | `spawn_agent` (veja [Despacho de subagente requer suporte multi-agente](#despacho-de-subagente-requer-suporte-multi-agente)) |
| Múltiplas chamadas `Task` (paralelo) | Múltiplas chamadas `spawn_agent` |
| Task retorna resultado | `wait_agent` |
| Task completa automaticamente | `close_agent` para liberar slot |
| `TodoWrite` (rastreamento de tarefas) | `update_plan` |
| `Skill` tool (invocar uma skill) | Skills carregam nativamente — apenas siga as instruções |
| `Read`, `Write`, `Edit` (arquivos) | Use suas ferramentas nativas de arquivo |
| `Bash` (executar comandos) | Use suas ferramentas nativas de shell |

## Despacho de subagente requer suporte multi-agente

Adicione à sua configuração do Codex (`~/.codex/config.toml`):

```toml
[features]
multi_agent = true
```

Isso habilita `spawn_agent`, `wait_agent` e `close_agent` para skills como `dispatching-parallel-agents` e `subagent-driven-development`.

Nota legada: Builds do Codex anteriores a `rust-v0.115.0` expunham a espera de agente gerado como `wait`. O Codex atual usa `wait_agent` para agentes gerados. O nome `wait` agora pertence ao `exec/wait` do modo código, que retoma uma célula exec pausada por `cell_id`; não é a ferramenta de resultado de agente gerado.

## Detecção de Ambiente

Skills que criam worktrees ou finalizam branches devem detectar seu ambiente com comandos git somente de leitura antes de prosseguir:

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
BRANCH=$(git branch --show-current)
```

- `GIT_DIR != GIT_COMMON` → já em um worktree vinculado (pule a criação)
- `BRANCH` vazio → HEAD desanexado (não pode fazer branch/push/PR do sandbox)

Veja `using-git-worktrees` Passo 0 e `finishing-a-development-branch` Passo 1 para como cada skill usa esses sinais.

## Finalização no App Codex

Quando o sandbox bloqueia operações de branch/push (HEAD desanexado em um worktree gerenciado externamente), o agente commita todo o trabalho e informa ao usuário para usar os controles nativos do App:

- **"Create branch"** — nomeia a branch, depois commit/push/PR via UI do App
- **"Hand off to local"** — transfere trabalho para o checkout local do usuário

O agente ainda pode executar testes, preparar arquivos e fornecer nomes de branch sugeridos, mensagens de commit e descrições de PR para o usuário copiar.
