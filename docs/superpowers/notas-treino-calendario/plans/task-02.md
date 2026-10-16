# Task 2: Entidade TrainingNote e erros de domínio [FR-001, FR-005]

**Status:** DONE

**PRD:** `../prd/prd-notas-treino-calendario.md`

**Spec:** `../specs/notas-treino-calendario-design.md`

**Tier:** standard

## Visão Geral

Cria a entidade pura `TrainingNote` (data como dia de calendário, texto normalizado por trim) e os quatro erros de domínio com seus `kind`. É o coração das regras que repositórios, casos de uso e controllers vão reutilizar.

## Arquivos

- Create: `apps/backend/src/training-notes/domain/entity/training-note.ts`
- Create: `apps/backend/src/training-notes/domain/error/invalid-training-note-text-error.ts`
- Create: `apps/backend/src/training-notes/domain/error/invalid-training-note-date-error.ts`
- Create: `apps/backend/src/training-notes/domain/error/duplicate-training-note-error.ts`
- Create: `apps/backend/src/training-notes/domain/error/training-note-not-found-error.ts`
- Test: `apps/backend/src/training-notes/domain/entity/training-note.test.ts`

## Interfaces

- **Consome:** N/A
- **Produz:** `TrainingNote.create(input: { id?: string; userId: string; data: string; texto: string }): Either<InvalidTrainingNoteTextError | InvalidTrainingNoteDateError, TrainingNote>` (task-03, task-04); `TrainingNote.restore(input: { id: string; userId: string; data: string; texto: string; createdAt: Date; updatedAt: Date }): TrainingNote` sem validação (task-03); `InvalidTrainingNoteTextError` e `InvalidTrainingNoteDateError` com `kind = "validation"` (task-04, task-05); `DuplicateTrainingNoteError` com `kind = "conflict"` (task-03, task-04, task-05); `TrainingNoteNotFoundError` com `kind = "not-found"` (task-04, task-05)

### Skills a invocar

- `typescript-advanced`: tipos da entidade e erros com `kind` literais
- `test-antipatterns`: testes de domínio sem mocks, um comportamento por teste

## Passos

- **Step 1: Review Focus: Texto com exatamente 500 caracteres aceito e com 501 recusado — Write the failing test**

  ```ts
  test("INV-02 texto com 500 caracteres é aceito e com 501 é recusado", () => {
    const ok = TrainingNote.create({ userId: "u1", data: "2026-10-16", texto: "a".repeat(500) });
    expect(ok.isSuccess()).toBe(true);
    const tooLong = TrainingNote.create({ userId: "u1", data: "2026-10-16", texto: "a".repeat(501) });
    expect(tooLong.isFailure()).toBe(true);
    const empty = TrainingNote.create({ userId: "u1", data: "2026-10-16", texto: "   " });
    expect(empty.isFailure()).toBe(true);
    expect(empty.forceFailure().kind).toBe("validation");
  });
  ```

- **Step 2: Run test to verify it fails**

  Run: (cwd em `apps/backend`) `npx vitest --run --config ./test/vite.config.app-domain.ts src/training-notes/domain/entity/training-note.test.ts`
  Expected: FAIL — `TrainingNote` não definido.

- **Step 3: Implement `TrainingNote.create` e `InvalidTrainingNoteTextError` nos arquivos da task**

  Assinatura exata da `## Interfaces`; regras pinadas: `texto.trim()` com `texto.trim().length` entre 1 e 500 (quebras internas preservadas), vazio → `failure(new InvalidTrainingNoteTextError())`.

- **Step 4: Run test to verify it passes**

  Run: (cwd em `apps/backend`) `npx vitest --run --config ./test/vite.config.app-domain.ts src/training-notes/domain/entity/training-note.test.ts`
  Expected: PASS (1 teste).

- **Step 5: Write the failing test**

  ```ts
  test("data inválida é recusada e restore não valida", () => {
    for (const data of ["2026-02-30", "16-10-2026", "1899-12-31", "2200-01-01"]) {
      expect(TrainingNote.create({ userId: "u1", data, texto: "treino" }).isFailure()).toBe(true);
    }
    const restored = TrainingNote.restore({ id: "id1", userId: "u1", data: "2026-10-16", texto: "  Peito + tríceps 4x12  ", createdAt: new Date(), updatedAt: new Date() });
    expect(restored.texto).toBe("Peito + tríceps 4x12");
  });
  ```

- **Step 6: Run test to verify it fails**

  Run: (cwd em `apps/backend`) `npx vitest --run --config ./test/vite.config.app-domain.ts src/training-notes/domain/entity/training-note.test.ts`
  Expected: FAIL — data `2026-02-30` aceita (validação de data real e anos 1900–2199 ausente).

- **Step 7: Implement validação de `data` e `TrainingNote.restore` nos arquivos da task**

  Regras pinadas: `data` real `YYYY-MM-DD` (ex. `2026-02-30` inválida), anos 1900–2199; falha → `failure(new InvalidTrainingNoteDateError())` com `kind = "validation"`; `restore` constrói sem validar e normaliza `texto` com trim.

- **Step 8: Run test to verify it passes**

  Run: (cwd em `apps/backend`) `npx vitest --run --config ./test/vite.config.app-domain.ts src/training-notes/domain/entity/training-note.test.ts`
  Expected: PASS (2 testes).

- **Step 9: Write the failing test**

  ```ts
  test("erros de conflito e ausência carregam o kind correto", () => {
    expect(new DuplicateTrainingNoteError().kind).toBe("conflict");
    expect(new TrainingNoteNotFoundError().kind).toBe("not-found");
  });
  ```

- **Step 10: Run test to verify it fails**

  Run: (cwd em `apps/backend`) `npx vitest --run --config ./test/vite.config.app-domain.ts src/training-notes/domain/entity/training-note.test.ts`
  Expected: FAIL — `DuplicateTrainingNoteError` não definido.

- **Step 11: Implement `DuplicateTrainingNoteError` e `TrainingNoteNotFoundError` nos arquivos da task**

  `kind` pinados: `conflict` e `not-found`, seguindo o padrão de erros de domínio com `kind` mapeado por `STATUS_BY_ERROR_KIND`.

- **Step 12: Run test to verify it passes**

  Run: (cwd em `apps/backend`) `npx vitest --run --config ./test/vite.config.app-domain.ts src/training-notes/domain/entity/training-note.test.ts`
  Expected: PASS (3 testes).

## Critérios de Sucesso

- INV-02 [unit]: Nota com texto vazio não chega ao banco
- Texto com exatamente 500 caracteres aceito e com 501 recusado (Review Focus; spec Significados: 1 a 500 após trim, contagem `texto.trim().length`)
- `data` irreal (`2026-02-30`) e anos fora de 1900–2199 recusados com `kind = "validation"`; `restore()` sem validação
- `DuplicateTrainingNoteError.kind = "conflict"`, `TrainingNoteNotFoundError.kind = "not-found"`
