# Task 7: Restringir algoritmo JWT a HS256

**Status:** DONE
**PRD:** N/A
**Spec:** N/A — ver `apps/backend/reports/security-review-2026-05-11.md` → HIGH-5

## Visão Geral

`jwt.verify()` é chamado sem especificar o algoritmo aceito. Embora `jsonwebtoken@9.x` rejeite `alg:none` por padrão, a ausência de restrição explícita deixa margem para ataques de confusão de algoritmo (RS256→HS256). A correção adiciona `{ algorithms: ["HS256"] }` no `verify()` e `{ algorithm: "HS256" }` no `sign()` e `refreshToken()` para consistência.

## Arquivos

- Modify: `apps/backend/src/shared/infra/auth/json-web-token-adapter.ts`

<skills>
### Compliance with Standard Skills

- `no-workarounds`: hardening explícito, não confiar em comportamento padrão da lib.
</skills>

## Passos

- [ ] **Step 1: Executar testes relacionados a autenticação para confirmar baseline**

Run:
```bash
pnpm --filter backend test:run -- --reporter=verbose src/session src/user/infra/controller/user-profile src/user/infra/controller/fetch-users 2>&1 | tail -20
```
Expected: todos passam.

- [ ] **Step 2: Atualizar `json-web-token-adapter.ts` com restrição de algoritmo**

Substituir o conteúdo de `apps/backend/src/shared/infra/auth/json-web-token-adapter.ts`:

```ts
import { inject, injectable } from "inversify"
import jwt, { type SignOptions } from "jsonwebtoken"
import {
  type Either,
  failure,
  success,
} from "@/shared/domain/value-object/either"
import type { AuthToken, Payload } from "@/user/application/auth/auth-token"
import { InvalidUserTokenError } from "@/user/application/error/invalid-user-token-error"
import { env } from "../env"
import { SHARED_TYPES } from "../ioc/types"
import type { Logger } from "../logger/logger"

@injectable()
export class JsonWebTokenAdapter implements AuthToken {
  constructor(
    @inject(SHARED_TYPES.Logger)
    private readonly logger: Logger,
  ) {}

  public sign(payload: Payload, privateKey: string): string {
    return jwt.sign(payload, privateKey, {
      expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
      algorithm: "HS256",
    })
  }

  public verify<TokenPayload>(
    token: string,
    secretKey: string,
  ): Either<InvalidUserTokenError, TokenPayload> {
    try {
      const payload = jwt.verify(token, secretKey, {
        algorithms: ["HS256"],
      }) as TokenPayload
      return success(payload)
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(this, error.message)
      }
      return failure(new InvalidUserTokenError())
    }
  }

  public refreshToken(payload: Payload, secretKey: string): string {
    return jwt.sign(payload, secretKey, {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions["expiresIn"],
      algorithm: "HS256",
    })
  }
}
```

- [ ] **Step 3: Executar todos os testes**

Run:
```bash
pnpm --filter backend test:run 2>&1 | tail -10
```
Expected: todos os testes passam.

- [ ] **Step 4: Verificar typecheck e lint**

Run:
```bash
pnpm --filter backend tsc:check && pnpm --filter backend biome:fix 2>&1 | tail -10
```
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
cd apps/backend
git add src/shared/infra/auth/json-web-token-adapter.ts
git commit -m "fix(security): restrict JWT algorithm to HS256 explicitly

Adds algorithms: ['HS256'] to jwt.verify() and algorithm: 'HS256'
to jwt.sign() and jwt.refreshToken() to prevent algorithm confusion
attacks. jsonwebtoken@9.x rejects alg:none by default but explicit
restriction is required for proper hardening.

HIGH-5 from security-review-2026-05-11

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- `jwt.verify()` usa `{ algorithms: ["HS256"] }`
- `jwt.sign()` usa `{ algorithm: "HS256" }`
- `jwt.refreshToken()` usa `{ algorithm: "HS256" }`
- Todos os testes passam
- `tsc:check` sem erros
