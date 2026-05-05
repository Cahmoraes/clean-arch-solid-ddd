---
name: verification-before-completion
description: Use quando estiver prestes a afirmar que o trabalho está completo, corrigido ou passando, antes de commitar ou criar PRs — exige executar comandos de verificação e confirmar a saída antes de fazer qualquer afirmação de sucesso; evidências antes de afirmações sempre
---

# Verificação Antes da Conclusão

## Visão Geral

Afirmar que o trabalho está completo sem verificação é desonestidade, não eficiência.

**Princípio fundamental:** Evidências antes de afirmações, sempre.

**Violar a letra desta regra é violar o espírito desta regra.**

## A Lei de Ferro

```
SEM AFIRMAÇÕES DE CONCLUSÃO SEM EVIDÊNCIAS DE VERIFICAÇÃO FRESCAS
```

Se você não executou o comando de verificação nesta mensagem, não pode afirmar que está passando.

## A Função de Portão

```
ANTES de fazer qualquer afirmação de status ou expressar satisfação:

1. IDENTIFIQUE: Qual comando prova esta afirmação?
2. EXECUTE: Execute o comando COMPLETO (fresco, completo)
3. LEIA: Saída completa, verifique código de saída, conte falhas
4. VERIFIQUE: A saída confirma a afirmação?
   - Se NÃO: Declare o status real com evidências
   - Se SIM: Declare a afirmação COM evidências
5. SOMENTE ENTÃO: Faça a afirmação

Pular qualquer passo = mentira, não verificação
```

## Falhas Comuns

| Afirmação | Requer | Não Suficiente |
|-----------|--------|----------------|
| Testes passam | Saída do comando de teste: 0 falhas | Execução anterior, "deveria passar" |
| Linter limpo | Saída do linter: 0 erros | Verificação parcial, extrapolação |
| Build bem-sucedida | Comando de build: exit 0 | Linter passando, logs parecem bons |
| Bug corrigido | Testar sintoma original: passa | Código modificado, assumiu corrigido |
| Teste de regressão funciona | Ciclo vermelho-verde verificado | Teste passa uma vez |
| Agente completou | Diff VCS mostra mudanças | Agente reporta "sucesso" |
| Requisitos atendidos | Checklist linha por linha | Testes passando |

## Sinais de Alerta — PARE

- Usar "deveria", "provavelmente", "parece que"
- Expressar satisfação antes da verificação ("Ótimo!", "Perfeito!", "Pronto!", etc.)
- Prestes a commitar/push/PR sem verificação
- Confiando em relatórios de sucesso de agentes
- Confiando em verificação parcial
- Pensando "só dessa vez"
- Cansado e querendo que o trabalho acabe
- **QUALQUER redação que implique sucesso sem ter executado a verificação**

## Prevenção de Racionalização

| Desculpa | Realidade |
|----------|-----------|
| "Deveria funcionar agora" | EXECUTE a verificação |
| "Estou confiante" | Confiança ≠ evidência |
| "Só dessa vez" | Sem exceções |
| "Linter passou" | Linter ≠ compilador |
| "Agente disse sucesso" | Verifique independentemente |
| "Estou cansado" | Exaustão ≠ desculpa |
| "Verificação parcial é suficiente" | Parcial não prova nada |
| "Palavras diferentes então a regra não se aplica" | Espírito sobre letra |

## Padrões Chave

**Testes:**
```
✅ [Execute comando de teste] [Veja: 34/34 passam] "Todos os testes passam"
❌ "Deveria passar agora" / "Parece correto"
```

**Testes de regressão (TDD Vermelho-Verde):**
```
✅ Escreva → Execute (passa) → Reverta a correção → Execute (DEVE FALHAR) → Restaure → Execute (passa)
❌ "Escrevi um teste de regressão" (sem verificação vermelho-verde)
```

**Build:**
```
✅ [Execute build] [Veja: exit 0] "Build passa"
❌ "Linter passou" (linter não verifica compilação)
```

**Requisitos:**
```
✅ Releia o plano → Crie checklist → Verifique cada item → Reporte lacunas ou conclusão
❌ "Testes passam, fase completa"
```

**Delegação para agentes:**
```
✅ Agente reporta sucesso → Verifique diff VCS → Confirme mudanças → Reporte estado real
❌ Confie no relatório do agente
```

## Por Que Isso Importa

De 24 memórias de falhas:
- Seu parceiro humano disse "Não acredito em você" — confiança quebrada
- Funções indefinidas foram entregues — causaria crashes
- Requisitos faltando foram entregues — funcionalidades incompletas
- Tempo desperdiçado em conclusão falsa → redirecionamento → retrabalho
- Viola: "Honestidade é um valor fundamental. Se você mentir, será substituído."

## Quando Aplicar

**SEMPRE antes de:**
- QUALQUER variação de afirmações de sucesso/conclusão
- QUALQUER expressão de satisfação
- QUALQUER declaração positiva sobre o estado do trabalho
- Commitar, criar PR, completar tarefa
- Avançar para a próxima tarefa
- Delegar para agentes

**A regra se aplica a:**
- Frases exatas
- Paráfrases e sinônimos
- Implicações de sucesso
- QUALQUER comunicação sugerindo conclusão/correção

## O Resumo Final

**Sem atalhos para verificação.**

Execute o comando. Leia a saída. AÍ ENTÃO afirme o resultado.

Isso não é negociável.
