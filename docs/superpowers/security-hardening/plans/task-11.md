# Task 11: Adicionar security headers ao Nginx

**Status:** DONE
**PRD:** N/A
**Spec:** N/A — ver `apps/backend/reports/security-review-2026-05-11.md` → LOW-1

## Visão Geral

O `nginx/nginx.conf` não adiciona cabeçalhos de segurança HTTP. Sem eles, respostas ficam vulneráveis a clickjacking (`X-Frame-Options`), MIME-sniffing (`X-Content-Type-Options`) e referrer leakage (`Referrer-Policy`). A correção adiciona os quatro headers recomendados.

## Arquivos

- Modify: `apps/backend/nginx/nginx.conf`

<skills>
### Compliance with Standard Skills

- `no-workarounds`: headers no nível correto (dentro do `location /`), não em camada de aplicação.
</skills>

## Passos

- [ ] **Step 1: Atualizar `nginx/nginx.conf` com os security headers**

Substituir o conteúdo de `apps/backend/nginx/nginx.conf`:

```nginx
events {}

http {
  server {
    listen 80;

    location / {
      proxy_pass http://host.docker.internal:3333;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection 'upgrade';
      proxy_set_header Host $host;
      proxy_cache_bypass $http_upgrade;

      add_header X-Frame-Options "DENY";
      add_header X-Content-Type-Options "nosniff";
      add_header Referrer-Policy "strict-origin-when-cross-origin";
      add_header X-XSS-Protection "0";
    }
  }
}
```

> **Nota sobre `X-XSS-Protection: 0`:** O valor `0` é o recomendado atualmente (não `1`). Browsers modernos ignoram este header, e o valor `1` pode ser explorado em alguns cenários. Definir como `0` desabilita explicitamente o comportamento antigo.

- [ ] **Step 2: Verificar a sintaxe do nginx.conf**

Run:
```bash
docker run --rm -v "$(pwd)/apps/backend/nginx/nginx.conf:/etc/nginx/nginx.conf:ro" nginx:latest nginx -t 2>&1
```
Expected:
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

Se o Docker não estiver disponível, verificar manualmente a sintaxe do arquivo.

- [ ] **Step 3: Commit**

```bash
cd apps/backend
git add nginx/nginx.conf
git commit -m "fix(security): add HTTP security headers to Nginx config

Adds X-Frame-Options DENY, X-Content-Type-Options nosniff,
Referrer-Policy strict-origin-when-cross-origin and
X-XSS-Protection 0 to all proxied responses.

LOW-1 from security-review-2026-05-11

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- `add_header X-Frame-Options "DENY"` presente em `nginx.conf`
- `add_header X-Content-Type-Options "nosniff"` presente
- `add_header Referrer-Policy "strict-origin-when-cross-origin"` presente
- `add_header X-XSS-Protection "0"` presente
- `nginx -t` valida sem erros
