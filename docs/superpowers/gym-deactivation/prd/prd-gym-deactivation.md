---
created_at: "2026-07-31T14:16:17-03:00"
updated_at: "2026-07-31T14:16:17-03:00"
---

# PRD: Desativação/Reativação de Academia

## Visão Geral

Administradores precisam de uma forma de remover temporariamente uma academia da circulação — sem apagá-la — quando ela deixa de ser um local válido para check-ins (fechou, está em reforma, teve o cadastro contestado etc.). Hoje a única forma de "remover" uma academia seria excluí-la do banco, o que destruiria o histórico de check-ins e auditoria associado a ela. Esta funcionalidade resolve isso: um administrador pode desativar uma academia (ela some das buscas e passa a bloquear check-ins) e reativá-la a qualquer momento, sempre preservando o histórico.

## Objetivos

- **Segurança/Autorização**: apenas administradores conseguem desativar ou reativar uma academia. Meta: 100% das tentativas de um usuário não-administrador retornam erro de autorização (403).
- **Integridade dos dados**: nenhuma desativação/reativação apaga fisicamente uma academia ou seus check-ins. Meta: nenhuma operação desta feature executa `DELETE` sobre a tabela de academias.
- **Confiabilidade**: uma academia desativada não deve aparecer em nenhum caminho de busca nem permitir check-in para usuários comuns. Meta: 100% dos caminhos de leitura (busca geral, busca textual, busca por proximidade, acesso direto por link) e o fluxo de check-in respeitam essa regra, validados por teste de integração.

## Histórias de Usuário

- **US-01** — Como administrador, eu quero desativar uma academia para que ela deixe de ser encontrada por outros usuários e não permita novos check-ins
- **US-02** — Como administrador, eu quero reativar uma academia desativada para que ela volte a ficar visível e disponível para check-ins
- **US-03** — Como administrador, eu quero ver uma confirmação antes de desativar ou reativar uma academia para evitar cliques acidentais
- **US-04** — Como administrador, eu quero continuar acessando o detalhe de uma academia desativada para poder gerenciá-la e reativá-la
- **US-05** — Como usuário comum, eu quero que academias desativadas não apareçam nas minhas buscas para não tentar visitar um local indisponível
- **US-06** — Como usuário comum, eu quero ser impedido de fazer check-in em uma academia desativada para não gerar um registro inválido
- **US-07** — Como administrador, eu quero identificar visualmente quais academias estão desativadas na lista de busca para gerenciá-las com facilidade

## Funcionalidades Principais

### Alternância de status da academia (desativar/reativar)

O que faz: adiciona um botão de ação na tela de detalhe da academia que alterna o estado dela entre ativa e desativada. Por que importa: é o único ponto de controle do ciclo de vida operacional de uma academia sem recorrer a exclusão física. Como funciona em alto nível: o botão reflete o estado atual (ícone/cor diferentes) e, ao ser clicado, abre um modal de confirmação; a confirmação dispara a mudança de estado.

- **FR-001** — O sistema deve permitir que um usuário com papel de administrador desative uma academia ativa a partir da tela de detalhe.
- **FR-002** — O sistema deve permitir que um usuário com papel de administrador reative uma academia desativada a partir da tela de detalhe.
- **FR-003** — O botão de alternância de status deve exibir ícone e cor distintos conforme o estado atual da academia.
- **FR-004** — Ao clicar no botão de alternância, o sistema deve exibir um modal de confirmação explicando a consequência da ação (desativar: a academia some das buscas e bloqueia novos check-ins; reativar: a academia volta a ficar visível e disponível), com opções de confirmar ou cancelar.
- **FR-005** — Requisições de desativação ou reativação feitas por um usuário sem papel de administrador devem ser rejeitadas com erro de autorização.
- **FR-010** — Tentar desativar uma academia já desativada, ou reativar uma já ativa, deve retornar um erro de conflito, sem alterar o estado atual.
- **FR-011** — A desativação e a reativação nunca devem remover fisicamente a academia do banco de dados, nem os check-ins e dados de auditoria associados a ela.

