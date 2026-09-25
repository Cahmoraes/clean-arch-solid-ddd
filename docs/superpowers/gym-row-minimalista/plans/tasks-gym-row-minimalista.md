# Tarefas: Linha de Academia Minimalista

**Spec:** `../specs/gym-row-minimalista-design.md`

**PRD:** `../prd/prd-gym-row-minimalista.md`

---

## Tarefas

- [x] 1. Indicador de status por ponto e limpeza da linha → `task-01.md`
- [x] 2. Ícones de ação Check-in e editar com tooltip → `task-02.md`

## Restrições Globais

- Nenhuma mudança de backend, API, tema, fonte VT323 ou chanfros.
- `GymCard` (visão em grid) fica como está: o usuário escolheu mudar só o `GymRow`.
- Tema, fonte e tokens atuais mantidos.
- Runner: Vitest + Testing Library (`pnpm test -- --run` em `apps/frontend`), nomes em PT-BR com `test`.

## Foco de Revisão

- Academia desativada sem `adminEditHref` → ponto "Disponível" (verde), nunca "Desativada" → `task-01`
- Telefone preenchido ou ausente → nada de telefone nem "Ver detalhes" na linha → `task-01`
- Título muito longo com ícones de ação → padding reservado à direita, sem sobreposição → `task-02`
- Sem `adminEditHref` → nenhum ícone de editar, só Check-in → `task-02`
