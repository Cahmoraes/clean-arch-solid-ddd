---
name: finishing-a-development-branch
description: Use quando a implementação está completa, todos os testes passam e você precisa decidir como integrar o trabalho - guia a conclusão do trabalho de desenvolvimento apresentando opções estruturadas para merge, PR ou limpeza
---

# Finalizando um Branch de Desenvolvimento

## Visão Geral

Guie a conclusão do trabalho de desenvolvimento apresentando opções claras e lidando com o workflow escolhido.

**Princípio fundamental:** Verificar testes → Detectar ambiente → Apresentar opções → Executar escolha → Limpar.

**Anuncie no início:** "Estou usando a skill finishing-a-development-branch para concluir este trabalho."

## O Processo

### Passo 1: Verificar Testes

**Antes de apresentar opções, verifique se os testes passam:**

```bash
# Execute a suite de testes do projeto
npm test / cargo test / pytest / go test ./...
```

**Se os testes falharem:**
```
Testes falhando (<N> falhas). É necessário corrigir antes de concluir:

[Mostre as falhas]

Não é possível prosseguir com merge/PR até que os testes passem.
```

Pare. Não prossiga para o Passo 2.

**Se os testes passarem:** Continue para o Passo 2.

### Passo 2: Detectar Ambiente

**Determine o estado do workspace antes de apresentar opções:**

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
```

Isso determina qual menu mostrar e como a limpeza funciona:

| Estado | Menu | Limpeza |
|--------|------|---------|
| `GIT_DIR == GIT_COMMON` (repositório normal) | 4 opções padrão | Sem worktree para limpar |
| `GIT_DIR != GIT_COMMON`, branch nomeado | 4 opções padrão | Baseado em proveniência (ver Passo 6) |
| `GIT_DIR != GIT_COMMON`, HEAD desanexado | 3 opções reduzidas (sem merge) | Sem limpeza (gerenciado externamente) |

### Passo 3: Determinar Branch Base

```bash
# Tente branches base comuns
git merge-base HEAD main 2>/dev/null || git merge-base HEAD master 2>/dev/null
```

Ou pergunte: "Este branch derivou de main — isso está correto?"

### Passo 4: Apresentar Opções

**Repositório normal e worktree com branch nomeado — apresente exatamente estas 4 opções:**

```
Implementação completa. O que você gostaria de fazer?

1. Fazer merge de volta para <branch-base> localmente
2. Enviar (push) e criar um Pull Request
3. Manter o branch como está (vou cuidar depois)
4. Descartar este trabalho

Qual opção?
```

**HEAD desanexado — apresente exatamente estas 3 opções:**

```
Implementação completa. Você está em um HEAD desanexado (workspace gerenciado externamente).

1. Enviar como novo branch e criar um Pull Request
2. Manter como está (vou cuidar depois)
3. Descartar este trabalho

Qual opção?
```

**Não adicione explicações** — mantenha as opções concisas.

### Passo 5: Executar Escolha

#### Opção 1: Merge Local

```bash
# Obtenha a raiz do repositório principal para segurança do CWD
MAIN_ROOT=$(git -C "$(git rev-parse --git-common-dir)/.." rev-parse --show-toplevel)
cd "$MAIN_ROOT"

# Faça o merge primeiro — verifique o sucesso antes de remover qualquer coisa
git checkout <branch-base>
git pull
git merge <feature-branch>

# Verifique os testes no resultado do merge
<comando de teste>

# Apenas após o merge bem-sucedido: limpe o worktree (Passo 6), depois delete o branch
```

Em seguida: Limpe o worktree (Passo 6), depois delete o branch:

```bash
git branch -d <feature-branch>
```

#### Opção 2: Push e Criar PR

```bash
# Envie o branch
git push -u origin <feature-branch>

# Crie o PR
gh pr create --title "<título>" --body "$(cat <<'EOF'
## Resumo
<2-3 pontos do que mudou>

## Plano de Testes
- [ ] <passos de verificação>
EOF
)"
```

**NÃO limpe o worktree** — o usuário precisa dele para iterar no feedback do PR.

#### Opção 3: Manter Como Está

Reporte: "Mantendo branch <nome>. Worktree preservado em <caminho>."

**Não limpe o worktree.**

#### Opção 4: Descartar

**Confirme primeiro:**
```
Isso excluirá permanentemente:
- Branch <nome>
- Todos os commits: <lista-de-commits>
- Worktree em <caminho>

