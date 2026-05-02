# Critérios, Regras e Tratamento de Erros

> Referência para a skill `architectural-analyzer`.
> Critérios de análise, tratamento de ambiguidades, instruções negativas e respostas de erro.

## Critérios de Análise

### Abordagem Geral

- Percorra sistematicamente **todos** os diretórios para entender a estrutura do projeto
- Identifique padrões arquiteturais: MVC, microservices, layered, hexagonal, event-driven, etc.
- Foque em **componentes arquiteturalmente significativos**, não em catalogar todos os arquivos
- Calcule métricas de coupling para componentes críticos (dependências aferentes/eferentes)
- Mapeie fluxo de dados e fluxo de controle entre os componentes principais
- Avalie padrões de escalabilidade e gargalos potenciais
- Detecte anti-patterns arquiteturais e débito técnico
- **Priorize componentes por importância arquitetural e impacto de negócio**
- Identifique bibliotecas compartilhadas, utilitários e componentes comuns
- **Sempre exiba caminhos relativos** ao listar ou referenciar arquivos no relatório
- **Exclua** do escopo: `dist/`, `build/`, `coverage/`, `node_modules/`, `.next/`, arquivos gerados automaticamente, snapshots de teste, lockfiles e assets binários

### Análise DDD

- Identifique bounded contexts e subdomínios mesmo em código monolítico ou desorganizado
- Classifique subdomínios em: **Core**, **Supporting** e **Generic**
- Mapeie possíveis fronteiras de domínio com base em nomenclatura, estrutura e responsabilidades
- Documente entidades, value objects e aggregates quando identificáveis

### Métricas de Coupling

Antes de apresentar métricas, explique (em parágrafo no relatório):

- **Acoplamento Aferente (Ca)**: número de componentes externos que dependem deste componente.
  Alta Ca = componente amplamente utilizado, alto impacto em mudanças.

- **Acoplamento Eferente (Ce)**: número de componentes externos dos quais este componente depende.
  Alta Ce = componente frágil, difícil de reutilizar, sensível a mudanças externas.

- **Instabilidade (I = Ce / (Ca + Ce))**: valor de 0 (estável) a 1 (instável). Componentes de 0 são difíceis de mudar; de 1 são fáceis de mudar mas risco de mudanças externas.

### Análise de Segurança

Identifique especificamente:
- Credenciais ou segredos hardcoded no código
- Endpoints sem autenticação/autorização
- Dados sensíveis transmitidos sem criptografia
- Inputs sem validação ou sanitização
- Dependências com vulnerabilidades conhecidas
- Configurações inseguras (CORS, CSRF, rate limiting, headers)
- Logs que expõem dados sensíveis

### Variáveis de Ambiente

Localizações a verificar:
- `.env`, `.env.local`, `.env.production`, `.env.staging`
- `env-schema.ts` ou arquivos similares de schema de environment
- Referências em código como `process.env.XXX` ou `import.meta.env.XXX`

Para cada variável, avalie se está **ativa** (referenciada no código atual) ou **obsoleta** (declarada mas não utilizada).

### Detecção de Código Morto

A detecção de código morto requer verificar se exports e definições são efetivamente utilizados no codebase. Siga estas diretrizes:

#### Processo de Detecção

Para **cada arquivo** de código-fonte:
1. Identifique todos os exports (funções, classes, tipos, constantes, interfaces)
2. Para cada export, busque importações em todo o codebase
3. Categorize conforme as regras abaixo

#### Categorias de Confiança

| Categoria | Confiança | Critério |
|-----------|-----------|----------|
| **Morto** | ALTA | Exportado mas nunca importado em nenhum arquivo. Nenhum uso dinâmico detectado |
| **Possivelmente Morto** | MÉDIA | Usado apenas em código comentado, usado apenas em outros exports mortos, usado apenas em testes de features deprecadas |
| **Não Conclusivo** | BAIXA | Há indícios de desuso mas não é possível confirmar com certeza |

#### Falsos Positivos — NÃO reportar como morto

