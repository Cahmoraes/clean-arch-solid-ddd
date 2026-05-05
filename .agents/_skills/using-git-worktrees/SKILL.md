---
name: using-git-worktrees
description: Use quando começar trabalho em uma funcionalidade que precisa de isolamento do workspace atual ou antes de executar planos de implementação — garante que um workspace isolado exista via ferramentas nativas ou fallback para git worktree
---

# Usando Git Worktrees

## Visão Geral

Garanta que o trabalho aconteça em um workspace isolado. Prefira as ferramentas nativas de worktree da sua plataforma. Recorra a git worktrees manuais apenas quando nenhuma ferramenta nativa estiver disponível.

**Princípio fundamental:** Detecte isolamento existente primeiro. Então use ferramentas nativas. Então recorra ao git. Nunca lute contra o harness.

**Anuncie no início:** "Estou usando a skill using-git-worktrees para configurar um workspace isolado."

## Passo 0: Detectar Isolamento Existente

**Antes de criar qualquer coisa, verifique se você já está em um workspace isolado.**

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
BRANCH=$(git branch --show-current)
```

**Guard de submódulo:** `GIT_DIR != GIT_COMMON` também é verdadeiro dentro de submódulos git. Antes de concluir "já estou em um worktree", verifique que não está em um submódulo:

```bash
# Se isso retornar um caminho, você está em um submódulo, não em um worktree — trate como repo normal
git rev-parse --show-superproject-working-tree 2>/dev/null
```

**Se `GIT_DIR != GIT_COMMON` (e não é submódulo):** Você já está em um worktree vinculado. Pule para o Passo 3 (Configuração do Projeto). NÃO crie outro worktree.

Reporte com estado da branch:
- Em uma branch: "Já estou em workspace isolado em `<caminho>` na branch `<nome>`."
- HEAD desanexado: "Já estou em workspace isolado em `<caminho>` (HEAD desanexado, gerenciado externamente). Criação de branch necessária no momento de finalização."

**Se `GIT_DIR == GIT_COMMON` (ou em submódulo):** Você está em um checkout normal do repositório.

O usuário já indicou sua preferência de worktree nas suas instruções? Se não, peça consentimento antes de criar um worktree:

> "Gostaria que eu configurasse um worktree isolado? Protege sua branch atual de mudanças."

Respeite qualquer preferência declarada existente sem perguntar. Se o usuário recusar o consentimento, trabalhe no lugar e pule para o Passo 3.

## Passo 1: Criar Workspace Isolado

**Você tem dois mecanismos. Tente-os nesta ordem.**

### 1a. Ferramentas Nativas de Worktree (preferido)

O usuário pediu um workspace isolado (consentimento do Passo 0). Você já tem uma forma de criar um worktree? Pode ser uma ferramenta com nome como `EnterWorktree`, `WorktreeCreate`, um comando `/worktree`, ou uma flag `--worktree`. Se tiver, use-a e pule para o Passo 3.

Ferramentas nativas tratam de posicionamento de diretório, criação de branch e limpeza automaticamente. Usar `git worktree add` quando você tem uma ferramenta nativa cria estado fantasma que o seu harness não pode ver ou gerenciar.

Só prossiga para o Passo 1b se não tiver nenhuma ferramenta nativa de worktree disponível.

### 1b. Fallback para Git Worktree

**Use isso apenas se o Passo 1a não se aplicar** — você não tem ferramenta nativa de worktree disponível. Crie um worktree manualmente usando git.

#### Seleção de Diretório

Siga esta ordem de prioridade. Preferência explícita do usuário sempre supera estado observado do filesystem.

1. **Verifique suas instruções por uma preferência de diretório de worktree declarada.** Se o usuário já especificou uma, use-a sem perguntar.

2. **Verifique um diretório de worktree local ao projeto existente:**
   ```bash
   ls -d .worktrees 2>/dev/null     # Preferido (oculto)
   ls -d worktrees 2>/dev/null      # Alternativo
   ```
   Se encontrado, use-o. Se ambos existirem, `.worktrees` vence.

3. **Verifique um diretório global existente:**
   ```bash
   project=$(basename "$(git rev-parse --show-toplevel)")
   ls -d ~/.config/superpowers/worktrees/$project 2>/dev/null
   ```
   Se encontrado, use-o (compatibilidade retroativa com caminho global legado).

4. **Se não houver outra orientação disponível**, padrão para `.worktrees/` na raiz do projeto.

#### Verificação de Segurança (apenas diretórios locais ao projeto)

**DEVE verificar que o diretório está ignorado antes de criar o worktree:**

```bash
git check-ignore -q .worktrees 2>/dev/null || git check-ignore -q worktrees 2>/dev/null
```

**Se NÃO estiver ignorado:** Adicione ao .gitignore, commit a mudança, depois prossiga.

**Por que é crítico:** Previne commitar acidentalmente conteúdo do worktree no repositório.

Diretórios globais (`~/.config/superpowers/worktrees/`) não precisam de verificação.

#### Criar o Worktree

```bash
project=$(basename "$(git rev-parse --show-toplevel)")

