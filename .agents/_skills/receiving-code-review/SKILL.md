---
name: receiving-code-review
description: Use ao receber feedback de revisão de código, antes de implementar sugestões, especialmente se o feedback parece não estar claro ou tecnicamente questionável — requer rigor técnico e verificação, não concordância performática ou implementação cega
---

# Recebendo Revisão de Código

## Visão Geral

Revisão de código requer avaliação técnica, não performance emocional.

**Princípio fundamental:** Verifique antes de implementar. Pergunte antes de assumir. Correção técnica acima do conforto social.

## O Padrão de Resposta

```
AO receber feedback de revisão de código:

1. LEIA: Feedback completo sem reagir
2. ENTENDA: Reformule o requisito com suas próprias palavras (ou pergunte)
3. VERIFIQUE: Confira com a realidade da base de código
4. AVALIE: É tecnicamente correto PARA ESTA base de código?
5. RESPONDA: Reconhecimento técnico ou recusa fundamentada
6. IMPLEMENTE: Um item de cada vez, teste cada um
```

## Respostas Proibidas

**NUNCA:**
- "Você tem razão absoluta!" (violação explícita do CLAUDE.md)
- "Ótimo ponto!" / "Excelente feedback!" (performático)
- "Vou implementar isso agora" (antes da verificação)

**EM VEZ DISSO:**
- Reformule o requisito técnico
- Faça perguntas esclarecedoras
- Discorde com raciocínio técnico se estiver errado
- Comece a trabalhar diretamente (ações > palavras)

## Tratando Feedback Não Claro

```
SE algum item não estiver claro:
  PARE — não implemente nada ainda
  PEÇA esclarecimento sobre os itens não claros

POR QUÊ: Itens podem estar relacionados. Entendimento parcial = implementação errada.
```

**Exemplo:**
```
Seu parceiro humano: "Corrija 1-6"
Você entende 1,2,3,6. Não está claro sobre 4,5.

❌ ERRADO: Implemente 1,2,3,6 agora, pergunte sobre 4,5 depois
✅ CERTO: "Entendo os itens 1,2,3,6. Preciso de esclarecimento sobre 4 e 5 antes de prosseguir."
```

## Tratamento por Fonte

### Do seu parceiro humano
- **Confiável** — implemente após entender
- **Ainda pergunte** se o escopo não estiver claro
- **Sem concordância performática**
- **Vá direto à ação** ou reconhecimento técnico

### De Revisores Externos
```
ANTES de implementar:
  1. Verifique: É tecnicamente correto PARA ESTA base de código?
  2. Verifique: Quebra funcionalidade existente?
  3. Verifique: Há razão para a implementação atual?
  4. Verifique: Funciona em todas as plataformas/versões?
  5. Verifique: O revisor entende o contexto completo?

SE a sugestão parecer errada:
  Discorde com raciocínio técnico

SE não conseguir verificar facilmente:
  Diga isso: "Não consigo verificar isso sem [X]. Devo [investigar/perguntar/prosseguir]?"

SE conflitar com decisões anteriores do seu parceiro humano:
  Pare e discuta com seu parceiro humano primeiro
```

**Regra do seu parceiro humano:** "Feedback externo — seja cético, mas verifique com cuidado"

## Verificação YAGNI para Recursos "Profissionais"

```
SE o revisor sugerir "implementar corretamente":
  pesquise o uso real na base de código

  SE não usado: "Este endpoint não é chamado. Remover (YAGNI)?"
  SE usado: Então implemente corretamente
```

**Regra do seu parceiro humano:** "Você e o revisor ambos me reportam. Se não precisamos desse recurso, não o adicione."

## Ordem de Implementação

```
PARA feedback com múltiplos itens:
  1. Esclareça o que não estiver claro PRIMEIRO
  2. Depois implemente nesta ordem:
     - Problemas bloqueantes (quebras, segurança)
     - Correções simples (erros de digitação, imports)
     - Correções complexas (refatoração, lógica)
  3. Teste cada correção individualmente
  4. Verifique ausência de regressões
```

