# Formato de Saída do Relatório

> Referência para a skill `architectural-analyzer`.
> Especificação completa das seções, tabelas e exemplos para o relatório arquitetural.

## Nome do Relatório

`Relatório de Análise Arquitetural`

Arquivo gerado: `architectural-report-{YYYY-MM-DD-HH-MM-SS}.md`
Destino: `/docs/agents/architectural-analyzer/`

O cabeçalho do relatório deve incluir:
```markdown
# Relatório de Análise Arquitetural
**Data**: {YYYY-MM-DD}
**Modo**: {Arquitetura Macro | Higiene Estrutural | Auditoria Completa}
**Arquivos Analisados**: X arquivos de produção (Y total com testes)
**Total de Linhas de Produção**: ~Z
```

---

## Seção 1 — Resumo Executivo

Visão geral de alto nível do sistema. Adapte o conteúdo ao modo de análise executado:

**Arquitetura Macro**: Stack tecnológico, padrões arquiteturais, principais achados arquiteturais, avaliação de saúde.

**Higiene Estrutural**: Código morto encontrado, duplicações, anti-padrões, type issues, code smells, estimativa de limpeza.

**Auditoria Completa**: Todos os itens acima combinados.

Exemplo para Auditoria Completa:
```markdown
- **Código Morto**: X arquivos inteiramente mortos (Y linhas), Z+ exports mortos
- **Funcionalidade Duplicada**: W grupos de duplicação, ~V linhas duplicadas
- **Anti-Padrões Arquiteturais**: N type assertions inseguros
- **Problemas de Tipagem**: Mínimos — codebase bem tipada com poucos usos de `any`
- **Code Smells**: M componentes de página grandes

**Saude Geral**: [Avaliação qualitativa baseada nos achados]
```

---

## Seção 2 — Visão Geral do Sistema

Estrutura do projeto, diretórios principais, bounded contexts e subdomínios, e padrões arquiteturais.

**Bounded Contexts e Subdomínios (DDD)**:
```
- Product: (product)
- Authentication: (in-logged, not-logged)
- Billing: (subscription, invoice)
```

**Estrutura de Diretórios**:
```
project-root/
├── src/
│   ├── controllers/     # Camada de API
│   ├── services/        # Camada de lógica de negócio
│   └── models/          # Camada de acesso a dados
├── config/              # Arquivos de configuração
└── infrastructure/      # Deployment e infraestrutura
```

---

## Seção 3 — Métricas de Tamanho

> **Incluída em todos os modos de análise.**

Tabela com métricas quantitativas do codebase:

| Métrica | Valor |
| ------- | ----- |
| Total de arquivos de código-fonte | X |
| Arquivos de produção (excluindo testes) | Y |
| Arquivos de teste | Z |
| Linhas de código total (src/) | ~N |
| Linhas de código das features/módulos | ~M |
| Linhas de código de testes | ~T |

Quando relevante, inclua breakdown por módulo/feature/bounded context:

| Módulo/Feature | Arquivos | Linhas |
| -------------- | -------- | ------ |
| user/ | 12 | ~850 |
| gym/ | 8 | ~620 |

---

## Seção 4 — Análise de Componentes Críticos

> **Incluída nos modos: Arquitetura Macro, Auditoria Completa.**

Antes de apresentar a tabela, inclua parágrafo introdutório explicando:
- **Acoplamento Aferente (Ca)**: número de componentes externos que dependem deste componente (dependências de entrada). Alta Ca indica componente amplamente utilizado e de alto impacto.
- **Acoplamento Eferente (Ce)**: número de componentes externos dos quais este componente depende (dependências de saída). Alta Ce indica componente frágil e difícil de reutilizar.

Tabela de componentes — inclua **todos** os componentes significativos encontrados em módulos, features, bundles, packages, domains, subdomains:

