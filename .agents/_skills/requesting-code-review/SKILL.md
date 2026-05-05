---
name: requesting-code-review
description: Use ao concluir tarefas, implementar recursos importantes ou antes de fazer merge para verificar se o trabalho atende aos requisitos
---

# Solicitando Revisão de Código

Despache um subagente revisor de código para capturar problemas antes que eles se agravem. O revisor recebe contexto precisamente elaborado para avaliação — nunca o histórico da sua sessão. Isso mantém o revisor focado no produto do trabalho, não no seu processo de pensamento, e preserva seu próprio contexto para o trabalho contínuo.

**Princípio fundamental:** Revise cedo, revise com frequência.

## Quando Solicitar Revisão

**Obrigatório:**
- Após cada tarefa em desenvolvimento orientado por subagentes
- Após concluir um recurso importante
- Antes de merge para o main

**Opcional, mas valioso:**
- Quando travado (perspectiva fresca)
- Antes de refatorar (verificação da linha de base)
- Após corrigir bug complexo

## Como Solicitar

**1. Obtenha os SHAs do git:**
```bash
BASE_SHA=$(git rev-parse HEAD~1)  # ou origin/main
HEAD_SHA=$(git rev-parse HEAD)
```

**2. Despache o subagente revisor de código:**

Use a ferramenta Task com tipo `general-purpose`, preencha o template em `code-reviewer.md`

**Marcadores de posição:**
- `{DESCRIPTION}` — Breve resumo do que você construiu
- `{PLAN_OR_REQUIREMENTS}` — O que deve fazer
- `{BASE_SHA}` — Commit inicial
- `{HEAD_SHA}` — Commit final

**3. Aja com base no feedback:**
- Corrija problemas Críticos imediatamente
- Corrija problemas Importantes antes de prosseguir
- Anote problemas Menores para depois
- Discorde se o revisor estiver errado (com raciocínio)

## Exemplo

```
[Acabei de concluir a Tarefa 2: Adicionar função de verificação]

Você: Vou solicitar revisão de código antes de prosseguir.

BASE_SHA=$(git log --oneline | grep "Task 1" | head -1 | awk '{print $1}')
HEAD_SHA=$(git rev-parse HEAD)

[Despache subagente revisor de código]
  DESCRIPTION: Adicionou verifyIndex() e repairIndex() com 4 tipos de problema
  PLAN_OR_REQUIREMENTS: Tarefa 2 de docs/superpowers/plans/deployment-plan.md
  BASE_SHA: a7981ec
  HEAD_SHA: 3df7661

[Subagente retorna]:
  Pontos fortes: Arquitetura limpa, testes reais
  Problemas:
    Importante: Indicadores de progresso ausentes
    Menor: Número mágico (100) para intervalo de relatório
  Avaliação: Pronto para prosseguir

Você: [Corrija indicadores de progresso]
[Continue para a Tarefa 3]
```

## Integração com Workflows

**Desenvolvimento Orientado por Subagentes:**
- Revise após CADA tarefa
- Capture problemas antes que se agravem
- Corrija antes de passar para a próxima tarefa

**Executando Planos:**
- Revise após cada tarefa ou em checkpoints naturais
- Obtenha feedback, aplique, continue

**Desenvolvimento Ad-Hoc:**
- Revise antes do merge
- Revise quando travado

## Sinais de Alerta

**Nunca:**
- Pule a revisão porque "é simples"
- Ignore problemas Críticos
- Prossiga com problemas Importantes não corrigidos
- Discuta com feedback técnico válido

**Se o revisor estiver errado:**
- Discorde com raciocínio técnico
- Mostre código/testes que provam que funciona
- Solicite esclarecimento

Veja o template em: requesting-code-review/code-reviewer.md