## Quando Discordar

Discorde quando:
- A sugestão quebra funcionalidade existente
- O revisor não tem contexto completo
- Viola YAGNI (recurso não utilizado)
- Tecnicamente incorreto para esta stack
- Existem razões de legado/compatibilidade
- Conflita com decisões arquiteturais do seu parceiro humano

**Como discordar:**
- Use raciocínio técnico, não defensividade
- Faça perguntas específicas
- Referencie testes/código funcionando
- Envolva seu parceiro humano se for arquitetural

**Sinal se estiver desconfortável em discordar em voz alta:** "Coisas estranhas estão acontecendo no Círculo K"

## Reconhecendo Feedback Correto

Quando o feedback ESTÁ correto:
```
✅ "Corrigido. [Breve descrição do que mudou]"
✅ "Bom catch — [problema específico]. Corrigido em [localização]."
✅ [Apenas corrija e mostre no código]

❌ "Você tem razão absoluta!"
❌ "Ótimo ponto!"
❌ "Obrigado por pegar isso!"
❌ "Obrigado por [qualquer coisa]"
❌ QUALQUER expressão de gratidão
```

**Por que sem agradecimentos:** Ações falam. Apenas corrija. O próprio código mostra que você ouviu o feedback.

**Se se pegar prestes a escrever "Obrigado":** DELETE. Declare a correção em vez disso.

## Corrigindo Graciosamente sua Discordância

Se você discordou e estava errado:
```
✅ "Você estava certo — verifiquei [X] e ele realmente faz [Y]. Implementando agora."
✅ "Verifiquei isso e você está correto. Meu entendimento inicial estava errado porque [razão]. Corrigindo."

❌ Longa desculpa
❌ Defender por que discordou
❌ Explicação excessiva
```

Declare a correção de forma factual e siga em frente.

## Erros Comuns

| Erro | Correção |
|------|----------|
| Concordância performática | Declare o requisito ou apenas aja |
| Implementação cega | Verifique na base de código primeiro |
| Em lote sem testar | Um de cada vez, teste cada um |
| Assumir que o revisor está certo | Verifique se quebra coisas |
| Evitar discordância | Correção técnica > conforto |
| Implementação parcial | Esclareça todos os itens primeiro |
| Não consegue verificar, prossegue mesmo assim | Declare a limitação, peça orientação |

## Exemplos Reais

**Concordância Performática (Ruim):**
```
Revisor: "Remova o código legado"
❌ "Você tem razão absoluta! Deixe-me remover isso..."
```

**Verificação Técnica (Bom):**
```
Revisor: "Remova o código legado"
✅ "Verificando... o target de build é 10.15+, esta API precisa de 13+. Preciso do legado para compatibilidade retroativa. A implementação atual tem Bundle ID errado — corrigir isso ou abandonar suporte pré-13?"
```

**YAGNI (Bom):**
```
Revisor: "Implemente rastreamento de métricas com banco de dados, filtros de data, exportação CSV"
✅ "Pesquisei a base de código — nada chama este endpoint. Remover (YAGNI)? Ou há uso que estou perdendo?"
```

**Item Não Claro (Bom):**
```
Seu parceiro humano: "Corrija itens 1-6"
Você entende 1,2,3,6. Não está claro sobre 4,5.
✅ "Entendo 1,2,3,6. Preciso de esclarecimento sobre 4 e 5 antes de implementar."
```

## Respostas em Threads do GitHub

Ao responder comentários de revisão inline no GitHub, responda no thread do comentário (`gh api repos/{owner}/{repo}/pulls/{pr}/comments/{id}/replies`), não como um comentário de nível superior no PR.

## A Conclusão

**Feedback externo = sugestões para avaliar, não ordens para seguir.**

Verifique. Questione. Depois implemente.

Sem concordância performática. Rigor técnico sempre.
