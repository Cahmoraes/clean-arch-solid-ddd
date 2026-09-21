---
created_at: "2026-09-20T17:33:28-03:00"
updated_at: "2026-09-20T17:33:28-03:00"
---

# PRD: Aviso administrativo em broadcast

## Visão Geral

Hoje o sistema só gera notificações como consequência de eventos de check-in, para um único usuário. Administradores não têm como comunicar um aviso geral (manutenção, mudança de horário, comunicado institucional). Esta feature dá ao administrador uma tela para cadastrar um aviso, que é entregue como notificação in-app (sino, em tempo real) a todos os usuários ativos.

## Objetivos

- Todo usuário ativo recebe o aviso no sino logo após o administrador enviá-lo, sem recarregar a página.
- Cada usuário ativo recebe exatamente uma notificação por envio: nº de notificações criadas = nº de usuários ativos no momento do envio.
- Somente administradores conseguem enviar avisos: 100% das tentativas sem token ou de membros são recusadas.
- Falha na entrega em tempo real não faz o aviso persistido se perder: o usuário o vê ao abrir o sino.

## Histórias de Usuário

- **US-01** — Como administrador, eu quero cadastrar um aviso com título e mensagem para que todos os usuários sejam informados de um comunicado · **UI:** sim
- **US-02** — Como usuário ativo, eu quero receber o aviso no meu sino de notificações em tempo real para que eu seja informado sem precisar procurar · **UI:** sim
- **US-03** — Como administrador, eu quero ver uma pré-visualização de como o aviso aparecerá no sino para que eu confira o texto antes de enviá-lo a todos · **UI:** sim
- **US-04** — Como administrador, eu quero acessar a tela de novo aviso por um item no menu de administração para que eu a encontre facilmente, sem que membros a vejam ou usem · **UI:** sim
- **US-05** — Como responsável pela plataforma, eu quero que usuários suspensos ou bloqueados não recebam avisos para que a comunicação alcance apenas quem está ativo · **UI:** não

## Funcionalidades Principais

### Cadastro e envio do aviso

O administrador informa título e mensagem e envia. O aviso é entregue a todos os usuários ativos.

- **FR-001** (US-01) — O sistema deve permitir ao administrador enviar um aviso com título e mensagem.
- **FR-002** (US-01) — O título deve ter de 1 a 100 caracteres e a mensagem de 1 a 500 caracteres; valores fora desses limites devem ser recusados com mensagem de validação clara.
- **FR-003** (US-01) — Ao concluir o envio, o sistema deve informar ao administrador o sucesso e o número de usuários que receberam o aviso, e limpar o formulário.
- **FR-004** (US-01) — Enquanto o envio estiver em andamento, o botão de envio deve ficar desabilitado para evitar envio duplicado.
- **FR-005** (US-01) — Se o envio falhar, o sistema deve informar o erro ao administrador e manter o conteúdo digitado no formulário.

### Entrega ao usuário

- **FR-006** (US-01, US-02) — O sistema deve criar uma notificação do tipo aviso para cada usuário ativo, com o título e a mensagem informados.
- **FR-007** (US-02) — O aviso deve aparecer no sino do usuário em tempo real quando ele estiver conectado, e ficar disponível na lista de notificações para quem se conectar depois.
- **FR-008** (US-02) — O aviso deve seguir o comportamento das demais notificações: contador de não lidas, marcar como lida e rolagem infinita da lista.
- **FR-009** (US-02) — O aviso deve ter identificação visual própria no sino, distinta das notificações de check-in.
- **FR-010** (US-01, US-02) — Falha ao entregar em tempo real não deve fazer o envio falhar nem apagar avisos já persistidos.
- **FR-011** (US-05) — Somente usuários com status ativo (`activated`) devem receber o aviso; usuários suspensos ou bloqueados não devem receber.
- **FR-012** (US-01, US-02) — O administrador que envia o aviso também é um usuário ativo e deve recebê-lo.

### Pré-visualização

- **FR-013** (US-03) — A tela deve exibir, ao lado do formulário, uma pré-visualização do aviso como ele aparece no sino, atualizada conforme o administrador digita.

### Acesso restrito

- **FR-014** (US-04) — O menu de administração deve exibir o item "Novo aviso" apenas para administradores.
- **FR-015** (US-04) — A tela de novo aviso deve ser acessível somente a administradores.
- **FR-016** (US-04) — O envio de aviso deve ser recusado como não autenticado sem token e como não autorizado para usuários que não sejam administradores.

## Experiência do Usuário

Fluxo principal: o administrador abre "Novo aviso" no grupo ADMIN do menu, preenche título e mensagem, confere a pré-visualização, envia e vê a confirmação com o número de destinatários. Cada usuário vê o aviso surgir no sino com identificação própria.

Decisões visuais (norte, não pixel-final; detalhes em `docs/superpowers/admin-notice-broadcast/specs/mockups/admin-notice-broadcast-visual.md`): formulário em card à esquerda e pré-visualização à direita, empilhados em telas estreitas; mesmo tema e componentes das demais telas de administração. Acessibilidade: campos com rótulo, erros de validação anunciados e botão desabilitado com estado visível.

## Restrições Técnicas de Alto Nível

- **Segurança:** envio restrito a administradores; recusa sem token e para membros verificável por teste.
- **Corretude:** exatamente uma notificação por usuário ativo por envio.
- **Disponibilidade:** falha de entrega em tempo real não perde o aviso persistido; o banco é a fonte de verdade.
- **Desempenho:** envio síncrono adequado para a base atual; revisar o modelo de entrega se a base passar de ~10 mil usuários ativos ou o envio levar mais de 5 s.
- Reaproveita o mecanismo de notificações e a entrega em tempo real já existentes, sem alterar a leitura das notificações.
- Sem novas tabelas de banco de dados.

## Fora de Escopo

- Envio por e-mail ou push.
- Agendamento e rascunho de avisos.
- Histórico de avisos enviados e sua exclusão ou recolhimento.
- Deduplicação no servidor: dois envios deliberados iguais geram dois avisos (revisar com chave de idempotência se houver duplicidade em produção).
- Retentativa automática de entrega ou de blocos parcialmente persistidos.
- Limite de frequência de envios (rate limit) e trilha de auditoria de quem enviou.
- Segmentação de destinatários (apenas "todos os usuários ativos").
- Confirmação modal antes do envio (a pré-visualização cumpre esse papel).


## Adendo (2026-09-21): público-alvo

A feature `notice-audience` revisa dois pontos deste PRD:

- A segmentação de destinatários deixou de estar em "Fora de Escopo". O administrador escolhe o público do aviso: Todos, Alunos ou Administradores. Um envio sem público equivale a Todos.
- O FR-012 original (o administrador que envia sempre recebe o aviso) foi substituído. O remetente é tratado como qualquer usuário e recebe o aviso apenas se o público escolhido incluir administradores.

Os demais requisitos deste PRD seguem valendo. Detalhes em `docs/superpowers/notice-audience/prd/prd-notice-audience.md`.
