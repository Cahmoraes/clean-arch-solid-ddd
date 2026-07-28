---
created_at: "2026-07-28T08:47:56-03:00"
updated_at: "2026-07-28T08:47:56-03:00"
---

# PRD: Toggle de Visualização (Grid/Lista) em /academias

## Visão Geral

Hoje a tela `/academias` mostra os resultados só como grid de cards. Usuários que querem
comparar muitas academias de uma vez precisam rolar bastante, porque o card grande limita
quantos itens cabem na tela. Esta feature dá ao usuário um controle, na própria barra de
busca, para alternar para uma visualização em lista compacta — um item por linha — e
lembra a escolha entre sessões, para quem prefere a lista não precisar reconfigurar toda
vez que volta.

## Objetivos

- Permitir alternância entre grid e lista sem sair da tela `/academias` nem recarregar a
  página.
- Aumentar o número de academias visíveis por tela quando o usuário escolhe a lista
  (critério: layout de linha único, sem exigir contagem mínima fixa de itens).
- Preferência sobrevive a reload e a retorno em outro dia, no mesmo navegador/dispositivo.
- Zero regressão perceptível de flash (grid aparecendo antes da lista escolhida) no
  primeiro carregamento da página.

## Histórias de Usuário

- **US-01** — Como usuário da tela `/academias`, eu quero um controle na barra de busca
  para alternar entre grid e lista, para escolher o formato que prefiro sem sair da tela.
- **US-02** — Como usuário que prefere a lista compacta, eu quero ver mais academias na
  tela ao mesmo tempo, para comparar opções mais rápido.
- **US-03** — Como usuário que já escolheu a visualização em lista, eu quero que essa
  escolha continue valendo quando recarrego a página ou volto no dia seguinte, para não
  precisar reconfigurar toda vez.
- **US-04** — Como usuário navegando a lista compacta, eu quero ver o essencial de cada
  academia (imagem, nome, localização), para reconhecer rapidamente qual é qual mesmo em
  formato compacto.
- **US-05** — Como usuário de primeira visita (sem preferência salva), eu quero ver a
  tela no formato grid atual por padrão, para não ter o comportamento hoje existente
  alterado sem eu decidir trocar.

## Funcionalidades Principais

### 1. Controle de alternância de visualização

O que faz: exibe, na barra de busca de `/academias`, um controle com duas opções
(grid/lista). Por que importa: dá ao usuário um jeito explícito e fácil de achar para
trocar de formato, sem precisar de um menu separado. Como funciona (alto nível): a opção
clicada passa a ser a visualização ativa e os resultados já visíveis re-renderizam no
novo formato imediatamente.

- **FR-001** — O sistema deve exibir um controle com duas opções (grid e lista) na barra
  de busca de `/academias`.
- **FR-002** — Selecionar uma opção do controle deve trocar o formato de exibição dos
  resultados imediatamente, sem recarregar a página.
- **FR-003** — O controle deve indicar visualmente qual das duas opções está ativa no
  momento.
- **FR-004** — O controle de alternância deve ser operável via teclado e ter rótulo
  acessível para leitores de tela, no mesmo padrão de acessibilidade já usado pelos
  demais controles da tela de busca.

### 2. Persistência da preferência de visualização

O que faz: lembra a última visualização escolhida pelo usuário. Por que importa: sem
persistência, o usuário reconfiguraria a cada visita, o que o pedido original rejeita
explicitamente. Como funciona (alto nível): a escolha é gravada quando o usuário troca de
visualização e é aplicada automaticamente nas visitas seguintes, no mesmo navegador.

- **FR-005** — A escolha de visualização do usuário deve persistir após recarregar a
  página.
- **FR-006** — A escolha de visualização do usuário deve persistir em uma nova visita ao
  mesmo navegador/dispositivo (ex.: no dia seguinte).
- **FR-007** — Na ausência de uma preferência salva (primeira visita), a visualização
  padrão deve ser grid.
- **FR-008** — A aplicação da preferência salva não deve produzir um flash visível do
  formato errado (ex.: grid aparecendo por um instante antes da lista escolhida) no
  primeiro carregamento da página.

### 3. Visualização em lista

O que faz: renderiza cada academia como uma linha compacta, uma por item, em vez do card
grande do grid. Por que importa: é o formato que permite ver mais academias na tela de
uma vez, o motivo declarado do pedido. Como funciona (alto nível): cada linha mostra o
essencial da academia e reage a clique do mesmo jeito que o card reage hoje.

- **FR-009** — A visualização em lista deve renderizar cada academia como um item de
  linha única (não como card).
- **FR-010** — Cada linha deve exibir, no mínimo, uma imagem/thumbnail, o nome da academia
  e sua localização.
- **FR-011** — Clicar em qualquer parte de uma linha deve levar o usuário ao mesmo destino
  de navegação que clicar no card equivalente leva hoje, em grid.

## Experiência do Usuário

Fluxo principal: o usuário abre `/academias`, vê os resultados no formato já escolhido
anteriormente (ou em grid, na primeira visita) e encontra o controle de alternância já
visível na barra de busca, sem precisar procurar em um menu. Ao clicar na opção de lista,
os mesmos resultados já carregados trocam de formato na hora — sem espera, sem reload,
sem perder a busca/filtro ativos. Ao recarregar a página ou voltar em outro dia, a tela
já abre no formato escolhido, sem qualquer passo extra do usuário.

O controle deve ser operável por teclado e legível por leitor de tela, mantendo o padrão
de acessibilidade já usado nos demais controles de UI da tela de busca — não introduz uma
exceção de acessibilidade nova.

## Restrições Técnicas de Alto Nível

Carregadas das Características Arquiteturais priorizadas no spec de design:

- **Consistência/Usabilidade** — a solução deve reaproveitar padrões de interação já
  validados na tela, para não introduzir uma experiência de UI desconhecida. Critério
  mensurável: zero flash perceptível de grid antes da lista escolhida no primeiro
  carregamento (coberto por teste de hidratação).
- **Maintainability** — a feature é uma preferência de UI; não deve introduzir nenhuma
  superfície nova de backend. Critério mensurável: 0 novos endpoints ou migrations no PR.
- **Escopo do dispositivo** — a preferência é por navegador/dispositivo, não por conta:
  trocar de dispositivo ou navegador mostra o formato padrão (grid) novamente. Não há
  requisito de sincronizar a escolha entre dispositivos ou contas nesta feature.

## Fora de Escopo

- Sincronizar a preferência de visualização entre dispositivos ou contas do mesmo
  usuário.
- Qualquer terceiro formato de visualização além de grid e lista.
- Alterar o conteúdo ou o layout do card já existente na visualização em grid.
- Qualquer mudança na tela `dashboard-inicio` ou em features não relacionadas a
  `/academias` — um recall de memória apontou essa tela como possível ponto de atrito
  histórico, mas nenhuma sobreposição de arquivo foi confirmada com o escopo desta
  feature; fica fora de escopo desta PRD.
