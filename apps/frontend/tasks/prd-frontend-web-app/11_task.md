# Tarefa 11.0: F7 — Polimento de feedback global

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Auditar e garantir que todos os estados de loading, vazio e erro estão cobertos em todas as telas. Implementar error boundaries por route group, toasts globais (Sonner), `lib/observability.ts` com Web Vitals e registro dos eventos do auth-store.

<skills>
### Conformidade com Skills Padrões

- `no-workarounds` — tratar causas reais de erro; não suprimir com try/catch genérico
- `test-antipatterns` — testar comportamento dos estados de UI com MSW; não mockar componentes
- `vercel-react-best-practices` — error boundaries e `error.tsx` do App Router
</skills>

<requirements>
- `error.tsx` criado em cada route group (`(public)` e `(authenticated)`) como error boundary do App Router (RF-24)
- Todos os `useQuery` têm skeleton durante loading (RF-23)
- Todas as listas têm `EmptyState` explícito (RF-25)
- Toast global (Sonner) disparado para: sucesso de mutações, erros de rede/backend, logout forçado
- `src/lib/observability.ts` com `reportWebVitals` encaminhando para `console` (hook isolado)
- Auth-store emite eventos (`login`, `refresh`, `logout`, `forced-logout`) em um `EventTarget` interno
- `NEXT_PUBLIC_LOG_LEVEL` controla verbosidade dos logs de desenvolvimento
</requirements>

## Subtarefas

- [ ] 11.1 Criar `src/app/(public)/error.tsx` e `src/app/(authenticated)/error.tsx` com UI amigável e botão "Tentar novamente"
- [ ] 11.2 Auditar todas as telas das tasks 5.0 a 10.0: confirmar Skeleton em cada query, EmptyState em cada lista
- [ ] 11.3 Padronizar disparo de toasts Sonner nas mutations de sucesso e erro (centralizar em helper se necessário)
- [ ] 11.4 Criar `src/lib/observability.ts` com `reportWebVitals` e suporte a `NEXT_PUBLIC_LOG_LEVEL`
- [ ] 11.5 Evoluir `auth-store.ts` para emitir eventos `login`, `refresh`, `logout`, `forced-logout` em `EventTarget` interno
- [ ] 11.6 Adicionar `reportWebVitals` em `next.config.ts` ou no layout raiz, delegando para `observability.ts`

## Detalhes de Implementação

Ver `techspec.md` → seção **Monitoramento e Observabilidade**, **Abordagem de Testes** (estados de loading/empty/error) e `prd.md` → **F7. Tratamento de erros e feedback** (RF-23 a RF-25).

## Critérios de Sucesso

- Nenhuma tela exibe texto branco/vazio durante carregamento
- Nenhuma lista fica silenciosamente vazia — sempre mostra `EmptyState`
- Erros de rede exibem toast com mensagem amigável em PT-BR
- Error boundary exibe UI de fallback em vez de tela branca ao lançar exceção
- Auth-store dispara eventos capturáveis via `addEventListener`
- `NEXT_PUBLIC_LOG_LEVEL=debug` exibe logs detalhados no console

## Testes da Tarefa

- [ ] Teste de integração: error boundary captura exceção lançada por componente filho e exibe UI de fallback
- [ ] Teste de integração: query com erro de rede exibe toast amigável
- [ ] Teste de unidade: auth-store dispara evento `login` após `setSession` e `logout` após `clear`
- [ ] Teste de unidade: `observability.ts` chama `console.debug` quando `LOG_LEVEL=debug`
- [ ] Auditoria manual: percorrer todas as telas e confirmar Skeleton + EmptyState presentes

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- `apps/frontend/src/app/(public)/error.tsx`
- `apps/frontend/src/app/(authenticated)/error.tsx`
- `apps/frontend/src/lib/observability.ts`
- `apps/frontend/src/lib/auth/auth-store.ts`
- `apps/frontend/next.config.ts`
