# Mapeamento de Ferramentas do Copilot CLI

Skills usam nomes de ferramentas do Claude Code. Quando você encontrar esses em uma skill, use o equivalente da sua plataforma:

| Referência na Skill | Equivalente no Copilot CLI |
|--------------------|---------------------------|
| `Read` (leitura de arquivo) | `view` |
| `Write` (criação de arquivo) | `create` |
| `Edit` (edição de arquivo) | `edit` |
| `Bash` (executar comandos) | `bash` |
| `Grep` (buscar conteúdo de arquivo) | `grep` |
| `Glob` (buscar arquivos por nome) | `glob` |
| `Skill` tool (invocar uma skill) | `skill` |
| `WebFetch` | `web_fetch` |
| `Task` tool (despachar subagente) | `task` com `agent_type: "general-purpose"` ou `"explore"` |
| Múltiplas chamadas `Task` (paralelo) | Múltiplas chamadas `task` |
| Status/saída da Task | `read_agent`, `list_agents` |
| `TodoWrite` (rastreamento de tarefas) | `sql` com tabela integrada `todos` |
| `WebSearch` | Sem equivalente — use `web_fetch` com URL de mecanismo de busca |
| `EnterPlanMode` / `ExitPlanMode` | Sem equivalente — permaneça na sessão principal |

## Sessões shell assíncronas

O Copilot CLI suporta sessões shell assíncronas persistentes, que não têm equivalente direto no Claude Code:

| Ferramenta | Propósito |
|------------|-----------|
| `bash` com `async: true` | Iniciar um comando de longa duração em segundo plano |
| `write_bash` | Enviar entrada para uma sessão assíncrona em execução |
| `read_bash` | Ler saída de uma sessão assíncrona |
| `stop_bash` | Encerrar uma sessão assíncrona |
| `list_bash` | Listar todas as sessões shell ativas |

## Ferramentas adicionais do Copilot CLI

| Ferramenta | Propósito |
|------------|-----------|
| `store_memory` | Persistir fatos sobre o codebase para sessões futuras |
| `report_intent` | Atualizar a linha de status da UI com intenção atual |
| `sql` | Consultar o banco de dados SQLite da sessão (todos, metadados) |
| `fetch_copilot_cli_documentation` | Consultar documentação do Copilot CLI |
| Ferramentas GitHub MCP (`github-mcp-server-*`) | Acesso nativo à API do GitHub (issues, PRs, busca de código) |
