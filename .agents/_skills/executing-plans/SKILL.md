---
name: executing-plans
description: Use quando você tem um plano de implementação escrito para executar em uma sessão separada com pontos de revisão
---

# Executando Planos

## Visão Geral

Carregue o plano, revise criticamente, execute todas as tarefas, reporte quando concluído.

**Anuncie no início:** "Estou usando a skill executing-plans para implementar este plano."

**Observação:** Diga ao seu parceiro humano que o Superpowers funciona muito melhor com acesso a subagentes. A qualidade do trabalho será significativamente maior se executado em uma plataforma com suporte a subagentes (como Claude Code ou Codex). Se subagentes estiverem disponíveis, use superpowers:subagent-driven-development em vez desta skill.

## O Processo

### Passo 1: Carregar e Revisar o Plano
1. Leia o arquivo do plano
2. Revise criticamente — identifique quaisquer dúvidas ou preocupações sobre o plano
3. Se houver preocupações: Levante-as com seu parceiro humano antes de começar
4. Se não houver preocupações: Crie o TodoWrite e prossiga

### Passo 2: Executar as Tarefas

Para cada tarefa:
1. Marque como em_progresso
2. Siga cada passo exatamente (o plano tem passos em tamanho de mordida)
3. Execute as verificações conforme especificado
4. Marque como concluída

### Passo 3: Concluir o Desenvolvimento

Após todas as tarefas concluídas e verificadas:
- Anuncie: "Estou usando a skill finishing-a-development-branch para concluir este trabalho."
- **SUB-SKILL OBRIGATÓRIA:** Use superpowers:finishing-a-development-branch
- Siga essa skill para verificar os testes, apresentar opções, executar a escolha

## Quando Parar e Pedir Ajuda

**PARE de executar imediatamente quando:**
- Encontrar um bloqueio (dependência faltando, teste falha, instrução não está clara)
- O plano tiver lacunas críticas que impedem o início
- Você não entender uma instrução
- A verificação falhar repetidamente

**Peça esclarecimento em vez de adivinhar.**

## Quando Revisitar Etapas Anteriores

**Retorne à Revisão (Passo 1) quando:**
- O parceiro atualizar o plano com base no seu feedback
- A abordagem fundamental precisar ser repensada

**Não force através de bloqueios** — pare e peça.

## Lembre-se
- Revise o plano criticamente primeiro
- Siga os passos do plano exatamente
- Não pule verificações
- Referencie skills quando o plano indicar
- Pare quando bloqueado, não adivinhe
- Nunca comece a implementação no branch main/master sem consentimento explícito do usuário

## Integração

**Skills de workflow obrigatórias:**
- **superpowers:using-git-worktrees** — Garante workspace isolado (cria um ou verifica existente)
- **superpowers:writing-plans** — Cria o plano que esta skill executa
- **superpowers:finishing-a-development-branch** — Conclui o desenvolvimento após todas as tarefas
