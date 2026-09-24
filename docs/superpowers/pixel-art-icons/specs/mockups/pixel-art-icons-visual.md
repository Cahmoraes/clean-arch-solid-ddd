# Ícones Pixel-Art: Norte Visual

Curado da prévia do companion (`icon-compare.html`, descartada): sidebar lucide atual vs pixelarticons 2.4.1, expandida, recolhida e ampliada.

## Decisões visuais (norte, não pixel-final)

- **Menu lateral:** ícones 24px (`h-6 w-6`), `currentColor`, alinhados à esquerda com `gap-3` quando expandido; centralizados no rail de 76px quando recolhido.
- **Estados:** ativo = fundo `sidebar-active` (ciano) com `sidebar-active-foreground`; inativo = `sidebar-muted`; hover = `bg-white/5` + `sidebar-foreground`; Sair em hover = `text-destructive`. Nada muda além do glifo.
- **Ícones pequenos** (paleta, KPIs, badges, notificações): 16px; badges de papel 12px.
- **Renderização:** `shape-rendering: crispEdges`, sem `stroke`; ícones de traço 1px da lib devem cair em múltiplos de 12/16/20/24px.
- **Mapeamento de referência:** ver tabela em `pixel-art-icons-design.md`, "Fronteiras e Contratos". Dashboard=`layout`, Check-ins=`checkbox-on`, Academias=`building`, Calendário=`calendar`, Assinatura=`credit-card`, Analytics=`chart-bar-big`, Sair=`logout`, recolher/expandir=`arrow-bar-left/right`.

**Fonte de design original:** nenhuma; definido pela prévia do companion sobre `pixelarticons` 2.4.1.

**Fidelidade:** a prévia é um norte. A conferência final é visual, nas telas reais, nos temas claro e escuro.
