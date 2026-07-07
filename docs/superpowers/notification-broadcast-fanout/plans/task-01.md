# Task 1: Adicionar dependência `amqp-connection-manager` [FR-004]

**Status:** PENDING
**PRD:** `../prd/prd-notification-broadcast-fanout.md`
**Spec:** `../specs/notification-broadcast-fanout-design.md`
**Tier:** cheap
**Depends on:** N/A

## Visão Geral

Adicionar a dependência `amqp-connection-manager` (v5.0.0) ao backend. Essa biblioteca será usada
pela Task 6 para gerenciar a reconexão automática do `NotificationBroadcastSubscriber`, redeclarando
a exchange fanout e a fila exclusiva/auto-delete sempre que a conexão AMQP cair e for restabelecida.
Esta task não introduz nenhum uso de código ainda — apenas a instalação e a verificação de que o
build continua íntegro.

## Arquivos

- Modify: `apps/backend/package.json`

### Conformidade com as Skills Padrão

- `dependency-updater`: aplica-se por ser uma adição de dependência nova ao projeto — deve seguir o
  fluxo padrão de instalação e fixação de versão.
- `no-workarounds`: garante que a versão fixada seja a estável real (`5.0.0`), sem workaround de
  version pinning solto ou range aberto sem justificativa.

## Passos

- **Step 1: Instalar a dependência**

Run: `pnpm --filter backend add amqp-connection-manager@5.0.0`
Expected: instalação concluída, `apps/backend/package.json` e `pnpm-lock.yaml` atualizados.

- **Step 2: Verificar que a instalação não quebra o build**

Run: `pnpm --filter backend tsc:check`
Expected: PASS (nenhum uso de código ainda, só a instalação).

- **Step 3: Confirmar a entrada no `package.json`**

Confirmar que `apps/backend/package.json` contém, em `dependencies` (não `devDependencies`, pois é
usado em runtime):

```json
"amqp-connection-manager": "5.0.0"
```

(ou `^5.0.0`, conforme o que o pnpm gravar).

- **Step 4: Commit**

```bash
git add apps/backend/package.json pnpm-lock.yaml
git commit -m "chore(backend): adiciona amqp-connection-manager"
```

Nota: por ser apenas instalação de dependência, não há comportamento a testar via TDD clássico —
o passo de verificação (`tsc:check`) substitui o "rodar teste e ver passar".

## Critérios de Sucesso

- `pnpm --filter backend tsc:check` passa.
- `amqp-connection-manager` presente em `dependencies` no `apps/backend/package.json`.