Os seguintes casos **não são** código morto mesmo que não haja importação direta:
- **Hooks de framework**: lifecycle methods, decorators, callbacks registrados pelo framework (ex: `@injectable()`, `@Get()`, `init()` em controllers)
- **Injeção de dependência**: classes registradas em containers IoC (Inversify, NestJS, Angular)
- **Importações dinâmicas**: `import()` dinâmico, `require()` com variáveis
- **API pública**: exports destinados a consumidores externos (packages publicados)
- **Rotas registradas indiretamente**: controllers/handlers registrados via decorators ou configuração
- **Side-effect modules**: arquivos importados apenas pelo efeito colateral (`import './polyfill'`)
- **Barrel files**: `index.ts` que re-exportam de outros módulos (verificar o consumo do barrel, não dos re-exports individuais)
- **Código gerado**: arquivos em diretórios de output de geradores (Prisma, OpenAPI, GraphQL codegen)
- **Migrations**: arquivos de migração de banco de dados
- **Fixtures e seeds**: dados de teste e seed de banco
- **Configurações de build**: arquivos referenciados por ferramentas de build (webpack, tsup, vite.config)
- **Exports usados em testes**: se usados em testes ativos, são API pública testada (não mortos)
- **Globals e `window`**: exports acessados via escopo global

#### Código Interno Morto

Além de exports, verifique dentro de cada arquivo:
- Funções definidas mas nunca chamadas (não exportadas)
- Variáveis atribuídas mas nunca lidas
- Parâmetros aceitos mas nunca utilizados (cuidado com callbacks de framework)
- Imports não utilizados

### Detecção de Funcionalidade Duplicada

#### Categorias de Duplicação

| Severidade | Tipo | Critério |
|------------|------|----------|
| **Crítico** | Duplicata Exata | Código idêntico ou quase idêntico em múltiplos arquivos. Copy-paste evidente |
| **Alto** | Lógica Similar | Mesmo algoritmo/propósito, implementação ligeiramente diferente. Parâmetros ou nomes distintos |
| **Alto** | Duplicação de Tipos | Mesma interface/tipo definido em múltiplos arquivos. Tipos similares que deveriam ser unificados |
| **Médio** | Duplicação Conceitual | Múltiplas formas de resolver o mesmo problema. Implementações concorrentes |

#### Processo de Detecção

1. **Reconhecimento de padrões**: Leia arquivos no mesmo diretório/módulo e busque código suspeitamente similar
2. **Busca por assinaturas**: Procure funções com nomes similares, mesmo propósito, mesmos parâmetros
3. **Verificação**: Para cada potencial duplicação, leia ambas implementações e confirme se a lógica é realmente a mesma
4. **Diferenças intencionais**: Distinga diferenças acidentais (copy-paste) de diferenças intencionais (variantes legítimas)

#### Para Cada Grupo de Duplicação, Documente

- Quantidade de instâncias
- Arquivos e linhas afetados
- O padrão duplicado (bloco de código representativo)
- Estimativa de linhas duplicadas
- Tipo de duplicação (exata, similar, conceitual)

### Detecção de Anti-Padrões

#### God Objects
- Arquivos com mais de ~500 linhas (heurística, ajustar ao contexto do projeto)
- Classes com 10+ métodos públicos
- Arquivos que importam de muitos módulos distintos
- Módulos com múltiplas responsabilidades não relacionadas

#### Dependências Circulares
- Arquivo A importa de B, B importa de A
- Cadeias circulares: A → B → C → A
- Ciclos de acoplamento entre módulos

#### Violações de Camada
- Componentes de UI importando diretamente da camada de dados
- Models importando de views
- Utilitários importando de lógica de negócio
- Qualquer inversão na hierarquia de camadas do projeto

#### Acoplamento Forte
- Módulos de alto nível dependendo de módulos de baixo nível sem abstração
- Lógica de negócio dependendo de detalhes de infraestrutura
- Lógica core dependendo de especificidades do framework

### Detecção de Problemas de Tipagem

Busque sistematicamente:
- Uso de `: any` — cada instância deve ser reportada com contexto
- Type assertions (`as Type`, `as unknown as Type`) — especialmente double casts
- `@ts-ignore` e `@ts-expect-error` — mascaramento de erros reais
- Supressões de linter (`biome-ignore`, `eslint-disable`) — verificar se justificadas
- Uso de `unknown` — reportar apenas para referência; com type guards é aceitável
- Tipos implícitos que deveriam ser explícitos

### Detecção de Code Smells

Trate todos os thresholds abaixo como **heurísticas contextuais**, não regras absolutas. Considere o framework, os padrões do projeto e o contexto antes de reportar. Exija evidência concreta.

