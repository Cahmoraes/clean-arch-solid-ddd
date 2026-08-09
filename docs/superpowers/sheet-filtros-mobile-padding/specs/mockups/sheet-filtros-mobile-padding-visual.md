---
created_at: "2026-08-09T17:31:37-03:00"
updated_at: "2026-08-09T17:31:37-03:00"
---

# Especificação Visual — Margem lateral no bottom sheet de filtros (mobile)

## Fonte de design original

Nenhuma; problema reportado via 2 screenshots do app real (usuário) mostrando o bug em produção. Layout de correção definido via mockup do companion de brainstorming (comparação lado a lado antes/depois).

## Decisões visuais (norte, não pixel-final)

- **Layout:** o corpo do bottom sheet (chips de status + botões "Limpar"/"Aplicar") ganha `16px` (`px-4`) de padding horizontal, igual ao padding já existente no header (título "Filtros").
- **Hierarquia:** nenhuma mudança de hierarquia — só alinhamento de respiro lateral entre o título e o conteúdo abaixo dele.
- **Spacing/escala:** `px-4` (16px), consistente com a escala Tailwind já usada em `SheetHeader` (`p-4`).
- **Tokens:** fundo `#080808` (dark, tema padrão do app), chips ativos em pill mint `#39e58c` sobre texto `#0a0a0a`, botão "Aplicar" sólido mint, botão "Limpar" outline com borda `#2a2a2a`.

## Antes / Depois (resumo do mockup aprovado)

| | Antes (bug) | Depois (aprovado) |
|---|---|---|
| Padding horizontal do corpo do sheet | `0px` — chips e botões colados na borda da tela | `16px` — alinhado ao título |
| Padding horizontal do header | `16px` (`p-4`, inalterado) | `16px` (mantido, redistribuído para não duplicar) |

## Fidelidade

O mockup é um *norte* de espaçamento (antes/depois comparativo), não uma tela pixel-final nova — a tela final já existe em produção (`check-in-filter-bar.tsx`, `user-filter-bar.tsx`); a mudança é puramente o padding herdado do componente base `sheet.tsx`. Fidelidade final: aplicar exatamente as classes definidas na seção "Decisões Arquiteturais" do spec principal e validar visualmente contra as duas telas reais do app em viewport mobile.
