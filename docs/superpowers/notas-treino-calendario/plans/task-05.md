# Task 5: Controllers, rotas, IoC e tipos OpenAPI [FR-001, FR-002, FR-003, FR-005, FR-006, FR-008, FR-009]

**Status:** PENDING

**PRD:** `../prd/prd-notas-treino-calendario.md`

**Spec:** `../specs/notas-treino-calendario-design.md`

**Tier:** standard

## Visão Geral

Expõe o HTTP do contexto: quatro controllers autenticados com schemas zod e Swagger, rotas como constantes, módulo Inversify com provider e registro no bootstrap. Fecha com a geração dos tipos OpenAPI que o frontend vai consumir.

## Arquivos

- Create: `apps/backend/src/training-notes/infra/controller/routes/training-note-routes.ts`
- Create: `apps/backend/src/training-notes/infra/controller/create-training-note.controller.ts`
- Create: `apps/backend/src/training-notes/infra/controller/update-training-note.controller.ts`
- Create: `apps/backend/src/training-notes/infra/controller/delete-training-note.controller.ts`
- Create: `apps/backend/src/training-notes/infra/controller/list-training-notes.controller.ts`
- Create: `apps/backend/src/shared/infra/ioc/module/service-identifier/training-note-types.ts`
- Create: `apps/backend/src/shared/infra/ioc/module/training-note-module.ts`
- Create: `apps/backend/src/shared/infra/ioc/provider/training-note-repository-provider.ts`
- Create: `apps/backend/src/bootstrap/setup-training-notes-module.ts`
- Modify: `apps/backend/src/shared/infra/ioc/types.ts` (registrar o módulo)
- Test: `apps/backend/src/training-notes/infra/controller/training-note.business-flow-test.ts`

## Interfaces

- **Consome:** `CreateTrainingNoteUseCase.execute(input: { userId: string; data: string; texto: string }): Promise<Either<Error, { id: string; data: string; texto: string; atualizadoEm: string }>>` (task-04); `UpdateTrainingNoteUseCase.execute(input: { userId: string; data: string; texto: string }): Promise<Either<Error, { id: string; data: string; texto: string; atualizadoEm: string }>>` (task-04); `DeleteTrainingNoteUseCase.execute(input: { userId: string; data: string }): Promise<Either<Error, void>>` (task-04); `ListTrainingNotesUseCase.execute(input: { userId: string; de: string; ate: string }): Promise<Either<Error, Array<{ data: string; texto: string; atualizadoEm: string }>>>` (task-04); container IoC, `BaseController` (`parseRequest`, `createResponseError`) e `ResponseFactory` existentes
- **Produz:** `TrainingNoteRoutes = { CREATE: "/training-notes", LIST: "/training-notes", BY_DATE: "/training-notes/:date" } as const`; `POST /training-notes`, `GET /training-notes`, `PUT /training-notes/:date`, `DELETE /training-notes/:date` com corpos e erros do contrato (task-06 via `@repo/api-types`); `TRAINING_NOTE_TYPES` com `Repositories.TrainingNote`, `UseCases.*`, `Controllers.*`

### Skills a invocar

- `typescript-advanced`: controllers e módulo IoC tipados
- `test-antipatterns`: business-flow com `serverBuildForTest` e rebind InMemory, sem estado vazado
- `zod`: schemas de request (`data` regex + data real, `texto` trim 1..500, `de`/`ate` + regra 62 dias)
- `security-review`: rotas com `isProtected: true`, autor só de `req.user.sub.id`, JWT nos testes

## Passos

- **Step 1: Write the failing test**

  ```ts
  test("AC-07 POST duplica o dia e recebe 409 com orientação de editar", async () => {
    // setup espelhado em check-in.business-flow-test.ts: serverBuildForTest(), rebind do repositório para InMemory e JWT de teste
    const app = serverBuildForTest();
    container.rebindSync(TRAINING_NOTE_TYPES.Repositories.TrainingNote).toConstantValue(new InMemoryTrainingNoteRepository());
    const auth = { Authorization: `Bearer ${testJwt}` };
    await request(app).post("/training-notes").set(auth).send({ data: "2026-10-16", texto: "Peito + tríceps 4x12" }).expect(201);
    const res = await request(app).post("/training-notes").set(auth).send({ data: "2026-10-16", texto: "outro" }).expect(409);
    expect(res.body.message).toMatch(/edite/i);
  });
  ```

- **Step 2: Run test to verify it fails**

  Run: (cwd em `apps/backend`) `npx vitest run --config ./test/vite.config.business-flow.ts src/training-notes/infra/controller/training-note.business-flow-test.ts`
  Expected: FAIL — rota `POST /training-notes` responde 404 (rota não registrada).

- **Step 3: Implement `TrainingNoteRoutes`, o controller de create com `makeCreateSwaggerSchema()`, `TRAINING_NOTE_TYPES`, módulo, provider e `setup-training-notes-module.ts` nos arquivos da task**

  Pinos: `export const TrainingNoteRoutes = { CREATE: "/training-notes", LIST: "/training-notes", BY_DATE: "/training-notes/:date" } as const`; registro com `{ isProtected: true }`; `parseRequest` com schema zod (`data` regex + data real, `texto` trim 1..500); autor de `req.user.sub.id`; `ResponseFactory.create({ status, body })` com `CREATED` e `createResponseError`; corpos de erro `{message}`; provider retorna InMemory fora de produção e Prisma em produção. Controllers de update/delete/list vêm no Step 7.