| Smell | Heurística | Contexto |
|-------|------------|----------|
| Funções/componentes longos | ~50+ linhas | Ajustar para componentes React com JSX extenso |
| Listas de parâmetros longas | ~4+ parâmetros | Verificar se object parameter seria mais adequado |
| Condicionais complexos | ~3+ níveis de aninhamento | Ou expressões booleanas com 3+ termos |
| Números mágicos | Literais numéricos sem nome | Exceto 0, 1, -1, HTTP status codes em contexto óbvio |
| Código comentado | Blocos de código comentado | Deve usar histórico do git |
| Nomes ruins | Variáveis de 1 letra (exceto loops), abreviações sem contexto | Nomes que não refletem propósito |
| Funções utilitárias inline | Funções definidas dentro de componentes/páginas | Que deveriam estar em módulos compartilhados |

---

## Tratamento de Ambiguidades

### Múltiplos Padrões Arquiteturais

Se múltiplos padrões estiverem presentes, **documente cada um separadamente** e declare explicitamente:
```
Nota: Este projeto utiliza múltiplos padrões arquiteturais:
1. MVC para o módulo de autenticação (src/auth/)
2. Hexagonal para o módulo de pagamentos (src/payments/)
```

### Infraestrutura Ausente

Se arquivos de infraestrutura estiverem ausentes:
```
Nota: Arquivos de infraestrutura (Dockerfile, kubernetes, CI/CD) não foram encontrados.
A seção "Análise de Infraestrutura" foi omitida.
```

### Documentação Escassa

Se a documentação for escassa, faça suposições razoáveis baseadas em:
- Estrutura de código e padrões de nomenclatura
- Convenções do framework identificado
- Padrões arquiteturais implícitos no código

Declare explicitamente quando uma suposição foi feita:
```
Suposição: Baseado na estrutura de diretórios e nomenclatura, infere-se padrão MVC.
Evidência: Presença de diretórios controllers/, services/ e models/.
```

### Múltiplos Serviços/Módulos

Se o projeto abrange múltiplos serviços:
- Analise cada serviço individualmente
- Documente as interações entre eles
- Identifique a topologia geral (monolito, microservices, modular monolith)

### Relacionamentos Pouco Claros

Quando relacionamentos entre componentes forem incertos:
```
Incerteza: O relacionamento entre ComponenteA e ComponenteB não pôde ser determinado
com certeza. Possibilidades identificadas:
1. [Possibilidade 1]
2. [Possibilidade 2]
Análise: [Melhor estimativa baseada nas evidências disponíveis]
```

### Folder Não Especificado

- Se o usuário **não especificou** uma pasta, analise **o projeto inteiro**
- Se o usuário **especificou** uma pasta, analise **apenas aquela pasta**

### Modo de Análise Ambíguo

Se a intenção do usuário não deixar claro qual modo de análise executar:
- Frases sobre "arquitetura", "coupling", "DDD", "integrações" → **Arquitetura Macro**
- Frases sobre "código morto", "duplicação", "smells", "métricas", "limpeza" → **Higiene Estrutural**
- Frases sobre "auditoria", "saúde do codebase", "relatório completo", ou ausência de direcionamento específico → **Auditoria Completa**

---

## Instruções Negativas

O que **NUNCA** fazer:

- ❌ Modificar ou sugerir mudanças no codebase
- ❌ Criar ou modificar diagramas arquiteturais programaticamente
- ❌ Assumir padrões arquiteturais sem evidência no código
- ❌ Incluir estimativas de tempo para melhorias arquiteturais
- ❌ Usar emojis ou caracteres estilizados no relatório
- ❌ Fabricar informações — se incerto, declare explicitamente
- ❌ Usar o ficheiro `.env` como justificativa para modificar configurações
- ❌ Reportar como morto código que se enquadra nas exceções de falso positivo
- ❌ Reportar code smells sem evidência concreta e contexto
- ❌ Listar exaustivamente todos os achados menores — consolidar em tabelas-resumo e detalhar apenas severidade Crítica/Alta

---

## Tratamento de Erros

Se a análise arquitetural não puder ser realizada (e.g., código-fonte não encontrado):

```
Status: ERROR

Razão: [Explicação clara do motivo pelo qual a análise não pôde ser realizada]

Próximos Passos Sugeridos:

* Forneça o caminho para o código-fonte do projeto
* Conceda permissões de leitura ao workspace
* Confirme quais componentes ou camadas devem ser priorizados para análise
* Especifique preocupações arquiteturais específicas para focar
```

