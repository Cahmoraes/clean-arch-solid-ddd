# Onboarding de Preferências de Workflow

Este guia é acionado quando `.superpowers/preferences.yml` não existe no repositório do usuário.

## Trigger

O skill `using-superpowers` detecta a ausência do arquivo `.superpowers/preferences.yml` na raiz do repositório do usuário.

## Fluxo do Wizard

Siga estes passos na ordem, **uma pergunta por vez**:

### Passo 1 — Informar

Diga ao usuário:
> "Não encontrei suas preferências de workflow (`.superpowers/preferences.yml`). Vou fazer algumas perguntas rápidas para configurar o comportamento dos agentes neste projeto."

### Passo 2 — Auto-commit

Pergunte:
> "Deseja que subagentes façam commit automático após completar cada tarefa?"
> - **Sim** (default) — commits são feitos automaticamente
> - **Não** — você fará os commits manualmente

Registre a resposta como `workflow.auto_commit` (true/false).

### Passo 3 — Idioma

Pergunte:
> "Qual idioma prefere para comunicação dos agentes?"
> - **pt-BR** (default)
> - **en**
> - **es**
> - Outro (especifique)

Registre a resposta como `communication.language`.

### Passo 4 — Confirmação de ações destrutivas

Pergunte:
> "Deseja que agentes peçam confirmação antes de ações destrutivas (deletar arquivos, sobrescrever conteúdo)?"
> - **Sim** (default) — sempre pedir confirmação
> - **Não** — executar sem perguntar

Registre a resposta como `workflow.confirm_destructive_actions` (true/false).

### Passo 5 — Gerar e salvar

1. Gere o YAML com as respostas coletadas
2. Crie o diretório `.superpowers/` se não existir
3. Salve em `.superpowers/preferences.yml`
4. Confirme:
> "Preferências salvas em `.superpowers/preferences.yml`. Você pode editá-las manualmente a qualquer momento ou me pedir para alterá-las."

## Estrutura do YAML gerado

```yaml
# Superpowers Workflow Preferences
# Gerado automaticamente pelo wizard de onboarding.
# Edite manualmente ou peça ao agente para alterar.

workflow:
  auto_commit: <true|false>
  confirm_destructive_actions: <true|false>

communication:
  language: <idioma>
```

## Mutabilidade em Runtime

Se o usuário solicitar mudança de preferência durante uma sessão (ex: "mude auto_commit para false"):
1. Leia o arquivo atual
2. Altere apenas a chave solicitada
3. Salve o arquivo
4. Confirme a mudança ao usuário

**Regra:** Nunca altere preferências sem solicitação explícita do usuário.

## Regras de Leitura

- Preferência ausente no arquivo → assume valor default (ver template em `artifacts/superpowers/preferences.yml`)
- Chaves desconhecidas → ignoradas (forward-compatible)
- Arquivo malformado (YAML inválido) → avisa o usuário, assume todos os defaults, oferece recriar
