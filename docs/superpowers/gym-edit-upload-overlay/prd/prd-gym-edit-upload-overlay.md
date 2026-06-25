---
created_at: "2026-06-25T11:43:15-03:00"
updated_at: "2026-06-25T11:43:15-03:00"
---

# PRD: Gym Edit Upload Overlay

## Visão Geral

A tela de edição de academia (`/admin/academias/[id]/editar`) não oferece uma forma direta de descartar alterações, exige que o admin role até o final do formulário para trocar a imagem de capa, e mantém o upload de imagem acoplado ao submit do formulário. Estas três fricções aumentam o esforço cognitivo do administrador em uma operação frequente.

Este PRD formaliza os requisitos para: (1) adicionar um botão de cancelamento com navegação explícita; (2) substituir o bloco de upload por um ícone de edição sobreposto à própria imagem de capa; e (3) transformar o upload de imagem em uma operação imediata e independente do submit, com recorte via dialog modal.

## Objetivos

- Reduzir para **1 clique** a ação de cancelar/descartar a edição e retornar à listagem
- Eliminar a necessidade de scroll para iniciar o upload de imagem — o ponto de entrada fica na própria cover
- Tornar o upload de imagem uma operação confirmada imediatamente (feedback visual em tempo real), desacoplada do submit dos dados do formulário
- Manter consistência visual com o padrão de ícone já existente no detail page da academia

## Histórias de Usuário

- **US-01** — Como administrador, eu quero um botão de "Cancelar" visível na área de ações do formulário para que eu possa descartar a edição e retornar à listagem de academias com um único clique, sem precisar usar o botão voltar do navegador
- **US-02** — Como administrador, eu quero clicar diretamente na imagem de capa da academia na tela de edição para que eu possa iniciar a troca de imagem sem rolar a página até um botão separado
- **US-03** — Como administrador, eu quero um dialog de recorte focado para que eu possa ajustar o enquadramento da nova imagem antes de confirmar, sem que o formulário de dados seja deslocado ou interrompido
- **US-04** — Como administrador, eu quero que a nova imagem da academia seja salva imediatamente ao confirmar o recorte para que eu possa ver o resultado atualizado na cover antes de salvar os demais dados do formulário

## Funcionalidades Principais

### 1. Botão Cancelar no formulário de edição

Permite ao administrador descartar a edição sem salvar e retornar à listagem.

**Por que importa:** Atualmente não existe saída explícita da tela de edição além do botão "voltar" do navegador, o que é uma UX fraca para uma ação administrativa comum.

**Requisitos funcionais:**
- **FR-001** — O formulário de edição deve exibir um botão "Cancelar" visível na mesma linha do botão "Salvar alterações"
- **FR-002** — O botão "Cancelar" deve ter aparência secundária (variante outline), claramente distinguível do botão primário de submit
- **FR-003** — Ao clicar em "Cancelar", o usuário deve ser navegado para `/admin/academias` (listagem de academias)
- **FR-004** — O botão "Cancelar" não deve disparar o submit do formulário nem validações de campo

### 2. Overlay de edição na imagem de capa

Substitui o bloco `GymImageUploader` ao final do formulário por um ícone de edição sobreposto à imagem de capa.

**Por que importa:** O admin já sabe que a imagem é editável; o ponto de entrada deve estar na própria imagem, não num componente separado abaixo de todos os campos.

**Requisitos funcionais:**
- **FR-005** — A imagem de capa na tela de edição deve exibir um ícone de edição (lápis) fixo no canto superior direito, sempre visível
- **FR-006** — O ícone deve ter feedback visual de hover (tint na cor primária do tema + borda destacada) indicando que é clicável
- **FR-007** — Ao clicar no ícone, um seletor de arquivo (`input[type=file]`) deve ser acionado, aceitando apenas arquivos de imagem
- **FR-008** — O bloco `GymImageUploader` existente ao final do formulário de edição deve ser removido

### 3. Dialog de recorte (cropper modal)

Após selecionar um arquivo, o recortador abre em um dialog modal centralizado.

**Por que importa:** O cropper inline desloca o layout da página; um dialog isola a operação de recorte sem interromper o contexto do formulário.

