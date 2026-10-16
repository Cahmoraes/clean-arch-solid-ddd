# Task 3: Repositórios port, Prisma e InMemory [FR-001, FR-006, FR-008]

**Status:** DONE

**PRD:** `../prd/prd-notas-treino-calendario.md`

**Spec:** `../specs/notas-treino-calendario-design.md`

**Tier:** standard

## Visão Geral

Cria a porta do repositório e suas duas implementações (Prisma para produção, InMemory para testes), mais a factory de teste. Toda leitura filtra pelo autor; a concorrência na criação resolve-se na UNIQUE com conversão de `P2002` em erro de domínio.

## Arquivos

- Create: `apps/backend/src/training-notes/application/repository/training-note-repository.ts`
- Create: `apps/backend/src/shared/infra/database/repository/prisma/prisma-training-note-repository.ts`
- Create: `apps/backend/src/shared/infra/database/repository/in-memory/in-memory-training-note-repository.ts`
- Create: `apps/backend/test/factory/create-and-save-training-note.ts`
- Test: `apps/backend/src/shared/infra/database/repository/in-memory/in-memory-training-note-repository.test.ts`
- Test: `apps/backend/src/shared/infra/database/repository/prisma/prisma-training-note-repository.integration-test.ts`

## Interfaces

- **Consome:** `TrainingNote.create(input: { id?: string; userId: string; data: string; texto: string }): Either<InvalidTrainingNoteTextError | InvalidTrainingNoteDateError, TrainingNote>` (task-02); `TrainingNote.restore(input: { id: string; userId: string; data: string; texto: string; createdAt: Date; updatedAt: Date }): TrainingNote` (task-02); `DuplicateTrainingNoteError` com `kind = "conflict"` (task-02); model `TrainingNote` do client Prisma (task-01)
- **Produz:** `TrainingNotesRepository.save(note: TrainingNote): Promise<Either<DuplicateTrainingNoteError, void>>` (task-04); `TrainingNotesRepository.findByUserIdAndDate(userId: string, data: string): Promise<TrainingNote | null>` (task-04); `TrainingNotesRepository.listByUserIdAndRange(userId: string, de: string, ate: string): Promise<TrainingNote[]>` (task-04); `TrainingNotesRepository.deleteByUserIdAndDate(userId: string, data: string): Promise<void>` (task-04); `createAndSaveTrainingNote(input: { userId: string; data: string; texto?: string }): Promise<TrainingNote>` (task-04)

### Skills a invocar

- `typescript-advanced`: porta e implementações tipadas
- `test-antipatterns`: testes contra InMemory e banco real sem mocks frágeis
- `find-docs`: exatidão da API Prisma e do erro `P2002`
- `security-review`: toda query filtrada pelo autor da sessão

## Passos

- **Step 1: Review Focus: Duplo clique em Salvar criando duas notas do mesmo dia — Write the failing test**

  ```ts
  test("INV-01 duplo save do mesmo autor+data vira DuplicateTrainingNoteError e persiste uma", async () => {
    const repo = new InMemoryTrainingNoteRepository();
    const note = TrainingNote.create({ userId: "u1", data: "2026-10-16", texto: "Peito + tríceps 4x12" }).forceSuccess().value;
    expect((await repo.save(note)).isSuccess()).toBe(true);
    const again = await repo.save(note);
    expect(again.isFailure()).toBe(true);
    expect((await repo.listByUserIdAndRange("u1", "2026-10-01", "2026-10-31")).length).toBe(1);
  });
  ```

- **Step 2: Run test to verify it fails**

  Run: (cwd em `apps/backend`) `npx vitest --run --config ./test/vite.config.app-domain.ts src/shared/infra/database/repository/in-memory/in-memory-training-note-repository.test.ts`
  Expected: FAIL — `InMemoryTrainingNoteRepository` não definido.

- **Step 3: Implement o port `TrainingNotesRepository`, `InMemoryTrainingNoteRepository` e `createAndSaveTrainingNote` nos arquivos da task**

  Assinaturas exatas da `## Interfaces`; InMemory com `withTransaction() { return this }`; duplicata autor+data → `failure(new DuplicateTrainingNoteError())`.

- **Step 4: Run test to verify it passes**

  Run: (cwd em `apps/backend`) `npx vitest --run --config ./test/vite.config.app-domain.ts src/shared/infra/database/repository/in-memory/in-memory-training-note-repository.test.ts`
  Expected: PASS (1 teste).

- **Step 5: Write the failing test**

  ```ts
  test("INV-01 P2002 do Prisma vira DuplicateTrainingNoteError", async () => {
    const nota = (userId: string, data: string) =>
      TrainingNote.create({ userId, data, texto: "treino" }).forceSuccess().value;
    const repo = new PrismaTrainingNoteRepository(); // construção espelhada em prisma-check-in-repository
    const first = await repo.save(nota("u1", "2026-10-16"));
    expect(first.isSuccess()).toBe(true);
    const second = await repo.save(nota("u1", "2026-10-16"));
    expect(second.forceFailure()).toBeInstanceOf(DuplicateTrainingNoteError);
  });
  ```

