# Direção visual: layout de usuários

## Intenção

Criar uma tela de administração com leitura imediata: filtros no topo, busca logo abaixo,
lista navegável à esquerda e detalhe contextual à direita. O objetivo é modernizar a
hierarquia sem adicionar ruído visual ou alterar o fluxo de negócio.

## Layout aprovado

- Desktop: duas colunas, lista em 40% e detalhe em 60%.
- Lista com seleção persistente, avatar, nome, e-mail, papel e status.
- Detalhe com avatar ampliado, status, ação `Editar dados`, menu `Mais ações`,
  informações resumidas e abas de atividade/permissões.
- Mobile: lista em tela cheia; detalhe em drawer ou página de detalhe.
- Painel desktop sticky e rolagem independente.

## Tokens aplicados

```css
:root {
  --background: #080808;
  --surface: #161616;
  --surface-elevated: #1d1d1d;
  --border: #2a2a2a;
  --foreground: #f6f6f4;
  --muted: #85857d;
  --accent: #39e58c;
  --radius-control: 14px;
  --radius-card: 22px;
  --space-unit: 4px;
}
```

## Markup representativo

```tsx
<div className="grid lg:grid-cols-[minmax(320px,0.4fr)_minmax(0,0.6fr)]">
  <UserListPanel
    filters={<UserFilterBar />}
    selectedUserId={selectedUserId}
    onSelectUser={setSelectedUserId}
  />
  <UserDetailContainer
    className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)]"
    userId={selectedUserId}
  />
</div>
```

## Interações

- O primeiro usuário é selecionado quando existem resultados e nenhum usuário foi
  escolhido.
- `ArrowUp` e `ArrowDown` percorrem a lista.
- `/` foca a busca.
- O drawer recebe foco ao abrir e devolve foco à linha selecionada ao fechar.
- Estados destrutivos permanecem no menu secundário e exigem confirmação.

## Fonte e fidelidade

Nenhuma fonte externa; o layout foi definido no companion visual. Este artefato é um norte
de composição e espaçamento. A fidelidade final deve ser validada contra os componentes e
tokens reais durante a implementação.