- **Step 4: Run test to verify it passes**

  Run: (cwd em `apps/backend`) `npx vitest run --config ./test/vite.config.business-flow.ts src/training-notes/infra/controller/training-note.business-flow-test.ts`
  Expected: PASS (teste AC-07).

- **Step 5: Write the failing test**

  ```ts
  test("AC-08 PUT/DELETE em data inexistente recebe 404 sem efeito colateral", async () => {
    // mesmo setup do teste AC-07 (app, rebind InMemory, auth)
    await request(app).put("/training-notes/2026-10-17").set(auth).send({ texto: "novo" }).expect(404);
    await request(app).delete("/training-notes/2026-10-17").set(auth).expect(404);
    const list = await request(app).get("/training-notes").set(auth).query({ de: "2026-10-01", ate: "2026-10-31" }).expect(200);
    expect(list.body).toEqual([]);
  });
  ```

- **Step 6: Run test to verify it fails**

  Run: (cwd em `apps/backend`) `npx vitest run --config ./test/vite.config.business-flow.ts src/training-notes/infra/controller/training-note.business-flow-test.ts`
  Expected: FAIL — `PUT /training-notes/:date` responde 404 de rota (controller não registrado).

- **Step 7: Implement os controllers de update/delete/list com schemas e Swagger nos arquivos da task**

  Pinos: `PUT` valida `texto` trim 1..500 no path `:date` com data real; `DELETE` 204 sem corpo; `GET` exige `de`/`ate` com `de<=ate` e até 62 dias, ordem crescente; `NOTA_INEXISTENTE → 404`, `VALIDACAO → 400`, `NAO_AUTENTICADO → 401`.

- **Step 8: Run test to verify it passes**

  Run: (cwd em `apps/backend`) `npx vitest run --config ./test/vite.config.business-flow.ts src/training-notes/infra/controller/training-note.business-flow-test.ts`
  Expected: PASS.

- **Step 9: Review Focus: Nota criada perto da meia-noite — Write the failing test**

  ```ts
  test("nota perto da meia-noite permanece no dia clicado sem deslocamento de fuso", async () => {
    // mesmo setup do teste AC-07 (app, rebind InMemory, auth)
    await request(app).post("/training-notes").set(auth).send({ data: "2026-10-16", texto: "treino tardio" }).expect(201);
    const list = await request(app).get("/training-notes").set(auth).query({ de: "2026-10-16", ate: "2026-10-16" }).expect(200);
    expect(list.body.map((r: { data: string }) => r.data)).toEqual(["2026-10-16"]);
  });
  ```

- **Step 10: Run test to verify it fails**

  Run: (cwd em `apps/backend`) `npx vitest run --config ./test/vite.config.business-flow.ts src/training-notes/infra/controller/training-note.business-flow-test.ts`
  Expected: FAIL — `data` volta deslocada para o dia vizinho (hora/fuso aplicada).

- **Step 11: Implement persistência e serialização de `data` como dia de calendário nos arquivos da task**

  Pino: `data` = `YYYY-MM-DD` em America/Sao_Paulo exibida como está, sem conversão de fuso; coluna `date` sem hora; `atualizadoEm` ISO-8601 UTC.

- **Step 12: Run test to verify it passes**

  Run: (cwd em `apps/backend`) `npx vitest run --config ./test/vite.config.business-flow.ts src/training-notes/infra/controller/training-note.business-flow-test.ts`
  Expected: PASS (todos os testes do arquivo).

- **Step 13: Gerar os tipos OpenAPI para o frontend**

  Run: (cwd na raiz) `pnpm generate:types`
  Expected: `apps/backend/docs/openapi-spec.json` atualizado com `/training-notes` e `packages/api-types/index.d.ts` regenerado sem erro.

## Critérios de Sucesso

- | POST /training-notes | {data: YYYY-MM-DD, texto: string 1..500 após trim} | 201 {id, data, texto, atualizadoEm: ISO-8601 UTC} | NOTA_JA_EXISTE → 409; VALIDACAO → 400; NAO_AUTENTICADO → 401 |
- | GET /training-notes | query de: YYYY-MM-DD, ate: YYYY-MM-DD (obrigatórios, de<=ate, intervalo até 62 dias; ver Significados) | 200 [{data, texto, atualizadoEm: ISO-8601 UTC}] do autor, ordem crescente de data | VALIDACAO → 400; NAO_AUTENTICADO → 401 |
- | PUT /training-notes/:date | {texto: string 1..500 após trim} | 200 {id, data, texto, atualizadoEm: ISO-8601 UTC} | NOTA_INEXISTENTE → 404; VALIDACAO → 400; NAO_AUTENTICADO → 401 |
- | DELETE /training-notes/:date | — | 204 sem corpo | NOTA_INEXISTENTE → 404; NAO_AUTENTICADO → 401 |
- AC-07 [int]: WHEN o usuário cria nota para dia que já tem nota THEN a criação é recusada com orientação de editar · Run: (cwd em `apps/backend`) `npx vitest run --config ./test/vite.config.business-flow.ts src/training-notes/infra/controller/training-note.business-flow-test.ts`
- AC-08 [int]: WHEN o usuário edita nota inexistente THEN recebe aviso sem efeito colateral · Run: (cwd em `apps/backend`) `npx vitest run --config ./test/vite.config.business-flow.ts src/training-notes/infra/controller/training-note.business-flow-test.ts`
- Nota em data limítrofe permanece no dia clicado, sem deslocamento de fuso (Review Focus)
- Tipos `/training-notes` disponíveis em `@repo/api-types` após `pnpm generate:types`
