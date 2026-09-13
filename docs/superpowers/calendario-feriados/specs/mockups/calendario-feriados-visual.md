---
created_at: "2026-09-13T18:32:36.384-03:00"
updated_at: "2026-09-13T18:32:36.384-03:00"
---

# Mockup visual — Calendario de Feriados

## Intencao visual

A nova tela deve parecer parte natural da area logada VOLT: sidebar escura fixa, item ativo em verde, conteudo em cards claros, cabecalho com eyebrow mono em PT-BR e titulo em display. O item **Calendario** entra na secao **Principal**, junto de Inicio, Check-ins e Academias.

## Decisoes visuais

- **Layout:** shell autenticado em duas colunas, com sidebar existente a esquerda e conteudo da rota `/calendario` no painel principal.
- **Hierarquia:** titulo "Calendario 2026" no topo, navegacao de ano ao lado, calendario mensal como card principal e resumo/lista de proximos feriados em coluna lateral.
- **Interacao:** botoes anterior/proximo alteram o ano selecionado; feriados aparecem destacados no grid e listados no painel lateral.
- **Estados:** loading ocupa a area do calendario; erro exibe mensagem clara e acao de retry sem remover a navegacao.

## Tokens aplicados

- Background: `#f1f1ec`; foreground: `#111110`; surface/card: `#ffffff`; muted: `#f7f7f3`; border: `#e4e4dc`.
- Sidebar: `#111110`; item ativo/primary: `#39e58c`; primary strong: `#22c976`; muted sidebar: `#8d8d84`.
- Radius: cards `22px`, controles `14px`, botoes/nav `8px-14px`, pill `9999px`.
- Tipografia: Inter para corpo, Space Grotesk para titulos, JetBrains Mono para labels/eyebrows.

## Core HTML de referencia

```html
<aside class="sidebar">
  <nav aria-label="Navegacao principal">
    <div class="nav-item">Inicio</div>
    <div class="nav-item">Check-ins</div>
    <div class="nav-item">Academias</div>
    <div class="nav-item active">Calendario</div>
  </nav>
</aside>

<main class="content">
  <header class="page-header">
    <p class="eyebrow">Feriados nacionais</p>
    <h1>Calendario 2026</h1>
    <div aria-label="Navegacao de anos">
      <button>2025</button>
      <strong>2026</strong>
      <button>2027</button>
    </div>
  </header>

  <section class="calendar-layout">
    <article class="calendar-card">
      <h2>Abril</h2>
      <div class="day holiday">21 Tiradentes</div>
    </article>
    <aside class="side-panel">Proximos feriados</aside>
  </section>
</main>
```

## Fonte original

Nenhuma fonte externa. Layout definido via Visual Companion em `http://localhost:60547` durante o brainstorming.

## Fidelidade

Este artefato e um norte visual, nao a tela pixel-final. A implementacao deve usar os componentes reais (`AuthenticatedShell`, `PageHeader`, `Card`, `Button`) e os tokens do design system do frontend.
