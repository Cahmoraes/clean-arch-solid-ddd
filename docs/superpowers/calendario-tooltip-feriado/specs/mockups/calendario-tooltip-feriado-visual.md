---
created_at: "2026-09-19T11:23:29-03:00"
updated_at: "2026-09-19T11:23:29-03:00"
---
# Visual: feriado âmbar, hoje verde, tooltip

Norte, não pixel-final. Tema escuro do app.

- Dia atual: `border-primary bg-primary/10` (#39e58c).
- Feriado: `border-warning bg-warning/10` (#ffb443).
- Célula: `min-h-14 rounded-md border p-1`, número em `font-mono`, nome do feriado `text-[7px]` abaixo.
- Tooltip: `TooltipContent` padrão (`bg-popover border-border text-xs rounded-md px-3 py-1.5`), aberto no hover do feriado.
- Card do calendário: `bg-card` #161616, borda #2a2a2a.

Opção escolhida no preview: A (feriado âmbar). Opção B (`secondary` #1d1d1d) descartada por baixo contraste.
