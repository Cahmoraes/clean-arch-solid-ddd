---
created_at: "2026-08-26T14:57:46-03:00"
updated_at: "2026-08-26T14:57:46-03:00"
---

# Auditoria WCAG 2.2 — `features/gyms`, `features/check-ins`, `academias/**`

Procedimento seguido: `wcag-audit-patterns --mode review`, restrito aos critérios solicitados (`1.1.1`, `1.4.11`, `2.5.8`, `3.3.2`, `2.4.6`, `2.5.3`, `4.1.2`, `2.1.1`, `2.4.7`).

Inventário: 6 `<input>` crus, 5 `<button>` crus (fora testes), 15 usos de `<Button>`, 5 pontos de imagem/ícone funcional listados no escopo, mais o toggle de visualização em `academias/page.tsx` (achado novo, fora da amostra prévia).

## Falhas encontradas (7 itens, 17 problemas)

### 1.1.1 — Conteúdo Não Textual · A · 🔴 Crítico · 2 problemas

| Ocorrência | Local | Correção |
|---|---|---|
| Ícone funcional sem nome acessível. | `apps/frontend/src/app/(authenticated)/academias/page.tsx:29-36` (item "cards" do toggle de visualização, ícone `LayoutGrid aria-hidden`, renderizado como `<button>` em `components/ui/segmented-control.tsx:61-81` sem `aria-label` por item) | Adicionar `aria-label="Ver como cards"` ao item (exige estender `SegmentedItem` para aceitar `aria-label` por opção, já que hoje só o `<fieldset>` externo recebe rótulo) |
| Ícone funcional sem nome acessível. | `apps/frontend/src/app/(authenticated)/academias/page.tsx:37-46` (item "rows" do mesmo toggle, ícone `List aria-hidden`) | `aria-label="Ver como lista"` no item |

**Confirmado PASSOU** (verificação da amostra prévia): `gym-card.tsx:52`, `gym-row.tsx:29`, `gym-image.tsx:58`, `gym-image-edit-overlay.tsx:88` e `academias/[id]/page.tsx:247` têm `alt={gym.title}`/`alt={gymTitle}` corretos. Placeholder decorativo em `gym-image.tsx:80` (`ImageIcon aria-hidden`) está corretamente marcado como decorativo. Nenhum outro `<img>`/ícone funcional sem nome foi encontrado além do toggle acima.

### 3.3.2 — Rótulos ou Instruções · A · 🔴 Crítico (base) · 5 problemas

| Ocorrência | Local | Correção |
|---|---|---|
| Campo `<input type='file'>` sem label, aria-label ou placeholder. | `apps/frontend/src/features/gyms/components/gym-image-uploader.tsx:69-75` (o `<span>{label}</span>` da linha 68 não está associado via `htmlFor`/`id` nem `aria-labelledby`) | `<label htmlFor={fileInputId}>{label}</label>` + `id={fileInputId}` no input |
| Campo usa apenas placeholder como rótulo – preferir `<label>` persistente. | `apps/frontend/src/features/check-ins/components/check-in-search-input.tsx:25-31` (só recebe `placeholder`, sem `<label>`/`aria-label`) | Adicionar `aria-label` prop obrigatória no componente, ou `<label className="sr-only">` no wrapper |
| Campo sem nome acessível programático. | idem `check-in-search-input.tsx:25-31` | idem |
| Campo obrigatório sem indicação textual de obrigatoriedade. | `apps/frontend/src/features/gyms/components/gym-cnpj-field.tsx:19-45` (CNPJ é obrigatório em `create-gym-schema.ts:40-44`, mas `FieldShell` é chamado sem `showRequiredIndicator`, sem `required`/`aria-required`) | Passar `showRequiredIndicator` ao `FieldShell` e `required`/`aria-required="true"` no `IMaskInput` |
| Campo obrigatório sem indicação textual de obrigatoriedade. | `apps/frontend/src/features/gyms/components/gym-location-picker.tsx:45-58` (label mostra `*` só por `text-red-500`, sem `required`/`aria-required` no `<input>`) | `required aria-required="true"` no input; complementar o `*` com `<span className="sr-only">(obrigatório)</span>` |

