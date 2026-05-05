# Template de Prompt para Revisor de Qualidade de Código

Use este template ao despachar um subagente revisor de qualidade de código.

**Propósito:** Verificar se a implementação está bem construída (limpa, testada, manutenível)

**Despache apenas após a revisão de conformidade com a spec passar.**

```
Ferramenta Task (general-purpose):
  Use o template em requesting-code-review/code-reviewer.md

  DESCRIPTION: [resumo da tarefa, do relatório do implementador]
  PLAN_OR_REQUIREMENTS: Tarefa N de [arquivo-do-plano]
  BASE_SHA: [commit antes da tarefa]
  HEAD_SHA: [commit atual]
```

**Além das preocupações padrão de qualidade de código, o revisor deve verificar:**
- Cada arquivo tem uma responsabilidade clara com uma interface bem definida?
- As unidades são decompostas de forma que possam ser entendidas e testadas independentemente?
- A implementação está seguindo a estrutura de arquivos do plano?
- Esta implementação criou novos arquivos que já estão grandes, ou fez crescer significativamente arquivos existentes? (Não sinalize tamanhos de arquivos pré-existentes — foque no que esta mudança contribuiu.)

**O revisor de código retorna:** Pontos Fortes, Problemas (Críticos/Importantes/Menores), Avaliação
