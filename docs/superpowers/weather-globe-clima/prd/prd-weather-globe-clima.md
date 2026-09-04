---
created_at: "2026-09-04T20:17:11-03:00"
updated_at: "2026-09-04T20:27:11-03:00"
---

# PRD: Globo 3D na rota `/clima`

## Visão Geral

A rota pública `/clima` já permite ao usuário buscar o clima atual de uma cidade
(temperatura atual, mínima e máxima). Essa experiência é hoje puramente textual. Este PRD
formaliza a adição de um globo 3D decorativo à página, que gira automaticamente e anima
até a localização geográfica da cidade consultada, tornando a busca de clima mais visual
e envolvente sem alterar o comportamento funcional já existente.

## Objetivos

- Aumentar o apelo visual da página `/clima` sem degradar sua performance de carregamento
  nem sua acessibilidade.
- Garantir que a informação essencial (temperatura) nunca dependa do globo: uma falha no
  globo não pode impedir a exibição do clima.
- Manter a página utilizável e sem elementos gráficos indevidos para usuários sem suporte
  a WebGL ou com preferência por movimento reduzido.

**Critérios mensuráveis:**
- O globo 3D está presente e em rotação visível na renderização padrão da página `/clima`
  (FR-001).
- O chunk do globo fica fora do bundle inicial da rota (verificável no output do `next build`).
- Fallback estático cobre 100% dos casos de WebGL indisponível OU `prefers-reduced-motion: reduce`.
- A animação de câmera do globo é testável sem depender de renderização WebGL real.

## Histórias de Usuário

- **US-01** — Como usuário da página `/clima`, eu quero ver um globo 3D decorativo girando
  automaticamente para que a consulta de clima seja mais visual e envolvente · **UI:** sim
- **US-02** — Como usuário que busca uma cidade, eu quero que o globo anime até a
  localização geográfica do resultado para que eu associe visualmente o clima ao lugar
  buscado · **UI:** sim
- **US-03** — Como usuário sem suporte a WebGL ou com `prefers-reduced-motion` ativo, eu
  quero ver uma alternativa estática no lugar do globo para que a página continue
  acessível e sem animação indesejada · **UI:** sim
- **US-04** — Como usuário da página `/clima`, eu quero que a consulta de clima continue
  funcionando normalmente mesmo se o globo falhar ou a busca não encontrar resultado, para
  que a informação essencial nunca seja bloqueada por um elemento decorativo · **UI:** sim
  — **nota de QA:** verificação exige um cenário com falha induzida do globo ou busca sem
  resultado; um screenshot do estado normal não comprova esta história.

## Funcionalidades Principais

**Globo decorativo com rotação automática**
Um globo 3D é exibido como elemento hero, sempre visível no topo da página, girando
automaticamente mesmo antes de qualquer busca.
- **FR-001** (US-01) — O sistema deve renderizar um globo 3D decorativo com rotação
  automática por padrão na página `/clima`.
- **FR-002** (US-01) — O código do globo deve ser carregado separadamente do bundle
  inicial da rota (code-splitting client-only), de forma que seu carregamento não atrase
  a exibição do restante da página.
- **FR-010** (US-01) — Os recursos alocados pelo globo (loop de animação, contexto
  gráfico) devem ser liberados quando o componente é desmontado, sem deixar recursos
  presos.
- **FR-011** (US-01) — Deve existir uma verificação automatizada que impeça o código do
  globo de ser incluído no bundle inicial por engano em mudanças futuras.
- **FR-012** (US-01) — Antes de qualquer busca de clima, o globo deve girar sem exibir
  marcador de localização.

_Nota de QA:_ FR-002, FR-010 e FR-011 são requisitos não-visuais, verificados por teste
automatizado (build/estrutura/cleanup) — não pela captura de tela associada a US-01.

**Animação até a cidade buscada**
Quando uma busca de clima retorna um resultado, a câmera do globo anima até a coordenada
geográfica correspondente.
- **FR-003** (US-02) — O sistema deve animar a câmera do globo até a latitude/longitude da
  cidade buscada sempre que uma nova busca de clima retornar um resultado.
- **FR-004** (US-02) — A resposta da consulta de clima deve passar a incluir a
  latitude/longitude da cidade encontrada, de forma aditiva (sem remover ou alterar campos
  existentes).
- **FR-013** (US-02) — Quando o usuário faz uma nova busca antes da animação da busca
  anterior terminar, a câmera deve animar para a coordenada da busca mais recente
  (a mais nova sempre prevalece).

**Fallback para ambientes sem suporte**
Nem todo navegador/usuário suporta WebGL ou deseja animação contínua.
- **FR-005** (US-03) — O sistema deve renderizar uma alternativa estática (sem WebGL) no
  lugar do globo quando WebGL não estiver disponível no navegador do usuário.
- **FR-006** (US-03) — O sistema deve renderizar a mesma alternativa estática quando a
  preferência do sistema `prefers-reduced-motion: reduce` estiver ativa.
- **FR-007** (US-03, US-04) — O globo (e seu fallback) deve ser marcado como puramente
  decorativo para tecnologia assistiva e não deve capturar foco de teclado nem interação
  de mouse/toque.

**Robustez frente a falhas**
A informação de clima é o dado essencial; o globo nunca pode comprometê-la.
- **FR-008** (US-04) — Um erro em tempo de execução do globo não deve impedir a
  renderização do restante da página, incluindo a exibição da temperatura.
- **FR-009** (US-04) — Quando uma busca de clima falhar, o globo deve manter sua última
  posição/rotação válida, sem exibir indicação própria de erro (o erro é comunicado pela
  mensagem já existente da página).

## Experiência do Usuário

O globo aparece como elemento hero, sempre visível acima da área de busca (mantendo a
coluna centralizada atual da página), com rotação automática contínua. Um marcador simples
na cor primária do tema indica a localização da última cidade buscada. Ao carregar o
código do globo, um espaço reservado evita deslocamento de layout no card de resultado. O
mockup curado que orientou essas decisões visuais está em
`../specs/mockups/weather-globe-clima-visual.md` — a renderização final usa WebGL real,
não o círculo estático do mockup. Usuários sem WebGL ou com `prefers-reduced-motion` veem
uma alternativa estática equivalente, sem perda de acesso à informação de clima.

## Restrições Técnicas de Alto Nível

- **Performance (bundle):** o código do globo não pode inflar o bundle inicial de uma rota
  pública simples — deve ser carregado separadamente do carregamento inicial da página.
- **Compatibilidade / acessibilidade:** WebGL e `prefers-reduced-motion` não são garantidos
  em todo navegador/usuário; a página deve permanecer funcional e acessível em ambos os
  casos.
- **Testabilidade:** o comportamento de animação de câmera do globo deve ser verificável
  por teste automatizado sem depender de renderização WebGL real (ambientes de CI não
  suportam WebGL).
- **Contrato de API:** a extensão do endpoint de clima existente deve ser aditiva — nenhum
  consumidor atual pode quebrar.
- **Escala/disponibilidade:** fora de escopo como preocupação priorizada — rota pública de
  baixo tráfego; o globo é decorativo e sua falha não pode afetar a disponibilidade da
  informação de clima (ver FR-008).

## Fora de Escopo

- Marcadores múltiplos, arcos, atmosfera ou qualquer recurso visual adicional além do
  globo com animação de câmera.
- Interação manual com o globo (arrastar, zoom) — o globo é apenas decorativo/auto-animado.
- Exibição de histórico de cidades buscadas no globo.
- Mudanças na lógica de desambiguação de cidade homônima (comportamento já definido na
  feature de clima existente).
