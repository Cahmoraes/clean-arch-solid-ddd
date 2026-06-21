# Mockup Curado — Sidebar Recolhível

> Norte visual (não pixel-final). Distilado do mockup do companion desta sessão.
> Fonte de design original: nenhuma ferramenta externa. Inspiração: Perplexity (trilho de ícones), claude.ai (recolhimento).

## Intenção de Design

- **Dois estados** do `<aside>`:
  - **Expandido (268px):** logo com wordmark, seções "Principal"/"Admin" com labels, item ativo em pílula, footer com avatar + nome.
  - **Recolhido (~76px):** só ícones centralizados; wordmark vira só a marca; labels viram tooltip; footer mostra só o avatar.
- **Alternador:** botão chevron circular discreto na borda direita do `<aside>`, alinhado ao topo. Aponta `‹` quando expandido (ação: recolher) e `›` quando recolhido (ação: expandir).
- **Transição:** largura animada (`transition-[width]` / `transition-all`), labels somem via `sr-only` quando recolhido.
- **Tooltip:** aparece à direita do ícone, só no estado recolhido, no `hover` **e** `focus`.

## Tokens Aplicados (do `globals.css`)

| Uso | Token | Valor (tema claro) |
|---|---|---|
| Fundo sidebar | `--color-sidebar` | `#111110` |
| Texto sidebar | `--color-sidebar-foreground` | `#f3f3ee` |
| Texto secundário | `--color-sidebar-muted` | `#8d8d84` |
| Borda sidebar | `--color-sidebar-border` | `#262622` |
| Pílula ativa (fundo) | `--color-sidebar-active` | `#ffffff` (claro) / `#39e58c` (escuro) |
| Marca / acento | `--color-primary` | `#39e58c` |
| Raio dos itens | classe `rounded-xl` | 22px |

Larguras: **268px** (expandido) e **76px** (recolhido), idênticas ao grid atual `grid-cols-[268px_1fr]` / `max-[860px]:grid-cols-[76px_1fr]`.

## Core HTML (representativo — estado recolhido)

```html
<aside class="rail collapsed"> <!-- 76px -->
  <button class="toggle" aria-label="Expandir menu" aria-expanded="false" aria-controls="nav-principal">
    <svg><!-- chevron-right --></svg>
  </button>

  <a class="brand" href="/inicio"><span class="logo"></span></a>

  <nav id="nav-principal" aria-label="Navegação principal">
    <a class="nav active" href="/inicio" aria-current="page" aria-label="Dashboard">
      <svg aria-hidden="true"><!-- layout-grid --></svg>
      <span class="sr-only">Dashboard</span>
      <span class="tooltip" role="tooltip">Dashboard</span>
    </a>
    <!-- demais itens: Check-ins, Academias, Perfil, Assinatura -->
  </nav>

  <div class="footer"><!-- avatar só --></div>
</aside>
```

## Notas de Acessibilidade (carregam para a implementação)

- Item recolhido **mantém** nome acessível: `aria-label` no `<a>` ou `<span class="sr-only">`; nunca apenas `display:none` no label.
- Tooltip com `role="tooltip"`; surge no `hover` e `focus`.
- Botão toggle: `aria-label` dinâmico ("Recolher menu" / "Expandir menu"), `aria-expanded`, `aria-controls` apontando para o `id` do `<nav>`.

## Fidelidade

Direcional. A implementação reusa o markup/estilos atuais do `AuthenticatedShell`, apenas tornando o estado recolhido dirigido pelo store em vez de só pela media query.