- **Step 6: Run test to verify it fails**

  Run: (exige Postgres via `pnpm --filter backend docker:up`; cwd em `apps/backend`) `npx vitest --run --config ./test/vite.config.integration.ts src/shared/infra/database/repository/prisma/prisma-training-note-repository.integration-test.ts`
  Expected: FAIL — `PrismaTrainingNoteRepository` não definido.

- **Step 7: Implement `save`, `findByUserIdAndDate` e `listByUserIdAndRange` no `PrismaTrainingNoteRepository` no arquivo da task**

  Mesmas assinaturas da `## Interfaces`; `mapSaveError` converte `PrismaClientKnownRequestError` `P2002` em `DuplicateTrainingNoteError` no padrão de `prisma-check-in-repository`; leituras ainda sem filtro de autor (o filtro vem no Step 11) e sem `deleteByUserIdAndDate` (vem no Step 15).

- **Step 8: Run test to verify it passes**

  Run: (cwd em `apps/backend`) `npx vitest --run --config ./test/vite.config.integration.ts src/shared/infra/database/repository/prisma/prisma-training-note-repository.integration-test.ts`
  Expected: PASS (1 teste).

- **Step 9: Write the failing test**

  ```ts
  test("AC-05 leitura é isolada por autor", async () => {
    // mesmo setup do teste INV-01 P2002 (helper nota + repo Prisma)
    await repo.save(nota("conta-a", "2026-10-16"));
    const alheias = await repo.listByUserIdAndRange("conta-b", "2026-10-01", "2026-10-31");
    expect(alheias).toEqual([]);
    expect(await repo.findByUserIdAndDate("conta-b", "2026-10-16")).toBeNull();
  });
  ```

- **Step 10: Run test to verify it fails**

  Run: (cwd em `apps/backend`) `npx vitest --run --config ./test/vite.config.integration.ts src/shared/infra/database/repository/prisma/prisma-training-note-repository.integration-test.ts`
  Expected: FAIL — lista de `conta-b` inclui a nota de `conta-a` (filtro de autor ausente).

- **Step 11: Implement filtro por autor em `findByUserIdAndDate` e `listByUserIdAndRange` no arquivo da task**

  Toda leitura condiciona `userId` da sessão; sem esse filtro o teste do Step 9 passa dados alheios.

- **Step 12: Run test to verify it passes**

  Run: (cwd em `apps/backend`) `npx vitest --run --config ./test/vite.config.integration.ts src/shared/infra/database/repository/prisma/prisma-training-note-repository.integration-test.ts`
  Expected: PASS.

- **Step 13: Write the failing test**

  ```ts
  test("INV-03 excluir remove e a listagem deixa de incluir a data", async () => {
    // mesmo setup do teste INV-01 P2002 (helper nota + repo Prisma)
    await repo.save(nota("u1", "2026-10-16"));
    await repo.deleteByUserIdAndDate("u1", "2026-10-16");
    expect(await repo.findByUserIdAndDate("u1", "2026-10-16")).toBeNull();
    expect(await repo.listByUserIdAndRange("u1", "2026-10-01", "2026-10-31")).toEqual([]);
  });
  ```

- **Step 14: Run test to verify it fails**

  Run: (cwd em `apps/backend`) `npx vitest --run --config ./test/vite.config.integration.ts src/shared/infra/database/repository/prisma/prisma-training-note-repository.integration-test.ts`
  Expected: FAIL — `deleteByUserIdAndDate` não definido.

- **Step 15: Implement `deleteByUserIdAndDate` no Prisma e no InMemory nos arquivos da task**

  Assinatura exata da `## Interfaces`; deleta restrito ao par autor+data.

- **Step 16: Run test to verify it passes**

  Run: (cwd em `apps/backend`) `npx vitest --run --config ./test/vite.config.integration.ts src/shared/infra/database/repository/prisma/prisma-training-note-repository.integration-test.ts`
  Expected: PASS (todos os testes de integração do arquivo).

## Critérios de Sucesso

- INV-01 [db]: Cada par autor + data tem até um registro de nota · Run: (cwd em `apps/backend`) `npx vitest --run --config ./test/vite.config.integration.ts src/shared/infra/database/repository/prisma/prisma-training-note-repository.integration-test.ts`
- INV-03 [db]: Excluir remove o registro e a listagem mensal deixa de incluir a data · Run: (cwd em `apps/backend`) `npx vitest --run --config ./test/vite.config.integration.ts src/shared/infra/database/repository/prisma/prisma-training-note-repository.integration-test.ts`
- AC-05 [db]: WHEN outra conta abre o mesmo mês THEN as notas da primeira conta não aparecem · Run: (cwd em `apps/backend`) `npx vitest --run --config ./test/vite.config.integration.ts src/shared/infra/database/repository/prisma/prisma-training-note-repository.integration-test.ts`
- Duplo `save` do mesmo autor+data resulta em um registro e `DuplicateTrainingNoteError` (Review Focus; `P2002` convertido no Prisma)
