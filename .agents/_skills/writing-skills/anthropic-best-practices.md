# Melhores Práticas para Criação de Skills

> Aprenda a escrever Skills eficazes que Claude pode descobrir e usar com sucesso.

Skills boas são concisas, bem estruturadas e testadas com uso real. Este guia fornece decisões práticas de criação para ajudá-lo a escrever Skills que Claude pode descobrir e usar efetivamente.

## Princípios Centrais

### Concisão é Essencial

A [janela de contexto](https://platform.claude.com/docs/en/build-with-claude/context-windows) é um bem público. Sua Skill compartilha a janela de contexto com tudo que Claude precisa saber, incluindo:

* O prompt do sistema
* Histórico de conversa
* Metadados de outras Skills
* Sua solicitação real

Nem cada token de sua Skill tem custo imediato. Na inicialização, apenas os metadados (nome e descrição) de todas as Skills são pré-carregados. Claude lê o SKILL.md apenas quando a Skill se torna relevante, e lê arquivos adicionais apenas conforme necessário. No entanto, ser conciso no SKILL.md ainda importa: uma vez que Claude o carrega, cada token compete com o histórico de conversa e outros contextos.

**Premissa padrão**: Claude já é muito inteligente.

Adicione apenas contexto que Claude não tem. Questione cada informação:

* "Claude realmente precisa dessa explicação?"
* "Posso assumir que Claude sabe isso?"
* "Este parágrafo justifica seu custo em tokens?"

**Bom exemplo: Conciso** (~50 tokens):

````markdown
## Extrair texto de PDF

Use pdfplumber para extração de texto:

```python
import pdfplumber

with pdfplumber.open("arquivo.pdf") as pdf:
    texto = pdf.pages[0].extract_text()
```
````

**Exemplo ruim: Muito verboso** (~150 tokens):

```markdown
## Extrair texto de PDF

Arquivos PDF (Portable Document Format) são um formato de arquivo comum que contém
texto, imagens e outro conteúdo. Para extrair texto de um PDF, você precisará
usar uma biblioteca. Há muitas bibliotecas disponíveis para processamento de PDF, mas
recomendamos pdfplumber porque é fácil de usar e lida com a maioria dos casos bem.
Primeiro, você precisará instalá-la usando pip. Então você pode usar o código abaixo...
```

A versão concisa assume que Claude sabe o que são PDFs e como bibliotecas funcionam.

### Defina Graus Adequados de Liberdade

Combine o nível de especificidade com a fragilidade e variabilidade da tarefa.

**Alta liberdade** (instruções baseadas em texto):

Use quando:
* Múltiplas abordagens são válidas
* Decisões dependem de contexto
* Heurísticas guiam a abordagem

Exemplo:

```markdown
## Processo de revisão de código

1. Analise a estrutura e organização do código
2. Verifique possíveis bugs ou casos extremos
3. Sugira melhorias de legibilidade e manutenibilidade
4. Verifique aderência às convenções do projeto
```

**Liberdade média** (pseudocódigo ou scripts com parâmetros):

Use quando:
* Um padrão preferido existe
* Alguma variação é aceitável
* Configuração afeta o comportamento

Exemplo:

````markdown
## Gerar relatório

Use este template e personalize conforme necessário:

```python
def gerar_relatorio(dados, formato="markdown", incluir_graficos=True):
    # Processar dados
    # Gerar saída no formato especificado
    # Opcionalmente incluir visualizações
```
````

**Baixa liberdade** (scripts específicos, poucos ou nenhum parâmetro):

Use quando:
* Operações são frágeis e propensas a erros
* Consistência é crítica
* Uma sequência específica deve ser seguida

Exemplo:

````markdown
## Migração de banco de dados

Execute exatamente este script:

```bash
python scripts/migrate.py --verify --backup
```

Não modifique o comando nem adicione flags adicionais.
````

**Analogia**: Pense no Claude como um robô explorando um caminho:

* **Ponte estreita com penhascos nos lados**: Há apenas um caminho seguro. Forneça guardrails específicos e instruções exatas (baixa liberdade). Exemplo: migrações de banco de dados que devem ser executadas em sequência exata.
* **Campo aberto sem perigos**: Muitos caminhos levam ao sucesso. Dê direção geral e confie no Claude para encontrar a melhor rota (alta liberdade). Exemplo: revisões de código onde o contexto determina a melhor abordagem.

### Teste com Todos os Modelos que Planeja Usar

Skills atuam como adições a modelos, então a eficácia depende do modelo subjacente. Teste sua Skill com todos os modelos que planeja usar.

**Considerações de teste por modelo**:

* **Claude Haiku** (rápido, econômico): A Skill fornece orientação suficiente?
* **Claude Sonnet** (balanceado): A Skill é clara e eficiente?
* **Claude Opus** (raciocínio poderoso): A Skill evita explicações excessivas?

O que funciona perfeitamente para Opus pode precisar de mais detalhes para Haiku. Se planeja usar sua Skill em múltiplos modelos, mire em instruções que funcionem bem com todos.

## Estrutura da Skill

> **Frontmatter YAML**: O frontmatter do SKILL.md requer dois campos:
> * `name` — Nome legível por humanos da Skill (máximo 64 caracteres)
> * `description` — Descrição de uma linha do que a Skill faz e quando usá-la (máximo 1024 caracteres)

### Convenções de Nomenclatura

Use padrões de nomenclatura consistentes para tornar Skills mais fáceis de referenciar e discutir. Recomendamos usar **forma gerúndio** (verbo + -ndo) para nomes de Skills.

**Bons exemplos de nomenclatura (forma gerúndio)**:

* "Processando PDFs"
* "Analisando planilhas"
* "Gerenciando bancos de dados"
* "Testando código"
* "Escrevendo documentação"

**Alternativas aceitáveis**:

* Frases nominais: "Processamento de PDF", "Análise de Planilha"
* Orientadas a ação: "Processar PDFs", "Analisar Planilhas"

**Evite**:

* Nomes vagos: "Auxiliar", "Utils", "Ferramentas"
* Nomes genéricos demais: "Documentos", "Dados", "Arquivos"
* Padrões inconsistentes dentro da sua coleção de skills

### Escrevendo Descrições Eficazes

O campo `description` habilita a descoberta de Skills e deve incluir tanto o que a Skill faz quanto quando usá-la.

> **Sempre escreva na terceira pessoa**. A descrição é injetada no prompt do sistema, e ponto de vista inconsistente pode causar problemas de descoberta.
> 
> * **Bom:** "Processa arquivos Excel e gera relatórios"
> * **Evite:** "Eu posso ajudá-lo a processar arquivos Excel"
> * **Evite:** "Você pode usar isso para processar arquivos Excel"

**Seja específico e inclua termos-chave**. Inclua tanto o que a Skill faz quanto gatilhos/contextos específicos de quando usá-la.

Cada Skill tem exatamente um campo de descrição. A descrição é crítica para seleção de skills: Claude a usa para escolher a Skill certa de potencialmente 100+ Skills disponíveis.

Exemplos eficazes:

**Skill de Processamento de PDF:**

```yaml
description: Extrai texto e tabelas de arquivos PDF, preenche formulários, mescla documentos. Use ao trabalhar com arquivos PDF ou quando o usuário mencionar PDFs, formulários ou extração de documentos.
```

**Skill de Análise de Excel:**

```yaml
description: Analisa planilhas Excel, cria tabelas dinâmicas, gera gráficos. Use ao analisar arquivos Excel, planilhas, dados tabulares ou arquivos .xlsx.
```

**Skill de Auxiliar de Commit Git:**

```yaml
description: Gera mensagens de commit descritivas analisando diffs do git. Use quando o usuário pede ajuda para escrever mensagens de commit ou revisar mudanças em staging.
```

Evite descrições vagas como estas:

```yaml
description: Ajuda com documentos
```

```yaml
description: Processa dados
```

### Padrões de Divulgação Progressiva

SKILL.md serve como visão geral que aponta Claude para materiais detalhados conforme necessário, como um sumário em um guia de integração.

**Orientação prática:**

* Mantenha o corpo do SKILL.md abaixo de 500 linhas para desempenho ideal
* Divida conteúdo em arquivos separados quando se aproximar desse limite
* Use os padrões abaixo para organizar instruções, código e recursos efetivamente

#### Padrão 1: Guia de Alto Nível com Referências

````markdown
---
name: Processamento de PDF
description: Extrai texto e tabelas de arquivos PDF, preenche formulários e mescla documentos. Use ao trabalhar com arquivos PDF ou quando o usuário mencionar PDFs, formulários ou extração de documentos.
---

# Processamento de PDF

## Início rápido

Extraia texto com pdfplumber:
```python
import pdfplumber
with pdfplumber.open("arquivo.pdf") as pdf:
    texto = pdf.pages[0].extract_text()
```

## Funcionalidades avançadas

**Preenchimento de formulários**: Veja [FORMULARIOS.md](FORMULARIOS.md) para guia completo
**Referência de API**: Veja [REFERENCIA.md](REFERENCIA.md) para todos os métodos
**Exemplos**: Veja [EXEMPLOS.md](EXEMPLOS.md) para padrões comuns
````

Claude carrega FORMULARIOS.md, REFERENCIA.md ou EXEMPLOS.md apenas quando necessário.

#### Padrão 2: Organização por Domínio

Para Skills com múltiplos domínios, organize o conteúdo por domínio para evitar carregar contexto irrelevante.

```
bigquery-skill/
├── SKILL.md (visão geral e navegação)
└── referencia/
    ├── financeiro.md (receita, métricas de cobrança)
    ├── vendas.md (oportunidades, pipeline)
    ├── produto.md (uso de API, funcionalidades)
    └── marketing.md (campanhas, atribuição)
```

````markdown SKILL.md
# Análise de Dados BigQuery

## Datasets disponíveis

**Financeiro**: Receita, ARR, cobrança → Veja [referencia/financeiro.md](referencia/financeiro.md)
**Vendas**: Oportunidades, pipeline, contas → Veja [referencia/vendas.md](referencia/vendas.md)
**Produto**: Uso de API, funcionalidades, adoção → Veja [referencia/produto.md](referencia/produto.md)
**Marketing**: Campanhas, atribuição, email → Veja [referencia/marketing.md](referencia/marketing.md)

## Busca rápida

Encontre métricas específicas usando grep:

```bash
grep -i "receita" referencia/financeiro.md
grep -i "pipeline" referencia/vendas.md
grep -i "uso de api" referencia/produto.md
```
````

#### Padrão 3: Detalhes Condicionais

Mostre conteúdo básico, vincule ao conteúdo avançado:

```markdown
# Processamento DOCX

## Criando documentos

Use docx-js para novos documentos. Veja [DOCX-JS.md](DOCX-JS.md).

## Editando documentos

Para edições simples, modifique o XML diretamente.

**Para mudanças rastreadas**: Veja [REDLINING.md](REDLINING.md)
**Para detalhes OOXML**: Veja [OOXML.md](OOXML.md)
```

### Evite Referências Muito Aninhadas

Claude pode ler arquivos parcialmente quando são referenciados de outros arquivos referenciados. **Mantenha referências com apenas um nível de profundidade a partir do SKILL.md**.

**Mau exemplo: Muito profundo**:

```markdown
# SKILL.md
Veja [avancado.md](avancado.md)...

# avancado.md
Veja [detalhes.md](detalhes.md)...

# detalhes.md
Aqui está a informação real...
```

**Bom exemplo: Um nível de profundidade**:

```markdown
# SKILL.md

**Uso básico**: [instruções no SKILL.md]
**Funcionalidades avançadas**: Veja [avancado.md](avancado.md)
**Referência de API**: Veja [referencia.md](referencia.md)
**Exemplos**: Veja [exemplos.md](exemplos.md)
```

### Estruture Arquivos de Referência Longos com Sumário

Para arquivos de referência com mais de 100 linhas, inclua um sumário no topo.

**Exemplo**:

```markdown
# Referência de API

## Conteúdo
- Autenticação e configuração
- Métodos principais (criar, ler, atualizar, deletar)
- Funcionalidades avançadas (operações em lote, webhooks)
- Padrões de tratamento de erros
- Exemplos de código

## Autenticação e configuração
...

## Métodos principais
...
```

## Fluxos de Trabalho e Loops de Feedback

### Use Fluxos de Trabalho para Tarefas Complexas

Divida operações complexas em etapas claras e sequenciais. Para fluxos de trabalho particularmente complexos, forneça um checklist que Claude pode copiar em sua resposta e marcar conforme progride.

**Exemplo 1: Fluxo de síntese de pesquisa** (para Skills sem código):

````markdown
## Fluxo de síntese de pesquisa

Copie este checklist e acompanhe seu progresso:

```
Progresso da Pesquisa:
- [ ] Etapa 1: Ler todos os documentos fonte
- [ ] Etapa 2: Identificar temas principais
- [ ] Etapa 3: Cruzar referências de afirmações
- [ ] Etapa 4: Criar resumo estruturado
- [ ] Etapa 5: Verificar citações
```

**Etapa 1: Ler todos os documentos fonte**

Revise cada documento no diretório `fontes/`. Observe os argumentos principais e evidências de suporte.

**Etapa 2: Identificar temas principais**

Procure padrões nas fontes. Quais temas aparecem repetidamente? Onde as fontes concordam ou discordam?

**Etapa 3: Cruzar referências de afirmações**

Para cada afirmação principal, verifique se aparece no material fonte. Observe qual fonte suporta cada ponto.

**Etapa 4: Criar resumo estruturado**

Organize descobertas por tema. Inclua:
- Afirmação principal
- Evidências de suporte das fontes
- Pontos de vista conflitantes (se houver)

**Etapa 5: Verificar citações**

Verifique que cada afirmação referencia o documento fonte correto. Se as citações estiverem incompletas, retorne à Etapa 3.
````

**Exemplo 2: Fluxo de preenchimento de formulários PDF** (para Skills com código):

````markdown
## Fluxo de preenchimento de formulários PDF

Copie este checklist e marque os itens conforme os conclui:

```
Progresso da Tarefa:
- [ ] Etapa 1: Analisar o formulário (executar analyze_form.py)
- [ ] Etapa 2: Criar mapeamento de campos (editar campos.json)
- [ ] Etapa 3: Validar mapeamento (executar validate_fields.py)
- [ ] Etapa 4: Preencher o formulário (executar fill_form.py)
- [ ] Etapa 5: Verificar saída (executar verify_output.py)
```

**Etapa 1: Analisar o formulário**

Execute: `python scripts/analyze_form.py entrada.pdf`

**Etapa 2: Criar mapeamento de campos**

Edite `campos.json` para adicionar valores para cada campo.

**Etapa 3: Validar mapeamento**

Execute: `python scripts/validate_fields.py campos.json`

Corrija quaisquer erros de validação antes de continuar.

**Etapa 4: Preencher o formulário**

Execute: `python scripts/fill_form.py entrada.pdf campos.json saida.pdf`

**Etapa 5: Verificar saída**

Execute: `python scripts/verify_output.py saida.pdf`

Se a verificação falhar, retorne à Etapa 2.
````

### Implemente Loops de Feedback

**Padrão comum**: Executar validador → corrigir erros → repetir

Este padrão melhora muito a qualidade da saída.

**Exemplo 1: Conformidade com guia de estilo** (para Skills sem código):

```markdown
## Processo de revisão de conteúdo

1. Elabore seu conteúdo seguindo as diretrizes em GUIA_ESTILO.md
2. Revise contra o checklist:
   - Verifique consistência de terminologia
   - Confirme que os exemplos seguem o formato padrão
   - Confirme que todas as seções obrigatórias estão presentes
3. Se problemas encontrados:
   - Anote cada problema com referência de seção específica
   - Revise o conteúdo
   - Revise o checklist novamente
4. Prossiga apenas quando todos os requisitos forem atendidos
5. Finalize e salve o documento
```

**Exemplo 2: Processo de edição de documentos** (para Skills com código):

```markdown
## Processo de edição de documentos

1. Faça suas edições em `word/document.xml`
2. **Valide imediatamente**: `python ooxml/scripts/validate.py pasta_descompactada/`
3. Se a validação falhar:
   - Revise a mensagem de erro cuidadosamente
   - Corrija os problemas no XML
   - Execute a validação novamente
4. **Prossiga apenas quando a validação passar**
5. Reconstrua: `python ooxml/scripts/pack.py pasta_descompactada/ saida.docx`
6. Teste o documento de saída
```

## Diretrizes de Conteúdo

### Evite Informações Sensíveis ao Tempo

Não inclua informações que ficarão desatualizadas:

**Mau exemplo: Sensível ao tempo** (ficará errado):

```markdown
Se você estiver fazendo isso antes de agosto de 2025, use a API antiga.
Após agosto de 2025, use a nova API.
```

**Bom exemplo** (use seção "padrões antigos"):

```markdown
## Método atual

Use o endpoint da API v2: `api.exemplo.com/v2/mensagens`

## Padrões antigos

<details>
<summary>API v1 legada (descontinuada em 2025-08)</summary>

A API v1 usava: `api.exemplo.com/v1/mensagens`

Este endpoint não é mais suportado.
</details>
```

### Use Terminologia Consistente

Escolha um termo e use-o ao longo de toda a Skill:

**Bom — Consistente**:
* Sempre "endpoint de API"
* Sempre "campo"
* Sempre "extrair"

**Ruim — Inconsistente**:
* Misture "endpoint de API", "URL", "rota de API", "caminho"
* Misture "campo", "caixa", "elemento", "controle"
* Misture "extrair", "puxar", "obter", "recuperar"

## Padrões Comuns

### Padrão Template

Forneça templates para formato de saída.

**Para requisitos rígidos** (como respostas de API ou formatos de dados):

````markdown
## Estrutura de relatório

SEMPRE use exatamente esta estrutura de template:

```markdown
# [Título da Análise]

## Resumo executivo
[Visão geral de um parágrafo das principais descobertas]

## Principais descobertas
- Descoberta 1 com dados de suporte
- Descoberta 2 com dados de suporte
- Descoberta 3 com dados de suporte

## Recomendações
1. Recomendação acionável específica
2. Recomendação acionável específica
```
````

**Para orientação flexível** (quando a adaptação é útil):

````markdown
## Estrutura de relatório

Aqui está um formato padrão sensato, mas use seu melhor julgamento com base na análise:

```markdown
# [Título da Análise]

## Resumo executivo
[Visão geral]

## Principais descobertas
[Adapte seções com base no que descobrir]

## Recomendações
[Adapte ao contexto específico]
```

Ajuste seções conforme necessário para o tipo de análise específico.
````

### Padrão de Exemplos

Para Skills onde a qualidade da saída depende de ver exemplos, forneça pares entrada/saída:

````markdown
## Formato de mensagem de commit

Gere mensagens de commit seguindo estes exemplos:

**Exemplo 1:**
Entrada: Adicionada autenticação de usuário com tokens JWT
Saída:
```
feat(auth): implementar autenticação baseada em JWT

Adicionar endpoint de login e middleware de validação de token
```

**Exemplo 2:**
Entrada: Corrigido bug onde datas eram exibidas incorretamente nos relatórios
Saída:
```
fix(relatorios): corrigir formatação de data na conversão de fuso horário

Usar timestamps UTC consistentemente na geração de relatórios
```

Siga este estilo: tipo(escopo): descrição breve, depois explicação detalhada.
````

### Padrão de Fluxo Condicional

Guie Claude através de pontos de decisão:

```markdown
## Fluxo de modificação de documentos

1. Determine o tipo de modificação:

   **Criando novo conteúdo?** → Siga o "Fluxo de criação" abaixo
   **Editando conteúdo existente?** → Siga o "Fluxo de edição" abaixo

2. Fluxo de criação:
   - Use biblioteca docx-js
   - Construa documento do zero
   - Exporte para formato .docx

3. Fluxo de edição:
   - Descompacte o documento existente
   - Modifique o XML diretamente
   - Valide após cada mudança
   - Reempacote quando completo
```

> Se fluxos de trabalho ficarem grandes ou complicados com muitas etapas, considere movê-los para arquivos separados e diga ao Claude para ler o arquivo apropriado com base na tarefa.

## Avaliação e Iteração

### Construa Avaliações Primeiro

**Crie avaliações ANTES de escrever documentação extensa.** Isso garante que sua Skill resolve problemas reais em vez de documentar problemas imaginados.

**Desenvolvimento orientado por avaliação:**

1. **Identifique lacunas**: Execute Claude em tarefas representativas sem uma Skill. Documente falhas específicas ou contexto ausente
2. **Crie avaliações**: Construa três cenários que testem essas lacunas
3. **Estabeleça baseline**: Meça o desempenho do Claude sem a Skill
4. **Escreva instruções mínimas**: Crie apenas conteúdo suficiente para abordar as lacunas e passar as avaliações
5. **Itere**: Execute avaliações, compare com o baseline e refine

**Estrutura de avaliação**:

```json
{
  "skills": ["processamento-pdf"],
  "query": "Extraia todo o texto deste arquivo PDF e salve em saida.txt",
  "files": ["arquivos-teste/documento.pdf"],
  "expected_behavior": [
    "Lê com sucesso o arquivo PDF usando uma biblioteca de processamento de PDF apropriada",
    "Extrai conteúdo de texto de todas as páginas do documento sem perder nenhuma página",
    "Salva o texto extraído em um arquivo chamado saida.txt em formato claro e legível"
  ]
}
```

> Avaliações são sua fonte da verdade para medir eficácia da Skill.

### Desenvolva Skills Iterativamente com Claude

O processo mais eficaz de desenvolvimento de Skill envolve o próprio Claude. Trabalhe com uma instância do Claude ("Claude A") para criar uma Skill que será usada por outras instâncias ("Claude B"). Claude A ajuda a projetar e refinar instruções, enquanto Claude B as testa em tarefas reais.

**Criando uma nova Skill:**

1. **Complete uma tarefa sem uma Skill**: Trabalhe em um problema com Claude A usando prompting normal. Perceba quais informações você fornece repetidamente.

2. **Identifique o padrão reutilizável**: Após completar a tarefa, identifique qual contexto você forneceu que seria útil para tarefas similares futuras.

3. **Peça ao Claude A para criar uma Skill**: "Crie uma Skill que capture este padrão de análise do BigQuery que acabamos de usar."

   > Modelos Claude entendem o formato e estrutura de Skill nativamente. Você não precisa de prompts especiais do sistema ou de uma "skill de escrever skills" para fazer Claude ajudar a criar Skills.

4. **Revise pela concisão**: Verifique se Claude A não adicionou explicações desnecessárias.

5. **Melhore a arquitetura de informação**: Peça ao Claude A para organizar o conteúdo mais efetivamente.

6. **Teste em tarefas similares**: Use a Skill com Claude B em casos de uso relacionados. Observe se Claude B encontra as informações certas, aplica regras corretamente e lida com a tarefa com sucesso.

7. **Itere com base na observação**: Se Claude B tiver dificuldades ou perder algo, retorne ao Claude A com especificidades.

**Iterando em Skills existentes:**

O mesmo padrão hierárquico continua ao melhorar Skills. Você alterna entre:

* **Trabalhar com Claude A** (o especialista que ajuda a refinar a Skill)
* **Testar com Claude B** (o agente usando a Skill para realizar trabalho real)
* **Observar o comportamento de Claude B** e trazer insights de volta ao Claude A

### Observe Como Claude Navega Skills

Enquanto itera em Skills, preste atenção em como Claude realmente as usa na prática. Observe:

* **Caminhos de exploração inesperados**: Claude lê arquivos em ordem diferente da que você antecipou?
* **Conexões perdidas**: Claude falha em seguir referências para arquivos importantes?
* **Dependência excessiva de certas seções**: Se Claude lê repetidamente o mesmo arquivo, considere se esse conteúdo deveria estar no SKILL.md principal
* **Conteúdo ignorado**: Se Claude nunca acessa um arquivo agrupado, pode ser desnecessário

## Anti-Padrões a Evitar

### Evite Caminhos no Estilo Windows

Sempre use barras normais em caminhos de arquivo, mesmo no Windows:

* ✓ **Bom**: `scripts/auxiliar.py`, `referencia/guia.md`
* ✗ **Evite**: `scripts\auxiliar.py`, `referencia\guia.md`

### Evite Oferecer Muitas Opções

Não apresente múltiplas abordagens a não ser que seja necessário:

````markdown
**Mau exemplo: Muitas escolhas** (confuso):
"Você pode usar pypdf, ou pdfplumber, ou PyMuPDF, ou pdf2image, ou..."

**Bom exemplo: Forneça um padrão** (com saída de emergência):
"Use pdfplumber para extração de texto:
```python
import pdfplumber
```

Para PDFs digitalizados que requerem OCR, use pdf2image com pytesseract em vez disso."
````

## Avançado: Skills com Código Executável

### Resolva, Não Repasse

Ao escrever scripts para Skills, trate condições de erro em vez de repassar ao Claude.

**Bom exemplo: Trate erros explicitamente**:

```python
def processar_arquivo(caminho):
    """Processa um arquivo, criando-o se não existir."""
    try:
        with open(caminho) as f:
            return f.read()
    except FileNotFoundError:
        print(f"Arquivo {caminho} não encontrado, criando padrão")
        with open(caminho, 'w') as f:
            f.write('')
        return ''
    except PermissionError:
        print(f"Não é possível acessar {caminho}, usando padrão")
        return ''
```

**Mau exemplo: Repassa ao Claude**:

```python
def processar_arquivo(caminho):
    # Apenas falha e deixa Claude descobrir
    return open(caminho).read()
```

Parâmetros de configuração também devem ser justificados e documentados para evitar "constantes voodoo" (lei de Ousterhout).

**Bom exemplo: Auto-documentado**:

```python
# Requisições HTTP normalmente completam em 30 segundos
# Timeout maior acomoda conexões lentas
REQUEST_TIMEOUT = 30

# Três tentativas equilibram confiabilidade versus velocidade
# A maioria das falhas intermitentes resolve na segunda tentativa
MAX_RETRIES = 3
```

### Forneça Scripts Utilitários

Mesmo que Claude pudesse escrever um script, scripts pré-feitos oferecem vantagens:

**Benefícios de scripts utilitários**:

* Mais confiáveis do que código gerado
* Economizam tokens (sem necessidade de incluir código no contexto)
* Economizam tempo (sem necessidade de geração de código)
* Garantem consistência entre usos

**Faça clara a intenção de execução**:
* "Execute `analyze_form.py` para extrair campos" (executar)
* "Veja `analyze_form.py` para o algoritmo de extração" (ler como referência)

**Exemplo**:

````markdown
## Scripts utilitários

**analyze_form.py**: Extrair todos os campos do formulário do PDF

```bash
python scripts/analyze_form.py entrada.pdf > campos.json
```

Formato de saída:
```json
{
  "nome_campo": {"tipo": "text", "x": 100, "y": 200},
  "assinatura": {"tipo": "sig", "x": 150, "y": 500}
}
```

**validate_boxes.py**: Verificar caixas delimitadoras sobrepostas

```bash
python scripts/validate_boxes.py campos.json
# Retorna: "OK" ou lista conflitos
```

**fill_form.py**: Aplicar valores de campo ao PDF

```bash
python scripts/fill_form.py entrada.pdf campos.json saida.pdf
```
````

### Crie Saídas Intermediárias Verificáveis

Quando Claude realiza tarefas complexas e abertas, pode cometer erros. O padrão "planejar-validar-executar" captura erros cedo fazendo Claude primeiro criar um plano em formato estruturado, depois validar esse plano com um script antes de executar.

**Quando usar**: Operações em lote, mudanças destrutivas, regras de validação complexas, operações de alto risco.

**Por que este padrão funciona:**

* **Captura erros cedo**: Validação encontra problemas antes de aplicar mudanças
* **Verificável por máquina**: Scripts fornecem verificação objetiva
* **Planejamento reversível**: Claude pode iterar no plano sem tocar nos originais
* **Depuração clara**: Mensagens de erro apontam para problemas específicos

**Dica de implementação**: Faça scripts de validação verbosos com mensagens de erro específicas como "Campo 'data_assinatura' não encontrado. Campos disponíveis: nome_cliente, total_pedido, data_assinatura_assinado" para ajudar Claude a corrigir problemas.

### Dependências de Pacotes

Skills rodam no ambiente de execução de código com limitações específicas de plataforma:

* **claude.ai**: Pode instalar pacotes de npm e PyPI e baixar de repositórios GitHub
* **Anthropic API**: Não tem acesso à rede e sem instalação de pacotes em tempo de execução

Liste pacotes necessários no seu SKILL.md.

### Ambiente de Runtime

Skills rodam em um ambiente de execução de código com acesso ao sistema de arquivos, comandos bash e capacidades de execução de código.

**Como Claude acessa Skills:**

1. **Metadados pré-carregados**: Na inicialização, o nome e a descrição de todas as Skills são carregados no prompt do sistema
2. **Arquivos lidos sob demanda**: Claude usa ferramentas de leitura bash para acessar SKILL.md e outros arquivos do sistema de arquivos quando necessário
3. **Scripts executados eficientemente**: Scripts utilitários podem ser executados via bash sem carregar seu conteúdo completo no contexto
4. **Sem penalidade de contexto para arquivos grandes**: Arquivos de referência, dados ou documentação não consomem tokens de contexto até serem lidos

* **Caminhos de arquivo importam**: Claude navega seu diretório de skill como um sistema de arquivos. Use barras normais (`referencia/guia.md`), não barras invertidas
* **Nomeie arquivos descritivamente**: Use nomes que indicam conteúdo: `regras_validacao_formulario.md`, não `doc2.md`
* **Organize para descoberta**: Estruture diretórios por domínio ou funcionalidade
* **Prefira scripts para operações determinísticas**: Escreva `validate_form.py` em vez de pedir ao Claude para gerar código de validação

**Exemplo:**

```
bigquery-skill/
├── SKILL.md (visão geral, aponta para arquivos de referência)
└── referencia/
    ├── financeiro.md (métricas de receita)
    ├── vendas.md (dados de pipeline)
    └── produto.md (análise de uso)
```

### Referências de Ferramentas MCP

Se sua Skill usa ferramentas MCP (Model Context Protocol), sempre use nomes de ferramentas completamente qualificados para evitar erros de "ferramenta não encontrada".

**Formato**: `NomeServidor:nome_ferramenta`

**Exemplo**:

```markdown
Use a ferramenta BigQuery:bigquery_schema para recuperar schemas de tabelas.
Use a ferramenta GitHub:create_issue para criar issues.
```

Sem o prefixo do servidor, Claude pode falhar em localizar a ferramenta, especialmente quando múltiplos servidores MCP estão disponíveis.

## Checklist para Skills Eficazes

Antes de compartilhar uma Skill, verifique:

### Qualidade Central

* [ ] Descrição é específica e inclui termos-chave
* [ ] Descrição inclui tanto o que a Skill faz quanto quando usá-la
* [ ] Corpo do SKILL.md está abaixo de 500 linhas
* [ ] Detalhes adicionais estão em arquivos separados (se necessário)
* [ ] Sem informações sensíveis ao tempo (ou na seção "padrões antigos")
* [ ] Terminologia consistente ao longo
* [ ] Exemplos são concretos, não abstratos
* [ ] Referências de arquivos têm um nível de profundidade
* [ ] Divulgação progressiva usada apropriadamente
* [ ] Fluxos de trabalho têm etapas claras

### Código e Scripts

* [ ] Scripts resolvem problemas em vez de repassar ao Claude
* [ ] Tratamento de erros é explícito e útil
* [ ] Sem "constantes voodoo" (todos os valores justificados)
* [ ] Pacotes necessários listados nas instruções e verificados como disponíveis
* [ ] Scripts têm documentação clara
* [ ] Sem caminhos no estilo Windows (todas as barras normais)
* [ ] Etapas de validação/verificação para operações críticas
* [ ] Loops de feedback incluídos para tarefas de qualidade crítica

### Testes

* [ ] Pelo menos três avaliações criadas
* [ ] Testado com Haiku, Sonnet e Opus
* [ ] Testado com cenários de uso real
* [ ] Feedback da equipe incorporado (se aplicável)
