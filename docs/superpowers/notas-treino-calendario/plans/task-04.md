# Task 4: Casos de uso criar, atualizar, excluir e listar [FR-001, FR-002, FR-003, FR-005, FR-006, FR-008, FR-009]

**Status:** DONE

**PRD:** `../prd/prd-notas-treino-calendario.md`

**Spec:** `../specs/notas-treino-calendario-design.md`

**Tier:** standard

## Visão Geral

Cria os quatro casos de uso do contexto com retorno `Either`: criar, atualizar, excluir e listar o intervalo. O autor vem sempre do input `userId` (o controller passa `req.user.sub.id`); nenhum caso de uso consulta o contexto user.

## Arquivos

- Create: `apps/backend/src/training-notes/application/use-case/create-training-note.usecase.ts`
- Create: `apps/backend/src/training-notes/application/use-case/update-training-note.usecase.ts`
- Create: `apps/backend/src/training-notes/application/use-case/delete-training-note.usecase.ts`
- Create: `apps/backend/src/training-notes/application/use-case/list-training-notes.usecase.ts`
- Test: `apps/backend/src/training-notes/application/use-case/create-training-note.usecase.test.ts`
- Test: `apps/backend/src/training-notes/application/use-case/update-training-note.usecase.test.ts`
- Test: `apps/backend/src/training-notes/application/use-case/delete-training-note.usecase.test.ts`
- Test: `apps/backend/src/training-notes/application/use-case/list-training-notes.usecase.test.ts`

## Interfaces

- **Consome:** `TrainingNote.create(input: { id?: string; userId: string; data: string; texto: string }): Either<InvalidTrainingNoteTextError | InvalidTrainingNoteDateError, TrainingNote>` (task-02); `TrainingNote.restore(input: { id: string; userId: string; data: string; texto: string; createdAt: Date; updatedAt: Date }): TrainingNote` (task-02); `DuplicateTrainingNoteError` com `kind = "conflict"` (task-02); `TrainingNoteNotFoundError` com `kind = "not-found"` (task-02); `TrainingNotesRepository.save(note: TrainingNote): Promise<Either<DuplicateTrainingNoteError, void>>` (task-03); `TrainingNotesRepository.findByUserIdAndDate(userId: string, data: string): Promise<TrainingNote | null>` (task-03); `TrainingNotesRepository.listByUserIdAndRange(userId: string, de: string, ate: string): Promise<TrainingNote[]>` (task-03); `TrainingNotesRepository.deleteByUserIdAndDate(userId: string, data: string): Promise<void>` (task-03); `createAndSaveTrainingNote(input: { userId: string; data: string; texto?: string }): Promise<TrainingNote>` (task-03)
- **Produz:** `CreateTrainingNoteUseCase.execute(input: { userId: string; data: string; texto: string }): Promise<Either<Error, { id: string; data: string; texto: string; atualizadoEm: string }>>` (task-05); `UpdateTrainingNoteUseCase.execute(input: { userId: string; data: string; texto: string }): Promise<Either<Error, { id: string; data: string; texto: string; atualizadoEm: string }>>` (task-05); `DeleteTrainingNoteUseCase.execute(input: { userId: string; data: string }): Promise<Either<Error, void>>` (task-05); `ListTrainingNotesUseCase.execute(input: { userId: string; de: string; ate: string }): Promise<Either<Error, Array<{ data: string; texto: string; atualizadoEm: string }>>>` (task-05)

### Skills a invocar

- `typescript-advanced`: casos de uso com `Either` e `failure()`/`success()`
- `test-antipatterns`: branches Either cobertos com InMemory, sem banco
- `zod`: validação de `de`/`ate` e datas no input quando usar schemas
- `security-review`: posse verificada por par autor+data em cada operação

## Passos

