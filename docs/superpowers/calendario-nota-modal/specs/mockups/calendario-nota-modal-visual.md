# Calendário: nota do dia em modal: Norte visual

Artefato curado do mockup aprovado pelo usuário no companion (duas telas: painel do dia com a nota truncada e modal aberto). É um *norte*, não a tela final; a fidelidade final é construída na implementação.

## Intenção de design

- O painel do dia mostra **no máximo 3 linhas** da nota, com reticências, sem barra de rolagem. Abaixo do trecho vem o link "Ver nota completa". O trecho inteiro é um botão que abre o modal.
- Editar e Excluir **não aparecem** no painel. A lista "No mês" fica contida no cartão; só ela rola.
- O modal é um `Dialog` centralizado em qualquer largura, com título (data), subtítulo (dia da semana e feriado, se houver), rótulo "Nota do treino", textarea com o texto completo, contador `n/500` e a fileira de ações.
- As ações são **botões quadrados de 40 px só com ícone**, nesta ordem: Salvar (disquete, primário magenta), Cancelar (X, contorno), Excluir (lixeira, destrutivo vermelho). Cada um com `aria-label` e tooltip com o mesmo texto.
- Sem nota no dia, o painel mostra "Nenhuma nota neste dia." e o botão "Adicionar nota", que abre o mesmo modal vazio, sem o botão Excluir.

## Marcação central (referência, não código final)

Painel, bloco da nota:

```html
<div class="bloco-nota">            <!-- fundo surface-2, borda esquerda 3px cyan, radius 6px, px 12, py 8 -->
  <div class="rotulo">NOTA DO DIA</div>   <!-- 10px, semibold, uppercase, tracking-widest, texto muted -->
  <button type="button" class="trecho">   <!-- botão sem estilo; abre o modal -->
    <span class="line-clamp-3">…texto da nota…</span>
    <span class="ver-mais">Ver nota completa</span>   <!-- cyan, 13px -->
  </button>
</div>
```

Modal, fileira de ações:

```html
<div class="acoes">                  <!-- flex, gap 8px, alinhada à esquerda -->
  <button aria-label="Salvar"   class="icone primario">  <!-- Save,   16px, h-10 w-10 --> </button>
  <button aria-label="Cancelar" class="icone contorno">  <!-- X,      16px, h-10 w-10 --> </button>
  <button aria-label="Excluir"  class="icone destrutivo"><!-- Trash2, 16px, h-10 w-10, só em modo edição --> </button>
</div>
```

Ícones do conjunto pixelarticons vendorizado do projeto (`src/components/ui/pixel-icons.tsx`): `Save` (a ser gerado, `save`), `X` e `Trash2`. Tamanho `h-4 w-4` com `aria-hidden`.

## Tokens aplicados (tema escuro do projeto)

- Fundo `#0a1424`; cartão e diálogo `#0d1b2e`; superfície do bloco `#101f36`; borda `#16304d`; borda do textarea `#7d95af`.
- Texto `#dbe9f7`; texto secundário `#9db4cc`.
- Acento cyan `#3ee0ff` (nota, foco, cursor); feriado laranja `#ffb443`; destrutivo `#ff5a4d`; primário magenta `#ff3ea5` (texto sobre ele `#0a1424`).
- Fontes: VT323 em títulos e botões, Inter no corpo (15px), JetBrains Mono no textarea e no contador.
- Formas: cartão e diálogo com raio 12px, botões e blocos com raio 6px, com `corner-shape: bevel` onde houver suporte.
- Diálogo: overlay `bg-black/40`, `max-w-lg`, `p-6`, `gap-4`, título VT323 30px, botão de fechar (X) no canto superior direito.

## Fonte original

Nenhuma (mockup do companion). O mockup original tem a lista "No mês" cortada com fade no fim do cartão e o texto de exemplo "treino com os irmãos…" repetido.
