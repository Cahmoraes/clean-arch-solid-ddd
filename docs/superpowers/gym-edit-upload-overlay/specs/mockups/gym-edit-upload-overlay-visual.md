# Visual — Gym Edit Upload Overlay

**Feature:** `gym-edit-upload-overlay`
**Fonte de design:** Mockup gerado via Visual Companion nesta sessão (sem Figma ou fonte externa).
**Fidelidade:** Norte direcional — fidelidade final construída na implementação.

---

## Decisões Visuais

### 1. Overlay da imagem cover (ícone Pencil)

Posição e estilo idênticos ao `gym-detail-edit` do detail page para consistência visual:

```html
<!-- Wrapper da cover -->
<div class="relative h-40 w-full">
  <GymImage imageKey={imageKey} alt={gymTitle} className="h-full w-full rounded-[8px]" />

  <!-- Botão overlay — sempre visível, canto sup. direito -->
  <button
    type="button"
    aria-label="Alterar imagem da academia"
    class="absolute right-3 top-3 z-20 inline-flex h-9 w-9 items-center justify-center
           rounded-md border border-border bg-background/80 text-foreground backdrop-blur
           transition-colors hover:bg-background hover:text-primary"
  >
    <Pencil class="h-4 w-4" aria-hidden="true" />
  </button>

  <!-- Input oculto -->
  <input type="file" accept="image/*" class="hidden" ref={inputRef} />
</div>
```

**Tokens aplicados:**
- `border-border` → `--color-border: #2a2a2a` (dark)
- `bg-background/80` → `--color-background: #080808` com 80% opacidade
- `backdrop-blur` → blur nativo Tailwind
- `hover:text-primary` → `--color-primary: #39e58c`
- `rounded-md` → `--radius-sm: 8px`

---

### 2. Dialog do Cropper

```html
<Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
  <DialogContent class="max-w-md max-h-[90dvh] overflow-auto">
    <DialogHeader>
      <DialogTitle>Ajustar imagem</DialogTitle>
    </DialogHeader>

    <!-- Área do cropper -->
    <div class="relative h-[280px] w-full overflow-hidden rounded-lg bg-black">
      <Cropper ... />
    </div>

    <!-- Zoom -->
    <label class="flex items-center gap-2 text-xs text-muted-foreground">
      Zoom
      <input type="range" min={1} max={3} step={0.1} class="flex-1" />
    </label>

    <DialogFooter>
      <Button variant="outline" type="button">Cancelar</Button>
      <Button type="button" disabled={isProcessing}>
        {isProcessing ? "Processando..." : "Confirmar recorte"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

### 3. Linha de ações do formulário

```html
<div class="flex justify-end gap-2">
  <Button variant="outline" type="button" onClick={() => router.push('/admin/academias')}>
    Cancelar
  </Button>
  <Button type="submit" disabled={isPending}>
    {isPending ? "Salvando..." : "Salvar alterações"}
  </Button>
</div>
```

**Nota:** `justify-end gap-2` — Cancelar fica à esquerda do Salvar por ordem natural no flex.

---

## O que foi removido

O bloco `<GymImageUploader onCropped={setImageBlob} label="Trocar imagem (opcional)" />` que aparecia no final do form é **removido**. Sua lógica foi absorvida pelo `GymImageEditOverlay` com o cropper no Dialog.
