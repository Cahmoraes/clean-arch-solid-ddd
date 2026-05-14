---
created_at: "2026-05-14T17:15:44-03:00"
updated_at: "2026-05-14T17:15:44-03:00"
---

# PRD: Login misto para contas com provider externo

## Visao Geral

Este PRD formaliza a necessidade de remover o bloqueio atual da tela de senha para usuarios autenticados por provider externo que ainda nao possuem senha local. A iniciativa cria uma experiencia clara para **definir a primeira senha** sem quebrar o fluxo de **alterar senha** de quem ja possui credencial local. O resultado esperado e que a mesma conta possa aceitar login por provider externo e por email/senha, sem duplicar usuarios nem depender de linking inseguro.

## Objetivos

1. Garantir que usuarios autenticados por provider externo e sem senha local encontrem um caminho valido para criar a primeira senha a partir do perfil.
2. Permitir que a mesma conta passe a aceitar login por provider externo e por email/senha depois da definicao da primeira senha.
3. Preservar um fluxo seguro de alteracao de senha para usuarios que ja possuem senha local.
4. Retornar comunicacao explicita quando um usuario tentar login por email/senha em uma conta que ainda nao tem senha local.
5. Reduzir ambiguidade na UI, diferenciando claramente **Definir senha** de **Alterar senha**.

## Historias de Usuario

- Como usuario autenticado por provider externo e sem senha local, eu quero definir uma senha local apos me reautenticar para ter um metodo alternativo de acesso.
- Como usuario que ja possui senha local, eu quero continuar alterando minha senha com validacao da senha atual para proteger minha conta.
- Como usuario que tenta entrar por email/senha em uma conta sem senha local, eu quero receber orientacao clara sobre o proximo passo correto.
- Como time de produto e seguranca, eu quero manter um unico principal por conta para evitar duplicidade de usuarios e linking inseguro entre metodos de autenticacao.

## Funcionalidades Principais

### 1. Experiencia de senha orientada pela capacidade da conta

O produto deve distinguir contas que ja possuem senha local das contas que ainda dependem apenas de provider externo.

- **RF-001:** o perfil do usuario deve expor informacoes suficientes para o frontend identificar se a conta possui senha local e quais metodos de autenticacao estao vinculados.
- **RF-002:** a area de perfil deve mostrar **Definir senha** quando a conta nao tiver senha local e **Alterar senha** quando a conta ja tiver senha.
- **RF-003:** a tela de senha deve adaptar campos, textos e acao principal de acordo com o estado da conta, evitando qualquer formulario que exija senha atual quando ela nao existe.

### 2. Definicao da primeira senha com verificacao reforcada

O produto deve permitir que usuarios autenticados por provider externo criem a primeira senha local com uma verificacao adicional de identidade.

- **RF-004:** o sistema deve permitir a definicao da primeira senha apenas para usuarios autenticados que nao possuem senha local e que tenham pelo menos um provider externo elegivel.
- **RF-005:** antes de concluir a definicao da primeira senha, o usuario deve passar por reautenticacao recente no provider externo ja vinculado a conta.
- **RF-006:** ao concluir a definicao da primeira senha, o sistema deve associar a nova credencial local ao mesmo usuario existente, sem criar uma conta paralela.
- **RF-007:** depois da definicao da primeira senha, a conta deve aceitar login por provider externo e por email/senha.

### 3. Alteracao segura de senha para contas locais

Usuarios que ja possuem senha local nao devem ser redirecionados para o fluxo de definicao da primeira senha.

- **RF-008:** contas com senha local devem continuar usando um fluxo de alteracao de senha separado do fluxo de definicao da primeira senha.
- **RF-009:** o fluxo de alteracao de senha deve exigir a senha atual antes de aceitar a nova senha.

### 4. Claridade no login e nos limites de vinculacao

O produto precisa responder de forma clara quando o usuario escolhe um metodo de autenticacao que ainda nao esta disponivel para a conta.

- **RF-010:** quando um usuario existente ainda nao tiver senha local e tentar login por email/senha, o sistema deve retornar uma resposta explicita que permita orientar o usuario para o provider externo ou para a definicao da primeira senha.
- **RF-011:** o sistema nao deve vincular silenciosamente um login por provider externo a uma conta existente apenas por coincidencia de email.
- **RF-012:** apos a definicao da primeira senha, o estado da conta mostrado ao usuario deve refletir imediatamente a nova capacidade de login.
- **RF-013:** o usuario deve ser notificado quando a primeira senha local for criada com sucesso.

## Experiencia do Usuario

Fluxo principal para conta sem senha local:

1. O usuario acessa `/perfil` e encontra a acao **Definir senha**.
2. O usuario abre a tela de senha e ve apenas os campos de nova senha e confirmacao, acompanhados da exigencia de reautenticacao recente no provider externo.
3. O usuario conclui a verificacao adicional e finaliza a criacao da senha.
4. O sistema confirma o sucesso e, a partir desse ponto, a conta passa a aceitar login por email/senha e por provider externo.

Fluxo principal para conta com senha local:

1. O usuario acessa `/perfil` e encontra a acao **Alterar senha**.
2. O usuario informa senha atual, nova senha e confirmacao.
3. O sistema valida a senha atual e conclui a troca com feedback claro.

Consideracoes de UX:

- o usuario nao deve encontrar campos impossiveis de preencher para o seu estado atual
- os textos devem explicar claramente a diferenca entre criar a primeira senha e alterar uma senha existente
- mensagens de erro devem orientar o proximo passo, nao apenas bloquear
- a experiencia deve continuar acessivel para quem navega apenas por teclado e leitores de tela

## Restricoes Tecnicas de Alto Nivel

- A solucao deve funcionar para providers externos suportados, sem depender de um unico provider.
- A conta precisa manter o mesmo principal de usuario entre os metodos de autenticacao habilitados.
- A criacao da primeira senha deve exigir verificacao adicional de identidade por meio de reautenticacao recente no provider externo ja vinculado.
- O estado de credenciais da conta precisa ser refletido imediatamente na experiencia autenticada.
- O produto deve respeitar requisitos de seguranca para credenciais, notificacao ao usuario e protecao contra vinculacao insegura por email.

## Fora de Escopo

- Mesclar duas contas ja existentes.
- Criar uma UX completa de account linking para qualquer combinacao de providers.
- Redesenhar fluxos de recuperacao de conta ou MFA.
- Construir um sistema novo de revogacao global de todas as sessoes como parte desta iniciativa.
