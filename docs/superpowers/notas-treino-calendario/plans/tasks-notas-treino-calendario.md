# Tarefas: Notas de Treino no Calendário

**Spec:** `../specs/notas-treino-calendario-design.md`

**PRD:** `../prd/prd-notas-treino-calendario.md`

---

## Tarefas

- [x] 1. Migration e model Prisma de training_notes → `task-01.md`
- [x] 2. Entidade TrainingNote e erros de domínio → `task-02.md`
- [x] 3. Repositórios port, Prisma e InMemory → `task-03.md`
- [x] 4. Casos de uso criar, atualizar, excluir e listar → `task-04.md`
- [x] 5. Controllers, rotas, IoC e tipos OpenAPI → `task-05.md`
- [x] 6. Camada de dados frontend com TanStack Query → `task-06.md`
- [x] 7. UI do calendário com notas e fidelidade visual → `task-07.md`

## Restrições Globais

- `data` = dia de calendário `YYYY-MM-DD` em America/Sao_Paulo, exibido como está, sem conversão de fuso (spec, Significados)
- `texto` = UTF-8 com 1 a 500 caracteres após trim (spec, Significados)
- contagem = `texto.trim().length` nas três camadas, trim no sentido de `String.trim`, quebras internas preservadas (spec, Significados)
- `de`/`ate` = dias de calendário com `de<=ate` e intervalo até 62 dias (spec, Significados)
- os dois lados limitam anos a 1900–2199 (spec, Significados)
- autor = `sub` do JWT extraído no backend, o cliente não o informa (spec, Significados)
- corpos de erro = `{message}` via ResponseFactory, e o frontend diferencia os casos pelo status HTTP (spec, Significados)
- `accent #3ee0ff` para nota (spec, Especificação Visual)

## Foco de Revisão

- Duplo clique em Salvar criando duas notas do mesmo dia → uma persiste e o conflito vira 409 com orientação de editar → `task-03`
- Virada de ano na navegação (dez→jan) → bounds de/ate do mês correto e lista recarrega → `task-06`
- Nota criada perto da meia-noite → permanece no dia clicado, sem deslocamento de fuso → `task-05`
- 409 na criação → modal sugere editar em vez de erro genérico → `task-07`
- Texto com exatamente 500 caracteres aceito e com 501 recusado → `task-02`
