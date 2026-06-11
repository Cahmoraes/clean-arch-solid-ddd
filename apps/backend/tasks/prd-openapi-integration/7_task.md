# Tarefa 7.0: ResponseValidationHook

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Implementar o hook Fastify `onSend` que valida responses contra os schemas OpenAPI definidos em ambiente de desenvolvimento. O hook emite warnings no log quando um response diverge do schema documentado, sem bloquear a resposta. Desenvolvimento com TDD.

<skills>
### Conformidade com Skills Padrões

- **tdd** — Implementar com ciclo red-green-refactor
- **no-workarounds** — Validação real contra schema, não checks superficiais
- **test-antipatterns** — Testes verificam comportamento (log gerado/não gerado), não internals
- **typescript-advanced** — Tipagem correta do hook Fastify
</skills>

<requirements>
- Criar `src/shared/infra/server/hooks/response-validation-hook.ts`
- O hook deve ser registrado apenas em ambiente de desenvolvimento (NODE_ENV !== 'production')
- O hook deve interceptar responses via `onSend` e validar contra o schema da rota
- Responses não-conformes devem gerar warning via Logger existente (nível WARN)
- O hook NÃO deve bloquear ou modificar o response (apenas log)
- A validação deve ser configurável (ativável/desativável via variável de ambiente)
- Performance: validação não deve impactar significativamente o tempo de resposta
</requirements>

## Subtarefas

- [x] 7.1 Criar arquivo de teste `src/shared/infra/server/hooks/response-validation-hook.test.ts` (RED)
- [x] 7.2 Implementar `ResponseValidationHook` com registro no Fastify (GREEN)
- [x] 7.3 Implementar lógica de validação do response body contra schema da rota
- [x] 7.4 Adicionar logging de warnings quando response não conforma ao schema
- [x] 7.5 Adicionar guard de ambiente (apenas DEV) e configurabilidade
- [x] 7.6 Registrar hook no `FastifyAdapter` condicionalmente
- [x] 7.7 Refatorar para clareza (REFACTOR)
- [x] 7.8 Executar `pnpm tsc:check`, `pnpm biome:fix` e `pnpm test:run`

## Detalhes de Implementação

Consultar seções da techspec.md:
- "Design de Implementação > Interfaces Principais" — interface `ResponseValidationHook`
- "Monitoramento e Observabilidade" — logs de validação em DEV
- "Considerações Técnicas > Decisões Principais" — hook onSend para validação
- "Abordagem de Testes > Testes Unitários > ResponseValidationHook"

## Critérios de Sucesso

- Hook registrado corretamente no Fastify apenas em DEV
- Responses válidos não geram log
- Responses inválidos geram warning com detalhes do erro de validação
- Hook não bloqueia nem modifica responses
- Sem impacto em produção (hook não registrado)
- `pnpm tsc:check` e `pnpm test:run` passam a 100%

## Testes da Tarefa

- [x] Testes de unidade:
  - Response válido não gera warning
  - Response com campo faltando gera warning
  - Response com tipo incorreto gera warning
  - Hook não é registrado em produção
  - Hook não modifica o response
  - Hook é desativável via configuração
- [x] Testes de integração: Verificar hook funcionando com servidor Fastify em memória

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- `src/shared/infra/server/hooks/response-validation-hook.ts` (criar)
- `src/shared/infra/server/hooks/response-validation-hook.test.ts` (criar)
- `src/shared/infra/server/fastify-adapter.ts` (modificar)
- `src/shared/infra/env/index.ts` (verificar variáveis de ambiente)