- **Step 1: Write the failing test**

  ```ts
  test("create persiste e devolve atualizadoEm; duplicata vira DuplicateTrainingNoteError", async () => {
    const repo = new InMemoryTrainingNoteRepository();
    const createUseCase = new CreateTrainingNoteUseCase(repo); // construção segue o padrão dos casos de uso de check-in
    const ok = await createUseCase.execute({ userId: "u1", data: "2026-10-16", texto: "Peito + tríceps 4x12" });
    expect(ok.forceSuccess().value.data).toBe("2026-10-16");
    const dupe = await createUseCase.execute({ userId: "u1", data: "2026-10-16", texto: "outro" });
    expect(dupe.forceFailure()).toBeInstanceOf(DuplicateTrainingNoteError);
    const other = await createUseCase.execute({ userId: "u2", data: "2026-10-16", texto: "outro" });
    expect(other.isSuccess()).toBe(true);
  });
  ```

- **Step 2: Run test to verify it fails**

  Run: (cwd em `apps/backend`) `npx vitest --run --config ./test/vite.config.app-domain.ts src/training-notes/application/use-case/create-training-note.usecase.test.ts`
  Expected: FAIL — `CreateTrainingNoteUseCase` não definido.

- **Step 3: Implement `CreateTrainingNoteUseCase.execute` no arquivo da task**

  Assinatura exata da `## Interfaces`; fluxo: valida entrada → `findByUserIdAndDate` → `failure(new DuplicateTrainingNoteError())` se existir → `TrainingNote.create` → `save` (converte `P2002` também) → `success({ id, data, texto, atualizadoEm })` com `atualizadoEm` ISO-8601 UTC.

- **Step 4: Run test to verify it passes**

  Run: (cwd em `apps/backend`) `npx vitest --run --config ./test/vite.config.app-domain.ts src/training-notes/application/use-case/create-training-note.usecase.test.ts`
  Expected: PASS.

- **Step 5: Write the failing test**

  ```ts
  test("update edita o texto; inexistente vira TrainingNoteNotFoundError sem efeito", async () => {
    const repo = new InMemoryTrainingNoteRepository();
    const updateUseCase = new UpdateTrainingNoteUseCase(repo);
    const createUseCase = new CreateTrainingNoteUseCase(repo);
    const missing = await updateUseCase.execute({ userId: "u1", data: "2026-10-17", texto: "novo" });
    expect(missing.forceFailure()).toBeInstanceOf(TrainingNoteNotFoundError);
    await createUseCase.execute({ userId: "u1", data: "2026-10-17", texto: "inicial" });
    const ok = await updateUseCase.execute({ userId: "u1", data: "2026-10-17", texto: "  Costas 5x5  " });
    expect(ok.forceSuccess().value.texto).toBe("Costas 5x5");
  });
  ```

- **Step 6: Run test to verify it fails**

  Run: (cwd em `apps/backend`) `npx vitest --run --config ./test/vite.config.app-domain.ts src/training-notes/application/use-case/update-training-note.usecase.test.ts`
  Expected: FAIL — `UpdateTrainingNoteUseCase` não definido.

- **Step 7: Implement `UpdateTrainingNoteUseCase.execute` no arquivo da task**

  Assinatura exata da `## Interfaces`; fluxo: lê por autor+data → `TrainingNoteNotFoundError` se vazio → valida novo texto → `save`.

- **Step 8: Run test to verify it passes**

  Run: (cwd em `apps/backend`) `npx vitest --run --config ./test/vite.config.app-domain.ts src/training-notes/application/use-case/update-training-note.usecase.test.ts`
  Expected: PASS.

- **Step 9: Write the failing test**

  ```ts
  test("delete remove; inexistente vira TrainingNoteNotFoundError", async () => {
    const repo = new InMemoryTrainingNoteRepository();
    const deleteUseCase = new DeleteTrainingNoteUseCase(repo);
    const createUseCase = new CreateTrainingNoteUseCase(repo);
    const missing = await deleteUseCase.execute({ userId: "u1", data: "2026-10-18" });
    expect(missing.forceFailure()).toBeInstanceOf(TrainingNoteNotFoundError);
    await createUseCase.execute({ userId: "u1", data: "2026-10-18", texto: "inicial" });
    expect((await deleteUseCase.execute({ userId: "u1", data: "2026-10-18" })).isSuccess()).toBe(true);
    expect(await repo.findByUserIdAndDate("u1", "2026-10-18")).toBeNull();
  });
  ```

