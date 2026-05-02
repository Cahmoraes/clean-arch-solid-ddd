# Review: Task 11.0 - F7 — Polimento de feedback global

**Revisor**: AI Code Reviewer
**Data**: 2025-11-19
**Arquivo da task**: 11_task.md
**Status**: APROVADO

## Resumo

Implementação focada e cirúrgica do polimento global de feedback. Foram criados error boundaries por route group (`(public)/error.tsx` e `(authenticated)/error.tsx`) com UI amigável e botão "Tentar novamente"; criado `lib/observability.ts` com logger filtrado por `NEXT_PUBLIC_LOG_LEVEL` e `reportWebVitals` integrado via `useReportWebVitals` do Next em um componente cliente (`web-vitals.tsx`) montado no root layout; o `auth-store` passou a expor um `EventTarget` interno (`authEvents`) emitindo `login | refresh | logout | forced-logout`, com `setSession`/`clear` aceitando parâmetro de "kind" sem quebrar callers existentes; consumidores internos (`token-refresh`, `auth-fetch-middleware`, `api`) foram atualizados para sinalizar `forced-logout`/`refresh` corretamente. Auditoria das telas das tasks 5–10 confirmou Skeleton em todas as queries e EmptyState em todas as listas (já implementados pelas tasks anteriores). Toda a suíte (180 testes) e o `tsc --noEmit`/`biome check` passam sem warnings.

## Arquivos Revisados

| Arquivo | Status | Problemas |
|---------|--------|-----------|
| `src/lib/observability.ts` | ✅ OK | 0 |
| `src/lib/observability.test.ts` | ✅ OK | 0 |
| `src/lib/auth/auth-store.ts` | ✅ OK | 0 |
| `src/lib/auth/auth-store.test.ts` | ✅ OK | 0 |
| `src/lib/auth/token-refresh.ts` | ✅ OK | 0 |
| `src/lib/auth/auth-fetch-middleware.ts` | ✅ OK | 0 |
| `src/lib/api.ts` | ✅ OK | 0 |
| `src/app/(public)/error.tsx` | ✅ OK | 0 |
| `src/app/(public)/error.test.tsx` | ✅ OK | 0 |
| `src/app/(authenticated)/error.tsx` | ✅ OK | 0 |
| `src/app/(authenticated)/error.test.tsx` | ✅ OK | 0 |
| `src/app/web-vitals.tsx` | ✅ OK | 0 |
| `src/app/layout.tsx` | ✅ OK | 0 |

## Problemas Encontrados

### 🔴 Problemas Críticos

Nenhum problema crítico encontrado.

### 🟡 Problemas Major

Nenhum problema major encontrado.

### 🟢 Problemas Minor

1. **`src/lib/observability.ts`** — o sink de Web Vitals é mutável via módulo (`activeSink`). Funciona para o escopo atual (single root layout) mas dificulta isolamento em testes paralelos. Caso a equipe avance para um APM real, considerar trocar pelo padrão "factory + injection" no layout. Não bloqueia.
2. **`src/app/web-vitals.tsx`** — usa `as { rating?: string }` para extrair `rating` do tipo `Metric` do Next porque `rating` está presente apenas em métricas core (CLS/LCP/INP) e ausente em custom metrics. Aceitável, mas se desejar tipagem mais forte, fazer narrowing por `metric.name`.
3. **`src/lib/auth/auth-store.ts`** — `authEvents` é um `EventTarget` global de módulo. O `setup.ts` de testes não remove listeners entre testes; testes adicionados removem manualmente. Considerar adicionar utilitário `clearAuthListeners()` no futuro para evitar leaks em suítes maiores. Não bloqueia.

## ✅ Destaques Positivos

- **Mudança não-disruptiva no auth-store**: `setSession`/`clear` ganharam um parâmetro opcional `kind`, mantendo retrocompatibilidade total com 100% dos callers existentes (login mutation, logout mutation, scheduler, middleware) — apenas os pontos relevantes foram atualizados para emitir `refresh`/`forced-logout`.
- **Separação cliente/servidor correta**: `WebVitalsReporter` é um componente `"use client"` isolado, mantendo o `RootLayout` como server component sem regressões.
- **Logger com hierarquia de níveis e fallback seguro**: `silent` desabilita até `error`; nível desconhecido cai em `info`; sink de Web Vitals encapsulado em try/catch para não derrubar a página caso o APM externo falhe.
- **Error boundaries acessíveis**: `role="alert"`, `aria-labelledby`, `aria-label` no botão de retry, mensagens em PT-BR alinhadas ao tom do design system.
- **Testes cobrindo cada subtask**: 6 testes para `observability` (níveis, defaults, sinks), 4 novos testes para eventos do auth-store (login/refresh/logout/forced-logout) e 2 testes por error boundary (render + retry).
- **Auditoria 11.2 sem deltas**: as telas de check-ins, perfil, admin, academias, assinatura já tinham Skeleton + EmptyState bem padronizados — confirmação documental sem refatoração desnecessária, respeitando o escopo de "polimento".

## Conformidade com Padrões

| Padrão | Status |
|--------|--------|
| Padrões de Código | ✅ |
| TypeScript/Node.js | ✅ |
| React | ✅ |
| Testes | ✅ |

## Recomendações

1. (Opcional) Em iteração futura, encapsular `authEvents` num hook `useAuthEvent(type, handler)` para componentes que queiram reagir a `forced-logout` (ex.: invalidar caches do React Query).
2. (Opcional) Quando definirem o destino real de Web Vitals (Datadog/Vercel Analytics), substituir o `setWebVitalSink` no `WebVitalsReporter` em vez de logar no console.
3. (Opcional) Adicionar um helper `clearAuthListeners()` exportado para o `setup.ts` global de testes evitar ruído acumulado.

## Veredito

Implementação **APROVADA**. Todos os critérios de sucesso da task 11.0 foram atendidos: error boundaries renderizam UI amigável, todas as queries têm Skeleton e todas as listas têm EmptyState, toasts globais cobrem mutações e logout forçado, `observability.ts` filtra logs por `NEXT_PUBLIC_LOG_LEVEL` e encaminha Web Vitals, e o auth-store dispara eventos capturáveis via `addEventListener`. Lint, typecheck e suíte de 180 testes passam. Pronto para seguir à task 12.0.
