---
name: systematic-debugging
description: Use ao encontrar qualquer bug, falha de teste ou comportamento inesperado, antes de propor correções
---

# Depuração Sistemática

## Visão Geral

Correções aleatórias desperdiçam tempo e criam novos bugs. Patches rápidos mascaram problemas subjacentes.

**Princípio fundamental:** SEMPRE encontre a causa raiz antes de tentar correções. Correções de sintomas são uma falha.

**Violar a letra deste processo é violar o espírito da depuração.**

## A Lei de Ferro

```
SEM CORREÇÕES SEM INVESTIGAÇÃO DA CAUSA RAIZ PRIMEIRO
```

Se você não completou a Fase 1, não pode propor correções.

## Quando Usar

Use para QUALQUER problema técnico:
- Falhas de teste
- Bugs em produção
- Comportamento inesperado
- Problemas de desempenho
- Falhas de build
- Problemas de integração

**Use ESPECIALMENTE quando:**
- Sob pressão de tempo (emergências tornam a tentativa de adivinhar tentadora)
- Uma "correção rápida" parece óbvia
- Você já tentou múltiplas correções
- A correção anterior não funcionou
- Você não entende totalmente o problema

**Não pule quando:**
- O problema parece simples (bugs simples têm causas raiz também)
- Você está com pressa (apressar-se garante retrabalho)
- O gerente quer corrigido AGORA (sistemático é mais rápido que thrashing)

## As Quatro Fases

Você DEVE completar cada fase antes de prosseguir para a próxima.

### Fase 1: Investigação da Causa Raiz

**ANTES de tentar QUALQUER correção:**

1. **Leia as Mensagens de Erro Cuidadosamente**
   - Não passe por erros ou avisos
   - Eles geralmente contêm a solução exata
   - Leia os stack traces completamente
   - Anote números de linha, caminhos de arquivo, códigos de erro

2. **Reproduza Consistentemente**
   - Você consegue disparar de forma confiável?
   - Quais são os passos exatos?
   - Acontece sempre?
   - Se não reproduzível → colete mais dados, não adivinhe

3. **Verifique Mudanças Recentes**
   - O que mudou que poderia causar isso?
   - Git diff, commits recentes
   - Novas dependências, mudanças de configuração
   - Diferenças ambientais

4. **Colete Evidências em Sistemas Multi-Componente**

   **QUANDO o sistema tem múltiplos componentes (CI → build → assinatura, API → serviço → banco de dados):**

   **ANTES de propor correções, adicione instrumentação de diagnóstico:**
   ```
   Para CADA fronteira de componente:
     - Log o que os dados entram no componente
     - Log o que os dados saem do componente
     - Verifique a propagação de ambiente/configuração
     - Verifique o estado em cada camada

   Execute uma vez para coletar evidências mostrando ONDE quebra
   ENTÃO analise as evidências para identificar o componente com falha
   ENTÃO investigue esse componente específico
   ```

   **Exemplo (sistema multi-camada):**
   ```bash
   # Camada 1: Workflow
   echo "=== Secrets disponíveis no workflow: ==="
   echo "IDENTITY: ${IDENTITY:+SET}${IDENTITY:-UNSET}"

   # Camada 2: Script de build
   echo "=== Variáveis de ambiente no script de build: ==="
   env | grep IDENTITY || echo "IDENTITY não está no ambiente"

   # Camada 3: Script de assinatura
   echo "=== Estado do Keychain: ==="
   security list-keychains
   security find-identity -v

   # Camada 4: Assinatura real
   codesign --sign "$IDENTITY" --verbose=4 "$APP"
   ```

   **Isso revela:** Qual camada falha (secrets → workflow ✓, workflow → build ✗)

5. **Rastreie o Fluxo de Dados**

   **QUANDO o erro está profundo no call stack:**

   Veja `root-cause-tracing.md` neste diretório para a técnica completa de rastreamento reverso.

   **Versão rápida:**
   - Onde o valor ruim se origina?
   - O que chamou isso com valor ruim?
   - Continue rastreando até encontrar a fonte
   - Corrija na fonte, não no sintoma

