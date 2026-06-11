# ADR006 — Publicar Eventos de Bloqueio no RabbitMQ em Modo Best-Effort

- Status: Aceito
- Data: 03/05/2026
- Autor: Caique Moraes

---

## Decisão

Eventos de bloqueio por rate limiting serão publicados no RabbitMQ (exchange `rateLimitExceeded`) de forma best-effort: erros de publicação serão capturados e logados sem propagar exceção ou impactar a resposta HTTP 429.

## Contexto

O PRD exige rastreabilidade de bloqueios (RF-12, RF-13): cada requisição bloqueada deve ser logada e publicada como evento no RabbitMQ para auditoria assíncrona. O plugin `@fastify/rate-limit` oferece o callback `onExceeded`, executado quando uma request excede o limite.

O RabbitMQ já é parte da infraestrutura do projeto, com a interface `Queue` e exchanges definidos em `EXCHANGES`. O `GlobalErrorHandler` já publica erros no exchange `log`.

A questão é: o que acontece se o RabbitMQ estiver indisponível no momento do bloqueio? Durante ataques de alto volume, a publicação de um evento por request bloqueada pode gerar pressão significativa na fila.

## Opções Consideradas

- **Opção 1 (SELECIONADA)** — Publicação best-effort com isolamento de falha
  - Prós: o bloqueio HTTP 429 sempre é retornado independentemente do estado do RabbitMQ; falhas de publicação são logadas localmente sem impactar o tempo de resposta; simplicidade de implementação (try/catch no callback `onExceeded`); alinhado com o padrão existente do `GlobalErrorHandler.publish()`
  - Contras: eventos de bloqueio podem ser perdidos durante indisponibilidade do RabbitMQ; sem garantia de entrega para auditoria

- **Opção 2** — Publicação garantida (com retry e persistência local)
  - Prós: nenhum evento de bloqueio é perdido; auditoria completa
  - Contras: complexidade significativa (fila local de retry, persistência em disco, dead-letter queue); latência adicional no path de resposta 429; durante ataques, o volume de retries pode agravar problemas de infraestrutura

- **Opção 3** — Apenas logging, sem publicação no RabbitMQ
  - Prós: zero dependência de messaging no path de rate limiting; máxima simplicidade
  - Contras: viola RF-13 do PRD que exige publicação de eventos no sistema de mensageria; impede consumers externos (alertas, SIEM, dashboards)

## Consequências

- Positivo: resposta HTTP 429 nunca é impactada por falhas do RabbitMQ
- Positivo: logging local garante rastreabilidade mínima mesmo sem RabbitMQ
- Positivo: novo exchange `rateLimitExceeded` permite consumers de alerta e auditoria
- Positivo: padrão consistente com o `GlobalErrorHandler.publish()` existente
- Negativo: eventos podem ser perdidos durante indisponibilidade do RabbitMQ (mitigação: logging local como fallback; monitoramento de saúde do RabbitMQ)
- Negativo: durante ataques de alto volume, cada request bloqueada gera uma publicação (mitigação futura: implementar sampling ou debounce se necessário)
