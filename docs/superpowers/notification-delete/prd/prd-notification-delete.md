# PRD: Exclusão de notificação no bell

## Visão Geral

O menu de notificações (bell) permite hoje apenas visualizar e marcar notificações como lidas. Quem recebe muitos avisos não consegue limpar a própria caixa, e notificações antigas ou irrelevantes permanecem na lista. Esta feature permite que o usuário autenticado exclua uma notificação por vez, direto no item do bell. A exclusão vale só para o próprio usuário: os demais destinatários de um mesmo aviso continuam vendo a sua notificação.

## Objetivos

- Ao excluir, o item some da lista imediatamente, sem esperar a resposta do servidor.
- Nenhuma exclusão de um usuário afeta a caixa de outro usuário (zero ocorrências nos testes de isolamento).
- O carregamento de mais notificações depois de excluir não pula nem repete nenhum item.
- O contador de não lidas fica sempre coerente com a lista exibida.
- Toda notificação excluída continua preservada por pelo menos 90 dias quando for de segurança, sem nova estrutura de dados.

## Histórias de Usuário

- **US-01** — Como usuário autenticado, eu quero excluir uma notificação direto no item do bell para que eu limpe minha caixa sem sair da página · **UI:** sim
- **US-02** — Como usuário autenticado, eu quero que a exclusão afete apenas a minha caixa e nunca a de outra pessoa para que avisos enviados a várias pessoas continuem visíveis para os demais destinatários · **UI:** não
- **US-03** — Como usuário autenticado, eu quero que a lista e o contador de não lidas continuem corretos depois de excluir para que eu confie no que vejo ao rolar o menu · **UI:** sim
- **US-04** — Como usuário de teclado ou de dispositivo touch, eu quero acionar a exclusão sem depender do mouse para que o recurso seja acessível em qualquer dispositivo · **UI:** sim

## Funcionalidades Principais

### Excluir uma notificação

Cada item do bell oferece uma ação de excluir, uma notificação por vez. É importante para o usuário controlar o que permanece na caixa. A exclusão é imediata e sem confirmação.

- **FR-001** (US-01) — O sistema deve oferecer, em cada item do bell, uma ação para excluir aquela notificação, uma por vez.
- **FR-002** (US-01) — O sistema deve executar a exclusão sem pedir confirmação e remover o item da lista antes da resposta do servidor.
- **FR-003** (US-01) — O sistema deve restaurar o item na posição original, junto com o contador de não lidas, quando a exclusão falhar por erro de rede ou de servidor.

### Isolamento e retenção

Notificações de aviso são compartilhadas entre vários destinatários, cada um com o seu estado. A exclusão respeita esse modelo.

- **FR-004** (US-02) — O sistema deve remover a notificação apenas da caixa de quem a excluiu, mantendo-a visível para os demais destinatários.
- **FR-005** (US-02) — O sistema não deve exibir novamente uma notificação excluída, inclusive após recarregar a página.
- **FR-006** (US-02) — O sistema deve responder como "não encontrada", sem revelar se ela existe, quando o usuário tentar excluir uma notificação que não é dele, que não existe ou que já foi excluída, e deve rejeitar a requisição sem autenticação.
- **FR-007** (US-02) — O sistema deve preservar o registro de toda notificação excluída, de modo que as notificações de segurança permaneçam retidas por pelo menos 90 dias.

### Consistência da lista e do contador

- **FR-008** (US-03) — O sistema deve reduzir em uma unidade o contador de não lidas ao excluir uma notificação não lida, e deve mantê-lo inalterado ao excluir uma já lida.
- **FR-009** (US-03) — O sistema não deve pular nem repetir itens ao carregar mais notificações depois de uma exclusão.
- **FR-010** (US-03) — O sistema deve manter o item removido, sem restaurá-lo, quando o servidor responder que ele já não existe para o usuário (por exemplo, em um clique duplo), e deve ressincronizar a lista.
- **FR-011** (US-03) — O sistema deve carregar mais notificações quando o usuário excluir o último item exibido e ainda houver mais a carregar, e deve mostrar o estado vazio quando não houver mais nenhuma.

### Acessibilidade e dispositivos

- **FR-012** (US-04) — O sistema deve revelar a ação de excluir ao passar o mouse ou focar o item com o teclado, e deve exibi-la sempre em dispositivos sem hover.
- **FR-013** (US-04) — O sistema deve identificar a ação de excluir com o nome acessível "Excluir notificação", com área de toque adequada, e o acionamento dela não deve marcar a notificação como lida.

## Experiência do Usuário

O layout atual do item do bell é mantido. O botão de excluir aparece no hover ou foco da linha e ocupa o lugar da hora; em dispositivos sem hover fica sempre visível. Em linhas já lidas, a atenuação visual não atinge o botão de excluir. O estilo destrutivo suave (vermelho translúcido) sinaliza a ação ao passar o mouse. Não há confirmação, desfazer nem lixeira. Direção visual detalhada: `docs/superpowers/notification-delete/specs/mockups/notification-delete-visual.md`.

## Restrições Técnicas de Alto Nível

Características priorizadas no design:

- **Isolamento entre usuários:** excluir notificação de outro usuário não altera nenhum dado.
- **Consistência percebida:** após excluir, o carregamento de mais itens não pula nem repete.
- **Manutenibilidade:** sem alteração no modelo de dados; a exclusão é lógica, preservando os registros.
- **Retenção:** notificações de segurança retidas por pelo menos 90 dias (PRD `realtime-notification-system`).
- **Contrato compartilhado:** o contrato da API deve ficar disponível para o frontend pelos tipos gerados.

## Fora de Escopo

- Excluir várias ou todas as notificações de uma vez.
- Desfazer a exclusão, lixeira ou restauração.
- Confirmação antes de excluir.
- Sincronização da exclusão entre abas ou dispositivos em tempo real.
- Purga física dos registros após 90 dias.
- Página de histórico `/notificacoes`.
- Exclusão ou recolhimento de avisos pelo administrador (excluído por `admin-notice-broadcast` e `notice-audience`).