# Determine o caminho baseado na localização escolhida
# Para local ao projeto: path="$LOCATION/$BRANCH_NAME"
# Para global: path="~/.config/superpowers/worktrees/$project/$BRANCH_NAME"

git worktree add "$path" -b "$BRANCH_NAME"
cd "$path"
```

**Fallback de sandbox:** Se `git worktree add` falhar com erro de permissão (negação do sandbox), informe ao usuário que o sandbox bloqueou a criação do worktree e que você está trabalhando no diretório atual em vez disso. Então execute setup e testes de baseline no lugar.

## Passo 3: Configuração do Projeto

Detecte automaticamente e execute setup apropriado:

```bash
# Node.js
if [ -f package.json ]; then npm install; fi

# Rust
if [ -f Cargo.toml ]; then cargo build; fi

# Python
if [ -f requirements.txt ]; then pip install -r requirements.txt; fi
if [ -f pyproject.toml ]; then poetry install; fi

# Go
if [ -f go.mod ]; then go mod download; fi
```

## Passo 4: Verificar Baseline Limpo

Execute testes para garantir que o workspace começa limpo:

```bash
# Use o comando apropriado para o projeto
npm test / cargo test / pytest / go test ./...
```

**Se os testes falharem:** Reporte as falhas, pergunte se deve prosseguir ou investigar.

**Se os testes passarem:** Reporte que está pronto.

### Relatório

```
Worktree pronto em <caminho-completo>
Testes passando (<N> testes, 0 falhas)
Pronto para implementar <nome-da-funcionalidade>
```

## Referência Rápida

| Situação | Ação |
|----------|------|
| Já em worktree vinculado | Pule a criação (Passo 0) |
| Em um submódulo | Trate como repo normal (guard do Passo 0) |
| Ferramenta nativa de worktree disponível | Use-a (Passo 1a) |
| Sem ferramenta nativa | Fallback para git worktree (Passo 1b) |
| `.worktrees/` existe | Use-o (verifique se está ignorado) |
| `worktrees/` existe | Use-o (verifique se está ignorado) |
| Ambos existem | Use `.worktrees/` |
| Nenhum existe | Verifique arquivo de instruções, depois padrão `.worktrees/` |
| Caminho global existe | Use-o (compatibilidade retroativa) |
| Diretório não está ignorado | Adicione ao .gitignore + commit |
| Erro de permissão ao criar | Fallback de sandbox, trabalhe no lugar |
| Testes falham no baseline | Reporte falhas + pergunte |
| Sem package.json/Cargo.toml | Pule instalação de dependências |

## Erros Comuns

### Lutando contra o harness

- **Problema:** Usar `git worktree add` quando a plataforma já fornece isolamento
- **Correção:** Passo 0 detecta isolamento existente. Passo 1a defere para ferramentas nativas.

### Pular a detecção

- **Problema:** Criar um worktree aninhado dentro de um existente
- **Correção:** Sempre execute o Passo 0 antes de criar qualquer coisa

### Pular verificação de ignorar

- **Problema:** Conteúdo do worktree fica rastreado, polui git status
- **Correção:** Sempre use `git check-ignore` antes de criar worktree local ao projeto

### Assumir localização do diretório

- **Problema:** Cria inconsistência, viola convenções do projeto
- **Correção:** Siga a prioridade: existente > global legado > arquivo de instruções > padrão

### Prosseguir com testes falhando

- **Problema:** Não consegue distinguir novos bugs de problemas pré-existentes
- **Correção:** Reporte falhas, obtenha permissão explícita para prosseguir

## Sinais de Alerta

**Nunca:**
- Crie um worktree quando o Passo 0 detecta isolamento existente
- Use `git worktree add` quando você tem uma ferramenta nativa de worktree (ex.: `EnterWorktree`). Este é o erro #1 — se você a tem, use-a.
- Pule o Passo 1a indo direto para os comandos git do Passo 1b
- Crie worktree sem verificar se está ignorado (local ao projeto)
- Pule a verificação do teste de baseline
- Prossiga com testes falhando sem perguntar

**Sempre:**
- Execute a detecção do Passo 0 primeiro
- Prefira ferramentas nativas ao fallback git
- Siga a prioridade de diretório: existente > global legado > arquivo de instruções > padrão
- Verifique se o diretório está ignorado para local ao projeto
- Detecte automaticamente e execute setup do projeto
- Verifique o baseline limpo dos testes
