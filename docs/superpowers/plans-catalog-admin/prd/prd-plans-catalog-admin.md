# PRD: Cadastro de Planos de Assinatura (Admin)

## Visão Geral

Hoje os planos exibidos na tela de assinaturas e na home pública são texto hardcoded no código (`DEMO_PLANS`), duplicado entre backend e frontend. Um administrador não tem como cadastrar, editar ou desativar um plano sem alterar código e fazer deploy. Esta feature dá ao admin uma tela própria para gerenciar o catálogo de planos, persistido em banco de dados, sem qualquer dependência do Stripe — a listagem pública continua funcionando com o mesmo contrato de resposta de hoje.

## Objetivos

- Eliminar a necessidade de alterar código para criar, editar ou descontinuar um plano.
- Garantir que a tela pública de assinaturas e a home continuem funcionando sem regressão durante e após a migração do array estático para o banco.
- Impedir a remoção definitiva de um plano que já tenha sido referenciado por uma assinatura (proteção contra quebra de integridade referencial).

**Métrica de sucesso:** um admin consegue criar um novo plano e vê-lo refletido na tela pública de assinaturas (`GET /plans`) sem qualquer deploy de código.

## Histórias de Usuário

- **US-01** — Como administrador, eu quero cadastrar um novo plano (nome, preço, periodicidade, tagline, features) para que ele passe a ser oferecido aos usuários · **UI:** sim
- **US-02** — Como administrador, eu quero editar os dados de um plano existente para que eu possa corrigir ou atualizar sua oferta sem recriar o plano · **UI:** sim
- **US-03** — Como administrador, eu quero inativar um plano para que ele pare de aparecer na tela pública sem perder o histórico de quem já o assinou · **UI:** sim
- **US-04** — Como administrador, eu quero reativar um plano previamente inativado para que eu possa voltar a oferecê-lo sem recadastrá-lo do zero · **UI:** sim
- **US-05** — Como administrador, eu quero ver a lista de todos os planos (ativos e inativos) para que eu tenha visão completa do catálogo · **UI:** sim
- **US-06** — Como visitante ou usuário autenticado, eu quero ver apenas os planos ativos ao acessar a tela de assinaturas ou a home para que eu não veja ofertas descontinuadas · **UI:** sim

## Funcionalidades Principais

### Cadastro e edição de planos

O admin acessa uma tela dedicada (`/admin/planos`) e cria ou edita um plano preenchendo nome, preço, periodicidade (mensal/anual), uma descrição curta (tagline) e uma lista de benefícios (features).

- **FR-001** (US-01) — O sistema deve permitir que um administrador crie um plano informando nome, preço, periodicidade, tagline e lista de features; um identificador de preço externo (para uso futuro com o Stripe) pode ser informado opcionalmente.
- **FR-002** (US-01, US-02) — O sistema deve validar que o preço informado não é negativo, rejeitando o cadastro/edição caso contrário.
- **FR-003** (US-01) — O sistema deve exigir que o nome do plano seja preenchido para permitir o cadastro.
- **FR-004** (US-02) — O sistema deve permitir que um administrador edite nome, preço, periodicidade, tagline e features de um plano existente.
- **FR-005** (US-02) — A edição de um plano não deve alterar seu status (ativo/inativo) — a mudança de status é uma ação separada.

### Ativação e inativação

Um plano nunca é excluído definitivamente — apenas inativado, para preservar o histórico de assinaturas que o referenciam.

- **FR-006** (US-03) — O sistema deve permitir que um administrador inative um plano, removendo-o da listagem pública sem apagar seus dados.
- **FR-007** (US-04) — O sistema deve permitir que um administrador reative um plano previamente inativado.
- **FR-008** (US-03) — O sistema não deve oferecer nenhuma forma de exclusão definitiva (hard delete) de um plano.

### Listagem administrativa e pública

- **FR-009** (US-05) — O sistema deve exibir ao administrador a lista completa de planos, incluindo os inativos, com indicação visual clara do status de cada um.
- **FR-010** (US-06) — O sistema deve exibir na tela pública de assinaturas e na home somente os planos ativos.
- **FR-011** (US-06) — O contrato de resposta da listagem pública de planos (campos retornados, incluindo o identificador de preço usado pelo fluxo de assinatura) deve permanecer o mesmo já usado hoje pela tela de assinaturas e pela home, para não quebrar essas telas.

### Acesso administrativo

- **FR-012** (US-01, US-02, US-03, US-04, US-05) — Somente usuários com papel de administrador podem criar, editar, inativar, reativar ou listar todos os planos (incluindo inativos); um usuário sem esse papel deve ser rejeitado.

## Experiência do Usuário

A tela administrativa (`/admin/planos`) exibe os planos em um grid de cards — cada card mostra nome, preço, tagline, lista de benefícios e um selo de status (Ativo/Inativo), com ações de editar e inativar/reativar no rodapé; um card adicional, ao final da grade, permite iniciar o cadastro de um novo plano. Criar/editar planos acontece em um formulário modal, reaproveitando o mesmo padrão visual já usado nas demais telas administrativas do produto. O layout foi validado com o usuário via preview visual (grid de cards, não tabela) — decisões completas em `../specs/mockups/plans-catalog-admin-visual.md`.

Um erro de validação (ex. preço negativo, nome vazio) é reportado diretamente no campo do formulário; uma falha ao salvar é comunicada ao administrador por uma notificação de erro, sem perder os dados já preenchidos.

## Restrições Técnicas de Alto Nível

- **Sem dependência de Stripe** — o cadastro, edição e gestão de status de planos deve funcionar de forma completamente independente de qualquer integração com o Stripe.
- **Compatibilidade de contrato** — a listagem pública de planos não pode alterar o formato de resposta hoje consumido pela tela de assinaturas e pela home.
- **Integridade referencial** — nenhuma operação pode remover fisicamente um plano do sistema; a única forma de "removê-lo" da oferta é inativá-lo.
- **Reuso de padrões existentes** — a nova funcionalidade deve seguir os mesmos padrões arquiteturais (camadas, autorização administrativa) e visuais (componentes de UI) já estabelecidos no restante do produto, sem introduzir uma segunda convenção.

## Fora de Escopo

- Integração com o Stripe (checkout real de assinatura, sincronização de preços/produtos) — não faz parte desta feature.
- Ações em massa (inativar ou editar múltiplos planos de uma vez).
- Filtros combinados na listagem administrativa além de busca simples por nome/status.
- Migração ou recuperação de qualquer implementação anterior descartada — esta feature é construída do zero.
