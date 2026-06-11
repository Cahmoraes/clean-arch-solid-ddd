---
created_at: "2026-05-14T17:11:36-03:00"
updated_at: "2026-05-14T17:14:48-03:00"
---

# Login misto para contas com provider externo

## Problema

A aplicacao trata `/perfil/senha` como um fluxo de troca de senha para qualquer usuario autenticado. Isso quebra para usuarios que entraram por provider externo e ainda nao possuem senha local. O objetivo do produto e permitir login misto na mesma conta: provider externo e email/senha.

## Resumo da decisao

Usar dois fluxos distintos:

1. **Definir senha** para contas que tenham pelo menos um provider externo e nenhuma senha local.
2. **Alterar senha** para contas que ja tenham senha local.

O frontend continua usando `/perfil/senha`, mas muda rotulo, copy, validacao e acao de backend de acordo com a capacidade da conta retornada pela API de perfil.

## Objetivos

- Suportar login misto no mesmo principal de usuario.
- Fazer a UI de senha refletir o estado real da conta.
- Exigir reautenticacao recente no provider externo antes de criar a primeira senha local.
- Manter o desenho generico para providers externos, sem amarrar a solucao ao Google.
- Preservar um fluxo mais estrito de alteracao de senha para quem ja possui senha local.

## Fora de escopo

- Mesclar duas contas de usuario preexistentes.
- Redesenhar recuperacao de conta ou introduzir MFA nesta iniciativa.
- Construir uma UX completa de account linking para todo provider.

## Experiencia do usuario

A API de perfil passa a expor capacidades de credencial. O frontend usa essas informacoes para decidir qual experiencia renderizar.

- `hasPassword = false` e `authMethods` contem um provider externo: mostrar **Definir senha**.
- `hasPassword = true`: manter **Alterar senha**.

A rota continua sendo `/perfil/senha`, mas o conteudo muda:

- **Definir senha**
  - campos: `newPassword`, `confirmPassword`
  - acao: exigir reautenticacao recente no provider e, depois disso, criar a primeira senha local
- **Alterar senha**
  - campos: `currentPassword`, `newPassword`, `confirmPassword`
  - acao: validar a senha atual e persistir a nova senha

Nao ocultar a funcionalidade para usuarios de provider externo. Expor a capacidade com o rotulo correto permite que o usuario ganhe um fallback local sem sair da mesma conta.

## Desenho de backend

### Metadados de credencial

`UserProfileUseCase` precisa retornar informacao suficiente para o frontend renderizar o fluxo correto. O contrato minimo e:

```json
{
  "id": "user-id",
  "name": "User Name",
  "email": "user@example.com",
  "role": "member",
  "hasPassword": false,
  "authMethods": ["google"]
}
```

`authMethods` precisa continuar extensivel. O frontend nao deve tratar Google como caso especial espalhado pela interface.

### Definir senha

Criar um caso de uso autenticado e uma rota dedicada para a primeira senha local. Essa rota nao deve reutilizar `change-password`, porque a semantica e diferente.

Contrato sugerido:

- `POST /users/me/password`
- corpo:
  - `newRawPassword`
  - `reauthGrant`

Regras:

- o usuario autenticado precisa ter `hasPassword = false`
- o usuario autenticado precisa ter pelo menos um provider externo suportado
- a requisicao precisa incluir um `reauthGrant` valido e de uso unico
- em caso de sucesso, a senha e persistida no mesmo registro de usuario e todos os metodos de autenticacao permanecem vinculados a mesma conta

### Contrato de reautenticacao

O desenho usa um fluxo de reautenticacao em duas etapas para que o endpoint de criacao de senha nao dependa de estado implicito do frontend.

1. O frontend executa uma reautenticacao fresca no provider.
2. O frontend envia a prova do provider para uma rota dedicada no backend.
3. O backend valida essa prova pelo adapter do provider e retorna um **reauth grant de uso unico** valido por **5 minutos**.
4. O frontend envia esse grant para `POST /users/me/password`.
5. O backend consome o grant uma unica vez e recusa reutilizacao.

