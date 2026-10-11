# PRD: Coexistência PostgreSQL e MongoDB

## Visão Geral

O backend persiste hoje apenas em PostgreSQL. Este trabalho permite rodar a mesma API sobre MongoDB, escolhendo o banco por configuração, sem remover o PostgreSQL. É um estudo de arquitetura: o valor está em provar que trocar o banco não exige mudar regras de negócio nem casos de uso, e em ter os dados atuais disponíveis no novo banco para comparação.

## Objetivos

- Subir a API inteira com `DATABASE_PROVIDER=mongo` e obter o mesmo comportamento observável do provider `prisma`.
- Zero alterações de código nas camadas de domínio e aplicação; as suítes existentes passam sem mudanças fora da infraestrutura.
- Cópia do estado atual do PostgreSQL no MongoDB com contagens iguais por coleção e amostra idêntica.
- Rollback imediato: voltar a configuração para `prisma` restaura o comportamento atual.

## Histórias de Usuário

- **US-01** — Como desenvolvedor, eu quero escolher o banco por `DATABASE_PROVIDER=prisma|mongo` para que eu alterne entre PostgreSQL e MongoDB sem mudar código · **UI:** não
- **US-02** — Como desenvolvedor, eu quero que usuários, academias, check-ins, assinaturas, planos e notificações funcionem sobre o MongoDB para que a API se comporte igual nos dois bancos · **UI:** não
- **US-03** — Como desenvolvedor, eu quero copiar o estado atual do PostgreSQL para o MongoDB para que eu compare os dois bancos sobre os mesmos dados · **UI:** não
- **US-04** — Como desenvolvedor, eu quero que unicidade, transações e integridade entre registros valham no MongoDB para que as regras de negócio não dependam do banco · **UI:** não
- **US-05** — Como desenvolvedor, eu quero que a busca de academias por proximidade e as analytics devolvam o mesmo resultado nos dois bancos para que o estudo compare comportamento, não aproximações · **UI:** não
- **US-06** — Como desenvolvedor, eu quero subir o MongoDB com suporte a transações no ambiente local para que a API e os testes rodem sem passos manuais · **UI:** não
- **US-07** — Como arquiteto, eu quero verificar automaticamente que domínio e aplicação não conhecem o MongoDB e que os dois adapters cumprem o mesmo contrato para que a tese do estudo fique provada · **UI:** não

## Funcionalidades Principais

**Seleção de banco**
- **FR-001** (US-01) — O sistema deve aceitar `DATABASE_PROVIDER` com os valores `prisma` e `mongo`; qualquer outro valor impede a API de subir com erro de configuração.
- **FR-002** (US-01) — O sistema deve usar um único banco ativo por processo, sem gravar nos dois nem sincronizá-los.
- **FR-003** (US-01) — O sistema deve manter `prisma` como comportamento padrão, de modo que sem alterar a configuração nada muda.

**Persistência no MongoDB**
- **FR-004** (US-02) — O sistema deve persistir e consultar usuários, academias, check-ins, assinaturas, planos, eventos de webhook do Stripe, atividade de usuário e notificações no MongoDB com o mesmo contrato dos repositórios atuais.
- **FR-005** (US-02) — O sistema deve manter os identificadores como UUID em texto, preservando o contrato da API e os tipos gerados.
- **FR-006** (US-02) — O sistema deve manter as regras de exclusão lógica e de academia inativa (`deleted_at`, `includeInactive`) com o mesmo efeito observável.

**Consistência**
- **FR-007** (US-04) — O sistema deve impedir e reportar com o mesmo erro de domínio atual: e-mail, CNPJ ou assinatura de cobrança repetidos, segundo check-in do mesmo usuário no mesmo dia, uma segunda assinatura ativa do mesmo usuário e evento de webhook repetido (INV-01, INV-02, INV-03, INV-07).
- **FR-008** (US-04) — O sistema deve executar operações que hoje são transacionais (check-in, criação de assinatura, ciclo de vida da assinatura, worker de webhook) de forma atômica: ou tudo é gravado ou nada (INV-04).
- **FR-009** (US-04) — O sistema deve remover as `UserNotification` de uma notificação excluída e recusar a exclusão de usuário ou plano com assinatura ou notificação associada (INV-05, INV-06).

**Consultas equivalentes**
- **FR-010** (US-05) — O sistema deve listar academias a até 10 km de uma coordenada com o mesmo resultado do provider `prisma`.
- **FR-011** (US-05) — O sistema deve produzir as analytics de usuários e de check-ins por período com os mesmos números do provider `prisma` sobre os mesmos dados.
- **FR-012** (US-05) — O sistema deve manter paginação e ordenação das listagens (usuários, check-ins, notificações, atividade) com o mesmo resultado.

**Migração de dados**
- **FR-013** (US-03) — O sistema deve oferecer um script único que copie o estado do PostgreSQL para o MongoDB, preservando ids e todos os campos (INV-08).
- **FR-014** (US-03) — O script deve ser repetível: executá-lo de novo produz o mesmo resultado, e uma falha no meio pode ser retomada reexecutando.
- **FR-015** (US-03) — O script deve validar a cópia por contagem por coleção e por amostra campo a campo, e reportar registros que violem a unicidade (por exemplo check-ins repetidos no mesmo dia), excluindo-os da cópia.

**Ambiente e operação**
- **FR-016** (US-06) — O ambiente local deve oferecer um MongoDB com transações habilitadas, subindo junto com os demais serviços.
- **FR-017** (US-06) — A API deve falhar na inicialização, com mensagem clara, quando o MongoDB estiver indisponível ou sem suporte a transações.
- **FR-018** (US-06) — O sistema deve oferecer seed equivalente ao atual para o MongoDB e verificação de saúde do banco no provider `mongo`.

**Verificação do isolamento**
- **FR-019** (US-07) — Os mesmos testes de contrato devem passar contra in-memory, Prisma e MongoDB.
- **FR-020** (US-07) — Os testes de integração dos repositórios, DAOs e providers devem rodar também contra um MongoDB real.
- **FR-021** (US-07) — Uma regra automatizada deve falhar se domínio ou aplicação importarem o driver do MongoDB.

## Experiência do Usuário

Não há interface nova nem mudança no contrato HTTP. A experiência é a de quem opera o backend: uma variável de ambiente escolhe o banco, um comando sobe a infraestrutura local, um script copia os dados e uma suíte única de testes prova a equivalência. Mensagens de erro de configuração e de inicialização dizem o que falta (valor inválido, MongoDB fora do ar, transações indisponíveis).

## Restrições Técnicas de Alto Nível

- Prisma 7.8 não suporta MongoDB; o acesso ao MongoDB usa o driver oficial `mongodb`, restrito à camada de infraestrutura.
- Transações exigem MongoDB em replica set.
- Redis e RabbitMQ permanecem como estão.
- Critério de sucesso do estudo: manutenibilidade e isolamento da persistência, medidos por FR-019 e FR-021; sem metas de carga ou disponibilidade.
- A tarefa só termina com `biome:fix`, `tsc:check`, `test:run` e `build` passando sem problemas.

## Fora de Escopo

- Remover Prisma ou PostgreSQL.
- Gravação dupla ou sincronização contínua entre os bancos.
- Adapters `sqlite` e `pg` legados.
- Mudar identificadores para ObjectId ou redesenhar o modelo em documentos aninhados.
- Alterar retenção, purge ou anonimização de dados.
- Migração de dados de produção, downtime ou janela de manutenção (ambiente local).
- Mudanças em Redis, RabbitMQ, frontend ou contrato OpenAPI.
