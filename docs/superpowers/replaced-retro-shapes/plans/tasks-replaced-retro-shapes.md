# Tarefas: Formas e Tipografia Retrô Replaced

**Spec:** `../specs/replaced-retro-shapes-design.md`

**PRD:** `../prd/prd-replaced-retro-shapes.md`

---

## Tarefas

- [x] 1. Tokens de chanfro com corner-shape e validação do anel de foco → `task-01.md`
- [x] 2. VT323 como fonte de display → `task-02.md`
- [x] 3. Forma retrô nos componentes compartilhados → `task-03.md`
- [x] 4. Tipografia de terminal nos componentes compartilhados → `task-04.md`
- [x] 5. Forma retrô em features e páginas → `task-05.md`
- [x] 6. Tipografia de terminal em features e páginas → `task-06.md`
- [x] 7. Scanlines de CRT e caret de terminal → `task-07.md`
- [x] 8. Guarda de resíduo, documentação e conferência de acessibilidade → `task-08.md`

## Restrições Globais

- `--radius-*` = tamanho do chanfro em px quando há suporte a `corner-shape`; 0 quando não há. Nunca significa raio de arredondamento. (spec, Fronteiras e Contratos)
- Chanfros: `--radius-xs` 2px, `--radius-sm` 4px, `--radius-md` 6px, `--radius-lg` 10px, `--radius-xl` 12px (spec, Arquitetura e Fluxo)
- Elementos com menos de 12px de lado (dots de status) usam `rounded-none`: um chanfro neles vira losango. (spec, Arquitetura e Fluxo)
- `rounded-full` = proibido em `src/` (exceto allowlist); círculo não faz parte da identidade. (spec, Fronteiras e Contratos)
- `font-display` = VT323, peso único 400; `font-bold` não se aplica a ela. (spec, Fronteiras e Contratos)
- VT323 tem x-height baixa: tamanhos ~1,25× os atuais (título de card 20px → 26px; botão 13px → 18px; rótulo 10px → 15px); nenhum texto em VT323 abaixo de 15px. (spec, Especificação Visual)
- Scanline = decoração; nunca entra no cálculo de contraste e nunca fica sobre o texto. (spec, Fronteiras e Contratos)
- Nenhum componente declara `corner-shape`; só `globals.css`. (spec, Características Arquiteturais)
- Paleta, layout e estrutura do shell não mudam; glow nunca em texto. (spec, Escopo)

## Foco de Revisão

- Navegador sem `corner-shape` (Firefox/Safari) → cantos retos (raio 0), nunca arredondados → `task-01`
- Anel de foco duplo num botão ou campo chanfrado → aparece completo, sem corte nos cantos → `task-01`
- Dot de status ou elemento com menos de 12px de lado → canto reto (`rounded-none`), nunca losango → `task-03`
- Rótulo, eyebrow ou badge em VT323 → nunca abaixo de 15px, mesmo onde hoje é 10–12px → `task-04`
- Tema claro → nenhuma scanline visível nas 4 superfícies → `task-07`
