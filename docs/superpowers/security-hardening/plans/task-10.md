# Task 10: Restringir portas Docker ao loopback (127.0.0.1)

**Status:** DONE
**PRD:** N/A
**Spec:** N/A — ver `apps/backend/reports/security-review-2026-05-11.md` → MEDIUM-3

## Visão Geral

`compose.yaml` expõe PostgreSQL (5432), RabbitMQ (5672, 15672) e Redis (6379) em todas as interfaces de rede (`0.0.0.0`). Em ambientes cloud ou CI, esses serviços ficam acessíveis com credenciais padrão. A correção restringe todos os binds ao loopback `127.0.0.1`, mantendo acesso local mas bloqueando acesso externo. O Nginx (porta 80) permanece em `0.0.0.0` por ser o ponto de entrada público.

## Arquivos

- Modify: `apps/backend/compose.yaml`

<skills>
### Compliance with Standard Skills

- `no-workarounds`: bind explícito ao loopback, não firewall ou `.env` separado.
</skills>

## Passos

- [ ] **Step 1: Atualizar `compose.yaml` com bind ao loopback**

Substituir o conteúdo de `apps/backend/compose.yaml`:

```yaml
services:
  postgresql:
    container_name: "postgresql-dev"
    image: bitnami/postgresql:latest
    restart: unless-stopped
    volumes:
      - postgresql_data:/bitnami/postgresql
    environment:
      - POSTGRES_USERNAME=docker
      - POSTGRESQL_PASSWORD=docker
      - POSTGRESQL_DATABASE=apisolid
    ports:
      - "127.0.0.1:5432:5432"

  rabbitmq:
    container_name: rabbitmq
    image: rabbitmq:3-management
    restart: unless-stopped
    ports:
      - "127.0.0.1:5672:5672"
      - "127.0.0.1:15672:15672"

  redis:
    container_name: redis
    image: redis:latest
    restart: always
    ports:
      - "127.0.0.1:6379:6379"
    volumes:
      - redis_data:/data
    command: ["redis-server", "--appendonly", "yes"]

  nginx:
    image: nginx:latest
    container_name: nginx-proxy
    restart: unless-stopped
    ports:
      - "80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - postgresql
      - rabbitmq
      - redis
    extra_hosts:
      - "host.docker.internal:host-gateway"

volumes:
  postgresql_data:
  redis_data:
```

- [ ] **Step 2: Verificar a sintaxe do compose.yaml**

Run:
```bash
docker compose -f apps/backend/compose.yaml config --quiet 2>&1
```
Expected: sem erros de sintaxe.

- [ ] **Step 3: Verificar que não há testes que dependam de acesso externo ao compose**

Run:
```bash
pnpm --filter backend test:run 2>&1 | tail -10
```
Expected: todos os testes passam (testes usam in-memory, não o compose.yaml).

- [ ] **Step 4: Commit**

```bash
cd apps/backend
git add compose.yaml
git commit -m "fix(security): bind Docker service ports to loopback (127.0.0.1)

Restricts PostgreSQL, RabbitMQ and Redis ports to localhost only.
Nginx port 80 remains on 0.0.0.0 as the public entry point.
Prevents external access to infra services with default credentials.

MEDIUM-3 from security-review-2026-05-11

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- `127.0.0.1:5432:5432` no serviço `postgresql`
- `127.0.0.1:5672:5672` e `127.0.0.1:15672:15672` no serviço `rabbitmq`
- `127.0.0.1:6379:6379` no serviço `redis`
- `docker compose config` valida sem erros
- Testes não afetados