Isso deixa o contrato explicito e generico. Para Google, a prova do provider e um ID token fresco validado contra o subject do Google ja vinculado. Outros providers podem entrar no mesmo contrato por meio de seus adapters.

### Alterar senha

O fluxo atual de troca de senha nao e seguro o bastante para ser reutilizado como esta. Corrigi-lo e um prerequisito bloqueante desta iniciativa.

Antes de liberar login misto, `change-password` precisa:

- aceitar `currentPassword`
- validar `currentPassword` contra o hash armazenado
- persistir a senha atualizada por meio do repositorio

Depois dessa correcao, a rota pode continuar dedicada a usuarios que ja tenham `hasPassword = true`.

### Endurecimento do login por provider externo

Esta iniciativa nao deve depender de linking silencioso por email. Se um login por provider externo encontrar um usuario existente pelo email, mas sem identidade de provider ja vinculada, o backend precisa parar de fazer esse link automaticamente.

Para esta iniciativa, a regra segura e:

- provider ja vinculado para o mesmo subject: permitir login
- usuario existente com mesmo email, mas sem provider vinculado: rejeitar com conflito explicito
- nenhum usuario existente: criar nova conta de provider externo

Isso mantem o login misto vinculado a uma mudanca explicita e autenticada na conta, em vez de depender de linking so por email.

## Comportamento de login apos a primeira senha

Nao e necessaria uma nova rota de login por email/senha se a senha for armazenada no mesmo registro de usuario. O fluxo atual de login pode autenticar essa conta assim que `password_hash` existir.

O backend ainda precisa de um ajuste de comportamento: quando um usuario existir, mas ainda nao tiver senha local, o login por email/senha deve retornar um erro especifico em vez de uma resposta generica de credenciais invalidas. Essa resposta deve permitir que o frontend sugira o provider externo ou o fluxo de definir senha.

## Regras de erro e seguranca

- Rejeitar `define password` se a conta ja tiver senha.
- Rejeitar `define password` se a prova de reautenticacao pertencer a outra identidade de provider.
- Rejeitar `define password` se o `reauthGrant` estiver expirado ou ja tiver sido consumido.
- Rejeitar `change password` se `currentPassword` estiver incorreta.
- Nunca deixar o frontend decidir elegibilidade sozinho. O backend precisa revalidar as capacidades da conta.
- Notificar o usuario depois que a primeira senha for criada.
- Atualizar o estado de sessao apos sucesso. Com a infraestrutura atual, e melhor revogar o contexto atual de refresh e emitir novos tokens do que prometer revogacao global sem mecanismo pronto.
- Invalidar ou atualizar imediatamente qualquer cache de perfil que alimente `hasPassword` ou `authMethods`.

## Estrategia de testes

Cobrir a iniciativa em tres niveis:

1. **Testes de unidade e business-flow no backend**
   - perfil retorna `hasPassword` e `authMethods`
   - conta somente externa consegue definir a primeira senha com `reauthGrant` valido
   - `reauthGrant` reutilizado ou expirado falha
   - conta com senha existente continua usando `change-password`
   - login por email/senha funciona depois que a primeira senha e criada
   - login por email/senha retorna erro especifico quando a conta ainda nao tem senha
2. **Testes de frontend**
   - `/perfil` mostra `Definir senha` ou `Alterar senha` a partir das capacidades da conta
   - `/perfil/senha` troca campos, copy e acao de submit de acordo com as capacidades da conta
3. **Cobertura E2E**
   - conta externa entra, reautentica, define a primeira senha e depois faz login por email/senha
   - conta local existente altera a senha pelo fluxo com senha atual

Quando a implementacao chegar na cobertura E2E, usar **Playwright CLI** para ajudar a exercitar e validar o fluxo completo no navegador.

## Notas de implementacao

- Modelar a solucao em torno de capacidades da conta, e nao de ramificacoes de UI por provider.
- Manter `define password` e `change password` como casos de uso separados, mesmo se compartilharem helpers de validacao.
- Tratar as correcoes de `change-password` como prerequisito, nao como limpeza opcional.