- **Step 10: Run test to verify it fails**

  Run: (cwd em `apps/backend`) `npx vitest --run --config ./test/vite.config.app-domain.ts src/training-notes/application/use-case/delete-training-note.usecase.test.ts`
  Expected: FAIL — `DeleteTrainingNoteUseCase` não definido.

- **Step 11: Implement `DeleteTrainingNoteUseCase.execute` no arquivo da task**

  Assinatura exata da `## Interfaces`; fluxo: lê por autor+data → 404 de domínio se vazio → `delete`.

- **Step 12: Run test to verify it passes**

  Run: (cwd em `apps/backend`) `npx vitest --run --config ./test/vite.config.app-domain.ts src/training-notes/application/use-case/delete-training-note.usecase.test.ts`
  Expected: PASS.

- **Step 13: Write the failing test**

  ```ts
  test("list valida intervalo e devolve só o autor em ordem crescente", async () => {
    const repo = new InMemoryTrainingNoteRepository();
    const listUseCase = new ListTrainingNotesUseCase(repo);
    const createUseCase = new CreateTrainingNoteUseCase(repo);
    for (const input of [{ userId: "u1", de: "", ate: "2026-10-31" }, { userId: "u1", de: "2026-10-31", ate: "2026-10-01" }, { userId: "u1", de: "2026-01-01", ate: "2026-12-31" }]) {
      expect((await listUseCase.execute(input)).isFailure()).toBe(true);
    }
    await createUseCase.execute({ userId: "u1", data: "2026-10-20", texto: "a" });
    await createUseCase.execute({ userId: "u1", data: "2026-10-16", texto: "b" });
    await createUseCase.execute({ userId: "u2", data: "2026-10-18", texto: "c" });
    const rows = (await listUseCase.execute({ userId: "u1", de: "2026-10-01", ate: "2026-10-31" })).forceSuccess().value;
    expect(rows.map((r) => r.data)).toEqual(["2026-10-16", "2026-10-20"]);
  });
  ```

- **Step 14: Run test to verify it fails**

  Run: (cwd em `apps/backend`) `npx vitest --run --config ./test/vite.config.app-domain.ts src/training-notes/application/use-case/list-training-notes.usecase.test.ts`
  Expected: FAIL — `ListTrainingNotesUseCase` não definido.

- **Step 15: Implement `ListTrainingNotesUseCase.execute` no arquivo da task**

  Assinatura exata da `## Interfaces`; regras pinadas: `de`/`ate` obrigatórios, `de<=ate`, intervalo até 62 dias, anos 1900–2199; delega a `listByUserIdAndRange` e ordena por data crescente.

- **Step 16: Run test to verify it passes**

  Run: (cwd em `apps/backend`) `npx vitest --run --config ./test/vite.config.app-domain.ts src/training-notes/application/use-case/list-training-notes.usecase.test.ts`
  Expected: PASS.

## Critérios de Sucesso

- Create: sucesso devolve `{ id, data, texto, atualizadoEm }`; duplicata do mesmo autor+data vira `DuplicateTrainingNoteError`; mesmo dia em outra conta passa
- Update: inexistente vira `TrainingNoteNotFoundError` sem efeito; existente atualiza o texto trimado
- Delete: inexistente vira `TrainingNoteNotFoundError`; existente é removido
- List: `de`/`ate` ausentes, `de>ate`, intervalo acima de 62 dias e anos fora de 1900–2199 falham; sucesso retorna só o autor em ordem crescente
- Autor sempre do input `userId`; nenhum caso de uso consulta o contexto user (D3)
