# Ícones Pixel-Art: Design

- **Norte visual:** `mockups/pixel-art-icons-visual.md`
- **Features relacionadas:** `replaced-visual-redesign`, `replaced-retro-shapes`, `sidebar-collapse-toggle`, `admin-semantic-icons`

## Visão Geral

O redesign Replaced deu ao frontend paleta neon, fonte VT323, chanfros e scanlines, mas os ícones continuam `lucide-react` (traço fino, cantos arredondados), o que destoa do tema. Objetivo: todos os ícones do frontend passam a ser pixel-art, com origem única e nítidos em `currentColor`.

Sucesso, observável: (1) nenhum import de `lucide-react` em `apps/frontend/src` e a dependência removida; (2) ícones nítidos em 24px no menu e 16px nos pequenos; (3) ativo, hover, recolhido e contraste inalterados; (4) `biome:fix`, `tsc:check`, `test --run` e `build` passam.

Entendimento confirmado pelo usuário: escopo é "todos os ícones em todos os lugares"; fonte é `pixelarticons` 2.4.1 (MIT, 24x24); ícone sem par exato aceita o mais próximo.

## Escopo

**Dentro**
- 52 arquivos de produção e 6 de teste que importam `lucide-react` (menu lateral, paleta de comandos, notificações, KPIs, páginas, botões, `status-icon.ts`, `sheet`, `checkbox`).
- Módulo novo `components/ui/pixel-icons.tsx` com os SVGs vendorizados.
- Remoção de `lucide-react` do `package.json`; guarda contra reintrodução.
- Atualização da seção Design System de `apps/frontend/AGENTS.md`.

**Fora de escopo**
- `PixelBolt` (`brand-mark.tsx`, grade 8x8) e `PixelScene`: já são pixel-art próprios.
- Variante `-sharp` da lib: decisão do usuário, usa-se a normal.
- `components.json` (`iconLibrary: "lucide"`) permanece: só afeta o CLI do shadcn. A guarda abaixo pega ícones lucide trazidos por componentes novos.
- Prosa histórica em `tasks/prd-frontend-web-app/*` que cita lucide.
- Nova dependência de runtime: não há; os paths são vendorizados.

**Regra do redesign ampliada:** `replaced-visual-redesign` limitava pixel-art a login, hero e estados vazios e vetava dependências novas. Esta feature amplia o limite para ícones em toda a UI, sem dependência nova.

## Arquitetura e Fluxo

Um módulo único, `components/ui/pixel-icons.tsx`, exporta um componente por ícone com o mesmo nome de uso do lucide (`Users`, `Building2`, `CheckCircle`...). Cada componente renderiza um `<svg viewBox="0 0 24 24" fill="currentColor" shape-rendering="crispEdges" aria-hidden="true" focusable="false">` com o `path` da lib e repassa `className` e demais props de SVG. Os call sites só trocam o caminho do import; mapas (`ACTION_ICON`, `NavItem.icon`, `KpiSlot`) continuam recebendo referências de componente. O tipo `LucideIcon` é substituído por `PixelIcon` (`ComponentType<SVGProps<SVGSVGElement>>`) exportado do mesmo módulo.

## Componentes

**`pixel-icons.tsx`** — Oculta: o formato dos paths, o mapa nome da lib → componente, os atributos de acessibilidade e de renderização nítida. Expõe: um componente por ícone e o tipo `PixelIcon`. Acoplamento: os consumidores dependem só do nome e de `className`; nenhum conhece o `path`.

**Cabeçalho de licença** no mesmo arquivo: versão `pixelarticons` 2.4.1, licença MIT e aviso de copyright copiados do `LICENSE` do pacote (a atribuição MIT é obrigatória para a cópia vendorizada).

**Script `scripts/generate-pixel-icons.mjs`** (uso pontual, não roda no build): baixa os SVGs de `pixelarticons@2.4.1` para os nomes do mapeamento abaixo, aborta se algum não existir e reescreve os dados de `pixel-icons.tsx`. Existe para que atualizar a versão seja repetível.

**Guarda `no-lucide.test.ts`** em `src/test/`: falha se qualquer arquivo de `src/` importar `lucide-react`, no padrão de `rounded-residue.test.ts`.

## Fronteiras e Contratos

**Significados**
- Tamanho: só 12, 16, 20 ou 24px. 24px é exato na grade; `crispEdges` evita borrão nos demais, mas em 16 e 20px a espessura do traço pode variar entre 1 e 2px. Menu lateral e recolhido: 24px (`h-6 w-6`). Paleta, KPIs, badges e ícones inline: 16px (`h-4 w-4`). `h-3.5`→`h-4`, `h-4.5`→`h-6` no menu, `h-3` fica (12px), `h-5` fica (20px).
- Cor: sempre `currentColor`; ativo, hover e destrutivo continuam dos tokens existentes. Nunca glow.
- Semântica: os ícones são decorativos (`aria-hidden`); o nome acessível fica no `aria-label` do botão ou link, como hoje.

**Mapeamento lucide → pixelarticons** (nomes verificados contra a listagem de 2.4.1; o script gerador aborta se um nome não existir):

