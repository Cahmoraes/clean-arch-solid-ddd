# Guia do Companheiro Visual

Companheiro de brainstorming visual baseado em navegador para mostrar mockups, diagramas e opções.

## Quando Usar

Decida por pergunta, não por sessão. O teste: **o usuário entenderia isso melhor vendo do que lendo?**

**Use o navegador** quando o conteúdo em si for visual:

- **Mockups de UI** — wireframes, layouts, estruturas de navegação, designs de componentes
- **Diagramas de arquitetura** — componentes do sistema, fluxo de dados, mapas de relacionamento
- **Comparações visuais lado a lado** — comparando dois layouts, dois esquemas de cores, duas direções de design
- **Polimento de design** — quando a questão é sobre aparência e sensação, espaçamento, hierarquia visual
- **Relacionamentos espaciais** — máquinas de estado, fluxogramas, relacionamentos de entidades renderizados como diagramas

**Use o terminal** quando o conteúdo for texto ou tabular:

- **Perguntas de requisitos e escopo** — "o que X significa?", "quais funcionalidades estão no escopo?"
- **Escolhas conceituais A/B/C** — escolhendo entre abordagens descritas em palavras
- **Listas de trade-offs** — prós/contras, tabelas de comparação
- **Decisões técnicas** — design de API, modelagem de dados, seleção de abordagem arquitetural
- **Perguntas de esclarecimento** — qualquer coisa onde a resposta é palavras, não uma preferência visual

Uma pergunta *sobre* um tópico de UI não é automaticamente uma questão visual. "Que tipo de wizard você quer?" é conceitual — use o terminal. "Qual desses layouts de wizard parece certo?" é visual — use o navegador.

## Como Funciona

O servidor observa um diretório para arquivos HTML e serve o mais recente ao navegador. Você escreve conteúdo HTML em `screen_dir`, o usuário vê no navegador e pode clicar para selecionar opções. As seleções são gravadas em `state_dir/events` que você lê no seu próximo turno.

**Fragmentos de conteúdo vs documentos completos:** Se seu arquivo HTML começar com `<!DOCTYPE` ou `<html`, o servidor o serve como está (apenas injeta o script auxiliar). Caso contrário, o servidor automaticamente envolve seu conteúdo no template de frame — adicionando cabeçalho, tema CSS, indicador de seleção e toda a infraestrutura interativa. **Escreva fragmentos de conteúdo por padrão.** Só escreva documentos completos quando precisar de controle total sobre a página.

## Iniciando uma Sessão

```bash
# Iniciar servidor com persistência (mockups salvos no projeto)
scripts/start-server.sh --project-dir /caminho/para/projeto

# Retorna: {"type":"server-started","port":52341,"url":"http://localhost:52341",
#           "screen_dir":"/caminho/para/projeto/.superpowers/brainstorm/12345-1706000000/content",
#           "state_dir":"/caminho/para/projeto/.superpowers/brainstorm/12345-1706000000/state"}
```

Salve `screen_dir` e `state_dir` da resposta. Diga ao usuário para abrir a URL.

**Encontrando informações de conexão:** O servidor escreve seu JSON de inicialização em `$STATE_DIR/server-info`. Se você iniciou o servidor em segundo plano e não capturou a saída, leia esse arquivo para obter a URL e a porta. Ao usar `--project-dir`, verifique `<projeto>/.superpowers/brainstorm/` para o diretório de sessão.

**Nota:** Passe a raiz do projeto como `--project-dir` para que os mockups persistam em `.superpowers/brainstorm/` e sobrevivam a reinicializações do servidor. Sem isso, os arquivos vão para `/tmp` e são limpos. Lembre ao usuário de adicionar `.superpowers/` ao `.gitignore` se ainda não estiver lá.

**Iniciando o servidor por plataforma:**

**Claude Code (macOS / Linux):**
```bash
# Modo padrão funciona — o script coloca o servidor em segundo plano sozinho
scripts/start-server.sh --project-dir /caminho/para/projeto
```

**Claude Code (Windows):**
```bash
# Windows auto-detecta e usa modo de primeiro plano, que bloqueia a chamada de ferramenta.
# Use run_in_background: true na chamada de ferramenta Bash para que o servidor sobreviva
# entre turnos de conversa.
scripts/start-server.sh --project-dir /caminho/para/projeto
```
Ao chamar isso via ferramenta Bash, defina `run_in_background: true`. Depois leia `$STATE_DIR/server-info` no próximo turno para obter a URL e a porta.

