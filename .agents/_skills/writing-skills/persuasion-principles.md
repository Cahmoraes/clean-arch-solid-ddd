# Princípios de Persuasão para Design de Skills

## Visão Geral

LLMs respondem aos mesmos princípios de persuasão que humanos. Entender essa psicologia ajuda você a projetar skills mais eficazes — não para manipular, mas para garantir que práticas críticas sejam seguidas mesmo sob pressão.

**Base de pesquisa:** Meincke et al. (2025) testou 7 princípios de persuasão com N=28.000 conversas de IA. As técnicas de persuasão mais que dobraram as taxas de conformidade (33% → 72%, p < .001).

## Os Sete Princípios

### 1. Autoridade
**O que é:** Deferência à expertise, credenciais ou fontes oficiais.

**Como funciona em skills:**
- Linguagem imperativa: "VOCÊ DEVE", "Nunca", "Sempre"
- Enquadramento não-negociável: "Sem exceções"
- Elimina fadiga de decisão e racionalização

**Quando usar:**
- Skills de imposição de disciplina (TDD, requisitos de verificação)
- Práticas críticas de segurança
- Melhores práticas estabelecidas

**Exemplo:**
```markdown
✅ Escreveu código antes do teste? Delete-o. Recomece. Sem exceções.
❌ Considere escrever testes primeiro quando viável.
```

### 2. Comprometimento
**O que é:** Consistência com ações, declarações ou anúncios públicos anteriores.

**Como funciona em skills:**
- Exigir anúncios: "Anuncie o uso da skill"
- Forçar escolhas explícitas: "Escolha A, B ou C"
- Use rastreamento: TodoWrite para checklists

**Quando usar:**
- Garantindo que skills sejam realmente seguidas
- Processos de múltiplos passos
- Mecanismos de responsabilização

**Exemplo:**
```markdown
✅ Quando você encontrar uma skill, você DEVE anunciar: "Estou usando [Nome da Skill]"
❌ Considere informar seu parceiro sobre qual skill você está usando.
```

### 3. Escassez
**O que é:** Urgência de limites de tempo ou disponibilidade limitada.

**Como funciona em skills:**
- Requisitos com prazo: "Antes de prosseguir"
- Dependências sequenciais: "Imediatamente após X"
- Previne procrastinação

**Quando usar:**
- Requisitos de verificação imediata
- Fluxos de trabalho urgentes
- Prevenindo "vou fazer depois"

**Exemplo:**
```markdown
✅ Após completar uma tarefa, IMEDIATAMENTE solicite revisão de código antes de prosseguir.
❌ Você pode revisar o código quando conveniente.
```

### 4. Prova Social
**O que é:** Conformidade com o que os outros fazem ou o que é considerado normal.

**Como funciona em skills:**
- Padrões universais: "Toda vez", "Sempre"
- Modos de falha: "X sem Y = falha"
- Estabelece normas

**Quando usar:**
- Documentando práticas universais
- Alertando sobre falhas comuns
- Reforçando padrões

**Exemplo:**
```markdown
✅ Checklists sem rastreamento TodoWrite = passos são pulados. Toda vez.
❌ Algumas pessoas acham o TodoWrite útil para checklists.
```

### 5. Unidade
**O que é:** Identidade compartilhada, "nós-idade", pertencimento ao grupo.

**Como funciona em skills:**
- Linguagem colaborativa: "nossa codebase", "somos colegas"
- Objetivos compartilhados: "queremos qualidade juntos"

**Quando usar:**
- Fluxos de trabalho colaborativos
- Estabelecendo cultura de equipe
- Práticas não-hierárquicas

**Exemplo:**
```markdown
✅ Somos colegas trabalhando juntos. Preciso do seu julgamento técnico honesto.
❌ Você provavelmente deveria me dizer se estou errado.
```

### 6. Reciprocidade
**O que é:** Obrigação de retribuir benefícios recebidos.

**Como funciona:**
- Use com parcimônia — pode parecer manipulador
- Raramente necessário em skills

**Quando evitar:**
- Quase sempre (outros princípios são mais eficazes)

### 7. Simpatia
**O que é:** Preferência por cooperar com quem gostamos.

**Como funciona:**
- **NÃO USE para conformidade**
- Conflita com cultura de feedback honesto
- Cria servilidade

**Quando evitar:**
- Sempre para imposição de disciplina

## Combinações de Princípios por Tipo de Skill

| Tipo de Skill | Use | Evite |
|--------------|-----|-------|
| Imposição de disciplina | Autoridade + Comprometimento + Prova Social | Simpatia, Reciprocidade |
| Orientação/técnica | Autoridade Moderada + Unidade | Autoridade pesada |
| Colaborativa | Unidade + Comprometimento | Autoridade, Simpatia |
| Referência | Apenas clareza | Toda persuasão |

## Por Que Funciona: A Psicologia

**Regras claras reduzem racionalização:**
- "VOCÊ DEVE" remove fadiga de decisão
- Linguagem absoluta elimina perguntas "isso é uma exceção?"
- Contadores anti-racionalização explícitos fecham brechas específicas

**Intenções de implementação criam comportamento automático:**
- Gatilhos claros + ações obrigatórias = execução automática
- "Quando X, faça Y" mais eficaz do que "geralmente faça Y"
- Reduz carga cognitiva na conformidade

**LLMs são para-humanos:**
- Treinados em texto humano contendo esses padrões
- Linguagem de autoridade precede conformidade nos dados de treinamento
- Sequências de comprometimento (declaração → ação) frequentemente modeladas
- Padrões de prova social (todos fazem X) estabelecem normas

## Uso Ético

**Legítimo:**
- Garantir que práticas críticas sejam seguidas
- Criar documentação eficaz
- Prevenindo falhas previsíveis

**Ilegítimo:**
- Manipular para ganho pessoal
- Criar urgência falsa
- Conformidade baseada em culpa

**O teste:** Essa técnica serviria os interesses genuínos do usuário se ele a entendesse completamente?

## Citações de Pesquisa

**Cialdini, R. B. (2021).** *Influence: The Psychology of Persuasion (New and Expanded).* Harper Business.
- Sete princípios de persuasão
- Base empírica para pesquisa de influência

**Meincke, L., Shapiro, D., Duckworth, A. L., Mollick, E., Mollick, L., & Cialdini, R. (2025).** Call Me A Jerk: Persuading AI to Comply with Objectionable Requests. University of Pennsylvania.
- Testou 7 princípios com N=28.000 conversas de LLM
- Conformidade aumentou de 33% → 72% com técnicas de persuasão
- Autoridade, comprometimento, escassez mais eficazes
- Valida modelo para-humano de comportamento de LLM

## Referência Rápida

Ao projetar uma skill, pergunte:

1. **Que tipo é?** (Disciplina vs. orientação vs. referência)
2. **Que comportamento estou tentando mudar?**
3. **Quais princípio(s) se aplicam?** (Normalmente autoridade + comprometimento para disciplina)
4. **Estou combinando demais?** (Não use todos os sete)
5. **Isso é ético?** (Serve aos interesses genuínos do usuário?)
