# Tarefa 9.0: F5 — Assinatura demo

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Implementar a tela de assinatura premium no modo demonstrativo (sem cobrança real), que dispara `POST /subscriptions` e exibe o resultado retornado pelo backend com aviso explícito de que não há cobrança.

<skills>
### Conformidade com Skills Padrões

- `tanstack-query-best-practices` — mutation de assinatura sem retry automático
- `typescript-advanced` — tipos derivados de `paths` para `/subscriptions`
- `test-antipatterns` — MSW para mockar a resposta de `/subscriptions`
</skills>

<requirements>
- Tela `/assinatura`: descreve o plano premium e exibe aviso explícito de fluxo demonstrativo (sem cobrança) (RF-20)
- Botão "Assinar" dispara `POST /subscriptions` e exibe resultado retornado (RF-19)
- Estado de loading no botão durante a chamada
- Resposta de sucesso exibe confirmação (ex: id da subscription criada)
- Erro exibido em mensagem amigável
- Mutation sem retry automático
</requirements>

## Subtarefas

- [x] 9.1 Criar `src/features/subscriptions/api/useCreateSubscription.ts` (POST /subscriptions, retry: 0)
- [x] 9.2 Criar `src/app/(authenticated)/assinatura/page.tsx` com descrição do plano, aviso de demo e botão de assinatura
- [x] 9.3 Exibir confirmação com dados retornados pelo backend após sucesso
- [x] 9.4 Exibir mensagem amigável em caso de erro
- [x] 9.5 Adicionar handler MSW: `POST /subscriptions`

## Detalhes de Implementação

Ver `techspec.md` → seção **Endpoints de API** (RF-19, RF-20) e `prd.md` → **F5. Assinatura (Stripe fictício)**.

## Critérios de Sucesso

- Aviso de "fluxo demonstrativo / sem cobrança" visível na tela antes do clique
- Botão exibe loading durante a chamada
- Sucesso exibe dados da subscription (mínimo: id)
- Erro exibe mensagem amigável
- Mutation não é retentada automaticamente

## Testes da Tarefa

- [x] Teste de unidade: `useCreateSubscription` tem `retry: 0` configurado
- [x] Teste de integração: botão "Assinar" exibe loading e confirmação após resposta MSW de sucesso
- [x] Teste de integração: erro em `/subscriptions` exibe mensagem amigável
- [x] Teste de integração: aviso de demo está visível na página sem interação do usuário

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- `apps/frontend/src/features/subscriptions/api/useCreateSubscription.ts`
- `apps/frontend/src/app/(authenticated)/assinatura/page.tsx`
- `apps/frontend/src/test/msw/handlers.ts`
