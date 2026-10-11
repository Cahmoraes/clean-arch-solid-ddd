# QA Report — mongodb-coexistence

## Resumo
- **Status**: ⚠️ PARCIAL
- **PRD**: `docs/superpowers/mongodb-coexistence/prd/prd-mongodb-coexistence.md`
- **Total de Requisitos**: 21
- **Requisitos Atendidos**: 20 / 21 (FR-009 parcial)
- **Bugs Encontrados**: 0

Seis das sete histórias passaram. US-04 ficou parcial porque INV-05 e INV-06 (cascata e restrição de exclusão física, parte do FR-009) não têm caminho de código para testar: nenhuma porta de repositório expõe exclusão física de `Notification`, `User` ou `Plan`. Nenhuma história é de interface web, então não há screenshots (automação de navegador indisponível, URL da aplicação não aplicável).

---

## Requisitos Verificados

| ID | Requisito | Status | Evidência |
|----|-----------|--------|-----------|
| FR-001 | `DATABASE_PROVIDER=prisma\|mongo`, mongo exige `DATABASE_URL_MONGO` | ✅ PASSOU | `evidence/us-01-desenvolvedor-escolher-o-banco-por/result.json` |
| FR-002 | Um único banco ativo por execução | ✅ PASSOU | `evidence/us-01-desenvolvedor-escolher-o-banco-por/result.json` |
| FR-003 | Padrão `prisma` mantém o comportamento atual | ✅ PASSOU | `evidence/us-01-desenvolvedor-escolher-o-banco-por/result.json` |
| FR-004 | Repositórios e DAOs com adapter Mongo | ✅ PASSOU | `evidence/us-02-desenvolvedor-que-usuarios-academias-checkins/result.json` |
| FR-005 | Identificador UUID string como `_id` | ✅ PASSOU | `evidence/us-02-desenvolvedor-que-usuarios-academias-checkins/result.json` |
| FR-006 | `includeInactive` e `deleted_at` com o mesmo significado | ✅ PASSOU | `evidence/us-02-desenvolvedor-que-usuarios-academias-checkins/result.json` |
| FR-007 | Unicidade (INV-01, INV-02, INV-03, INV-07) | ✅ PASSOU | `evidence/us-04-desenvolvedor-que-unicidade-transacoes-e/result.json` |
| FR-008 | Transações atômicas via `MongoUnitOfWork` | ✅ PASSOU | `evidence/us-04-desenvolvedor-que-unicidade-transacoes-e/result.json` |
| FR-009 | Integridade entre registros (Notification + UserNotification, INV-05, INV-06) | ⚠️ PARCIAL | `evidence/us-04-desenvolvedor-que-unicidade-transacoes-e/result.json` — gravação atômica testada; INV-05/INV-06 sem porta de exclusão física |
| FR-010 | Busca de academias a até 10 km igual nos dois bancos | ✅ PASSOU | `evidence/us-05-desenvolvedor-que-a-busca-de/result.json` |
| FR-011 | Analytics por aggregation pipeline com paridade | ✅ PASSOU | `evidence/us-05-desenvolvedor-que-a-busca-de/result.json` |
| FR-012 | Paginação e ordenação equivalentes | ✅ PASSOU | `evidence/us-05-desenvolvedor-que-a-busca-de/result.json` |
| FR-013 | ETL copia o estado do Postgres preservando ids e campos | ✅ PASSOU | `evidence/us-03-desenvolvedor-copiar-o-estado-atual/result.json` |
| FR-014 | ETL idempotente e retomável | ✅ PASSOU | `evidence/us-03-desenvolvedor-copiar-o-estado-atual/result.json` |
| FR-015 | Validação por contagem e amostra; órfãos e duplicatas reportados | ✅ PASSOU | `evidence/us-03-desenvolvedor-copiar-o-estado-atual/result.json` |
| FR-016 | MongoDB com replica set no compose, sem passo manual | ✅ PASSOU | `evidence/us-06-desenvolvedor-subir-o-mongodb-com/result.json` |
| FR-017 | API falha na inicialização sem Mongo ou sem replica set | ✅ PASSOU | `evidence/us-06-desenvolvedor-subir-o-mongodb-com/result.json` |
| FR-018 | Seed e health do Mongo | ✅ PASSOU | `evidence/us-06-desenvolvedor-subir-o-mongodb-com/result.json` |
| FR-019 | Mesmo contrato nos adapters in-memory, Prisma e Mongo | ✅ PASSOU | `evidence/us-07-arquiteto-verificar-automaticamente-que-dominio/result.json` |
| FR-020 | Testes de integração contra MongoDB real | ✅ PASSOU | `evidence/us-07-arquiteto-verificar-automaticamente-que-dominio/result.json` |
| FR-021 | Domínio e aplicação não importam o driver `mongodb` | ✅ PASSOU | `evidence/us-07-arquiteto-verificar-automaticamente-que-dominio/result.json` |

---

## Testes E2E Executados

| Fluxo | Resultado | Observações |
|-------|-----------|-------------|
| US-01 — escolher o banco por `DATABASE_PROVIDER` | ✅ PASSOU | 21 testes de integração + 8 unitários |
| US-02 — entidades funcionando sobre o MongoDB | ✅ PASSOU | 12 arquivos, 112 testes de integração; FR-005/FR-006 conferidos por busca nos testes |
| US-03 — copiar o Postgres para o MongoDB | ✅ PASSOU | 9 testes de integração + 4 unitários do ETL |
| US-04 — unicidade, transações e integridade | ⚠️ PARCIAL | 82 testes passaram; INV-05/INV-06 sem caminho de código testável |
| US-05 — proximidade e analytics com paridade | ✅ PASSOU | 8 testes de paridade; conjunto ampliado com 66 testes |
| US-06 — subir o MongoDB com transações | ✅ PASSOU | 16 testes de integração + 3 unitários contra replica set real e standalone |
| US-07 — isolamento do driver e contratos | ✅ PASSOU | fitness 4/4, cobertura de contratos 11/11, amostra de integração 31/31 |

---

## Acessibilidade
- [ ] Navegação por teclado verificada — não aplicável (feature de backend)
- [ ] Contraste de cores adequado — não aplicável (feature de backend)
- [ ] Labels e ARIA roles presentes — não aplicável (feature de backend)

---

## Bugs Encontrados

| ID | Descrição | Severidade | Screenshot |
|----|-----------|------------|------------|
| — | Nenhum bug encontrado | — | — |

---

## Conclusão
Aprovada com ressalvas. Todos os requisitos testáveis passaram. A ressalva é o FR-009: as regras de cascata (INV-05) e de restrição de exclusão (INV-06) não são exercitáveis porque não há porta de exclusão física; o ETL preserva a regra apenas excluindo registros órfãos. A boot real da API com `DATABASE_PROVIDER=mongo` e a criação do PostGIS em ambientes limpos ficam como verificação manual pendente.