| Uso | Ícone |
|---|---|
| Dashboard, Check-ins, Academias, Calendário | `layout`, `checkbox-on`, `building`, `calendar` |
| Perfil, Usuários, Assinatura, Planos | `user`, `users`, `credit-card`, `wallet` |
| Analytics, Novo aviso, Sair | `chart-bar-big`, `megaphone`, `logout` |
| Recolher / Expandir menu | `arrow-bar-left` / `arrow-bar-right` |
| CheckCircle, CheckCircle2, CircleCheck | `checkbox-on` |
| Check, X, Plus, Search, Pencil, Trash2 | `check`, `close`, `plus`, `search`, `pencil`, `trash` |
| AlertTriangle/TriangleAlert, AlertCircle | `warning-diamond`, `circle-info` |
| Shield, ShieldCheck, ShieldAlert | `shield` (semântica vem da cor/rótulo) |
| Chevron*/Arrow* | `chevron-*` / `arrow-*` |
| Loader2 | `loader` |
| Demais (Activity, Flame, Filter, List, LayoutGrid, Mail, MapPin, Clock, Bell*, Tag, Power, Rotate*, Moon, Sun, Key*, User*, MoreHorizontal, BadgeCheck, CircleSlash, BarChart3, Phone) | `chart-line`, `fire`, `filter`, `bulletlist`, `grid-2x2-2`, `mail`, `map-pin`, `clock`, `bell`/`bell-off`, `label`, `power`, `reload`, `moon`, `sun`, `key`, `user`, `more-horizontal`, `check-double`, `cancel`, `chart-bar-big`, `phone` |

## Falhas e Erros

| Falha | Detecção | Comportamento | Usuário vê |
|---|---|---|---|
| Nome de ícone inexistente na lib | aborto do script gerador | nada é escrito em `pixel-icons.tsx` | nada (falha em dev) |
| Ícone sem par exato | revisão desta tabela | usa o mais próximo | ícone aproximado |
| `Loader2` estático | teste visual | rotação em passos (`steps(8)`) para manter o aspecto pixel | spinner em passos |

## Especificação Visual

**Artefato curado:** `mockups/pixel-art-icons-visual.md`

**Fonte de design original:** nenhuma; layout definido pela prévia do companion sobre `pixelarticons` 2.4.1.

**Decisões visuais (norte, não pixel-final):**
- Menu lateral: ícones 24px (`h-6 w-6`), `currentColor`; ativo em `sidebar-active`, inativo em `sidebar-muted`, hover `bg-white/5`.
- Ícones pequenos (paleta, KPIs, badges, notificações) em 16px; badges de papel em 12px.
- Renderização com `crispEdges`, sem `stroke`.

**Fidelidade:** o mockup é um norte; a conferência final é visual, nas telas reais, nos temas claro e escuro.

## Decisões Arquiteturais

### D1. Vamos vendorizar os paths de `pixelarticons` 2.4.1 num módulo próprio, com componentes nomeados no espelho do lucide

- **Contexto:** `@nsmr/pixelart-react` 2.0.0 não tem `megaphone`, está parado desde mar/2025 e cobre 11 dos 13 ícones do menu; `pixelarticons` 2.4.1 cobre os 13. Alternativas: componente único `<PixelIcon name>` (rejeitada: reescreve os ~58 call sites e os mapas); SVGR/loader com o pacote (rejeitada: ferramenta de build nova em Next e Vitest).
- **Decisão:** vamos copiar os paths para `pixel-icons.tsx`.
- **Justificativa:** técnica: diff mínimo nos consumidores e um ponto único de troca; de negócio: identidade visual do jogo coerente sem dependência que possa parar.
- **Consequências:** ganha zero dependência de runtime e controle total; aceita manter um arquivo de dados e o aviso de licença MIT, e atualizar a versão à mão.
- **Conformidade:** a guarda `no-lucide.test.ts` e o teste do módulo (svg, `aria-hidden`, `crispEdges`, `className` repassado, viewBox `0 0 24 24`).

**Decisões locais (reversíveis):**

| Decisão | Padrão | Gatilho para rever |
|---|---|---|
| Variante | normal, não `-sharp` | usuário pedir cantos retos |
| Grade | 24x24, tamanhos 12/16/20/24 | ícone borrado em algum tamanho |
| Spinner | `loader` com `steps(8)` | aparência ruim no teste visual |

## Riscos

| Risco | Onde | Impacto | Prob. | Score | Mitigação |
|---|---|---|---|---|---|
| Testes checam `svg` com classe (`assinatura`, `activity-tab`, `gym-row`) | 3 testes | 2 | 2 | 4 🟡 | componente sempre renderiza `<svg>` e repassa `className`; ajustar testes |
| Tamanhos fora da lista (12/16/20/24) ou traço irregular em 16/20px | ~10 arquivos | 2 | 3 | 6 🔴 | tabela de tamanhos acima e revisão visual das telas com `h-3.5`/`h-4.5` |
| Callers passam props exclusivas do lucide (`strokeWidth`, `size`) | vários | 1 | 2 | 2 🟢 | `tsc:check` acusa; remover a prop |
| Contraste de ícones cinza-azulado em 16px | sidebar, paleta | 2 | 1 | 2 🟢 | tokens já testados em `contrast-tokens.test.tsx` |

## Testes

Vitest + Testing Library: `pnpm --filter frontend test -- --run`, mais `tsc:check`, `lint:fix` (Biome, zero problemas) e `build`. Cenários:
- `pixel-icons.test.tsx`: cada componente renderiza `<svg>` com `aria-hidden`, `shape-rendering="crispEdges"`, viewBox `0 0 24 24`, `className` repassado, coordenadas inteiras no path.
- `no-lucide.test.ts`: nenhum import de `lucide-react` em `src/`.
- Atualizar `status-icon.test.ts`, `stat-card.test.tsx`, `empty-state.test.tsx`, `segmented-control.test.tsx` e os 2 testes restantes que importam lucide; ajustar os 3 que consultam `svg`.
- `authenticated-shell.test.tsx`: itens continuam achados por `aria-label`; recolhido mostra tooltip.
- Verificação visual manual do menu (ativo, hover, recolhido, claro e escuro) e das telas com tamanhos alterados.