Digite 'descartar' para confirmar.
```

Aguarde a confirmação exata.

Se confirmado:
```bash
MAIN_ROOT=$(git -C "$(git rev-parse --git-common-dir)/.." rev-parse --show-toplevel)
cd "$MAIN_ROOT"
```

Em seguida: Limpe o worktree (Passo 6), depois force-delete o branch:
```bash
git branch -D <feature-branch>
```

### Passo 6: Limpar Workspace

**Executa apenas para as Opções 1 e 4.** As Opções 2 e 3 sempre preservam o worktree.

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
WORKTREE_PATH=$(git rev-parse --show-toplevel)
```

**Se `GIT_DIR == GIT_COMMON`:** Repositório normal, sem worktree para limpar. Pronto.

**Se o caminho do worktree estiver sob `.worktrees/`, `worktrees/` ou `~/.config/superpowers/worktrees/`:** O Superpowers criou este worktree — nós somos responsáveis pela limpeza.

```bash
MAIN_ROOT=$(git -C "$(git rev-parse --git-common-dir)/.." rev-parse --show-toplevel)
cd "$MAIN_ROOT"
git worktree remove "$WORKTREE_PATH"
git worktree prune  # Auto-recuperação: limpa registros obsoletos
```

**Caso contrário:** O ambiente host (harness) é dono deste workspace. NÃO o remova. Se sua plataforma fornecer uma ferramenta de saída de workspace, use-a. Caso contrário, deixe o workspace no lugar.

## Referência Rápida

| Opção | Merge | Push | Manter Worktree | Limpar Branch |
|-------|-------|------|-----------------|---------------|
| 1. Merge local | sim | - | - | sim |
| 2. Criar PR | - | sim | sim | - |
| 3. Manter | - | - | sim | - |
| 4. Descartar | - | - | - | sim (forçado) |

## Erros Comuns

**Pular verificação de testes**
- **Problema:** Fazer merge de código quebrado, criar PR com falhas
- **Correção:** Sempre verifique os testes antes de oferecer opções

**Perguntas abertas**
- **Problema:** "O que devo fazer a seguir?" é ambíguo
- **Correção:** Apresente exatamente 4 opções estruturadas (ou 3 para HEAD desanexado)

**Limpar worktree para a Opção 2**
- **Problema:** Remover worktree que o usuário precisa para iterar no PR
- **Correção:** Limpe apenas para as Opções 1 e 4

**Deletar branch antes de remover worktree**
- **Problema:** `git branch -d` falha porque o worktree ainda referencia o branch
- **Correção:** Faça o merge primeiro, remova o worktree, então delete o branch

**Executar git worktree remove de dentro do worktree**
- **Problema:** Comando falha silenciosamente quando o CWD está dentro do worktree sendo removido
- **Correção:** Sempre faça `cd` para a raiz do repositório principal antes de `git worktree remove`

**Limpar worktrees de propriedade do harness**
- **Problema:** Remover um worktree que o harness criou causa estado fantasma
- **Correção:** Limpe apenas worktrees sob `.worktrees/`, `worktrees/` ou `~/.config/superpowers/worktrees/`

**Sem confirmação para descartar**
- **Problema:** Excluir acidentalmente trabalho
- **Correção:** Exija confirmação digitada "descartar"

## Sinais de Alerta

**Nunca:**
- Prosseguir com testes falhando
- Fazer merge sem verificar os testes no resultado
- Deletar trabalho sem confirmação
- Force-push sem solicitação explícita
- Remover um worktree antes de confirmar o sucesso do merge
- Limpar worktrees que você não criou (verificação de proveniência)
- Executar `git worktree remove` de dentro do worktree

**Sempre:**
- Verificar testes antes de oferecer opções
- Detectar o ambiente antes de apresentar o menu
- Apresentar exatamente 4 opções (ou 3 para HEAD desanexado)
- Obter confirmação digitada para a Opção 4
- Limpar worktree apenas para as Opções 1 e 4
- Fazer `cd` para a raiz do repositório antes de remover worktree
- Executar `git worktree prune` após a remoção
