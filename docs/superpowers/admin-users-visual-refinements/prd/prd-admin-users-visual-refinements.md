---
created_at: "2026-09-16T14:48:10-03:00"
updated_at: "2026-09-16T14:48:10-03:00"
---

# PRD: Refinamentos Visuais — Listagem de Usuários (Admin)

## Visão Geral

Administradores usam a tela `/admin/usuarios` várias vezes ao dia para localizar,
inspecionar e agir sobre usuários. Hoje três problemas visuais atrapalham essa leitura
rápida: o badge de papel e o badge de status ficam espremidos lado a lado; o item aberto
no painel de detalhes usa a mesma cor verde dos demais itens apenas marcados para ação em
massa, dificultando saber qual está em destaque; e o painel de detalhes aparece/some sem
nenhuma transição, o que passa uma sensação de tela quebrada. Um quarto problema —
contraste do e-mail quando o card está em destaque — foi identificado durante a validação
visual do segundo ponto e faz parte do mesmo pacote de correções.

## Objetivos

- Nenhuma informação do card (papel, status, seleção) depende só de cor para ser
  percebida — atende WCAG 1.4.1.
- O item em destaque é distinguível dos itens apenas marcados em, no máximo, um relance
  (validado por revisão visual manual nos dois temas, light e dark).
- O texto do e-mail permanece legível (contraste suficiente) em todos os estados do card,
  incluindo o destaque.
- A transição do painel de detalhes usa a mesma duração (300ms) no painel fixo (desktop)
  e na gaveta mobile já existente.

## Histórias de Usuário

- **US-01** — Como administrador, eu quero ver o status do usuário sem que ele espreme o
  badge de papel, para que eu leia nome, papel e status rapidamente mesmo em cards
  estreitos.
- **US-02** — Como administrador, eu quero que o usuário aberto no painel de detalhes
  tenha uma cor claramente diferente dos demais usuários apenas marcados para ação em
  massa, para que eu não confunda qual está em destaque ao selecionar vários de uma vez.
- **US-03** — Como administrador, eu quero continuar lendo o e-mail do usuário sem
  esforço quando o card dele estiver em destaque, para que a cor de destaque não
  atrapalhe a leitura de um dado que uso para identificar a pessoa certa.
- **US-04** — Como administrador, eu quero que o painel de detalhes abra e feche com uma
  transição suave, para que a troca de usuário selecionado não pareça abrupta.

## Funcionalidades Principais

**Status como indicador de borda, badge de papel liberado (US-01)**
Libera o espaço horizontal do card sem perder a informação de status, que passa a ser
comunicada por cor + texto acessível em vez de um segundo badge textual.

- **FR-001** (US-01) — O sistema deve exibir o status do usuário (Ativo/Inativo/Bloqueado)
  como um indicador de borda lateral colorida por tom, com um texto equivalente
  perceptível por leitor de tela, em vez de um segundo badge textual ao lado do badge de
  papel.
- **FR-002** (US-01) — O badge de papel (Membro/Administrador) deve permanecer como o
  único badge textual visível no card, ocupando o espaço horizontal antes dividido com o
  badge de status.

**Cor de seleção distinta entre destaque e apenas marcado (US-02)**
Separa visualmente o item aberto no painel de detalhes dos itens apenas marcados para
ação em massa, hoje indistinguíveis por usarem a mesma cor.

- **FR-003** (US-02) — O sistema deve aplicar uma cor de fundo ao item atualmente aberto
  no painel de detalhes (destaque) visualmente distinta da cor aplicada aos demais itens
  apenas marcados via checkbox de seleção em massa.
- **FR-004** (US-02) — A cor usada para os itens "apenas marcados" não deve ser a mesma
  cor usada para o destaque, nem a mesma cor usada no indicador de "marcado" do checkbox.

**Contraste do e-mail no destaque (US-03)**

- **FR-005** (US-03) — O texto do e-mail do usuário deve manter contraste legível contra
  o fundo do card quando este estiver no estado de destaque.

**Transição suave do painel de detalhes (US-04)**

- **FR-006** (US-04) — A abertura e o fechamento do painel de detalhes do usuário, em
  telas de split-view (desktop), devem ocorrer com uma transição visual perceptível, não
  instantânea.
- **FR-007** (US-04) — A duração da transição do painel de detalhes em split-view deve
  ser igual à duração já usada pela gaveta de detalhes em telas menores.

## Experiência do Usuário

Todas as histórias são de interface (`**UI:** sim`, aplicável ao conjunto). O fluxo
permanece o mesmo hoje existente na tela `/admin/usuarios`: listar usuários, marcar um ou
mais para ação em massa, abrir o painel de detalhes de um usuário. As mudanças são
puramente visuais dentro desse fluxo já validado.

Decisões visuais (norte, resumidas do spec — detalhe completo em
`../specs/mockups/admin-users-visual-refinements-visual.md`):
- Status vira faixa de borda lateral colorida por tom; papel continua como pill único.
- Destaque mantém o verde de accent atual; "apenas marcado" usa um tom neutro de
  superfície, sem matiz de cor nova.
- E-mail sobe para um tom de texto mais claro apenas no estado de destaque.
- Painel fixo (desktop) ganha fade + leve movimento de entrada em 300ms; a gaveta mobile
  mantém a transição que já existe, sem mudança.

Acessibilidade: nenhuma informação (status, seleção) pode depender só de cor — cada uma
carrega também um texto perceptível por leitor de tela.

## Restrições Técnicas de Alto Nível

- **Usabilidade/legibilidade:** nenhuma informação (papel, status, seleção) depende só de
  cor para ser percebida (WCAG 1.4.1).
- **Consistência visual:** o painel fixo (desktop) e a gaveta mobile são a mesma
  funcionalidade em dois breakpoints — usam a mesma duração de transição (300ms).
- **Manutenibilidade:** a nova cor de "marcado" e a nova variação do badge de status
  devem ficar centralizadas no tema/props do componente, não hardcoded numa única tela,
  para que outras telas possam reaproveitá-las.
- Mudança restrita à camada de apresentação: nenhuma rota, endpoint, schema ou regra de
  negócio muda.

## Fora de Escopo

- A lógica de seleção em si (quem pode ser marcado, o que a ação em massa faz) —
  já implementada em `bulk-user-status-actions`, não muda aqui.
- Qual usuário fica "em destaque" (aberto no painel) — a regra de abertura do painel não
  muda, só a cor aplicada a esse estado.
- Redesenho completo da tela `/admin/usuarios` além dos quatro pontos listados (badges,
  cor de seleção, contraste do e-mail, transição do painel).
- Qualquer nova cor de marca/identidade visual — o token novo introduzido é neutro
  (variação de superfície), não uma cor de marca nova.
- Alterar o comportamento da gaveta mobile (`Sheet`) — sua transição já existente é
  mantida como está.
