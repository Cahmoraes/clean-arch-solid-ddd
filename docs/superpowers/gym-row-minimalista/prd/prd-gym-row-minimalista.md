# PRD: Linha de Academia Minimalista

## Visão Geral

A lista de academias em linhas (`/academias`) mostra à direita de cada item telefone, pílula "Check-in", botão editar (admin) e selo de texto de status. A área ficou verbosa e disputa atenção com o nome e o endereço. Esta feature deixa a linha minimalista sem retirar nenhuma função: o usuário percebe rápido quais academias existem, onde ficam e se estão disponíveis, e acessa Check-in (e editar, se admin) com o mínimo de ruído.

## Objetivos

- Reduzir os elementos à direita da linha de quatro (telefone, pílula, editar, selo) para no máximo dois botões-ícone.
- Nenhuma ação ou informação de status deixa de estar acessível a usuário comum, admin, teclado ou leitor de tela.
- Alvos de toque de pelo menos 24px e varredura de acessibilidade (axe) de `/academias` sem novas violações.

## Histórias de Usuário

- **US-01** — Como usuário, eu quero uma lista de academias limpa, com imagem, nome, descrição e endereço em destaque, para que eu escaneie as opções rapidamente · **UI:** sim
- **US-02** — Como usuário, eu quero reconhecer a disponibilidade da academia por um indicador colorido discreto, para que eu saiba o status sem ler um selo de texto · **UI:** sim
- **US-03** — Como usuário, eu quero acionar o Check-in por um ícone na própria linha, para que eu chegue ao detalhe da academia para fazer o check-in · **UI:** sim
- **US-04** — Como administrador, eu quero editar uma academia por um ícone na linha, para que eu chegue à edição sem poluir a lista · **UI:** sim
- **US-05** — Como usuário de teclado ou leitor de tela, eu quero nomes acessíveis nos ícones e no indicador de status, para que eu use a lista sem depender de texto visual · **UI:** sim

## Funcionalidades Principais

**Linha simplificada**
- **FR-001** (US-01) — A linha do `GymRow` deve exibir imagem, nome, descrição e endereço da academia.
- **FR-002** (US-01) — A linha não deve exibir o telefone nem o texto "Ver detalhes".
- **FR-003** (US-01, US-02) — A linha não deve exibir selo de texto de status, nem no canto superior, nem como coluna.

**Indicador de status**
- **FR-004** (US-02) — Um ponto colorido deve aparecer antes do nome: verde quando a academia está disponível, vermelho quando está desativada.
- **FR-005** (US-02) — O estado "Desativada" só deve aparecer para administrador (quando há `adminEditHref`); sem admin, a academia é sempre indicada como disponível.

**Ações**
- **FR-006** (US-03) — A linha deve ter um ícone de Check-in em destaque à direita, que leva ao detalhe da academia (`/academias/{id}`), o mesmo destino da linha.
- **FR-007** (US-04) — Para administrador, a linha deve ter um ícone de editar à direita que leva à rota de edição; sem `adminEditHref`, o ícone não deve existir.
- **FR-008** (US-03, US-04) — Os ícones de ação devem ter alvo de pelo menos 24px e não sobrepor nome, descrição ou endereço, inclusive com títulos longos.

**Acessibilidade**
- **FR-009** (US-05) — Cada ícone de ação deve ter nome acessível ("Check-in em {título}", "Editar academia {título}") e tooltip, também exibido no foco de teclado.
- **FR-010** (US-05) — O indicador de status deve expor o rótulo ("Disponível" ou "Desativada") como nome acessível e como dica visual ao passar o mouse.

## Experiência do Usuário

Repouso: imagem, nome com ponto de status, descrição e endereço à esquerda; à direita, Check-in (destacado na cor de acento) e, para admin, editar (neutro, destaca no hover). Sem elementos de texto à direita. Clicar na linha continua abrindo o detalhe. Norte visual: `docs/superpowers/gym-row-minimalista/specs/mockups/gym-row-minimalista-visual.md` (variante A). Tema, fonte e chanfros atuais são mantidos.

## Restrições Técnicas de Alto Nível

- Apenas frontend; sem mudança de backend ou API.
- Ícones pixel-art do conjunto já adotado; sem `lucide-react`.
- Acessibilidade WCAG 2.2 AA: alvo mínimo 24px, nomes acessíveis, foco visível.
- A visão em grid (`GymCard`) não muda.

## Fora de Escopo

- `GymCard` (visão em grid) e qualquer unificação de componentes entre grid e linhas.
- Remoção do telefone do card ou do detalhe da academia.
- Ação própria de Check-in na lista (continua levando ao detalhe).
- Botão de status/desativação na linha.
- Mudanças de tema, fonte ou paleta.