**Codex:**
```bash
# Codex encerra processos em segundo plano. O script auto-detecta CODEX_CI e
# muda para modo de primeiro plano. Execute normalmente — sem flags extras necessárias.
scripts/start-server.sh --project-dir /caminho/para/projeto
```

**Gemini CLI:**
```bash
# Use --foreground e defina is_background: true na chamada de ferramenta shell
# para que o processo sobreviva entre turnos
scripts/start-server.sh --project-dir /caminho/para/projeto --foreground
```

**Outros ambientes:** O servidor deve continuar rodando em segundo plano entre turnos de conversa. Se seu ambiente encerra processos desanexados, use `--foreground` e inicie o comando com o mecanismo de execução em segundo plano da sua plataforma.

Se a URL não for alcançável pelo seu navegador (comum em configurações remotas/conteinerizadas), vincule a um host não-loopback:

```bash
scripts/start-server.sh \
  --project-dir /caminho/para/projeto \
  --host 0.0.0.0 \
  --url-host localhost
```

Use `--url-host` para controlar qual hostname é impresso na URL JSON retornada.

## O Loop

1. **Verifique se o servidor está ativo**, depois **escreva HTML** em um novo arquivo em `screen_dir`:
   - Antes de cada escrita, verifique se `$STATE_DIR/server-info` existe. Se não existir (ou se `$STATE_DIR/server-stopped` existir), o servidor foi encerrado — reinicie-o com `start-server.sh` antes de continuar. O servidor sai automaticamente após 30 minutos de inatividade.
   - Use nomes de arquivo semânticos: `platform.html`, `visual-style.html`, `layout.html`
   - **Nunca reutilize nomes de arquivo** — cada tela recebe um novo arquivo
   - Use a ferramenta Write — **nunca use cat/heredoc** (despeja ruído no terminal)
   - O servidor automaticamente serve o arquivo mais recente

2. **Diga ao usuário o que esperar e encerre seu turno:**
   - Lembre-os da URL (em cada etapa, não apenas na primeira)
   - Dê um breve resumo em texto do que está na tela (ex.: "Mostrando 3 opções de layout para a página inicial")
   - Peça que respondam no terminal: "Dê uma olhada e me diga o que acha. Clique para selecionar uma opção se quiser."

3. **No seu próximo turno** — após o usuário responder no terminal:
   - Leia `$STATE_DIR/events` se existir — contém as interações do navegador do usuário (cliques, seleções) como linhas JSON
   - Combine com o texto do terminal do usuário para ter o quadro completo
   - A mensagem do terminal é o feedback principal; `state_dir/events` fornece dados estruturados de interação

4. **Itere ou avance** — se o feedback mudar a tela atual, escreva um novo arquivo (ex.: `layout-v2.html`). Só avance para a próxima pergunta quando a etapa atual estiver validada.

5. **Descarregue ao retornar ao terminal** — quando a próxima etapa não precisar do navegador (ex.: uma pergunta de esclarecimento, uma discussão de trade-offs), empurre uma tela de espera para limpar o conteúdo antigo:

   ```html
   <!-- filename: waiting.html (ou waiting-2.html, etc.) -->
   <div style="display:flex;align-items:center;justify-content:center;min-height:60vh">
     <p class="subtitle">Continuando no terminal...</p>
   </div>
   ```

   Isso evita que o usuário fique olhando para uma escolha resolvida enquanto a conversa avançou. Quando a próxima questão visual surgir, empurre um novo arquivo de conteúdo normalmente.

6. Repita até terminar.

## Escrevendo Fragmentos de Conteúdo

Escreva apenas o conteúdo que vai dentro da página. O servidor o envolve no template de frame automaticamente (cabeçalho, CSS de tema, indicador de seleção e toda a infraestrutura interativa).

**Exemplo mínimo:**

```html
<h2>Qual layout funciona melhor?</h2>
<p class="subtitle">Considere legibilidade e hierarquia visual</p>

<div class="options">
  <div class="option" data-choice="a" onclick="toggleSelect(this)">
    <div class="letter">A</div>
    <div class="content">
      <h3>Coluna Única</h3>
      <p>Experiência de leitura limpa e focada</p>
    </div>
  </div>
  <div class="option" data-choice="b" onclick="toggleSelect(this)">
    <div class="letter">B</div>
    <div class="content">
      <h3>Duas Colunas</h3>
      <p>Navegação lateral com conteúdo principal</p>
    </div>
  </div>
</div>
```

Só isso. Sem `<html>`, sem CSS, sem tags `<script>` necessárias. O servidor fornece tudo isso.

## Classes CSS Disponíveis

O template de frame fornece essas classes CSS para seu conteúdo:

### Opções (escolhas A/B/C)

