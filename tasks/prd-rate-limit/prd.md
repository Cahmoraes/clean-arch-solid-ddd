# PRD — Rate Limiting no Backend

## Visão Geral

O backend expõe endpoints HTTP protegidos por JWT e endpoints públicos de autenticação sem qualquer mecanismo de controle de taxa. Isso o torna vulnerável a ataques de força bruta, enumeração de credenciais e consumo abusivo de recursos.

Este PRD define os requisitos para reintroduzir o rate limiting no backend Fastify de forma compatível com o ambiente de testes automatizados, usando Redis como armazenamento de estado distribuído e diferenciando limites por tipo de rota e identidade do requisitante.

## Objetivos

- Proteger endpoints de autenticação contra ataques de força bruta e credential stuffing
- Proteger todas as rotas contra consumo abusivo de recursos por clientes maliciosos ou com bug
- Manter compatibilidade total com os testes automatizados (unit, integration, e2e)
- Garantir rastreabilidade de bloqueios via logs e publicação de eventos no RabbitMQ
- Admins devem ter limites diferenciados, refletindo seu papel operacional no sistema

## Histórias de Usuário

- Como **usuário final**, eu quero que o sistema continue responsivo mesmo sob alta carga, para que minha experiência não seja degradada por abusos de outros clientes.
- Como **usuário final**, ao ser bloqueado por excesso de requisições, eu quero saber quando poderei tentar novamente, para que não fique tentando indefinidamente.
- Como **operador/administrador**, eu quero ter limites de taxa maiores do que usuários comuns, para que operações administrativas legítimas não sejam interrompidas por rate limiting.
- Como **desenvolvedor**, eu quero que o rate limit seja desabilitado automaticamente em ambiente de testes, para que os testes automatizados não sejam afetados pela proteção.
- Como **engenheiro de segurança**, eu quero que tentativas bloqueadas sejam logadas e publicadas como eventos no sistema de mensageria, para que seja possível detectar padrões de ataque.

## Funcionalidades Principais

### 1. Controle de Taxa por Tipo de Rota

O sistema deve aplicar limites distintos conforme o grupo de rota:

- **Rotas de autenticação** (login, registro, refresh de token, recuperação de senha): limite mais restritivo para mitigar ataques de força bruta.
- **Demais rotas** (recursos protegidos e públicos não relacionados a autenticação): limite moderado para proteger disponibilidade.

**Por que é importante**: Rotas de autenticação são o principal alvo de ataques automatizados. Diferenciá-las permite proteção efetiva sem impactar a usabilidade normal da API.

**Requisitos funcionais**:
- RF-01: O sistema DEVE aplicar um limite de 20 requisições a cada 15 minutos para rotas de autenticação.
- RF-02: O sistema DEVE aplicar um limite de 100 requisições a cada 15 minutos para as demais rotas.
- RF-03: O sistema DEVE retornar HTTP 429 (Too Many Requests) quando o limite for excedido.
- RF-04: A resposta HTTP 429 DEVE incluir os headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining` e `X-RateLimit-Reset`.

### 2. Granularidade por Identidade do Requisitante

O contador de taxa deve ser individualizado por identidade para que o bloqueio de um cliente não afete outros.

**Requisitos funcionais**:
- RF-05: Para rotas públicas (não autenticadas), o limite DEVE ser contado por IP do cliente.
- RF-06: Para rotas autenticadas, o limite DEVE ser contado por identificador único do usuário autenticado.
- RF-07: Usuários administradores DEVEM ter limites de taxa diferenciados (maiores) em relação a usuários comuns.

### 3. Armazenamento Distribuído via Redis

Os contadores de taxa devem persistir no Redis, que já é parte da infraestrutura do projeto.

**Por que é importante**: Permite que múltiplas instâncias do servidor compartilhem o mesmo estado de rate limiting, garantindo consistência horizontal.

**Requisitos funcionais**:
- RF-08: O estado dos contadores de taxa DEVE ser armazenado no Redis.
- RF-09: As chaves Redis para rate limiting DEVEM ter TTL automático alinhado à janela de tempo configurada.

### 4. Compatibilidade com Ambiente de Testes

O rate limiting não deve interferir nos testes automatizados.

**Requisitos funcionais**:
- RF-10: O rate limiting DEVE ser desabilitado quando a variável de ambiente indicar ambiente de testes (`NODE_ENV=test` ou equivalente já usado no projeto).
- RF-11: A desabilitação em testes DEVE ser transparente — sem necessidade de configuração adicional nos arquivos de teste.

### 5. Rastreabilidade de Bloqueios

Tentativas bloqueadas devem gerar evidências para análise de segurança.

**Requisitos funcionais**:
- RF-12: O sistema DEVE registrar em log cada requisição bloqueada, incluindo: IP de origem, rota acessada, identificador do usuário (quando disponível) e timestamp.
- RF-13: O sistema DEVE publicar um evento no sistema de mensageria (RabbitMQ) para cada bloqueio, permitindo alertas e auditoria assíncrona.

## Experiência do Usuário

**Clientes da API (desenvolvedores e aplicações)**:
- Ao receber HTTP 429, o cliente deve conseguir determinar exatamente quando poderá tentar novamente via header `X-RateLimit-Reset` (timestamp Unix ou duração em segundos).
- O header `X-RateLimit-Remaining` deve permitir ao cliente adaptar seu comportamento antes de ser bloqueado.
- A mensagem de erro no corpo da resposta deve ser clara: indicar que o limite foi excedido e orientar sobre o retry.

**Usuários finais via frontend**:
- A interface deve tratar HTTP 429 exibindo uma mensagem amigável ao usuário (fora do escopo deste PRD, mas a API deve fornecer informações suficientes para isso).

**Administradores**:
- Devem perceber o rate limiting apenas em cenários excepcionais de uso muito intenso, dado que seus limites são maiores.

## Restrições Técnicas de Alto Nível

- O backend usa Fastify como framework HTTP; a solução deve ser compatível com esse ecossistema.
- O projeto já utiliza Redis na infraestrutura; o rate limiting deve reutilizá-lo sem introduzir novas dependências de infraestrutura.
- O projeto já utiliza RabbitMQ para mensageria; os eventos de bloqueio devem ser publicados através do mecanismo já existente.
- O `GlobalErrorHandler` já possui tratamento para erros HTTP 429; a solução deve ser compatível com esse handler existente.
- A variável de ambiente de controle de ambiente de testes já existe no projeto; deve ser reutilizada sem criar novas variáveis redundantes.
- Conformidade: os headers de resposta devem seguir os padrões do IETF (RFC 6585 para HTTP 429, draft-ietf-httpapi-ratelimit-headers para os headers de metadados).
- Meta de performance: o overhead do rate limiting não deve adicionar mais de 5ms de latência em condições normais de operação.

## Fora de Escopo

- Configuração de rate limiting a nível de proxy/Nginx (já existe menção na documentação, mas não é responsabilidade desta funcionalidade).
- Rate limiting por geolocalização ou ASN.
- Bloqueio permanente de IPs (apenas bloqueio temporário dentro da janela de tempo).
- Interface de gerenciamento de limites em tempo real (sem dashboard administrativo para alterar limites sem deploy).
- Rate limiting diferenciado por plano de assinatura/tier de usuário.
- Testes de carga/stress para validar os limites definidos (escopo da equipe de QA).
- Alterações no frontend para tratar HTTP 429 de forma customizada.
