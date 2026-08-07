---
created_at: "2026-08-07T18:25:21-03:00"
updated_at: "2026-08-07T18:25:21-03:00"
---

# Especificação Visual — Ícones Semânticos em Telas Admin

**Origem:** mockup comparativo do companion de brainstorming (bespoke HTML, tokens reais do tema dark do projeto). Nenhuma fonte de design externa (Figma/screenshot) foi usada — decisão tomada diretamente comparando opções lado a lado.

## Decisões visuais aprovadas

### 1. Botões de ação (rodapé do painel de detalhe / linhas de tabela)

- **Editar dados** e **Mais ações** (trigger) viram `Button size="icon"` — ícone-só, sem texto visível.
- Cada botão ícone-só carrega **Tooltip visual** (aparece no hover e no foco de teclado) **e** `aria-label`, nunca só um dos dois.
- Ícone de editar: `Pencil` (lucide-react). Ícone de "mais ações": `MoreHorizontal` (kebab horizontal).
- Os **itens internos** do dropdown "Mais ações" (Radix `DropdownMenuItem`) permanecem em texto — só o botão-gatilho muda.
- Mesmo tratamento se aplica ao par Aprovar/Rejeitar de check-ins (`Check`/`X`).

### 2. Badge de papel (Membro/Admin)

- **Sem alteração.** Mantém texto puro. Descartado ícone-só por risco de ambiguidade semântica (achado de pesquisa de acessibilidade) e por o texto já ser curto (5-8 caracteres) — o ganho de espaço não compensaria a perda de clareza.

### 3. Badge de status (Ativo/Inativo/Bloqueado, e o par Disponível/Desativada de academias)

- O dot colorido (`h-1.5 w-1.5 rounded-full bg-current`) é **substituído** por um ícone semântico, mantendo o texto ao lado (nunca ícone-só).
- Ativo/Disponível → `CircleCheck`. Inativo/Desativada → `CircleSlash`. Bloqueado → `TriangleAlert`.

## Núcleo de markup representativo (proposta A do comparativo, aprovada)

```html
<div class="btn btn-icon" style="background:var(--primary);color:#06210f">
  <svg class="icn-btn" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
  </svg>
  <div class="tooltip">Editar dados</div>
</div>
<div class="btn btn-icon outline">
  <svg class="icn-btn" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>
  </svg>
  <div class="tooltip">Mais ações</div>
</div>
```

```html
<span class="pill pill-active">
  <svg class="icn" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4">
    <path d="M20 6 9 17l-5-5"/>
  </svg>
  Ativo
</span>
```

## Tokens aplicados (tema real do projeto, `apps/frontend/src/app/globals.css`)

- Cor de destaque: `--color-primary` / `--color-accent` = `#39e58c`
- Radius de botão: `rounded-md` (14px); badges: `rounded-full` (pill)
- Fonte: display `Space Grotesk`, corpo/UI `Inter` (tokens já estabelecidos do design system, não uma escolha nova deste mockup)
- Tons de status: `success` `#2fcf80`, `warning` `#ffb443`, `destructive` `#ff5a4d`, cada um com variante `-soft` para o fundo do pill

## Fidelidade

Este artefato é um *norte* — a fidelidade final (paths reais dos ícones `lucide-react`, ajuste fino de espaçamento) é construída na task de implementação, contra os componentes reais `Button`/`StatusBadge`/`Tooltip` do projeto.
