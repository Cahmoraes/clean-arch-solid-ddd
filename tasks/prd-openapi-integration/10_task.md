# Tarefa 10.0: Geração de client tipado

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Configurar a geração automática de tipos TypeScript e client HTTP tipado a partir da spec OpenAPI usando `openapi-typescript` + `openapi-fetch`. Criar scripts npm para geração e documentar o uso do client gerado.

<skills>
### Conformidade com Skills Padrões

- **typescript-advanced** — Types gerados com inferência completa
- **no-workarounds** — Geração automática de types, não manual
</skills>

<requirements>
- Criar `scripts/generate-client.ts` que executa `openapi-typescript` para gerar types
- Types gerados em `src/shared/infra/openapi/generated/api-types.d.ts`
- Adicionar script npm: `"openapi:generate-client": "tsx scripts/generate-client.ts"`
- Adicionar diretório `generated/` ao `.gitignore` (artefato gerado)
- Atualizar `tsconfig.json` para incluir diretório de types gerados
- Documentar uso do client com `openapi-fetch` em README ou doc dedicado
- Client gerado deve incluir tipos de request/response inferidos da spec
</requirements>

## Subtarefas

- [ ] 10.1 Criar `scripts/generate-client.ts` que executa `openapi-typescript` sobre a spec JSON
- [ ] 10.2 Configurar output para `src/shared/infra/openapi/generated/api-types.d.ts`
- [ ] 10.3 Adicionar script npm no `package.json`
- [ ] 10.4 Atualizar `tsconfig.json` para incluir types gerados
- [ ] 10.5 Criar exemplo de uso com `openapi-fetch` em `docs/openapi-client-usage.md`
- [ ] 10.6 Executar script e verificar types gerados
- [ ] 10.7 Verificar que types refletem corretamente os endpoints da API
- [ ] 10.8 Executar `pnpm tsc:check` e `pnpm biome:fix`

## Detalhes de Implementação

Consultar seções da techspec.md:
- "Pontos de Integração > openapi-typescript + openapi-fetch" — fluxo e saída
- "Sequenciamento de Desenvolvimento > Ordem de Construção" — etapa 8
- "Arquivos relevantes e dependentes > Novos arquivos a criar"

## Critérios de Sucesso

- `pnpm openapi:generate-client` executa sem erros
- Arquivo `api-types.d.ts` é gerado com tipos para todos os 19 endpoints
- Tipos incluem request body, response body, params e query para cada endpoint
- `pnpm tsc:check` passa com os types gerados
- Exemplo de uso com `openapi-fetch` compila corretamente

## Testes da Tarefa

- [ ] Testes de unidade: Não aplicável (script de geração)
- [ ] Verificação: Executar script e inspecionar types gerados
- [ ] Validação de tipo: Escrever snippet de exemplo que use os types e verificar compilação

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- `scripts/generate-client.ts` (criar)
- `src/shared/infra/openapi/generated/api-types.d.ts` (output gerado)
- `docs/openapi-client-usage.md` (criar — documentação de uso)
- `package.json` (adicionar script)
- `tsconfig.json` (incluir generated)
