# Template de Documento de Requisitos de Produto (PRD)

## Visão Geral

[Forneça uma visão geral de alto nível do seu produto/funcionalidade. Explique qual problema resolve, para quem é e por que é valioso.]

## Objetivos

[Liste objetivos específicos e mensuráveis para esta funcionalidade:

- Como é o sucesso
- Métricas principais para acompanhar
- Objetivos de negócio a alcançar]
# Template de Especificação Técnica

## Resumo Executivo

[Forneça uma breve visão técnica da abordagem de solução. Resuma as decisões arquiteturais principais e a estratégia de implementação em 1-2 parágrafos.]

## Arquitetura do Sistema

### Visão Geral dos Componentes

[Breve descrição dos componentes principais e suas responsabilidades:

- Nomes dos componentes e funções primárias **Não deixe de listar cada um dos componentes novos ou que serão modificados**
- Relacionamentos principais entre componentes
- Visão geral do fluxo de dados]

## Design de Implementação

### Interfaces Principais

[Defina interfaces de serviço principais (≤20 linhas por exemplo):

```go
// Exemplo de definição de interface
type NomeServico interface {
    NomeMetodo(ctx context.Context, entrada Tipo) (saida Tipo, error)
}
```

]

### Modelos de Dados

[Defina estruturas de dados essenciais:

- Entidades de domínio principais (se aplicável)
- Tipos de requisição/resposta
- Esquemas de banco de dados (se aplicável)]

### Endpoints de API

[Liste endpoints de API se aplicável:

- Método e caminho (ex: `POST /api/v0/recurso`)
- Breve descrição
- Referências de formato requisição/resposta]

## Pontos de Integração

[Inclua apenas se a funcionalidade requer integrações externas:

- Serviços ou APIs externos
- Requisitos de autenticação
- Abordagem de tratamento de erros]

## Abordagem de Testes

### Testes Unidade

[Descreva estratégia de testes unidade:

- Componentes principais a testar
- Requisitos de mock (apenas serviços externos)
- Cenários de teste críticos]

### Testes de Integração

[Se necessário, descreva testes de integração:

- Componentes a testar juntos
- Requisitos de dados de teste]

### Testes de E2E

[Se necessário, descreva testes E2E:

- Teste o frontend junto com o backend **usando o Playwright**]

## Sequenciamento de Desenvolvimento

### Ordem de Construção

[Defina sequência de implementação:

1. Primeiro componente/funcionalidade (por que primeiro)
2. Segundo componente/funcionalidade (dependências)
3. Componentes subsequentes
4. Integração e testes]

### Dependências Técnicas

[Liste quaisquer dependências bloqueantes:

- Infraestrutura requerida
- Disponibilidade de serviço externo]

## Monitoramento e Observabilidade

[Defina abordagem de monitoramento usando infraestrutura existente:

- Métricas a expor (formato Prometheus)
- Logs principais e níveis de log
- Integração com dashboards Grafana existentes]

## Considerações Técnicas

### Decisões Principais

[Documente decisões técnicas importantes:

- Escolha de abordagem e justificativa
- Trade-offs considerados
- Alternativas rejeitadas e por quê]

### Riscos Conhecidos

[Identifique riscos técnicos:

- Desafios potenciais
- Abordagens de mitigação
- Áreas precisando pesquisa]

### Conformidade com Skills Padrões

[Pesquisa as skills na pasta @.claude/skills que se encaixam e se apliquem nesta techspec e liste-as abaixo:]

### Arquivos relevantes e dependentes

[Liste aqui arquivos relevantes e dependentes]
## Histórias de Usuário

[Detalhe as narrativas do usuário descrevendo uso e benefícios da funcionalidade:

- Como [tipo de usuário], eu quero [realizar uma ação] para que [benefício]
- Inclua personas de usuários primários e secundários
- Cubra fluxos principais e casos extremos]

## Funcionalidades Principais

[Liste e descreva as funcionalidades principais do seu produto. Para cada funcionalidade, inclua:

- O que ela faz
- Por que é importante
- Como funciona em alto nível
- Requisitos funcionais (numerados para clareza)]

## Experiência do Usuário

[Descreva a jornada e experiência do usuário:

- Personas de usuário e suas necessidades
- Fluxos e interações principais do usuário
- Considerações e requisitos de UI/UX
- Requisitos de acessibilidade]

## Restrições Técnicas de Alto Nível

[Capture apenas restrições e considerações de alto nível (**evite soluções de design – essas pertencem à Tech Spec**):

- Integrações externas requeridas ou sistemas existentes para interfacear
- Mandatos de conformidade, regulatórios ou de segurança
- Metas de performance/escalabilidade (ex: TPS esperado, limites superiores de latência)
- Considerações de sensibilidade de dados/privacidade
- Requisitos não negociáveis de tecnologia ou protocolo

Detalhes de implementação serão abordados na Especificação Técnica.]

## Fora de Escopo

[Declare claramente o que esta funcionalidade NÃO incluirá para gerenciar o escopo:

- Funcionalidades explicitamente excluídas
- Considerações futuras que estão fora de escopo
- Limites e limitações

(Nota: Riscos de implementação técnica serão detalhados na Tech Spec.)]