### Cenários de Erro Comuns

| Cenário | Resposta |
|---------|----------|
| Código-fonte não encontrado | Solicite o caminho correto do projeto |
| Permissão negada em arquivos | Informe limitação e prossiga com arquivos acessíveis |
| Projeto muito grande | Foque em componentes de mais alto nível, documente limitação |
| Linguagem desconhecida | Informe limitação de análise, prossiga com o possível |
| Sem arquivos de configuração | Omita seções correspondentes e documente a ausência |

---

## Glossário de Termos

| Termo PT-BR | Termo EN | Uso |
|-------------|----------|-----|
| Acoplamento Aferente | Afferent Coupling | Número de dependências de entrada |
| Acoplamento Eferente | Efferent Coupling | Número de dependências de saída |
| Ponto único de falha | Single Point of Failure | Componente crítico sem redundância |
| Débito arquitetural | Architectural Debt | Problemas arquiteturais acumulados |
| Teste de unidade | Unit Test | ⚠️ NÃO usar "teste unitário" |
| Contexto delimitado | Bounded Context | Fronteira de domínio DDD |
| Subdomínio | Subdomain | Área de negócio específica |
| Domínio núcleo | Core Domain | Diferencial competitivo do negócio |
| Domínio de suporte | Supporting Domain | Suporta o core, não é diferencial |
| Domínio genérico | Generic Domain | Funcionalidade comum, substituível |
| Código morto | Dead Code | Código exportado mas nunca utilizado |
| Duplicata exata | Exact Duplicate | Código idêntico em múltiplos arquivos |
| Duplicação conceitual | Conceptual Duplication | Múltiplas implementações do mesmo conceito |
| God object | God Object | Classe/arquivo com responsabilidades excessivas |
| Violação de camada | Layer Violation | Dependência que inverte a hierarquia de camadas |
| Code smell | Code Smell | Indicador de problema potencial no código |
| Número mágico | Magic Number | Literal numérico sem nome explicativo |
| Falso positivo | False Positive | Achado incorretamente reportado como problema |

---

## Checklist Pré-Relatório

Antes de gerar o relatório final, verifique conforme o modo de análise ativo:

### Todos os Modos
- [ ] Percorri todos os diretórios do projeto (excluindo exclusões de escopo)?
- [ ] Coletei métricas de tamanho (arquivos, linhas)?
- [ ] Usei caminhos relativos em todas as referências de arquivos?
- [ ] Verifiquei que NÃO há emojis ou caracteres estilizados?
- [ ] Usei "Teste de unidade" (não "unitário") ao traduzir "unit test"?
- [ ] Incluí seção de achados positivos?
- [ ] Incluí seção de priorização de achados?
- [ ] Incluí seção de estatísticas consolidadas?
- [ ] Relatório salvo em `/docs/agents/architectural-analyzer/`?

### Arquitetura Macro
- [ ] Identifiquei todos os componentes arquiteturalmente significativos?
- [ ] Calculei coupling aferente e eferente para componentes críticos?
- [ ] Incluí parágrafo introdutório sobre coupling antes das métricas?
- [ ] Identifiquei todos os pontos de integração externa?
- [ ] Ordenei integrações por nível de risco (Crítico → Baixo)?
- [ ] Avaliei riscos de segurança na arquitetura?
- [ ] Mapeei todas as variáveis de ambiente?
- [ ] Analisei bounded contexts e subdomínios (DDD)?
- [ ] Seção de infraestrutura incluída APENAS se houver evidência de arquivos?

### Higiene Estrutural
- [ ] Verifiquei todos os exports de cada arquivo para detecção de dead code?
- [ ] Apliquei as regras de falso positivo antes de reportar código morto?
- [ ] Categorizei dead code por nível de confiança (Alta, Média, Baixa)?
- [ ] Identifiquei grupos de duplicação e categorizei por severidade?
- [ ] Busquei anti-padrões: god objects, deps circulares, violações de camada?
- [ ] Busquei problemas de tipagem: `any`, assertions, `@ts-ignore`?
- [ ] Busquei code smells com evidência concreta e contexto?
- [ ] Limitei detalhamento aos top achados por severidade?
- [ ] Incluí avaliação de impacto quantitativa (linhas, percentual)?
