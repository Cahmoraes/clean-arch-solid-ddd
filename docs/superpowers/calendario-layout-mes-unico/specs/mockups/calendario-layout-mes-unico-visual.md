# Mockup — Calendário Mês Único

> **Fonte de design original:** nenhuma; layout definido apenas via mockup do companion (sessão `1162391-1789392208`, `layout.html`).

## Intenção de Design

Substituir o grid anual de 12 meses por **mês único com navegação híbrida**: setas de mês no `CardHeader` do calendário + controle de ano (`pill` com `ChevronLeft/Right`) no `PageHeader`. Ao trocar de mês, conteúdo filtra para feriados daquele mês; virada dez→jan e jan→dez troca `selectedYear` automaticamente. Transição `180ms slide+fade` com `prefers-reduced-motion` fallback. Em `<768px`, swipe horizontal também troca de mês.

- **Layout:** `PageContainer wide` → `PageHeader` (título + pill ano) → `grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]` com coluna principal `Card` mês único + sidebar `Card` lista filtrada. Em mobile, colapsa para 1 coluna.
- **Hierarquia:** Título do mês (`aria-live="polite"`, `strong` 15px) é o foco; setas `32px` circulares ao lado; dias em `grid-cols-7 gap-1` com `min-h-10` e feriado destacado `bg-[#ecfdf5] border-[#39e58c]` + nome em `data-name` 7px.
- **Interação:** Setas têm `aria-label` com mês/ano alvo (`"Mês anterior, agosto 2026"`), foco permanece na seta após `setState`; swipe e teclado (ArrowLeft/Right) também navegam.
- **Sidebar:** `Feriados de {mês}` com `FeriadoItem` (`bg-muted`, data mono + nome + dia da semana), fonte `BrasilAPI` no rodapé; quando mês sem feriado, mensagem vazia.

## Tokens Aplicados

- `--volt-green: #39e58c` (borda feriado, badge)
- `--muted: #f4f4f5` (fundo item, hover pill)
- `--border: #e4e4e7` (Card, pill, weekdays)
- `--card-radius: 22px` (Card)
- `--radius-muted-item: 14px` / `10px` (FeriadoItem/data)
- Tipografia: sans `-apple-system` 13–18px; mono para data/ano
- Espaçamento: `gap-6` grid principal, `gap-1` dias, `p-3` items

## Core HTML (fragmento representativo)

```html
<div class="page-header">
  <h1>Calendário</h1>
  <div class="pill" aria-label="Navegação de ano">
    <button aria-label="Ano anterior, ir para 2025">‹</button>
    <span class="year-label">2026</span>
    <button aria-label="Ano seguinte, ir para 2027">›</button>
  </div>
</div>

<div class="grid-cal">
  <div class="card">
    <div class="card-header">
      <div><h2>Setembro 2026</h2><span>1 feriado no mês</span></div>
      <div class="month-nav" aria-label="Navegação de mês">
        <button aria-label="Mês anterior, agosto 2026">‹</button>
        <strong aria-live="polite">Setembro 2026</strong>
        <button aria-label="Próximo mês, outubro 2026">›</button>
      </div>
    </div>
    <div class="weekdays"><span>Dom</span><span>Seg</span>…<span>Sáb</span></div>
    <div class="days" role="grid">
      <div class="day holiday" data-name="Independência" aria-label="7 de setembro, feriado nacional">7</div>
    </div>
  </div>
  <div class="card">
    <div class="card-header"><h2>Feriados de setembro</h2><span>1 de 9 em 2026</span></div>
    <div class="sidebar-list">
      <div class="f-item"><div class="f-date">07/09</div><div><div class="f-name">Independência do Brasil</div><div class="f-type">nacional · segunda-feira</div></div></div>
    </div>
  </div>
</div>
```

## Fidelidade

Artefato direcional (*norte*), não pixel-final. Fidelidade final construída na implementação usando componentes reais (`Card`, `Button`, `Skeleton`, `PageContainer`, `PageHeader`) e tokens do tema. `prefers-reduced-motion` deve desabilitar animação.