```html
<div class="options">
  <div class="option" data-choice="a" onclick="toggleSelect(this)">
    <div class="letter">A</div>
    <div class="content">
      <h3>Título</h3>
      <p>Descrição</p>
    </div>
  </div>
</div>
```

**Multi-seleção:** Adicione `data-multiselect` ao container para permitir que usuários selecionem múltiplas opções. Cada clique alterna o item. A barra indicadora mostra a contagem.

```html
<div class="options" data-multiselect>
  <!-- mesma marcação de opção — usuários podem selecionar/desselecionar múltiplas -->
</div>
```

### Cards (designs visuais)

```html
<div class="cards">
  <div class="card" data-choice="design1" onclick="toggleSelect(this)">
    <div class="card-image"><!-- conteúdo do mockup --></div>
    <div class="card-body">
      <h3>Nome</h3>
      <p>Descrição</p>
    </div>
  </div>
</div>
```

### Container de mockup

```html
<div class="mockup">
  <div class="mockup-header">Pré-visualização: Layout do Dashboard</div>
  <div class="mockup-body"><!-- seu HTML de mockup --></div>
</div>
```

### Visão dividida (lado a lado)

```html
<div class="split">
  <div class="mockup"><!-- esquerda --></div>
  <div class="mockup"><!-- direita --></div>
</div>
```

### Prós/Contras

```html
<div class="pros-cons">
  <div class="pros"><h4>Prós</h4><ul><li>Benefício</li></ul></div>
  <div class="cons"><h4>Contras</h4><ul><li>Desvantagem</li></ul></div>
</div>
```

### Elementos mock (blocos de construção de wireframe)

```html
<div class="mock-nav">Logo | Início | Sobre | Contato</div>
<div style="display: flex;">
  <div class="mock-sidebar">Navegação</div>
  <div class="mock-content">Área de conteúdo principal</div>
</div>
<button class="mock-button">Botão de Ação</button>
<input class="mock-input" placeholder="Campo de entrada">
<div class="placeholder">Área de placeholder</div>
```

### Tipografia e seções

- `h2` — título da página
- `h3` — título de seção
- `.subtitle` — texto secundário abaixo do título
- `.section` — bloco de conteúdo com margem inferior
- `.label` — texto de label em maiúsculas pequenas

## Formato dos Eventos do Navegador

Quando o usuário clica em opções no navegador, suas interações são gravadas em `$STATE_DIR/events` (um objeto JSON por linha). O arquivo é limpo automaticamente quando você empurra uma nova tela.

```jsonl
{"type":"click","choice":"a","text":"Opção A - Layout Simples","timestamp":1706000101}
{"type":"click","choice":"c","text":"Opção C - Grid Complexo","timestamp":1706000108}
{"type":"click","choice":"b","text":"Opção B - Híbrido","timestamp":1706000115}
```

O fluxo completo de eventos mostra o caminho de exploração do usuário — eles podem clicar em múltiplas opções antes de decidir. O último evento `choice` é tipicamente a seleção final, mas o padrão de cliques pode revelar hesitação ou preferências que vale a pena perguntar.

Se `$STATE_DIR/events` não existir, o usuário não interagiu com o navegador — use apenas o texto do terminal.

## Dicas de Design

- **Dimensione a fidelidade à pergunta** — wireframes para layout, polimento para questões de polimento
- **Explique a pergunta em cada página** — "Qual layout parece mais profissional?" não apenas "Escolha um"
- **Itere antes de avançar** — se o feedback mudar a tela atual, escreva uma nova versão
- **Máximo de 2-4 opções** por tela
- **Use conteúdo real quando importa** — para um portfólio de fotografia, use imagens reais (Unsplash). Conteúdo placeholder obscurece problemas de design.
- **Mantenha os mockups simples** — foque em layout e estrutura, não em design pixel-perfect

## Nomenclatura de Arquivos

- Use nomes semânticos: `platform.html`, `visual-style.html`, `layout.html`
- Nunca reutilize nomes de arquivo — cada tela deve ser um novo arquivo
- Para iterações: adicione sufixo de versão como `layout-v2.html`, `layout-v3.html`
- Servidor serve o arquivo mais recente por tempo de modificação

## Limpando

```bash
scripts/stop-server.sh $SESSION_DIR
```

Se a sessão usou `--project-dir`, os arquivos de mockup persistem em `.superpowers/brainstorm/` para referência posterior. Apenas sessões em `/tmp` são deletadas ao parar.

## Referência

- Template de frame (referência CSS): `scripts/frame-template.html`
- Script auxiliar (lado do cliente): `scripts/helper.js`