**Requisitos funcionais:**
- **FR-009** — Ao selecionar um arquivo de imagem pelo ícone overlay, um dialog modal deve abrir com a interface de recorte (proporção 16:9)
- **FR-010** — O dialog deve oferecer controle de zoom para ajuste do enquadramento
- **FR-011** — O dialog deve ter botões "Cancelar" (descarta a seleção, fecha o dialog) e "Confirmar recorte" (processa e envia a imagem)
- **FR-012** — Ao fechar o dialog (por cancelamento ou confirmação), os recursos de memória do preview (object URL) devem ser liberados

### 4. Upload imediato ao confirmar o recorte

O upload da imagem ocorre imediatamente após a confirmação no dialog, sem aguardar o submit do formulário.

**Por que importa:** Desacopla operações ortogonais — dados do formulário e imagem de capa são recursos independentes; um erro num não deve contaminar o outro.

**Requisitos funcionais:**
- **FR-013** — Ao confirmar o recorte, a imagem deve ser enviada imediatamente ao endpoint de upload da academia
- **FR-014** — Após upload bem-sucedido, a cover da academia na tela de edição deve refletir a nova imagem (atualização em tempo real)
- **FR-015** — Em caso de falha no upload, o usuário deve receber uma mensagem de erro via toast e o dialog deve permanecer aberto para nova tentativa
- **FR-016** — O submit do formulário ("Salvar alterações") não deve incluir lógica de upload de imagem

## Experiência do Usuário

### Jornada principal — trocar imagem e salvar dados

1. Admin acessa `/admin/academias/[id]/editar`
2. Vê a imagem de capa com o ícone de lápis no canto superior direito
3. Passa o cursor sobre o ícone — feedback visual (cor primária verde, borda destacada)
4. Clica no ícone — seletor de arquivo abre
5. Seleciona uma imagem — dialog de recorte abre com a imagem carregada
6. Ajusta zoom e enquadramento
7. Clica "Confirmar recorte" — dialog fecha, cover atualiza em tempo real com a nova imagem
8. Edita os campos de texto normalmente
9. Clica "Salvar alterações" — apenas os dados do formulário são enviados
10. Redirecionado para o detail page da academia

### Jornada de cancelamento

1. Admin acessa a tela de edição
2. Decide não fazer alterações (ou muda de ideia)
3. Clica "Cancelar" (botão outline, ao lado de "Salvar alterações")
4. Redirecionado para `/admin/academias`

### Considerações de UX

- O ícone de lápis usa o mesmo estilo visual do ícone presente no detail page — consistência que o admin já reconhece
- O dialog de recorte é focado e modal — não desloca o formulário nem esconde o contexto
- Cancelar o dialog não afeta nenhum dado do formulário (operação totalmente independente)
- Curated mockup: `specs/mockups/gym-edit-upload-overlay-visual.md`

## Restrições Técnicas de Alto Nível

Derivadas das Características Arquiteturais priorizadas na design spec:

| Característica | Critério mensurável |
|---|---|
| Consistência visual | Ícone Pencil com posição (`right-3 top-3`) e classes CSS idênticos ao `gym-detail-edit` do detail page |
| Usabilidade (1 clique) | Botão "Cancelar" visível na mesma linha do submit, sem scroll; ícone de upload na própria imagem, sem scroll |
| Desacoplamento de operações | Submit do formulário não aciona upload de imagem; confirmação do recorte não aciona submit do formulário |

**Integrações requeridas:**
- Endpoint existente de upload de imagem da academia (o mesmo já utilizado na tela de edição e de criação)
- Sistema de cache do TanStack Query — invalidar a query da academia após upload bem-sucedido para atualizar a cover

**Sem novos endpoints** — toda a feature usa infraestrutura já existente.

## Fora de Escopo

- **Tela de criação de academia** (`/admin/academias/nova`): o `GymImageUploader` nessa tela não é alterado; upload continua acoplado ao submit
- **Detail page** (`/academias/[id]`): o ícone de edição existente (que navega para a tela de edição) não é alterado
- **Upload de múltiplas imagens**: somente imagem de capa única
- **Remoção de imagem** (restaurar para sem imagem): fora do escopo desta feature
- **Preview do recorte antes do upload**: o recorte ocorre localmente via `getCroppedBlob`; não há preview separado além do próprio cropper
- **Validação de tipo/tamanho de arquivo no client**: a validação existente no endpoint de upload é suficiente