### Ocultação de academias desativadas para usuários comuns

O que faz: garante que uma academia desativada seja tratada, para qualquer usuário não-administrador, como se não existisse. Por que importa: é a garantia de negócio central da feature — sem isso, "desativar" não teria efeito prático algum. Como funciona em alto nível: todo caminho de leitura de academias (listagem, busca, busca por proximidade, acesso direto) e o fluxo de check-in passam a considerar o status da academia antes de expor ou permitir a ação.

- **FR-006** — Uma academia desativada não deve ser retornada em nenhuma listagem ou busca de academias (geral, textual ou por proximidade) para um usuário sem papel de administrador.
- **FR-007** — Um usuário sem papel de administrador que tentar fazer check-in em uma academia desativada deve receber o mesmo erro hoje usado para uma academia inexistente.
- **FR-008** — Um usuário sem papel de administrador que acessar diretamente a URL de detalhe de uma academia desativada deve receber o mesmo erro hoje usado para uma academia inexistente.
- **FR-009** — Um usuário com papel de administrador deve continuar conseguindo visualizar e acessar o detalhe de uma academia desativada.

### Identificação visual de academias desativadas (visão administrativa)

O que faz: sinaliza, na lista de busca, quais academias estão desativadas — apenas para quem tem permissão de reativá-las. Por que importa: sem esse indicador, um administrador não teria como localizar uma academia desativada para reativá-la, já que ela não aparece nas buscas padrão. Como funciona em alto nível: a mesma tela de busca já existente passa a exibir academias desativadas, mas somente para administradores, com um selo indicando o estado.

- **FR-012** — Na lista de busca de academias, um usuário com papel de administrador deve visualizar um indicador visual identificando as academias com status desativado.

## Experiência do Usuário

O fluxo principal acontece inteiramente na tela de detalhe da academia (`/academias/[id]`): um botão flutuante ao lado do já existente botão "Editar" reflete o estado atual da academia (vermelho, indicando ação de desativar, quando ativa; verde, indicando ação de reativar, quando desativada). Ao clicar, um modal de confirmação — reaproveitando o padrão visual já usado em "Suspender usuário" — explica a consequência da ação antes de o administrador confirmar. Na tela de busca de academias, administradores passam a ver academias desativadas com um selo "Desativada", permitindo localizá-las para reativação; usuários comuns não veem essa distinção porque simplesmente não veem a academia.

Decisões visuais completas (posição, tamanho, cores, tokens) estão documentadas no artefato curado: `../specs/mockups/gym-deactivation-visual.md`.

## Restrições Técnicas de Alto Nível

Carregadas da seção "Características Arquiteturais" da spec de design (`../specs/gym-deactivation-design.md`), já validadas com o usuário durante o brainstorming:

- **Segurança/Autorização**: toda ação de desativar/reativar é restrita a administradores; 403 para qualquer outro papel.
- **Integridade dos dados**: nenhuma operação desta feature executa exclusão física de academias ou de seus check-ins/dados de auditoria.
- **Confiabilidade**: a regra de ocultação de academias desativadas deve valer em 100% dos caminhos de leitura e no fluxo de check-in, sem exceções de paginação ou geolocalização.

## Fora de Escopo

- Rastreamento de quem/quando desativou ou reativou uma academia (auditoria detalhada da ação) — considerado durante o brainstorming, mas não priorizado nesta versão.
- Ações em massa (desativar/reativar múltiplas academias de uma vez) ou combinação dessa funcionalidade com filtros de busca avançados.
- Notificação automática a membros quando uma academia que eles frequentam é desativada.
- Mensagem diferenciada para o usuário comum informando que uma academia específica foi desativada — por decisão de design, o comportamento observado é idêntico ao de "academia não encontrada", para não revelar a existência da academia desativada.