### 2.4.6 — Cabeçalhos e Rótulos · AA · 🟡 Médio (base) · 2 problemas

| Ocorrência | Local | Correção |
|---|---|---|
| Input sem label associado: type='file'. | `gym-image-uploader.tsx:69` | mesma correção do item 3.3.2 acima |
| Campo sem rótulo programático (sem `name`). | `check-in-search-input.tsx:25` | idem 3.3.2 |

### 2.5.3 — Rótulo no Nome · A · 🟡 Médio (base) · 2 problemas

| Ocorrência | Local | Correção |
|---|---|---|
| Campo sem label acessível. | `gym-image-uploader.tsx:69` (texto visível "Imagem da academia (opcional)" existe mas não é exposto como nome acessível do input) | associar via `<label htmlFor>` |
| Uso apenas de placeholder 'Buscar por academia...' sem label. | `check-in-search-input.tsx:25`, consumido em `app/(authenticated)/check-ins/page.tsx:184` e `admin/check-ins/page.tsx:161` | idem 3.3.2 |

### 4.1.2 — Nome, Função, Valor · A · 🔴 Crítico (base) · 4 problemas

| Ocorrência | Local | Correção |
|---|---|---|
| Elemento interativo sem nome acessível. | `gym-image-uploader.tsx:69` | idem 3.3.2 |
| Input sem nome acessível (label, aria-label). | `check-in-search-input.tsx:25` | idem 3.3.2 |
| Botão sem nome acessível. | `academias/page.tsx:29-36` (toggle "cards") | idem 1.1.1 |
| Botão sem nome acessível. | `academias/page.tsx:37-46` (toggle "rows") | idem 1.1.1 |

### 2.5.8 — Tamanho Mínimo do Alvo · AA · 🟢 Baixo · 1 problema

| Ocorrência | Local | Correção |
|---|---|---|
| Ícone interativo com alvo < 24px (w=16, h=16). | `apps/frontend/src/features/check-ins/components/check-in-search-input.tsx:33-40` (botão "Limpar busca" sem `min-width`/`min-height`/`padding`, herda exatamente o `h-4 w-4` do ícone `X`) | `className="inline-flex h-6 w-6 items-center justify-center shrink-0 ..."` (ou `min-w-6 min-h-6`) |

### 2.4.7 — Foco Visível · AA · 🟠 Alto · 1 problema

| Ocorrência | Local | Correção |
|---|---|---|
| CSS `outline-none` remove indicador de foco sem alternativa – viola 2.4.7. | `apps/frontend/src/features/check-ins/components/check-in-search-input.tsx:30` (`className="... outline-none text-sm"` no `<input>` cru) | Trocar por `focus-visible:outline-none` + a técnica de anel duplo decidida no design (padrão já usado em `field-shell.tsx` e `gym-location-picker.tsx:57`) |

Confirmação técnica desse achado: o projeto define um reset global `*:focus-visible { outline: 2px solid ...}` em `apps/frontend/src/app/globals.css:177-180`, dentro de `@layer base`. Compilei o `globals.css` real via `@tailwindcss/postcss` (Tailwind v4.3.0) e verifiquei que `.outline-none` gera `outline-style: none` dentro de `@layer utilities` — e a ordem de camadas declarada no próprio bundle (`@layer theme, base, components, utilities;`) faz `utilities` sempre vencer `base`, independente da ordem física no arquivo. Ou seja, o `outline-none` deste input **anula** o anel de foco global do projeto, e não há nenhuma classe `focus-visible:ring-*` substituta nesse elemento — diferente do padrão correto usado em `gym-location-picker.tsx:57` (`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`).

## PASSOU confirmado (achados relevantes, não exaustivo)

