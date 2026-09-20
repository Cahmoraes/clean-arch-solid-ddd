---
created_at: "2026-09-20T17:26:54-03:00"
updated_at: "2026-09-20T17:26:54-03:00"
---

# Tela "Novo aviso" - artefato visual curado

Norte (direcao), nao o pixel final. A fidelidade final e construida na task de implementacao.

## Intencao de design

Tela admin de cadastro de aviso com **formulario em card** (esquerda) e **pre-visualizacao de como o usuario vera o aviso no sino** (direita). O envio e irreversivel e atinge todos os usuarios, por isso o admin confere o texto renderizado antes de disparar. Layout escolhido pelo usuario entre duas opcoes (A: formulario simples; B: card + preview). Escolhida: **B**.

## Estrutura

- Shell existente (`AuthenticatedShell`): item novo **"Novo aviso"** (icone `Megaphone`, lucide) no grupo ADMIN, apos Analytics. Estado ativo: fundo `sidebar-active`.
- Cabecalho da pagina: eyebrow mono "Admin" + `h1` "Novo aviso" (Space Grotesk 500, ~24-30px) + subtitulo "Comunicado enviado a todos os usuarios pelo sino de notificacoes."
- Corpo em duas colunas (`grid`, proporcao ~1.2fr / 1fr, gap 16px; empilha em uma coluna abaixo de ~860px):
  - Esquerda: `Card` (rounded-xl, 22px) com `FormField` Titulo (Input), `FormField` Mensagem (textarea em `FieldShell`, `rows=4`, `resize-none`) com contador "N / 500", e linha `flex justify-end` com `Button` primario "Enviar aviso".
  - Direita: painel de preview (`surface-2`, borda tracejada, `rounded-md`) com rotulo mono "Como o usuario vera" e um `NotificationItem` real (tipo `NOTICE`) alimentado pelos valores do formulario.

## Tokens aplicados (tema VOLT, dark padrao)

| Token | Dark | Light |
|---|---|---|
| background | `#080808` | `#f1f1ec` |
| card | `#161616` | `#ffffff` |
| surface-2 | `#1d1d1d` | `#f7f7f3` |
| border | `#2a2a2a` | `#e4e4dc` |
| foreground | `#f6f6f4` | `#111110` |
| muted-foreground | `#a3a39c` | `#57574f` |
| primary | `#39e58c` (texto `#0a0a0a`) | igual |
| sidebar-active | `#39e58c` / texto `#0a0a0a` | `#ffffff` / `#111110` |

- Fontes: Inter (corpo, 15px), Space Grotesk (titulos), JetBrains Mono (eyebrow e rotulos).
- Raios: botoes e inputs `rounded-md` (14px); card `rounded-xl` (22px).
- Toast (sonner, top-right): sucesso "Aviso enviado para N usuarios."

## Componentes reutilizaveis

`PageContainer`, `PageHeader`, `FormField`, `FieldShell`, `Button`, `Card`, `NotificationItem` (adicionar `NOTICE` ao `NOTIFICATION_TYPE_STYLE`).

## Markup representativo

```tsx
<PageContainer as="section" width="wide">
	<PageHeader eyebrow="Admin" title="Novo aviso" description="Comunicado enviado a todos os usuarios pelo sino de notificacoes." />
	<div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
		<Card>
			<form className="flex flex-col gap-4">
				<FormField label="Titulo" error={errors.title?.message}>
					<Input {...register("title")} />
				</FormField>
				<FormField label="Mensagem" error={errors.message?.message}>
					<FieldShell>
						<textarea rows={4} className="resize-none rounded-md border border-input bg-background px-4 py-2 text-base" {...register("message")} />
					</FieldShell>
					<span className="text-right text-xs text-subtle">{message.length} / 500</span>
				</FormField>
				<div className="flex justify-end">
					<Button type="submit" disabled={isPending}>Enviar aviso</Button>
				</div>
			</form>
		</Card>
		<NoticePreview title={title} message={message} />
	</div>
</PageContainer>
```

## Fonte de design original

Nenhuma; layout definido apenas via mockup do companion.