### Fase 2: Análise de Padrão

**Encontre o padrão antes de corrigir:**

1. **Encontre Exemplos Funcionando**
   - Localize código similar funcionando na mesma base de código
   - O que funciona que é similar ao que está quebrado?

2. **Compare com Referências**
   - Se estiver implementando um padrão, leia a implementação de referência COMPLETAMENTE
   - Não passe por cima — leia cada linha
   - Entenda o padrão totalmente antes de aplicar

3. **Identifique Diferenças**
   - O que é diferente entre o que funciona e o que está quebrado?
   - Liste cada diferença, por menor que seja
   - Não assuma "isso não pode importar"

4. **Entenda as Dependências**
   - Quais outros componentes isso precisa?
   - Quais configurações, config, ambiente?
   - Quais premissas isso faz?

### Fase 3: Hipótese e Testes

**Método científico:**

1. **Forme uma Hipótese Única**
   - Declare claramente: "Acredito que X é a causa raiz porque Y"
   - Anote-a
   - Seja específico, não vago

2. **Teste Minimamente**
   - Faça a MENOR mudança possível para testar a hipótese
   - Uma variável de cada vez
   - Não corrija múltiplas coisas de uma vez

3. **Verifique Antes de Continuar**
   - Funcionou? Sim → Fase 4
   - Não funcionou? Forme UMA NOVA hipótese
   - NÃO adicione mais correções por cima

4. **Quando Você Não Sabe**
   - Diga "Não entendo X"
   - Não finja saber
   - Peça ajuda
   - Pesquise mais

### Fase 4: Implementação

**Corrija a causa raiz, não o sintoma:**

1. **Crie um Caso de Teste Falhando**
   - Reprodução mais simples possível
   - Teste automatizado se possível
   - Script de teste único se não houver framework
   - DEVE existir antes de corrigir
   - Use a skill `superpowers:test-driven-development` para escrever testes falhando adequados

2. **Implemente uma Correção Única**
   - Endereça a causa raiz identificada
   - UMA mudança de cada vez
   - Sem melhorias "já que estou aqui"
   - Sem refatoração incluída

3. **Verifique a Correção**
   - O teste passa agora?
   - Nenhum outro teste quebrou?
   - Problema realmente resolvido?

4. **Se a Correção Não Funcionar**
   - PARE
   - Conte: Quantas correções você tentou?
   - Se < 3: Retorne à Fase 1, reanalize com novas informações
   - **Se ≥ 3: PARE e questione a arquitetura (passo 5 abaixo)**
   - NÃO tente a Correção nº 4 sem discussão arquitetural

5. **Se 3+ Correções Falharam: Questione a Arquitetura**

   **Padrão indicando problema arquitetural:**
   - Cada correção revela novo estado compartilhado/acoplamento/problema em lugar diferente
   - Correções requerem "refatoração massiva" para implementar
   - Cada correção cria novos sintomas em outro lugar

   **PARE e questione os fundamentos:**
   - Este padrão é fundamentalmente sólido?
   - Estamos "nos apegando a ele por pura inércia"?
   - Deveríamos refatorar a arquitetura vs. continuar corrigindo sintomas?

   **Discuta com seu parceiro humano antes de tentar mais correções**

   Isso NÃO é uma hipótese falha — é uma arquitetura errada.

## Sinais de Alerta — PARE e Siga o Processo

Se você se pegar pensando:
- "Correção rápida por agora, investigo depois"
- "Apenas tente mudar X e veja se funciona"
- "Adicione múltiplas mudanças, execute os testes"
- "Pule o teste, vou verificar manualmente"
- "Provavelmente é X, deixa eu corrigir isso"
- "Não entendo totalmente, mas isso pode funcionar"
- "O padrão diz X mas vou adaptar diferentemente"
- "Aqui estão os principais problemas: [lista correções sem investigação]"
- Propondo soluções antes de rastrear o fluxo de dados
- **"Mais uma tentativa de correção" (quando já tentou 2+)**
- **Cada correção revela novo problema em lugar diferente**

