---
created_at: "2026-09-21T09:26:03-03:00"
updated_at: "2026-09-21T09:26:03-03:00"
---

# PRD: Público-alvo do aviso administrativo

## Visão Geral

O aviso administrativo em broadcast (feature `admin-notice-broadcast`) hoje chega a todos os usuários ativos, sem distinção. Comunicados como "a academia fecha no domingo" interessam aos alunos, mas um lembrete operacional interessa só aos administradores, e enviar tudo a todos gera ruído. Esta feature permite ao administrador escolher, ao criar o aviso, quem o recebe: **Todos**, **Alunos** ou **Administradores**. Só o público escolhido é notificado.

Este PRD reverte de propósito um ponto que o PRD anterior deixou fora de escopo (segmentação de destinatários). O mecanismo de entrega em tempo real, o sino e a regra de "somente usuários ativos" permanecem.

## Objetivos

- Para cada opção de público, o número de notificações criadas é exatamente o número de usuários ativos daquele público no momento do envio (verificado por teste por opção).
- Nenhum usuário fora do público escolhido recebe o aviso: 0 notificações e 0 eventos em tempo real para eles.
- Compatibilidade: 100% das requisições que não informam o público continuam entregando a todos os usuários ativos, como hoje.
- O administrador escolhe o público em uma única interação e vê o público escolhido na pré-visualização antes de enviar.

## Histórias de Usuário

- **US-01** — Como administrador, eu quero escolher o público do aviso (todos, alunos ou administradores) ao criá-lo para que ele chegue só a quem interessa · **UI:** sim
- **US-02** — Como usuário ativo pertencente ao público escolhido, eu quero receber o aviso no meu sino de notificações para que eu seja informado do comunicado · **UI:** não
- **US-03** — Como usuário ativo fora do público escolhido, eu quero não receber avisos que não me dizem respeito para que meu sino não tenha ruído · **UI:** não
- **US-04** — Como administrador, eu quero ver na pré-visualização para qual público o aviso será enviado para que eu confira o destinatário antes de enviar · **UI:** sim
- **US-05** — Como cliente atual do envio de avisos, eu quero que o envio sem informar público continue alcançando todos os usuários ativos para que nada que já funciona seja quebrado · **UI:** não

## Funcionalidades Principais

### Escolha do público no formulário

O formulário "Novo aviso" ganha um campo "Público-alvo" com três opções mutuamente exclusivas.

- **FR-001** (US-01) — O formulário deve permitir escolher exatamente um público entre "Todos", "Alunos" e "Administradores".
- **FR-002** (US-01) — O público "Todos" deve vir selecionado por padrão ao abrir o formulário.
- **FR-003** (US-01) — Cada opção deve exibir uma descrição curta do grupo que alcança (por exemplo, "Somente alunos ativos").
- **FR-004** (US-01) — O campo deve ser operável por teclado e ter nome acessível "Público-alvo" para leitores de tela.
- **FR-005** (US-01) — O envio deve incluir o público escolhido, e, ao concluir com sucesso, o formulário deve voltar ao estado inicial, com o público de volta em "Todos".
- **FR-006** (US-01) — Ao concluir o envio, a confirmação ao administrador deve informar o número de usuários que receberam o aviso, correspondente ao público escolhido.

### Entrega segmentada

- **FR-007** (US-02, US-03) — Com o público "Alunos", somente usuários ativos com papel de aluno devem receber o aviso.
- **FR-008** (US-02, US-03) — Com o público "Administradores", somente usuários ativos com papel de administrador devem receber o aviso.
- **FR-009** (US-02) — Com o público "Todos", todos os usuários ativos devem receber o aviso, como no comportamento atual.
- **FR-010** (US-03) — Usuários fora do público escolhido não devem receber notificação persistida nem evento em tempo real do aviso.
- **FR-011** (US-02, US-03) — Em qualquer público, somente usuários com status ativo são elegíveis; suspensos, bloqueados e removidos nunca recebem.
- **FR-012** (US-02, US-03) — O administrador que envia o aviso é tratado como qualquer outro usuário: recebe o aviso apenas se o público escolhido incluir administradores. Isso substitui a regra do PRD anterior, em que o remetente sempre recebia.
- **FR-013** (US-01, US-02) — Se o público escolhido não tiver nenhum usuário ativo, o envio deve concluir sem erro e informar 0 destinatários.

### Pré-visualização

- **FR-014** (US-04) — A pré-visualização deve exibir o público escolhido e atualizá-lo imediatamente quando o administrador trocar a opção.

### Compatibilidade e validação

- **FR-015** (US-05) — Um envio que não informa o público deve ser tratado como público "Todos".
- **FR-016** (US-05) — Um envio que informa um público desconhecido deve ser recusado como requisição inválida, sem criar nenhuma notificação.
- **FR-017** (US-05) — As restrições de acesso existentes permanecem: sem token o envio é recusado como não autenticado, e usuários que não são administradores são recusados como não autorizados.

## Experiência do Usuário

O administrador abre "Novo aviso" e vê, entre "Mensagem" e o botão "Enviar aviso", três cartões de opção em linha (Todos, Alunos, Administradores), cada um com uma descrição curta. O cartão selecionado tem destaque visual (borda e anel na cor primária), no mesmo padrão dos cartões de plano de `/assinatura`. Em telas estreitas, os cartões empilham. A coluna de pré-visualização mostra o aviso como aparecerá no sino e, abaixo, a linha "Público: <opção>". O subtítulo da página passa a falar do "público escolhido" em vez de "todos os usuários". A decisão visual (opção B do mockup) está registrada em `docs/superpowers/notice-audience/specs/mockups/notice-audience-visual.md`; é um norte, não o pixel final.

Acessibilidade: o grupo de opções é rotulado, navegável por teclado e anuncia a opção selecionada; o foco visível segue o padrão do app.

## Restrições Técnicas de Alto Nível

Herdadas das características arquiteturais priorizadas no design:

- **Correção do conjunto de destinatários:** para cada público, destinatários = exatamente os usuários ativos do papel correspondente, verificável por teste por público.
- **Compatibilidade retroativa:** envio sem público produz o mesmo resultado de hoje, verificável por teste de fluxo de negócio.
- **Camadas limpas:** o contexto de notificações não pode passar a depender do contexto de usuários; a validação de dependências do backend deve passar sem violações.
- O pipeline de entrega em tempo real, o sino e o modelo de dados de notificações não mudam.

## Fora de Escopo

- Registrar o público no histórico de avisos ou exibi-lo depois do envio (não existe histórico de avisos; revisitar quando existir).
- Públicos combinados ou personalizados (por academia, por status, por lista de usuários) e escolha múltipla de papéis.
- E-mail ou push (fronteira de produto já repetida em features anteriores de notificação).
- Agendamento, rascunho, edição ou exclusão de avisos, deduplicação e trilha de auditoria.
- Mudanças na regra de "somente usuários ativos" ou no mecanismo de entrega em tempo real.