| Componente | Tipo | Localização | Acoplamento Aferente | Acoplamento Eferente | Papel Arquitetural |
| ---------- | ---- | ----------- | -------------------- | -------------------- | ------------------ |
| UserService | Service | src/services/user.ts | 15 | 8 | Lógica de negócio principal |
| DatabaseManager | Infrastructure | src/db/manager.ts | 25 | 3 | Coordenação de acesso a dados |

> Cada projeto tem estrutura diferente — entenda o contexto para definir o que é um componente.

---

## Seção 5 — Mapeamento de Dependências

> **Incluída nos modos: Arquitetura Macro, Auditoria Completa.**

Representação visual e análise das dependências entre componentes:

```
Dependências de Alto Nível:
Controllers → Services → Repositories → Database
Controllers → APIs Externas
Services → Fila de Mensagens
```

Inclua:
- Direção do fluxo de dependências
- Ciclos de dependência (se existirem)
- Camadas arquiteturais e seus relacionamentos
- Componentes com alto acoplamento bidirecional

---

## Seção 6 — Pontos de Integração

> **Incluída nos modos: Arquitetura Macro, Auditoria Completa.**

Sistemas externos, APIs e integrações de terceiros.

**Ordenar por Nível de Risco: Crítico → Alto → Médio → Baixo**

| Integração | Tipo | Localização | Propósito | Nível de Risco |
| ---------- | ---- | ----------- | --------- | -------------- |
| Stripe API | API Externa | src/payment/stripe.ts | Processamento de pagamento | Alto |
| PostgreSQL | Banco de Dados | config/database.ts | Armazenamento primário | Médio |

---

## Seção 7 — Riscos Arquiteturais e Pontos Únicos de Falha

> **Incluída nos modos: Arquitetura Macro, Auditoria Completa.**

| Nível de Risco | Componente | Problema | Impacto | Detalhes |
| -------------- | ---------- | -------- | ------- | -------- |
| Crítico | AuthService | Ponto único de falha | Sistema inteiro | Toda autenticação depende de um único serviço |
| Alto | DatabaseConnection | Sem connection pooling | Performance | Conexões diretas podem causar gargalos |

---

## Seção 8 — Variáveis de Ambiente

> **Incluída nos modos: Arquitetura Macro, Auditoria Completa.**

Identificar sistematicamente **todas** as variáveis de ambiente declaradas em `.env` e `env-schema.ts`.

| Variável | Descrição | Usado Em | Escopo | Ativa | Nível de Risco | Notas |
| -------- | --------- | -------- | ------ | ----- | -------------- | ----- |
| `DATABASE_URL` | String de conexão ao PostgreSQL | `src/config/database.ts` | Production / Staging | Sim | Alto | Dependência core |
| `JWT_SECRET_KEY` | Chave secreta para tokens JWT | `src/auth/tokenService.ts` | Todos os ambientes | Sim | Crítico | Sensível |
| `REDIS_URL` | String de conexão Redis | `src/cache/index.ts` | Production | Não | Baixo | Candidato a remoção |

Inclua:
- Propósito funcional detalhado
- Escopo de uso (ambientes)
- Avaliação se está ativa ou obsoleta
- Nível de risco de segurança

---

## Seção 9 — Avaliação da Stack Tecnológica

> **Incluída nos modos: Arquitetura Macro, Auditoria Completa.**

Frameworks, bibliotecas e padrões arquiteturais em uso:

- **Frontend**: frameworks, UI libraries, state management
- **Backend**: runtime, frameworks, ORMs
- **Infraestrutura**: containerização, CI/CD, cloud providers
- **Testes**: frameworks, ferramentas de cobertura
- **Ferramentas de Build**: bundlers, transpiladores, linters
- **Padrões**: MVC, hexagonal, microservices, event-driven, etc.

Para cada item, indique versão quando disponível e relevância arquitetural.

---

## Seção 10 — Arquitetura de Segurança e Riscos

