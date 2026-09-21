# Task 11: Adendo de documentação em admin-notice-broadcast [FR-012]

**Status:** PENDING
**PRD:** `../prd/prd-notice-audience.md`
**Spec:** `../specs/notice-audience-design.md`
**Tier:** cheap
**Depends on:** N/A

## Visão Geral

Registra, no spec e no PRD da feature anterior (`admin-notice-broadcast`), que a segmentação de destinatários deixou de ser fora de escopo e que o administrador remetente não recebe mais o aviso sempre: ele passa a seguir o filtro do público escolhido (FR-012 novo, decisão D4 do spec de `notice-audience`). O adendo substitui, por referência, a regra D5 ("admin incluído") do spec e o FR-012 original do PRD, e aponta para `docs/superpowers/notice-audience/`. É só documentação: nenhum código de produção e nenhum teste automatizado. O adendo é acrescentado no fim de cada arquivo, sem reescrever o texto original, que segue como registro histórico da feature.

## Arquivos

- Modify: `docs/superpowers/admin-notice-broadcast/specs/admin-notice-broadcast-design.md`
- Modify: `docs/superpowers/admin-notice-broadcast/prd/prd-admin-notice-broadcast.md`

### Conformidade com as Skills Padrão

- `anthropic-skills:writing-clearly-and-concisely`: o adendo é curto, em voz ativa, sem jargão desnecessário, com uma afirmação por frase e sem emojis nem travessões longos.

## Passos

- **Step 1: Write the failing check**

Não há teste automatizado para documentação; a verificação é uma busca textual que hoje não encontra o adendo.

Run: `grep -c "Adendo (2026-09-21): público-alvo" docs/superpowers/admin-notice-broadcast/specs/admin-notice-broadcast-design.md docs/superpowers/admin-notice-broadcast/prd/prd-admin-notice-broadcast.md`
Expected: cada arquivo imprime `:0` (o grep sai com código 1, pois nenhuma linha casa; é o estado "vermelho").

- **Step 2: Write the addendum in the spec**

Acrescentar ao fim de `docs/superpowers/admin-notice-broadcast/specs/admin-notice-broadcast-design.md` (deixar duas linhas em branco antes do título, para não colar com a última linha do arquivo):

```bash
cat >> docs/superpowers/admin-notice-broadcast/specs/admin-notice-broadcast-design.md <<'EOF'


## Adendo (2026-09-21): público-alvo

A feature `notice-audience` permite escolher o público do aviso (Todos, Alunos ou Administradores). Duas decisões deste design mudam:

- A segmentação deixou de ser fora de escopo. O aviso agora chega só ao público escolhido; sem `audience` no corpo, vale `ALL`, o comportamento descrito acima.
- A decisão D5 (o administrador que envia sempre recebe o aviso) foi substituída. O remetente segue o filtro do público: recebe apenas se o público incluir administradores.

O restante deste design (fan-out em blocos de 500, `notificationCreated`, sino e tabelas) não muda. Detalhes em `docs/superpowers/notice-audience/specs/notice-audience-design.md`.
EOF
```

- **Step 3: Write the addendum in the PRD**

Acrescentar ao fim de `docs/superpowers/admin-notice-broadcast/prd/prd-admin-notice-broadcast.md`:

```bash
cat >> docs/superpowers/admin-notice-broadcast/prd/prd-admin-notice-broadcast.md <<'EOF'


## Adendo (2026-09-21): público-alvo

A feature `notice-audience` revisa dois pontos deste PRD:

- A segmentação de destinatários deixou de estar em "Fora de Escopo". O administrador escolhe o público do aviso: Todos, Alunos ou Administradores. Um envio sem público equivale a Todos.
- O FR-012 original (o administrador que envia sempre recebe o aviso) foi substituído. O remetente é tratado como qualquer usuário e recebe o aviso apenas se o público escolhido incluir administradores.

Os demais requisitos deste PRD seguem valendo. Detalhes em `docs/superpowers/notice-audience/prd/prd-notice-audience.md`.
EOF
```

- **Step 4: Run the check to verify it passes**

Run: `grep -c "Adendo (2026-09-21): público-alvo" docs/superpowers/admin-notice-broadcast/specs/admin-notice-broadcast-design.md docs/superpowers/admin-notice-broadcast/prd/prd-admin-notice-broadcast.md`
Expected: cada arquivo imprime `:1`.

Run: `grep -n "notice-audience" docs/superpowers/admin-notice-broadcast/specs/admin-notice-broadcast-design.md docs/superpowers/admin-notice-broadcast/prd/prd-admin-notice-broadcast.md`
Expected: cada arquivo mostra ao menos duas linhas (a feature nomeada e o caminho `docs/superpowers/notice-audience/...`).

Run: `git diff --stat -- docs/superpowers/admin-notice-broadcast`
Expected: exatamente 2 arquivos alterados, só com linhas adicionadas (nenhuma remoção).

- **Step 5: Commit** *(execução sequencial apenas; em onda paralela o orquestrador commita na barreira de integração. Se o seu prompt diz que você é um de vários implementadores em uma árvore compartilhada, pule este passo e reporte os arquivos.)*

```bash
git add docs/superpowers/admin-notice-broadcast/specs/admin-notice-broadcast-design.md docs/superpowers/admin-notice-broadcast/prd/prd-admin-notice-broadcast.md
git commit -m "docs(admin-notice-broadcast): registra adendo do publico-alvo"
```

## Critérios de Sucesso

- Os dois documentos de `admin-notice-broadcast` têm a seção "Adendo (2026-09-21): público-alvo" no fim, sem nenhuma linha original alterada ou removida.
- O adendo registra que a segmentação deixou de ser fora de escopo e que o remetente não recebe mais sempre, substituindo a D5 do design e o FR-012 original do PRD (FR-012 desta feature).
- O adendo aponta para `docs/superpowers/notice-audience/`.
