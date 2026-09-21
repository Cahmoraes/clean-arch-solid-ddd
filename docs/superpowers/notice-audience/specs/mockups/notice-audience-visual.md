---
created_at: "2026-09-21T09:21:11-03:00"
updated_at: "2026-09-21T09:21:11-03:00"
---

# Novo aviso: seletor de público (norte visual)

Artefato curado da opção **B** (cartões de rádio) escolhida no companion. Não é o pixel final.

## Intenção de design

- O seletor "Público-alvo" fica dentro do card do formulário, entre "Mensagem" e o botão "Enviar aviso".
- Três cartões de rádio em linha (grid de 3 colunas, gap 8px): **Todos**, **Alunos**, **Administradores**. Cada um tem título e uma linha de descrição.
- Cartão selecionado: borda `primary` + anel de 1px `primary` (`box-shadow: 0 0 0 1px`), indicador circular no canto superior direito preenchido em `primary`. Padrão inicial: **Todos**.
- Segue o padrão dos cartões de plano em `/assinatura` (label envolvendo `input type=radio` sr-only; foco por `focus-within` com anel).
- Preview (coluna direita): abaixo do item de notificação, linha "Público: <X>" em mono, uppercase, cor `primary`.
- Abaixo de md, os três cartões empilham em uma coluna.

## Markup representativo

```html
<fieldset class="flex flex-col gap-2">
  <legend class="text-sm font-medium">Público-alvo</legend>
  <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
    <label class="relative rounded-lg border border-border bg-card p-3 has-[:checked]:border-primary has-[:checked]:shadow-[0_0_0_1px_var(--color-primary)] has-[:focus-visible]:ring-2">
      <input type="radio" name="audience" value="ALL" class="sr-only" />
      <span class="block text-sm font-semibold">Todos</span>
      <span class="block text-xs text-muted-foreground">Alunos e administradores ativos</span>
    </label>
    <!-- MEMBERS: "Alunos" / "Somente alunos ativos"; ADMINS: "Administradores" / "Somente administradores ativos" -->
  </div>
</fieldset>
```

## Tokens aplicados (tema VOLT, escuro por padrão)

- Cores: `primary #39e58c` (fg `#0a0a0a`), bg `#080808`, card `#161616`, surface-2 `#1d1d1d`, borda `#2a2a2a`, texto `#f6f6f4`, muted `#a3a39c`. Claro: card `#ffffff`, borda `#e4e4dc`, texto `#111110`.
- Raios: cartão de opção `rounded-lg`, card do formulário `rounded-xl` (22px), botão e inputs `rounded-md` (14px).
- Tipografia: Inter (corpo), Space Grotesk (títulos), JetBrains Mono (linha "Público" do preview).
- Foco: anel duplo do app (2px de espaço + 2px de anel).

## Fonte de design original

Nenhuma; definido apenas via mockup do companion.

## Nota de fidelidade

Esta é a direção. A fidelidade final é construída na task de implementação, contra os componentes reais (`NoticeForm`, `NoticePreview`).