> **Incluída nos modos: Arquitetura Macro, Auditoria Completa.**

Riscos de segurança críticos e vulnerabilidades potenciais na arquitetura:

- Exposição de credenciais em código ou variáveis de ambiente
- Falta de autenticação/autorização em endpoints críticos
- Transmissão de dados sensíveis sem criptografia
- Dependências com vulnerabilidades conhecidas (CVEs)
- Ausência de validação de input / sanitização
- Configurações inseguras de CORS, CSRF, rate limiting
- Logs que expõem dados sensíveis
- Tokens ou chaves hardcoded

Formate como tabela ou lista priorizada por criticidade.

---

## Seção 11 — Análise de Infraestrutura

> **CONDICIONAL**: Inclua esta seção **APENAS** se existirem arquivos ou documentação de infraestrutura presentes (Dockerfile, docker-compose.yml, kubernetes/*.yaml, CI/CD configs, etc.). Caso contrário, **omita completamente**.
> **Incluída nos modos: Arquitetura Macro, Auditoria Completa.**

Quando presente, analise:
- Padrões de containerização (Docker, Kubernetes)
- Configurações de CI/CD
- Estratégias de deployment
- Escalabilidade horizontal/vertical
- Balanceamento de carga
- Estratégias de backup e recuperação

---

## Seção 12 — Código Morto

> **Incluída nos modos: Higiene Estrutural, Auditoria Completa.**

### Arquivos Completamente Mortos

Arquivos onde **nenhum export é importado** por outros arquivos do projeto.

| Arquivo | Linhas | Motivo | Confiança |
| ------- | ------ | ------ | --------- |
| `src/lib/auth/schemas.ts` | 34 | 8 exports, nenhum importado | ALTA |
| `src/components/ui/dialog.tsx` | 115 | 10 exports, nunca importado | ALTA |

**Total de Linhas**: X linhas podem ser deletadas

### Exports Mortos

Exports individuais que nunca são importados por outros arquivos.

| Arquivo | Export | Motivo |
| ------- | ------ | ------ |
| `src/features/admin/api/useUsers.ts` | `AdminUsersPagination` | Tipo exportado, nunca importado |

### Exports de Props Mortos (Baixa Prioridade)

Interfaces de Props exportadas mas usadas apenas internamente para anotação de tipos. Não são prejudiciais, mas são exports desnecessários:

| Arquivo | Export |
| ------- | ------ |
| `src/features/admin/components/UserRow.tsx` | `UserRowProps` |

### Possivelmente Mortos (Verificação Necessária)

Exports que possuem indicadores de desuso mas requerem verificação humana:

| Arquivo | Export | Motivo | Verificação Necessária |
| ------- | ------ | ------ | ---------------------- |
| `src/lib/api.ts` | `fetchOldApi()` | Usado apenas em código comentado | Confirmar se está deprecado |

### Código Interno Morto

Funções, variáveis ou blocos definidos dentro de um arquivo mas nunca utilizados (nem exportados):

- `src/services/user.ts:125` — Método privado `_validateLegacy()` nunca chamado
- `src/components/form.tsx:89` — Variável `tempData` atribuída mas nunca lida

---

## Seção 13 — Funcionalidade Duplicada

> **Incluída nos modos: Higiene Estrutural, Auditoria Completa.**
> **Limite ao top por severidade**. Consolide contagens em tabelas-resumo e liste detalhes completos apenas para achados Críticos e Altos.

### Crítico: Duplicatas Exatas

Código idêntico ou quase idêntico em múltiplos lugares.

```markdown
#### Grupo de Duplicação 1: Função `toApiError()`
**Instâncias**: 6
**Arquivos**:
- `src/features/auth/api/index.ts:14`
- `src/features/gyms/api/index.ts:17`

**Padrão**:
[bloco de código mostrando o padrão duplicado]

**Linhas Duplicadas**: ~36 linhas (6 x 6)
```

### Alto: Lógica Similar

Mesmo algoritmo com implementação ligeiramente diferente.

```markdown
#### Grupo de Duplicação N: Handlers de Mensagem de Erro
**Instâncias**: 8
**Padrão**: [descrição do padrão comum]
**Linhas Duplicadas**: ~70+ linhas
```

### Médio: Duplicação Conceitual

Múltiplas formas de fazer a mesma coisa, implementações concorrentes.

### Duplicação de Tipos

Mesma interface/tipo definido em múltiplos arquivos, tipos similares que deveriam ser unificados.

---

## Seção 14 — Anti-Padrões Arquiteturais

> **Incluída nos modos: Higiene Estrutural, Auditoria Completa.**

Analise e reporte cada categoria abaixo. Se não houver achados em uma categoria, reporte explicitamente como positivo (ex: "Sem Dependências Circulares ✓").

### God Objects

Arquivos ou classes com responsabilidades excessivas (muitas linhas, muitos métodos, muitas dependências).

| Arquivo | Linhas | Responsabilidades | Problema |
| ------- | ------ | ----------------- | -------- |

### Dependências Circulares

Ciclos de importação entre módulos.

### Violações de Camada

Componentes que importam de camadas que não deveriam acessar diretamente.

### Acoplamento Forte

Módulos com dependências bidirecionais excessivas ou URLs/configurações hardcoded.

### Type Assertions Inseguros

Type assertions que contornam o sistema de tipos, especialmente double casts (`as unknown as T`).

| Arquivo | Linha | Asserção | Motivo |
| ------- | ----- | -------- | ------ |

---

## Seção 15 — Problemas de Tipagem

> **Incluída nos modos: Higiene Estrutural, Auditoria Completa.**

### Uso de `any`

| Arquivo | Linha | Contexto | Severidade |
| ------- | ----- | -------- | ---------- |

**Total de usos de `any`**: X

### Type Assertions

| Arquivo | Linha | Asserção | Problema |
| ------- | ----- | -------- | -------- |

### @ts-ignore / @ts-expect-error

| Arquivo | Linha | Motivo | Deveria Corrigir |
| ------- | ----- | ------ | ---------------- |

### Supressões de Linter (biome-ignore, eslint-disable)

| Arquivo | Linha | Regra | Justificativa |
| ------- | ----- | ----- | ------------- |

### Uso de `unknown`

Quando apropriado, apenas listar para referência. Uso de `unknown` com type guards adequados é aceitável.

---

## Seção 16 — Code Smells

> **Incluída nos modos: Higiene Estrutural, Auditoria Completa.**
> Trate thresholds como heurísticas contextuais. Considere o framework e padrões do projeto.

### Componentes/Funções Longas

| Arquivo | Linhas | Problema |
| ------- | ------ | -------- |
| `src/app/subscription/page.tsx` | 323 | Hook inline `useSubscriptionFlow()` |

### Funções Utilitárias Inline

Funções que deveriam estar em módulos compartilhados mas estão definidas dentro de componentes/páginas:

| Função | Localização Atual | Localização Sugerida |
| ------ | ----------------- | -------------------- |

### Números Mágicos

| Localização | Valor | Deveria Ser |
| ----------- | ----- | ----------- |
| `src/page.tsx:59` | `409` | Constante `HTTP_CONFLICT` |

### Condicionais Complexos

Condicionais com aninhamento profundo (3+ níveis) ou expressões booleanas extensas.

### Código Comentado

Blocos de código comentado que deveriam ser removidos (usar histórico do git).

---

## Seção 17 — Estatísticas Consolidadas

> **Incluída em todos os modos. Adapte as categorias ao modo executado.**

| Categoria | Quantidade |
| --------- | ---------- |
| **Código Morto** | |
| — Arquivos completamente mortos | X (Y linhas) |
| — Exports mortos | Z |
| — Exports possivelmente mortos | W |
| **Duplicação** | |
| — Grupos de duplicação | X |
| — Arquivos afetados | Y |
| — Linhas duplicadas | ~Z |
| **Problemas Arquiteturais** | |
| — God objects | X |
| — Dependências circulares | Y |
| — Violações de camada | Z |
| — Type assertions inseguros | W |
| **Problemas de Tipagem** | |
| — Uso de `any` | X |
| — @ts-ignore / @ts-expect-error | Y |
| — Supressões de linter | Z |
| **Code Smells** | |
| — Componentes/funções longas | X |
| — Funções utilitárias inline | Y |
| — Números mágicos | Z |
| — Código comentado | W |

---

## Seção 18 — Avaliação de Impacto

> **Incluída em todos os modos. Adapte ao escopo analisado.**

### Potencial de Limpeza

- **Remoção de código morto**: ~X linhas (arquivos completos) + ~Y linhas (exports mortos)
- **Consolidação de duplicação**: ~Z linhas → ~W linhas de utilitários compartilhados
- **Redução total**: ~N linhas (~P% da codebase de produção)

### Melhoria de Manutenibilidade

- Quais consolidações trazem maior benefício (ex: "Correções de bug em 1 lugar em vez de 6")
- Reutilizabilidade de utilitários extraídos
- Testabilidade independente dos componentes

### Áreas de Risco

- Dependências que bloqueiam limpeza (ex: "depende de atualização do spec OpenAPI")
- Componentes que podem crescer sem disciplina de extração

---

## Seção 19 — Achados Positivos

> **Incluída em todos os modos.**

Liste as boas práticas encontradas no codebase. Achados positivos provêm contexto e equilibram o relatório.

Exemplo:
```markdown
1. **Zero dependências circulares** entre módulos de feature
2. **Separação de camadas adequada** — pages → features → lib
3. **API client type-safe** com integração OpenAPI
4. **Zero uso de `any`** no código de produção
5. **Cobertura de testes limpa** — arquivos de teste separados para cada módulo
```

---

## Seção 20 — Priorização de Achados

> **Incluída em todos os modos.**
> Esta seção organiza os achados por urgência. Não constitui recomendação de implementação — apenas prioriza o que foi encontrado pela análise para facilitar decisões.

### 1. Imediato (Alto Impacto, Baixo Esforço)

Lista dos achados mais urgentes e com menor custo de resolução.

```markdown
- Deletar `src/lib/auth/schemas.ts` — 34 linhas de código completamente morto
- Extrair `toApiError()` para módulo compartilhado (6 duplicatas → 1)
```

### 2. Curto Prazo (Impacto Médio)

Achados que requerem mais esforço mas trazem benefício significativo.

### 3. Longo Prazo (Nice-to-have)

Achados de baixa prioridade ou que dependem de outras mudanças.

---

## Instruções para Geração do Relatório

1. **Systematize antes de escrever**: realize toda a análise antes de gerar o relatório
2. **Adapte ao modo**: inclua apenas as seções correspondentes ao modo de análise ativo
3. **Caminhos relativos**: sempre use caminhos relativos ao referenciar arquivos
4. **Coupling intro obrigatória**: antes da tabela da Seção 4, explique Ca e Ce em parágrafo
5. **Ordenação de risco**: nas seções de integração e riscos, ordene de Crítico → Baixo
6. **Infraestrutura condicional**: Seção 11 só aparece se houver evidência de arquivos de infra
7. **Limite detalhamento**: em seções de dead code, duplicação e smells, limite aos top achados por severidade
8. **Sem modificações**: nunca crie ou edite arquivos do projeto durante a análise
9. **Salvar relatório**: usar a tool de escrita de arquivo para salvar em `/docs/agents/architectural-analyzer/`
10. **Notificar**: após salvar, informar ao agente principal o caminho relativo do arquivo
