---
created_at: "2026-09-15T09:04:44-03:00"
updated_at: "2026-09-15T09:04:44-03:00"
---

# Visual — Horário de Funcionamento (DetailCard)

**Fonte de design original:** Nenhuma; layout definido via mockup do visual companion (operating-hours-v1.html) em `.superpowers/brainstorm/13499-1789473169/content/operating-hours-v1.html`.

**Artefato efêmero:** `operating-hours-v1.html` (3 variações A/B/C). Decisão aprovada: **C · Compacto + expansível + status (recomendado)**.

## Decisões visuais (norte, não pixel-final)

- **Layout:** bloco `Horário de funcionamento` dentro do `DetailCard` existente, após `<dl>` de `phone/address/lat/lng`. Header com ícone `Clock` (14px) + label uppercase 11px. Conteúdo em `border-border rounded-[10px] bg-[#fcfcf9]` (card interno).
- **Hierarquia:** badge de status (“Aberto agora / Fechado”) é o elemento primário quando há horário; resumo compacto secundário; tabela expansível terciária sob `<details>`/`disclose`.
- **Resumo compacto:** agrupa dias consecutivos com mesmo horário: `Seg–Sex 06:00–22:00 · Sáb 08:00–14:00 · Dom fechado`. Fonte 12px, intervalos em `<b>`, fechado em `<em>` muted.
- **Tabela expansível:** 7 linhas `weekday | intervals ou Fechado`, colapsada por padrão, expande via “Ver horários completos ▾”. Linha `today` com fundo `rgba(57,229,140,.10)` e texto `#0a7a3a` destacada.
- **Badge status:** pill 11px bold, `Aberto → bg #e6f9ee border #b6e8c8 text #0a7a3a`, `Fechado → bg #fff1f0 border #ffd0cc text #b42318`, com `Fecha às HH:mm` ou `Abre às HH:mm` quando relevante.
- **Estado vazio:** quando `operatingHours == null`, bloco mostra “Horário não informado” em muted 12px (sem badge/tabela).
- **Spacing/escala:** gap-6/p-6 no DetailCard, gap-3 no dl, bloco com padding 8–10px, radius 10px interno vs 12px externo, imagem 16:9 rounded 8px (existente).
- **Tokens aplicados:** primary `#39e58c` (badge selected, today bg), card `#ffffff`, bg `#f1f1ec`, foreground `#111110`, muted `#57574f`, subtle `#8a8a80`, border `#e4e4dc`, border-strong `#d3d3c9`, radius DetailCard 12px / image 8px / card 22px, font display `Space_Grotesk` 600 tracking -0.02em, sans `Inter` 0.9375rem/1.5.
- **Interação:** resumo sempre visível; clique em “Ver horários completos” expande tabela; badge recalculado no client com `timeZone: 'America/Sao_Paulo'` sem request extra.
- **Responsivo:** DetailCard single column max-w-4xl; bloco ocupa 100% da largura do card.

## Core HTML/JSX (representativo — layout C)

```tsx
// DetailCard — trecho após <dl>
{operatingHours ? (
  <div className="mt-3 rounded-[10px] border border-border bg-[#fcfcf9] overflow-hidden">
    <div className="flex items-center gap-1.5 px-2.5 py-2 text-[11px] font-semibold uppercase tracking-[.05em] text-muted-foreground border-b border-border">
      <Clock className="h-3.5 w-3.5" /> Horário de funcionamento
    </div>
    <div className="flex items-center justify-between px-2.5 py-2">
      <span className="text-xs font-semibold text-[#0a7a3a]">● Aberto agora</span>
      <span className="rounded-full bg-[#e6f9ee] border border-[#b6e8c8] px-2 py-1 text-[11px] font-bold text-[#0a7a3a]">Fecha às 22:00</span>
    </div>
    <div className="px-2.5 pb-1 text-xs leading-5">Seg–Sex <b>06:00–22:00</b> · Sáb <b>08:00–14:00</b> · <em className="text-muted-foreground not-italic">Dom fechado</em></div>
    <details className="border-t border-border">
      <summary className="flex justify-center py-1.5 text-[11px] text-muted-foreground cursor-pointer">Ver horários completos ▾</summary>
      <table className="w-full text-xs">
        <tbody>
          {/* 7 linhas; today com bg-[rgba(57,229,140,.10)] */}
          <tr className="border-b border-[#ecece6] bg-[rgba(57,229,140,.10)]"><td className="px-2.5 py-1.5 font-medium text-[#0a7a3a]">Segunda</td><td className="px-2.5 py-1.5 text-right text-muted-foreground">06:00 – 22:00</td></tr>
          <tr><td className="px-2.5 py-1.5">Domingo</td><td className="px-2.5 py-1.5 text-right italic text-[#b0b0a6]">Fechado</td></tr>
        </tbody>
      </table>
    </details>
  </div>
) : (
  <div className="mt-3 rounded-[10px] border border-dashed border-border p-2.5 text-xs text-muted-foreground">Horário não informado</div>
)}
```

## Fidelidade

Mockup é um **norte** direcional. Fidelidade final é construída na task de implementação contra este artefato + tokens reais (`src/app/globals.css` via Tailwind 4.3 e `shadcn/ui`), preferindo validação visual com ferramentas do ambiente quando disponíveis. Não re-derivar layout — reusar decisões acima.
