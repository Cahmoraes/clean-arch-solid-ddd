# Tarefas: Coexistência PostgreSQL e MongoDB

**Spec:** `../specs/mongodb-coexistence-design.md`

**PRD:** `../prd/prd-mongodb-coexistence.md`

---

## Tarefas

- [ ] 1. Configuração: dependência mongodb, variáveis de ambiente e serviço Mongo com replica set → `task-01.md`
- [ ] 2. MongoConnection, índices, falha na inicialização e health do banco → `task-02.md`
- [ ] 3. MongoUnitOfWork com sessão transacional → `task-03.md`
- [ ] 4. Repositório e DAO de usuário no Mongo com suíte de contrato compartilhada → `task-04.md`
- [ ] 5. Repositório de academia no Mongo com busca por proximidade → `task-05.md`
- [ ] 6. Repositório de check-in no Mongo com unicidade por usuário e dia → `task-06.md`
- [ ] 7. Repositórios de plano, evento de webhook Stripe e assinatura no Mongo → `task-07.md`
- [ ] 8. Repositório de notificação e provider de destinatários ativos no Mongo → `task-08.md`
- [ ] 9. Repositório e DAO de atividade de usuário no Mongo → `task-09.md`
- [ ] 10. Repositórios de analytics no Mongo com aggregation pipeline → `task-10.md`
- [ ] 11. Seleção de adapters por DATABASE_PROVIDER nos providers e no IoC → `task-11.md`
- [ ] 12. Script ETL Postgres para Mongo → `task-12.md`
- [ ] 13. Seed equivalente para o Mongo → `task-13.md`
- [ ] 14. Regra de isolamento do driver e verificação cruzada dos contratos → `task-14.md`

## Restrições Globais

- Identificador: UUID string gerado pela aplicação (`Id`); no Mongo é o `_id`.
- Data e hora: instante UTC (`Date`); `created_at` e `deleted_at` mantêm o significado atual.
- Latitude e longitude: número em graus no domínio; o Mongo guarda também `location` GeoJSON `[longitude, latitude]`, derivado e fora do contrato da API.
- Decimal de coordenadas: convertido para `number` no mapeamento, como o repositório Prisma já faz.
- Contagens de analytics: `number`, como hoje após conversão de `bigint`.
- Dia do check-in: `dayKey` string `YYYY-MM-DD` em UTC, derivada de `created_at`.
- Violação de unicidade: o repositório devolve o mesmo erro de domínio que o Prisma devolve em `P2002`.
- Variável do Mongo: `DATABASE_URL_MONGO` separada de `DATABASE_URL`.
- Nenhum import de `mongodb` fora de `infra`.
- Redis e RabbitMQ: não mudam.
- Adapters `sqlite` e `pg` legados: ficam intocados.

## Foco de Revisão

- Check-in perto da meia-noite, em que o dia local difere do dia UTC: `onSameDateOfUserId` e o índice único por `dayKey` devem concordar com o comportamento do Prisma, sem bloquear nem deixar passar um segundo check-in indevido → `task-06`
- Academia gravada ou atualizada sem o campo `location` (também pelo ETL): `$geoNear` não a encontra e a busca por 10 km diverge do Prisma → `task-05`
- MongoDB standalone (sem replica set) ou indisponível: a API falha na inicialização com mensagem que cita o `--replSet`, nunca sobe e quebra só na primeira transação → `task-02`
- Reexecutar o ETL com `deleted_at`, coordenadas decimais e `operating_hours` JSON: o resultado é idêntico e nenhum campo perde precisão ou muda de tipo → `task-12`
- Registro do Postgres com referência sem pai (usuário, academia, plano ou notificação ausente): o ETL o reporta e o exclui, em vez de criar documento órfão → `task-12`
