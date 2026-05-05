---
name: writing-plans
description: Use quando você tiver uma spec ou requisitos para uma tarefa de múltiplos passos, antes de tocar no código
---

# Escrevendo Planos

## Visão Geral

Escreva planos de implementação abrangentes assumindo que o engenheiro tem zero contexto sobre nossa codebase e gosto questionável. Documente tudo que eles precisam saber: quais arquivos tocar para cada tarefa, código, testes, docs que podem precisar verificar, como testar. Dê-lhes o plano completo como tarefas em pequenas partes. DRY. YAGNI. TDD. Commits frequentes.

Assuma que eles são desenvolvedores habilidosos, mas que sabem quase nada sobre nosso conjunto de ferramentas ou domínio do problema. Assuma que eles não conhecem muito bem bom design de testes.

**Anuncie no início:** "Estou usando a skill writing-plans para criar o plano de implementação."

**Contexto:** Se trabalhando em um worktree isolado, ele deve ter sido criado via skill `superpowers:using-git-worktrees` no momento da execução.

**Salve planos em:** `docs/superpowers/plans/YYYY-MM-DD-<nome-da-funcionalidade>.md`
- (Preferências do usuário para localização do plano substituem esse padrão)

## Verificação de Escopo

Se a spec cobre múltiplos subsistemas independentes, ela deveria ter sido dividida em specs de sub-projeto durante o brainstorming. Se não foi, sugira dividir isso em planos separados — um por subsistema. Cada plano deve produzir software funcionando e testável por conta própria.

## Estrutura de Arquivos

Antes de definir tarefas, mapeie quais arquivos serão criados ou modificados e do que cada um é responsável. É aqui que as decisões de decomposição são fixadas.

- Projete unidades com limites claros e interfaces bem definidas. Cada arquivo deve ter uma responsabilidade clara.
- Você raciocina melhor sobre código que pode manter em contexto de uma vez, e suas edições são mais confiáveis quando os arquivos são focados. Prefira arquivos menores e focados a arquivos grandes que fazem muito.
- Arquivos que mudam juntos devem ficar juntos. Divida por responsabilidade, não por camada técnica.
- Em codebases existentes, siga padrões estabelecidos. Se o codebase usa arquivos grandes, não reestruture unilateralmente — mas se um arquivo que você está modificando cresceu demais, incluir uma divisão no plano é razoável.

Esta estrutura informa a decomposição de tarefas. Cada tarefa deve produzir mudanças autocontidas que fazem sentido independentemente.

## Granularidade de Tarefa em Pequenas Partes

**Cada passo é uma ação (2-5 minutos):**
- "Escreva o teste com falha" — passo
- "Execute para verificar que falha" — passo
- "Implemente o código mínimo para fazer o teste passar" — passo
- "Execute os testes e verifique que passam" — passo
- "Commit" — passo

## Cabeçalho do Documento de Plano

**Todo plano DEVE começar com este cabeçalho:**

```markdown
# Plano de Implementação de [Nome da Funcionalidade]

> **Para trabalhadores agênticos:** SUB-SKILL OBRIGATÓRIA: Use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para implementar este plano tarefa a tarefa. Os passos usam sintaxe de checkbox (`- [ ]`) para rastreamento.

**Objetivo:** [Uma frase descrevendo o que isso constrói]

**Arquitetura:** [2-3 frases sobre a abordagem]

**Stack Tecnológica:** [Tecnologias/bibliotecas principais]

---
```

## Estrutura de Tarefa

````markdown
### Tarefa N: [Nome do Componente]

**Arquivos:**
- Criar: `caminho/exato/para/arquivo.py`
- Modificar: `caminho/exato/para/existente.py:123-145`
- Teste: `testes/caminho/exato/para/test.py`

- [ ] **Passo 1: Escreva o teste com falha**

```python
def test_comportamento_especifico():
    resultado = funcao(entrada)
    assert resultado == esperado
```

- [ ] **Passo 2: Execute o teste para verificar que falha**

Execute: `pytest testes/caminho/test.py::test_nome -v`
Esperado: FALHA com "função não definida"

- [ ] **Passo 3: Escreva a implementação mínima**

```python
def funcao(entrada):
    return esperado
```

- [ ] **Passo 4: Execute o teste para verificar que passa**

Execute: `pytest testes/caminho/test.py::test_nome -v`
Esperado: PASSOU

- [ ] **Passo 5: Commit**

```bash
git add testes/caminho/test.py src/caminho/arquivo.py
git commit -m "feat: adiciona funcionalidade específica"
```
````

## Sem Placeholders

Cada passo deve conter o conteúdo real que um engenheiro precisa. Estas são **falhas de plano** — nunca escreva:
- "TBD", "TODO", "implementar depois", "preencher detalhes"
- "Adicione tratamento de erro apropriado" / "adicione validação" / "trate casos extremos"
- "Escreva testes para o acima" (sem código de teste real)
- "Similar à Tarefa N" (repita o código — o engenheiro pode estar lendo tarefas fora de ordem)
- Passos que descrevem o que fazer sem mostrar como (blocos de código necessários para passos de código)
- Referências a tipos, funções ou métodos não definidos em nenhuma tarefa

## Lembre-se
- Caminhos de arquivo exatos sempre
- Código completo em cada passo — se um passo muda código, mostre o código
- Comandos exatos com saída esperada
- DRY, YAGNI, TDD, commits frequentes

## Auto-Revisão

Após escrever o plano completo, olhe para a spec com olhos frescos e verifique o plano em relação a ela. Esta é uma checklist que você executa sozinho — não um despacho de subagente.

**1. Cobertura da spec:** Percorra cada seção/requisito na spec. Você pode apontar uma tarefa que o implementa? Liste quaisquer lacunas.

**2. Varredura de placeholders:** Pesquise seu plano por sinais de alerta — qualquer um dos padrões da seção "Sem Placeholders" acima. Corrija-os.

**3. Consistência de tipos:** Os tipos, assinaturas de método e nomes de propriedade que você usou em tarefas posteriores correspondem ao que você definiu em tarefas anteriores? Uma função chamada `limparCamadas()` na Tarefa 3 mas `limparCamadasCompletas()` na Tarefa 7 é um bug.

Se encontrar problemas, corrija-os inline. Não é necessário re-revisar — apenas corrija e siga em frente. Se encontrar um requisito da spec sem tarefa, adicione a tarefa.

## Transferência de Execução

Após salvar o plano, ofereça opção de execução:

**"Plano completo e salvo em `docs/superpowers/plans/<nome-do-arquivo>.md`. Duas opções de execução:**

**1. Orientado por Subagente (recomendado)** — Despacho um subagente fresco por tarefa, reviso entre tarefas, iteração rápida

**2. Execução Inline** — Execute tarefas nesta sessão usando executing-plans, execução em lote com checkpoints

**Qual abordagem?"**

**Se Orientado por Subagente for escolhido:**
- **SUB-SKILL OBRIGATÓRIA:** Use superpowers:subagent-driven-development
- Subagente fresco por tarefa + revisão em dois estágios

**Se Execução Inline for escolhida:**
- **SUB-SKILL OBRIGATÓRIA:** Use superpowers:executing-plans
- Execução em lote com checkpoints para revisão