- **2.1.1 Teclado**: nenhum `<div>`/`<span onClick>`, nenhum `role="button"` sem `tabindex`, nenhum `href="#"` em todo o escopo (`gyms/**`, `check-ins/**`, `academias/**`). Todos os controles usam `<button>`, `<a>` (via `Link`) ou `<input>` nativos — PASSOU integral neste critério.
- **2.4.7**: `Button` (`components/ui/button.tsx:15`) e `MASKED_INPUT_CLASS` (`field-shell.tsx:13`) usam `focus-visible:ring-*` corretamente; `gym-location-picker.tsx:57` idem. Todos os demais `<button>`/`<a>` crus do escopo não sobrescrevem `outline`, herdando o anel global — PASSOU.
- **1.1.1 / 4.1.2** em ícones-só-ícone: `Pencil` em `gym-card.tsx:95`, `gym-row.tsx:69`, `gym-image-edit-overlay.tsx:99`, `academias/[id]/page.tsx:259`; `Power`/`RotateCcw` em `academias/[id]/page.tsx:219`; `Check`/`Clock`/`X`/`Loader2` em `check-in-actions.tsx` — todos com ícone `aria-hidden` e `aria-label` no elemento pai. PASSOU.
- **2.5.8** nesses mesmos ícones: todos com `h-8 w-8`/`h-9 w-9`/`h-10 w-10` — acima do mínimo de 24px.
- **3.3.2/2.4.6/2.5.3/4.1.2** em `gym-cnpj-field.tsx`/`gym-phone-field.tsx` (associação `label htmlFor`/`id` via `FieldShell`), `gym-location-picker.tsx` (idem), sliders de zoom com `<label>` envolvente (`gym-image-uploader.tsx:89-101`) ou `aria-label="Zoom"` (`gym-image-edit-overlay.tsx:141`), e o campo de busca de academias (`academias/page.tsx:134-144`, `<label className="sr-only" htmlFor={inputId}>` corretamente associado ao `SearchBar`).
- Input de arquivo oculto em `gym-image-edit-overlay.tsx:101-108` (`className="hidden"`, `tabIndex={-1}`): não é exposto à árvore de acessibilidade (`display:none`), então critérios de rótulo/nome são **N/A** para ele — a interação real ocorre via o botão-lápis com `aria-label` próprio.

## N/A justificados

- **1.1.1** cenário "Gráfico/diagrama complexo com descrição alternativa": não há `<svg>`/`<canvas>` de dados no escopo (apenas ícones de UI via `lucide-react` e o mapa Leaflet, que é um widget interativo, não um gráfico estático).
- **2.5.3** para o input de zoom com `aria-label="Zoom"` sem texto visível (`gym-image-edit-overlay.tsx:141`): cenário de "divergência rótulo × nome" não se aplica pois não há texto visível concorrente.

## Pendente de runtime

- **1.4.11** — Contraste dos ícones funcionais-só-ícone (`Pencil`, `Power`, `RotateCcw`, e os dois ícones do toggle de visualização após corrigidos) contra os fundos `bg-background/80 backdrop-blur` e `bg-primary`/`bg-destructive`: medir ≥ 3:1 no render real.
- **1.4.11** — Indicador de foco (após aplicar a técnica de anel duplo decidida no design) contra os diversos fundos dos componentes: medir ≥ 3:1.
- **2.5.8** — Sobreposição estrutural entre o `<Link>` de edição (posicionado `absolute z-20`) e o `<Link>` que cobre o card/linha inteira: `gym-card.tsx:44-97` e `gym-row.tsx:21-71`. O HTML é válido (irmãos, não aninhados) e o padrão é comum em cards com overlay de ação, mas confirmar no render se as caixas realmente se cruzam na região do ícone.
- **2.5.8** — Altura real do "hit box" dos `<input type="range">` de zoom (`gym-image-uploader.tsx:91-100`, `gym-image-edit-overlay.tsx:133-142`): depende do estilo padrão do navegador, medir ≥ 24px.
- **1.1.1** (cenário "validação proxy com leitor de tela"): após as correções de rótulo propostas acima, validar com NVDA/VoiceOver que os nomes acessíveis são anunciados como esperado.

## Resumo de origem

Todos os 17 problemas têm origem no **módulo** auditado (arquivos dentro de `features/gyms/`, `features/check-ins/` ou `app/(authenticated)/academias/`) — nenhum depende de shell/design system para ser corrigido, exceto o achado de `academias/page.tsx` sobre o toggle de visualização, que exige também estender `components/ui/segmented-control.tsx` (`SegmentedItem`) para aceitar `aria-label` por item — encaminhamento: módulo (uso) + ajuste pontual no componente de design system que hoje não suporta rótulo por item.
