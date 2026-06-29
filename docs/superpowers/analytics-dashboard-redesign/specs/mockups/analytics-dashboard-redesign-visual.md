---
created_at: "2026-06-29T10:40:05-03:00"
updated_at: "2026-06-29T10:40:05-03:00"
---

# Especificação Visual — Analytics Dashboard Redesign

**Fonte de design original:** nenhuma; layout definido via mockup interativo do Visual Companion (sessão de brainstorming em 2026-06-29).

**Fidelidade:** este artefato é um *norte*. Fidelidade final construída na implementação.

---

## Decisões de Layout e Hierarquia

1. **Ordem vertical da página:** period selector → at-risk zone → KPI cards → retention mini-stats. Essa ordem segue o princípio de "dado mais acionável primeiro": a lista at-risk exige ação imediata; os KPI cards dão contexto; os mini-stats fecham o detalhe de retenção.
2. **At-risk zone:** ocupa a largura total do container (max-w-4xl). Cor de alerta: âmbar (não vermelho) para evitar falsa urgência — vermelho fica reservado para dias críticos individuais.
3. **KPI cards:** grid de 3 colunas (1fr 1fr 1fr). Card de retenção recebe tratamento de destaque visual (borda colorida, fundo levemente tintado) para indicar que é a métrica-alvo.
4. **Sparklines:** posicionadas no canto inferior direito do card, `position: absolute`, com `opacity: 0.35` — presença contextual sem competir com o número principal.
5. **Retention mini-stats:** row de 3 pills compactos abaixo dos KPI cards, sem seção colapsável, sem label de seção proeminente.

---

## Tokens Aplicados

```css
--color-background: #080808;    /* bg da página */
--color-card: #161616;          /* bg dos cards */
--color-surface2: #1d1d1d;     /* bg de items internos */
--color-border: #2a2a2a;        /* borda padrão */
--color-primary: #39e58c;       /* acento verde */
--color-primary-fg: #0a0a0a;   /* texto sobre primário */
--color-text: #f6f6f4;          /* texto principal */
--color-muted: #a3a39c;         /* texto secundário */
--color-destructive: #ef4444;   /* inativos, churn, dias críticos */
--color-warn: #f59e0b;          /* at-risk border/text */
--color-warn-soft: rgba(245,158,11,0.10);
--color-warn-border: rgba(245,158,11,0.25);
--color-success-soft: rgba(57,229,140,0.10);
--color-success-border: rgba(57,229,140,0.25);
--radius-md: 14px;              /* cards */
--radius-sm: 8px;               /* pills, rows internos */
--radius-xs: 6px;               /* member rows na alert zone */
font-family: Inter, system-ui, sans-serif;
font-family-mono: 'JetBrains Mono', monospace;  /* valores numéricos */
```

---

## Core HTML (estrutura de referência)

