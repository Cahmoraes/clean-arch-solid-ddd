# Tarefa 8.0: Script de exportação de spec

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Criar script npm que inicializa o servidor Fastify, extrai a spec OpenAPI completa via `fastify.swagger()` e persiste como arquivo JSON estático. Este arquivo será consumido pelos testes de contrato e pela geração de client.

<skills>
### Conformidade com Skills Padrões

- **no-workarounds** — Script real que inicializa servidor e extrai spec, não hardcode
- **typescript-advanced** — Tipagem correta para o script
</skills>

<requirements>
- Criar `scripts/export-openapi-spec.ts`
- O script deve inicializar o servidor Fastify (sem listen), registrar todas as rotas, extrair spec via `fastify.swagger()`
- A spec deve ser salva como arquivo JSON em path configurável (default: `docs/openapi-spec.json`)
- Adicionar script npm: `"openapi:export": "tsx scripts/export-openapi-spec.ts"`
- O script deve validar que a spec gerada contém todos os 19 endpoints esperados
- O script deve imprimir mensagem de sucesso com path do arquivo gerado
</requirements>

## Subtarefas

- [ ] 8.1 Criar `scripts/export-openapi-spec.ts` com lógica de inicialização do servidor
- [ ] 8.2 Implementar extração da spec via `fastify.swagger()` após ready
- [ ] 8.3 Implementar persistência como JSON formatado
- [ ] 8.4 Adicionar validação de completude (contar endpoints na spec)
- [ ] 8.5 Adicionar script npm no `package.json`
- [ ] 8.6 Executar script e verificar output
- [ ] 8.7 Adicionar `docs/openapi-spec.json` ao `.gitignore` (artefato gerado)
- [ ] 8.8 Executar `pnpm tsc:check` e `pnpm biome:fix`

## Detalhes de Implementação

Consultar seções da techspec.md:
- "Sequenciamento de Desenvolvimento > Ordem de Construção" — etapa 6
- "Arquivos relevantes e dependentes > Novos arquivos a criar" — `scripts/export-openapi-spec.ts`
- "Pontos de Integração" — `@fastify/swagger` gerencia endpoint `/documentation/json`

## Critérios de Sucesso

- `pnpm openapi:export` executa sem erros
- Arquivo `docs/openapi-spec.json` é gerado com spec OpenAPI 3.0 válida
- Spec contém todos os 19 endpoints documentados
- Spec contém securitySchemes, tags e metadata
- `pnpm tsc:check` passa sem erros

## Testes da Tarefa

- [ ] Testes de unidade: Não aplicável (script de infraestrutura)
- [ ] Testes de integração: Executar script e validar output JSON gerado
- [ ] Verificação: Validar spec gerada com ferramenta online (Swagger Editor) ou `swagger-cli validate`

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- `scripts/export-openapi-spec.ts` (criar)
- `package.json` (adicionar script)
- `docs/openapi-spec.json` (output gerado)
- `.gitignore` (adicionar artefato)
