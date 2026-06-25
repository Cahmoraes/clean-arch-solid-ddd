---
created_at: "2026-06-25T11:36:10-03:00"
updated_at: "2026-06-25T11:36:10-03:00"
---

# Design Spec — Gym Edit Upload Overlay

## Visão Geral

Melhoria de UX na tela de edição de academia (`/admin/academias/[id]/editar`). Três mudanças independentes mas coesas:

1. **Botão Cancelar** — botão `outline` ao lado de "Salvar alterações" que navega o usuário de volta à listagem `/admin/academias`, permitindo descartar a edição sem salvar.
2. **Overlay de edição na imagem cover** — ícone `Pencil` fixo no canto superior direito da imagem (padrão idêntico ao detail page), com hover verde/borda; clique dispara um `input[type=file]` oculto.
3. **Cropper em Dialog** — ao selecionar um arquivo, o recortador abre em um `Dialog` (shadcn) centralizado; ao confirmar, `useSetGymImage()` é chamado imediatamente (upload independente do submit do form). O bloco `GymImageUploader` ao final do form é removido.

---

## Características Arquiteturais

**Priorizadas (top 3):**

| Característica | Por quê (preocupação de domínio) | Critério mensurável |
|---|---|---|
| Consistência visual | Admins navegam entre detail e edit constantemente; ícone idêntico reduz carga cognitiva | Ícone Pencil em posição/estilo idêntico ao `gym-detail-edit` |
| Usabilidade | Cancelar deve ser um gesto de 1 clique; upload de imagem não deve exigir scroll até o final do form | Cancelar visível na mesma linha do submit; imagem editável sem scroll |
| Desacoplamento de operações | Upload de imagem e salvamento de dados são operações ortogonais — erro num não deve contaminar o outro | Salvar form não faz upload; upload não dispara submit |

**Consideradas, não priorizadas:** performance (operações simples sem impacto mensurável), scalability (feature de admin, volume baixo).

---

## Especificação Visual

**Artefato curado:** `mockups/gym-edit-upload-overlay-visual.md`

**Fonte de design original:** Nenhuma; layout definido via mockup do Visual Companion nesta sessão.

**Decisões visuais (norte, não pixel-final):**
- Botão "Cancelar" com `variant="outline"` à esquerda de "Salvar alterações" na div `flex justify-end gap-2` já existente
- Ícone `Pencil` (Lucide, `h-4 w-4`) no canto `right-3 top-3` da cover, com classes `absolute z-20 inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background/80 backdrop-blur transition-colors hover:bg-background hover:text-primary` — idêntico ao `gym-detail-edit` do detail page
- Dialog do cropper: título "Ajustar imagem", área do `Cropper` com altura fixa `h-[280px]`, controle de zoom, botões "Cancelar" (outline) e "Confirmar recorte" (primary) no footer
- Tokens aplicados: `--color-primary: #39e58c`, `--color-border: #2a2a2a`, `--color-background/80` com `backdrop-blur`, `--radius-sm: 8px`

**Fidelidade:** o mockup é um *norte*. Fidelidade final construída na implementação.

---

## Estrutura de Componentes

### Novo: `GymImageEditOverlay`

**Localização:** `src/features/gyms/components/gym-image-edit-overlay.tsx`

**Responsabilidade:** Renderizar a cover da academia com interação de edição inline — ícone overlay, input de arquivo oculto, dialog de recorte, e upload imediato ao confirmar.

**Props:**
```typescript
interface GymImageEditOverlayProps {
  gymId: string
  imageKey: string | null
  gymTitle: string
}
```

**Lógica interna:**
- `useRef<HTMLInputElement>` para o `input[type=file]` oculto
- `useState<string | null>` para `imageSrc` (object URL)
- `useState<boolean>` para `dialogOpen`
- `useSetGymImage()` para executar o upload
- Ao clicar no ícone: `inputRef.current.click()`
- `onChange` do input: `URL.createObjectURL(file)` → `setImageSrc` → `setDialogOpen(true)`
- Dialog fecha ao confirmar (com sucesso) ou cancelar; `URL.revokeObjectURL` ao fechar
- Sucesso: `toast.success` + `invalidateQueries(['gym', gymId])` para refetch da cover

**Dependências:** `GymImage`, `Dialog`/`DialogContent`/`DialogHeader`/`DialogFooter` (shadcn), `Cropper` (react-easy-crop), `getCroppedBlob`, `useSetGymImage`, `Button`

### Modificação: `EditGymForm`

- Remove `GymImageUploader` e `imageBlob` state
- Remove `uploadImageIfPresent()` e sua chamada em `onSubmit`
- Substitui `<GymImage />` por `<GymImageEditOverlay gymId={gym.id} imageKey={gym.imageKey} gymTitle={gym.title} />`
- Adiciona botão "Cancelar" (`variant="outline"`, `type="button"`, `onClick={() => router.push('/admin/academias')}`), à esquerda de "Salvar alterações"

