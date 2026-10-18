# Clima Detalhado: Norte Visual

Fidelidade: é um norte (direção), não a tela final pixel a pixel. O mockup foi visto no companion do brainstorming com dados de exemplo, tema escuro Noite neon; o botão de unidade foi pedido depois e não aparece desenhado.

## Intenção de design

Três cards empilhados na coluna de `max-w-md` (448px), abaixo da busca e do globo que já existem:

1. **Agora:** nome da cidade, ícone grande (64px) ao lado da temperatura em VT323 (80px, `tracking` de 0,04em, sem `font-bold`) e da condição em ciano (`text-accent`). Abaixo, uma grade de 3 caixas (Sensação, Umidade, Vento) e outra de 2 (Mínima, Máxima). Botão de unidade no canto superior direito do card, rótulo do sistema oposto ao ativo (`°F` quando está em Celsius).
2. **Próximas horas:** título "Próximas horas", faixa com rolagem horizontal de 24 itens de 58px (hora, ícone 24px, temperatura). O item "Agora" tem borda `primary`.
3. **Próximos 7 dias:** título "Próximos 7 dias", linhas com dia da semana, ícone 24px, barra fina de faixa (`muted` com preenchimento `accent`) e `mín / máx`.

Rodapé do resultado: linha pequena `text-muted-foreground` com o crédito à Open-Meteo.

## Tokens aplicados (tema escuro)

background `#0a1424`; card `#0d1b2e`; borda `#16304d`; foreground `#dbe9f7`; muted-foreground `#9db4cc`; muted `#101f36`; primary `#ff3ea5`; accent `#3ee0ff`. Fontes: `font-display` (VT323) para números, títulos e condição; `font-sans` (Inter) para rótulos. Cards com chanfro via `rounded-xl` (chanfro de 12px, só em `globals.css`), caixas internas `rounded-md`. Sem glow em texto.

## Núcleo do markup (ilustrativo)

```html
<div class="card">
  <div class="sub">Cajamar</div>
  <div class="top">
    <svg width="64" height="64"><!-- ícone da condição --></svg>
    <div><div class="d temp">22,4°C</div><div class="d cond">Céu limpo</div></div>
  </div>
  <div class="grid3">
    <div class="box"><div class="lbl">Sensação</div><div class="val">21,8°C</div></div>
    <div class="box"><div class="lbl">Umidade</div><div class="val">64%</div></div>
    <div class="box"><div class="lbl">Vento</div><div class="val">12 km/h NE</div></div>
  </div>
</div>
```

## Fonte de design original

Nenhuma; mockup do companion.
