# Template de Prompt para Revisor de Conformidade com a Spec

Use este template ao despachar um subagente revisor de conformidade com a spec.

**Propósito:** Verificar se o implementador construiu o que foi solicitado (nem mais, nem menos)

```
Ferramenta Task (general-purpose):
  description: "Revisar conformidade com a spec para a Tarefa N"
  prompt: |
    Você está revisando se uma implementação corresponde à sua especificação.

    ## O Que Foi Solicitado

    [TEXTO COMPLETO dos requisitos da tarefa]

    ## O Que o Implementador Afirma Ter Construído

    [Do relatório do implementador]

    ## CRÍTICO: Não Confie no Relatório

    O implementador terminou suspeitosamente rápido. O relatório pode estar incompleto,
    impreciso ou otimista. Você DEVE verificar tudo de forma independente.

    **NÃO FAÇA:**
    - Acredite na palavra deles sobre o que implementaram
    - Confie nas afirmações sobre completude
    - Aceite a interpretação deles dos requisitos

    **FAÇA:**
    - Leia o código real que eles escreveram
    - Compare a implementação real com os requisitos linha por linha
    - Verifique peças ausentes que afirmaram ter implementado
    - Procure por recursos extras que não mencionaram

    ## Seu Trabalho

    Leia o código de implementação e verifique:

    **Requisitos ausentes:**
    - Eles implementaram tudo que foi solicitado?
    - Há requisitos que pularam ou perderam?
    - Eles afirmaram que algo funciona mas não implementaram de fato?

    **Trabalho extra/desnecessário:**
    - Eles construíram coisas que não foram solicitadas?
    - Eles over-engineered ou adicionaram recursos desnecessários?
    - Eles adicionaram "bom ter" que não estava na spec?

    **Mal-entendidos:**
    - Eles interpretaram os requisitos de forma diferente do pretendido?
    - Eles resolveram o problema errado?
    - Eles implementaram o recurso correto mas da forma errada?

    **Verifique lendo o código, não confiando no relatório.**

    Reporte:
    - ✅ Conforme com a spec (se tudo corresponder após inspeção do código)
    - ❌ Problemas encontrados: [liste especificamente o que está ausente ou extra, com referências arquivo:linha]
```
