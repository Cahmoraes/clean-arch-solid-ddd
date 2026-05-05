# Log de Criação: Skill de Depuração Sistemática

Exemplo de referência de extração, estruturação e blindagem de uma skill crítica.

## Material de Origem

Framework de depuração extraído de `~/.claude/CLAUDE.md`:
- Processo sistemático de 4 fases (Investigação → Análise de Padrão → Hipótese → Implementação)
- Mandato central: SEMPRE encontrar a causa raiz, NUNCA corrija sintomas
- Regras projetadas para resistir à pressão do tempo e racionalização

## Decisões de Extração

**O que incluir:**
- Framework completo de 4 fases com todas as regras
- Proibições de atalhos ("NUNCA corrija o sintoma", "PARE e reanalize")
- Linguagem resistente à pressão ("mesmo que seja mais rápido", "mesmo que eu pareça estar com pressa")
- Passos concretos para cada fase

**O que deixar de fora:**
- Contexto específico do projeto
- Variações repetitivas da mesma regra
- Explicações narrativas (condensadas em princípios)

## Estrutura Seguindo skill-creation/SKILL.md

1. **when_to_use rico** — Incluiu sintomas e anti-padrões
2. **Tipo: técnica** — Processo concreto com passos
3. **Palavras-chave** — "causa raiz", "sintoma", "solução paliativa", "depuração", "investigação"
4. **Fluxograma** — Ponto de decisão para "correção falhou" → reanalisar vs. adicionar mais correções
5. **Detalhamento fase a fase** — Formato de lista verificável
6. **Seção de anti-padrões** — O que NÃO fazer (crítico para esta skill)

## Elementos de Blindagem

Framework projetado para resistir à racionalização sob pressão:

### Escolhas de Linguagem
- "SEMPRE" / "NUNCA" (não "deveria" / "tente")
- "mesmo que seja mais rápido" / "mesmo que eu pareça estar com pressa"
- "PARE e reanalize" (pausa explícita)
- "Não passe por cima" (captura o comportamento real)

### Defesas Estruturais
- **Fase 1 obrigatória** — Não é possível pular para a implementação
- **Regra de hipótese única** — Força o pensamento, evita correções aleatórias
- **Modo de falha explícito** — "SE sua primeira correção não funcionar" com ação obrigatória
- **Seção de anti-padrões** — Mostra exatamente como os atalhos parecem

### Redundância
- Mandato de causa raiz em visão geral + when_to_use + Fase 1 + regras de implementação
- "NUNCA corrija o sintoma" aparece 4 vezes em contextos diferentes
- Cada fase tem orientação explícita "não pule"

## Abordagem de Testes

Criados 4 testes de validação seguindo skills/meta/testing-skills-with-subagents:

### Teste 1: Contexto Acadêmico (Sem Pressão)
- Bug simples, sem pressão de tempo
- **Resultado:** Conformidade perfeita, investigação completa

### Teste 2: Pressão de Tempo + Correção Rápida Óbvia
- Usuário "com pressa", correção de sintoma parece fácil
- **Resultado:** Resistiu ao atalho, seguiu o processo completo, encontrou a causa raiz real

### Teste 3: Sistema Complexo + Incerteza
- Falha em múltiplas camadas, não está claro se consegue encontrar a causa raiz
- **Resultado:** Investigação sistemática, rastreou por todas as camadas, encontrou a fonte

### Teste 4: Primeira Correção Falhou
- Hipótese não funciona, tentação de adicionar mais correções
- **Resultado:** Parou, reanalisou, formou nova hipótese (sem atirar no escuro)

**Todos os testes passaram.** Sem racionalizações encontradas.

## Iterações

### Versão Inicial
- Framework completo de 4 fases
- Seção de anti-padrões
- Fluxograma para decisão de "correção falhou"

### Aprimoramento 1: Referência a TDD
- Adicionado link para skills/testing/test-driven-development
- Nota explicando que o "código mais simples" do TDD ≠ "causa raiz" da depuração
- Evita confusão entre as metodologias

## Resultado Final

Skill blindada que:
- ✅ Manda claramente investigar a causa raiz
- ✅ Resiste à racionalização sob pressão de tempo
- ✅ Fornece passos concretos para cada fase
- ✅ Mostra anti-padrões explicitamente
- ✅ Testada sob múltiplos cenários de pressão
- ✅ Esclarece relação com TDD
- ✅ Pronta para uso

## Insight Principal

**Blindagem mais importante:** Seção de anti-padrões mostrando exatamente os atalhos que parecem justificados no momento. Quando o Claude pensa "vou apenas adicionar essa correção rápida", ver exatamente esse padrão listado como errado cria fricção cognitiva.

## Exemplo de Uso

Ao encontrar um bug:
1. Carregue a skill: skills/debugging/systematic-debugging
2. Leia a visão geral (10 seg) — lembrado do mandato
3. Siga a lista de verificação da Fase 1 — investigação forçada
4. Se tentado a pular — veja o anti-padrão, pare
5. Conclua todas as fases — causa raiz encontrada

**Investimento de tempo:** 5-10 minutos
**Tempo economizado:** Horas de "whack-a-mole" de sintomas

---

*Criado: 2025-10-03*
*Propósito: Exemplo de referência para extração de skill e blindagem*