```html
<!-- Period selector — existente, sem mudança -->
<div class="period-selector">
  <button class="period-btn">7d</button>
  <button class="period-btn active">30d</button>
  <button class="period-btn">3m</button>
  <button class="period-btn">12m</button>
</div>

<!-- At-risk zone (estado com risco) -->
<div class="at-risk-zone" style="
  background: var(--color-warn-soft);
  border: 1px solid var(--color-warn-border);
  border-radius: var(--radius-md);
  padding: 16px 20px;
">
  <div class="alert-header">
    <span class="alert-icon">⚠</span>
    <span class="alert-title" style="color: var(--color-warn); font-weight: 700;">
      8 membros em risco de churn
    </span>
    <button class="alert-link">ver todos</button>
  </div>
  <div class="alert-members">
    <!-- membro crítico (>= 18 dias) -->
    <div class="member-row">
      <div class="member-avatar">AS</div>
      <span class="member-name">Ana Santos</span>
      <span class="days-badge critical">21 dias sem check-in</span>
    </div>
    <!-- membro âmbar (< 18 dias) -->
    <div class="member-row">
      <div class="member-avatar">CL</div>
      <span class="member-name">Carlos Lima</span>
      <span class="days-badge warning">15 dias sem check-in</span>
    </div>
  </div>
</div>

<!-- Healthy zone (zero at-risk) -->
<div class="healthy-zone" style="
  background: var(--color-success-soft);
  border: 1px solid var(--color-success-border);
  border-radius: var(--radius-md);
  padding: 12px 20px;
  display: flex; align-items: center; gap: 10px;
">
  <span style="font-size: 16px;">✓</span>
  <div>
    <div style="font-weight: 700; color: var(--color-primary);">Academia saudável</div>
    <div style="font-size: 12px; color: var(--color-muted);">
      Nenhum membro em risco de churn nos últimos 30 dias
    </div>
  </div>
</div>

<!-- KPI cards com sparklines -->
<div class="kpi-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">

  <!-- KPI padrão -->
  <div class="kpi-card" style="
    background: var(--color-card);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 18px 20px 14px;
    position: relative; overflow: hidden;
  ">
    <div class="kpi-value" style="font-family: var(--font-mono); font-size: 32px; font-weight: 700;">
      1.284
    </div>
    <div class="kpi-label" style="font-size: 12px; color: var(--color-muted);">Check-ins no período</div>
    <!-- Sparkline SVG (gerada por buildSparklinePath) -->
    <svg style="position:absolute;bottom:0;right:0;width:45%;height:50%;opacity:0.35;pointer-events:none;"
         viewBox="0 0 80 30" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sg-checkins" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#39e58c" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="#39e58c" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path d="M0,25 Q20,18 40,12 T80,4" fill="none" stroke="#39e58c" stroke-width="1.5"/>
      <path d="M0,25 Q20,18 40,12 T80,4 L80,30 L0,30 Z" fill="url(#sg-checkins)"/>
    </svg>
  </div>

  <!-- KPI destaque (retenção) -->
  <div class="kpi-card highlight" style="
    background: rgba(57,229,140,0.04);
    border: 1px solid rgba(57,229,140,0.35);
    border-radius: var(--radius-md);
    padding: 18px 20px 14px;
    position: relative; overflow: hidden;
  ">
    <div class="kpi-value" style="font-family: var(--font-mono); font-size: 32px; font-weight: 700; color: #39e58c;">
      82%
    </div>
    <div class="kpi-label" style="font-size: 12px; color: var(--color-muted);">Taxa de retenção</div>
    <svg style="position:absolute;bottom:0;right:0;width:45%;height:50%;opacity:0.5;pointer-events:none;"
         viewBox="0 0 80 30" preserveAspectRatio="none">
      <path d="M0,22 Q20,20 40,16 T80,10" fill="none" stroke="#39e58c" stroke-width="1.5"/>
    </svg>
  </div>

</div>

<!-- Retention mini-stats -->
<div class="retention-row" style="
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;
">
  <div class="ret-pill" style="
    background: var(--color-card); border: 1px solid var(--color-border);
    border-radius: var(--radius-sm); padding: 10px 16px;
    display: flex; justify-content: space-between; align-items: center;
  ">
    <span style="font-size: 12px; color: var(--color-muted);">Membros ativos</span>
    <span style="font-family: var(--font-mono); font-size: 15px; font-weight: 700;">312</span>
  </div>
  <div class="ret-pill" style="/* idêntico acima */">
    <span style="font-size: 12px; color: var(--color-muted);">Inativos</span>
    <span style="font-family: var(--font-mono); font-size: 15px; font-weight: 700; color: #ef4444;">44</span>
  </div>
  <div class="ret-pill" style="/* idêntico acima */">
    <span style="font-size: 12px; color: var(--color-muted);">Taxa de churn</span>
    <span style="font-family: var(--font-mono); font-size: 15px; font-weight: 700; color: #ef4444;">4,2%</span>
  </div>
</div>
```

---

## Notas de Implementação

- **Badge de dias:** crítico (cor `--color-destructive`) quando `daysSinceLastCheckIn >= AT_RISK_CRITICAL_THRESHOLD` (constante = 18); âmbar (`--color-warn`) abaixo do threshold.
- **Sparkline:** o helper `buildSparklinePath(data: number[]): string` normaliza os valores para `viewBox="0 0 80 30"`, retorna um `<path>` `d` attribute. Se `data.length < 2` ou todos os valores são iguais, retorna linha horizontal no meio do viewBox.
- **"Ver todos":** toggle de estado local (`showAll: boolean`) — não navega para outra página. Limita a 3 itens por padrão.
- **Skeleton:** usar shadcn `<Skeleton>` nas mesmas dimensões dos componentes enquanto `isLoading = true`.
