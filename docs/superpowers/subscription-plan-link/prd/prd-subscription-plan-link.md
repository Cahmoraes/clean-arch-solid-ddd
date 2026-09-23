# PRD: Vínculo Plano-Assinatura-Usuário

## Visão Geral

Hoje o plano escolhido na tela `/assinatura` não é salvo: ao voltar à tela, o usuário precisa selecionar o plano de novo, porque a seleção é apenas estado local. A assinatura de um usuário não referencia o plano contratado.

Esta feature vincula a assinatura ao plano e ao usuário de forma persistente, para que a tela mostre o plano vigente e o usuário possa consultar, trocar e cancelar a assinatura. Beneficia todo usuário autenticado que assina um plano do catálogo.

## Objetivos

- Ao reabrir `/assinatura`, 100% dos usuários com assinatura ativa veem seu plano vigente pré-selecionado e marcado como "Plano atual", sem nova seleção.
- Cada usuário tem no máximo uma assinatura ativa em qualquer momento.
- Trocar de plano e agendar cancelamento são concluídos em uma ação, sem passos manuais adicionais.
- O estado exibido (plano, período, cancelamento agendado) corresponde ao que foi gravado na última ação do usuário.

## Histórias de Usuário

- **US-01** — Como usuário autenticado, eu quero que o plano que assinei fique salvo para que eu o veja ao voltar à tela de assinatura sem selecionar de novo · **UI:** sim
- **US-02** — Como usuário sem assinatura, eu quero continuar escolhendo e assinando um plano na tela de assinatura para que eu comece a usar o serviço · **UI:** sim
- **US-03** — Como usuário com assinatura ativa, eu quero trocar para outro plano para que minha assinatura reflita o que quero pagar · **UI:** sim
- **US-04** — Como usuário com assinatura ativa, eu quero cancelar ao fim do período pago para que eu mantenha o acesso pelo que já paguei · **UI:** sim
- **US-05** — Como usuário com assinatura vencida após cancelamento, eu quero assinar novamente um plano para que eu retome o serviço · **UI:** sim
- **US-06** — Como sistema cliente da API, eu quero consultar a assinatura vigente do usuário autenticado para que a interface exiba seu estado atual · **UI:** não

## Funcionalidades Principais

**Persistência do vínculo**
- **FR-001** (US-01, US-02) — O sistema deve gravar, ao criar uma assinatura, o plano contratado e o período pago vigente (início e fim), vinculados ao usuário.
- **FR-002** (US-02) — O sistema deve resolver o plano contratado a partir do preço escolhido; se nenhum plano corresponder, deve informar que o plano não foi encontrado.
- **FR-003** (US-02, US-03) — O sistema deve calcular o fim do período como um mês após o início para planos mensais e um ano após o início para planos anuais.
- **FR-004** (US-02, US-05) — O sistema deve impedir que um usuário tenha mais de uma assinatura ativa e, ao tentar assinar com uma ativa não vencida, deve informar o conflito.

**Consulta**
- **FR-005** (US-01, US-06) — O sistema deve permitir ao usuário autenticado consultar sua assinatura vigente, retornando plano, status, início e fim do período e se o cancelamento está agendado.
- **FR-006** (US-01, US-06) — Quando o usuário não tem assinatura, a consulta deve retornar ausência de assinatura como resultado normal, não como erro.
- **FR-007** (US-01) — Ao abrir `/assinatura` com assinatura vigente, a tela deve pré-selecionar o plano vigente e marcá-lo como "Plano atual"; sem assinatura, deve manter o comportamento atual de seleção.
- **FR-008** (US-01) — O sistema deve exibir o plano vigente mesmo se ele estiver inativado no catálogo.

**Troca de plano**
- **FR-009** (US-03) — O sistema deve permitir trocar o plano da assinatura ativa, mantendo a mesma assinatura (sem criar uma nova) e uma única assinatura ativa.
- **FR-010** (US-03) — O sistema deve recusar a troca quando não há assinatura ativa ou quando há cancelamento agendado, informando o motivo; após a recusa por cancelamento agendado, a tela deve recarregar o estado da assinatura.
- **FR-011** (US-03) — Enquanto o usuário tem assinatura ativa, a tela deve oferecer "Trocar plano" no lugar de "Assinar".
- **FR-012** (US-03) — O sistema deve permitir a troca para assinaturas legadas sem plano identificado, gravando o novo plano.

**Cancelamento**
- **FR-013** (US-04) — O sistema deve permitir agendar o cancelamento ao fim do período pago; a assinatura permanece ativa até o fim do período.
- **FR-014** (US-04) — Cancelar uma assinatura com cancelamento já agendado deve manter o estado agendado sem erro.
- **FR-015** (US-04) — A tela deve exibir a data de fim do período quando há cancelamento agendado.
- **FR-016** (US-04) — Quando o usuário não tem assinatura ativa, o cancelamento deve ser recusado informando "Você não possui assinatura ativa".

**Expiração e reassinatura**
- **FR-017** (US-05) — O sistema deve considerar a assinatura vencida quando o fim do período passou e o cancelamento estava agendado, sem exigir job ou evento externo.
- **FR-018** (US-05) — Ao assinar novamente, o sistema deve encerrar a assinatura vencida e criar uma nova com novo período.

**Legado**
- **FR-019** (US-01) — Para assinaturas existentes sem plano vinculado, a tela deve mostrar "plano não identificado" e oferecer cancelar e trocar.

## Experiência do Usuário

Fluxo principal em `/assinatura`: (1) sem assinatura, o usuário escolhe um plano e assina (fluxo atual, com método de pagamento demo); (2) com assinatura, o plano vigente aparece pré-selecionado e marcado como "Plano atual", o botão principal passa a ser "Trocar plano" e há uma ação "Cancelar"; (3) com cancelamento agendado, a tela mostra a data de fim e não oferece troca. Datas são exibidas como dia, no fuso do navegador. Mensagens de erro em português, sem termos técnicos. Botões e estados novos devem ser acessíveis por teclado e ter nome acessível (WCAG 2.2 AA).

## Restrições Técnicas de Alto Nível

- **Consistência:** nunca duas assinaturas ativas para o mesmo usuário, inclusive sob requisições concorrentes.
- **Modificabilidade:** as regras de camadas e dependências do contexto de assinaturas permanecem válidas (`test:fitness` e `fit:validate-dependencies` sem regressão).
- **Testabilidade:** as transições do ciclo de vida são verificáveis sem infraestrutura externa.
- **Compatibilidade:** `GET /plans` mantém o formato atual; assinaturas existentes continuam consultáveis.
- **Integração:** o fluxo de checkout atual com o gateway de pagamento é mantido; o status local pode divergir do gateway (risco aceito, sem sincronização por eventos).

## Fora de Escopo

- Integração com gateway de pagamento real além do fluxo atual, cobrança proporcional na troca de plano.
- Sincronização de status por webhooks do gateway.
- Múltiplas assinaturas simultâneas por usuário.
- Histórico de planos por assinatura.
- Métricas financeiras (MRR, LTV, receita).
- Alterações no CRUD administrativo de planos.
- Cancelamento imediato (só ao fim do período).