### Sem alteração: `GymImageUploader`

Mantido intacto para uso na tela de criação (`/admin/academias/nova`). Não deve ser modificado.

---

## Fluxo de Dados

```
[Edit Page]
  EditGymForm
    ├── GymImageEditOverlay
    │     ├── GymImage (cover atual)
    │     ├── <input type="file" ref={inputRef} hidden />
    │     ├── <button> (ícone Pencil overlay)
    │     │     └── onClick → inputRef.current.click()
    │     └── Dialog [open={dialogOpen}]
    │           ├── Cropper (react-easy-crop)
    │           ├── Zoom slider
    │           ├── "Cancelar" → fecha dialog + revoga object URL
    │           └── "Confirmar recorte"
    │                 → getCroppedBlob()
    │                 → useSetGymImage({ id: gymId, file: blob })
    │                 → invalidateQueries(['gym', gymId])
    │                 → fecha dialog
    │
    ├── [campos do form: título, CNPJ, localização, descrição, telefone]
    │
    └── Div de ações
          ├── <Button variant="outline"> Cancelar → router.push('/admin/academias')
          └── <Button type="submit"> Salvar alterações → updateGym()
```

---

## Decisões Arquiteturais

### D1. Upload imediato (desvinculado do submit)

- **Contexto:** Atualmente, a imagem era acumulada em `imageBlob` e enviada junto com o submit. O usuário pediu que o upload seja independente.
- **Decisão:** Chamar `useSetGymImage()` imediatamente ao confirmar o recorte, sem aguardar o submit do formulário.
- **Justificativa técnica:** Operações ortogonais — dados da academia e imagem são recursos independentes no backend (endpoints distintos). Desacoplar evita que uma falha numa operação mascare a outra.
- **Justificativa de negócio:** UX mais direta; o admin vê a imagem atualizada em tempo real antes de salvar os demais dados.
- **Trade-offs aceitos:** Se o admin cancela o form após trocar a imagem, a imagem nova já foi persistida. Comportamento aceitável para um painel admin (sem impacto no usuário final além do próprio admin).

### D2. Cropper em Dialog (shadcn)

- **Contexto:** O `GymImageUploader` atual expande o cropper inline, deslocando o layout da página.
- **Decisão:** Mover o cropper para um `Dialog` modal centralizado.
- **Justificativa técnica:** Componente `Dialog` já disponível no design system (shadcn); sem dependência adicional.
- **Trade-offs aceitos:** O Dialog usa `portal` (renderizado em `<body>`), o que exige atenção ao `z-index` em páginas com outros overlays — sem risco no contexto atual.

### D3. Ícone idêntico ao detail page

- **Contexto:** O detail page já tem um ícone Pencil no canto da imagem para navegação. Reutilizar o padrão visual cria consistência.
- **Decisão:** Aplicar as mesmas classes CSS do `gym-detail-edit` no overlay do edit page.
- **Trade-offs aceitos:** Os dois ícones têm comportamentos diferentes (um navega, o outro faz upload) apesar do visual idêntico. O contexto da página (edit vs. detail) é suficiente para o admin distinguir a intenção.

---

## Riscos

| Risco | Impacto (1-3) | Probabilidade (1-3) | Score | Mitigação |
|---|---|---|---|---|
| Query key de `useGymById` não bater com `invalidateQueries` | 2 | 2 | 4 🟡 | Verificar a query key exata antes de implementar (`useGymById` em `features/gyms/api`) |
| `URL.revokeObjectURL` não chamado em todos os paths de saída | 1 | 2 | 2 🟢 | Usar `useEffect` cleanup ou garantir revogação no `onOpenChange` do Dialog |
| Dialog do cropper quebrar em mobile (height fixa) | 1 | 2 | 2 🟢 | Usar `max-h-[90dvh] overflow-auto` no DialogContent |

---

## Testes

- Renderizar `GymImageEditOverlay` e verificar que o ícone Pencil está presente
- Simular clique no ícone → verificar que `input[type=file]` é acionado (via `click()` mock)
- Simular seleção de arquivo → verificar que o Dialog abre
- Simular confirmação do recorte → verificar que `useSetGymImage` é chamado com `{ id, file }`
- Verificar que o Dialog fecha após confirmação bem-sucedida
- Verificar toast de erro quando `useSetGymImage` falha (dialog deve permanecer aberto)
- Renderizar `EditGymForm` → verificar botão "Cancelar" presente e `GymImageUploader` ausente
- Clicar em "Cancelar" → verificar navegação para `/admin/academias`
