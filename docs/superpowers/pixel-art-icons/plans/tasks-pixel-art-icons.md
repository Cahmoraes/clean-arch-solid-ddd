# Tarefas: Ícones Pixel-Art

**Spec:** `../specs/pixel-art-icons-design.md`

**PRD:** `N/A`

---

## Tarefas

- [x] 1. Módulo pixel-icons, gerador e testes → `task-01.md`
- [x] 2. Menu lateral com ícones pixel-art → `task-02.md`
- [x] 3. Paleta de comandos e notificações → `task-03.md`
- [x] 4. Componentes de ui compartilhados → `task-04.md`
- [x] 5. Features admin, atividade, dashboard, planos e assinatura → `task-05.md`
- [x] 6. Features check-ins, academias, perfil e contato → `task-06.md`
- [x] 7. Páginas autenticadas → `task-07.md`
- [x] 8. Remoção do lucide-react, guardas e documentação → `task-08.md`

## Restrições Globais

- Tamanho: só 12, 16, 20 ou 24px. 24px é exato na grade; `crispEdges` evita borrão nos demais, mas em 16 e 20px a espessura do traço pode variar entre 1 e 2px.
- Menu lateral e recolhido: 24px (`h-6 w-6`). Paleta, KPIs, badges e ícones inline: 16px (`h-4 w-4`). `h-3.5`→`h-4`, `h-4.5`→`h-6` no menu, `h-3` fica (12px), `h-5` fica (20px).
- Cor: sempre `currentColor`; ativo, hover e destrutivo continuam dos tokens existentes. Nunca glow.
- Semântica: os ícones são decorativos (`aria-hidden`); o nome acessível fica no `aria-label` do botão ou link, como hoje.
- Cada componente renderiza um `<svg viewBox="0 0 24 24" fill="currentColor" shape-rendering="crispEdges" aria-hidden="true" focusable="false">` com o `path` da lib e repassa `className` e demais props de SVG.
- Nova dependência de runtime: não há; os paths são vendorizados.
- Cabeçalho de licença no mesmo arquivo: versão `pixelarticons` 2.4.1, licença MIT e aviso de copyright copiados do `LICENSE` do pacote.
- Fora de escopo: `PixelBolt` (`brand-mark.tsx`, grade 8x8) e `PixelScene`; variante `-sharp`; `components.json` (`iconLibrary: "lucide"`) permanece.

## Foco de Revisão

- Ícone renderizado sem classe de tamanho (`ArrowRight` em `EditProfileModal`, `X` em `bulk-action-bar`) → continua 24px como no lucide, nunca 0 nem colapsado → `task-01`
- Tipos de notificação (aprovado, rejeitado, alerta, promoção, aviso) → cada um continua com ícone visualmente distinto, não todos iguais → `task-03`
- `svg` de ícone da atividade e de status → mantém a classe de tom (`text-accent`, `text-warning`, `text-muted-foreground`) repassada pelo `className` → `task-05`
- `Loader2` de aprovar/rejeitar check-in → `.animate-spin` fica no próprio `<svg>` e gira em passos (`steps(8)`), o botão não perde o estado de carregamento → `task-06`
- Classe de tamanho fora da lista (`h-3.5`, `w-3.5`, `size-3.5`, `h-4.5`, `w-4.5`) em arquivo que importa ícone pixel → falha no teste de guarda, não passa despercebida → `task-08`
