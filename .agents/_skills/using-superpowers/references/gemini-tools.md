# Mapeamento de Ferramentas do Gemini CLI

Skills usam nomes de ferramentas do Claude Code. Quando você encontrar esses em uma skill, use o equivalente da sua plataforma:

| Referência na Skill | Equivalente no Gemini CLI |
|--------------------|--------------------------|
| `Read` (leitura de arquivo) | `read_file` |
| `Write` (criação de arquivo) | `write_file` |
| `Edit` (edição de arquivo) | `replace` |
| `Bash` (executar comandos) | `run_shell_command` |
| `Grep` (buscar conteúdo de arquivo) | `grep_search` |
| `Glob` (buscar arquivos por nome) | `glob` |
| `TodoWrite` (rastreamento de tarefas) | `write_todos` |
| `Skill` tool (invocar uma skill) | `activate_skill` |
| `WebSearch` | `google_web_search` |
| `WebFetch` | `web_fetch` |
| `Task` tool (despachar subagente) | `@agent-name` (veja [Suporte a subagentes](#suporte-a-subagentes)) |

## Suporte a subagentes

O Gemini CLI suporta subagentes nativamente via sintaxe `@`. Use o agente integrado `@generalist` para despachar qualquer tarefa — ele tem acesso a todas as ferramentas e segue o prompt que você fornece.

Quando uma skill diz para despachar um tipo de agente nomeado, use `@generalist` com o prompt completo do template de prompt da skill:

| Instrução da skill | Equivalente no Gemini CLI |
|-------------------|--------------------------|
| `Task tool (superpowers:implementer)` | `@generalist` com o template `implementer-prompt.md` preenchido |
| `Task tool (superpowers:spec-reviewer)` | `@generalist` com o template `spec-reviewer-prompt.md` preenchido |
| `Task tool (superpowers:code-reviewer)` | `@code-reviewer` (agente integrado) ou `@generalist` com o prompt de revisão preenchido |
| `Task tool (superpowers:code-quality-reviewer)` | `@generalist` com o template `code-quality-reviewer-prompt.md` preenchido |
| `Task tool (general-purpose)` com prompt inline | `@generalist` com seu prompt inline |

### Preenchimento de prompt

Skills fornecem templates de prompt com placeholders como `{O_QUE_FOI_IMPLEMENTADO}` ou `[TEXTO COMPLETO da tarefa]`. Preencha todos os placeholders e passe o prompt completo como mensagem para `@generalist`. O próprio template de prompt contém o papel do agente, critérios de revisão e formato de saída esperado — `@generalist` seguirá isso.

### Despacho paralelo

O Gemini CLI suporta despacho paralelo de subagentes. Quando uma skill pede para despachar múltiplas tarefas de subagentes independentes em paralelo, solicite todas essas tasks `@generalist` ou subagentes nomeados juntos no mesmo prompt. Mantenha tasks dependentes sequenciais, mas não serialize tasks de subagentes independentes apenas para preservar um histórico mais simples.

## Ferramentas adicionais do Gemini CLI

Estas ferramentas estão disponíveis no Gemini CLI mas não têm equivalente no Claude Code:

| Ferramenta | Propósito |
|------------|-----------|
| `list_directory` | Listar arquivos e subdiretórios |
| `save_memory` | Persistir fatos em GEMINI.md entre sessões |
| `ask_user` | Solicitar entrada estruturada do usuário |
| `tracker_create_task` | Gerenciamento rico de tarefas (criar, atualizar, listar, visualizar) |
| `enter_plan_mode` / `exit_plan_mode` | Mudar para modo de pesquisa somente leitura antes de fazer mudanças |