**TODOS esses significam: PARE. Retorne à Fase 1.**

**Se 3+ correções falharam:** Questione a arquitetura (veja Fase 4.5)

## Sinais do Seu Parceiro Humano de Que Você Está Errando

**Fique atento a essas redireções:**
- "Isso não está acontecendo?" — Você assumiu sem verificar
- "Isso vai nos mostrar...?" — Você deveria ter adicionado coleta de evidências
- "Pare de adivinhar" — Você está propondo correções sem entender
- "Pense profundamente sobre isso" — Questione fundamentos, não apenas sintomas
- "Estamos travados?" (frustrado) — Sua abordagem não está funcionando

**Quando vir esses:** PARE. Retorne à Fase 1.

## Racionalizações Comuns

| Desculpa | Realidade |
|----------|-----------|
| "Problema simples, não precisa de processo" | Problemas simples têm causas raiz também. O processo é rápido para bugs simples. |
| "Emergência, sem tempo para o processo" | Depuração sistemática é MAIS RÁPIDA que thrashing de tentativa e erro. |
| "Apenas tente isso primeiro, depois investigue" | A primeira correção define o padrão. Faça certo desde o início. |
| "Vou escrever o teste depois de confirmar que a correção funciona" | Correções não testadas não persistem. Testar primeiro prova isso. |
| "Múltiplas correções de uma vez economizam tempo" | Não é possível isolar o que funcionou. Causa novos bugs. |
| "Referência muito longa, vou adaptar o padrão" | Entendimento parcial garante bugs. Leia completamente. |
| "Vejo o problema, deixa eu corrigir" | Ver sintomas ≠ entender a causa raiz. |
| "Mais uma tentativa de correção" (após 2+ falhas) | 3+ falhas = problema arquitetural. Questione o padrão, não corrija novamente. |

## Referência Rápida

| Fase | Atividades Principais | Critério de Sucesso |
|------|-----------------------|---------------------|
| **1. Causa Raiz** | Leia erros, reproduza, verifique mudanças, colete evidências | Entenda O QUE e POR QUÊ |
| **2. Padrão** | Encontre exemplos funcionando, compare | Identifique diferenças |
| **3. Hipótese** | Forme teoria, teste minimamente | Confirmada ou nova hipótese |
| **4. Implementação** | Crie teste, corrija, verifique | Bug resolvido, testes passam |

## Quando o Processo Revela "Sem Causa Raiz"

Se a investigação sistemática revelar que o problema é verdadeiramente ambiental, dependente de tempo ou externo:

1. Você completou o processo
2. Documente o que investigou
3. Implemente o tratamento adequado (retry, timeout, mensagem de erro)
4. Adicione monitoramento/logging para investigação futura

**Mas:** 95% dos casos de "sem causa raiz" são investigação incompleta.

## Técnicas de Suporte

Essas técnicas fazem parte da depuração sistemática e estão disponíveis neste diretório:

- **`root-cause-tracing.md`** — Rastreie bugs de volta pelo call stack para encontrar o gatilho original
- **`defense-in-depth.md`** — Adicione validação em múltiplas camadas após encontrar a causa raiz
- **`condition-based-waiting.md`** — Substitua timeouts arbitrários por polling de condição

**Skills relacionadas:**
- **superpowers:test-driven-development** — Para criar caso de teste falhando (Fase 4, Passo 1)
- **superpowers:verification-before-completion** — Verifique se a correção funcionou antes de afirmar sucesso

## Impacto no Mundo Real

De sessões de depuração:
- Abordagem sistemática: 15-30 minutos para corrigir
- Abordagem de correções aleatórias: 2-3 horas de thrashing
- Taxa de correção na primeira tentativa: 95% vs 40%
- Novos bugs introduzidos: Próximo de zero vs. comum
