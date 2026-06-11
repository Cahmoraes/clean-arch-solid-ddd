# Task 5: GoogleAuthProvider — abstração e implementações [RF-003, RF-004]

**Status:** IN_PROGRESS
**PRD:** `../prd/prd-google-social-login.md`
**Spec:** `../specs/google-social-login-design.md`

## Visão Geral

Criar a interface `GoogleAuthProvider` na camada de aplicação do bounded context `session`, e suas duas implementações: `GoogleAuthProviderImpl` (usa `google-auth-library`) e `InMemoryGoogleAuthProvider` (para testes).

## Arquivos

- Create: `apps/backend/src/session/application/provider/google-auth-provider.ts`
- Create: `apps/backend/src/session/infra/provider/google-auth-provider-impl.ts`
- Create: `apps/backend/src/session/infra/provider/in-memory-google-auth-provider.ts`

## Passos

- [ ] **Step 1: Criar a interface GoogleAuthProvider**

Criar `apps/backend/src/session/application/provider/google-auth-provider.ts`:

```typescript
import type { Either } from "@/shared/domain/value-object/either.js"
import type { InvalidGoogleTokenError } from "../error/invalid-google-token-error.js"

export interface GoogleUserInfo {
	sub: string
	email: string
	name: string
	emailVerified: boolean
}

export interface GoogleAuthProvider {
	verify(
		idToken: string,
	): Promise<Either<InvalidGoogleTokenError, GoogleUserInfo>>
}
```

- [ ] **Step 2: Criar InMemoryGoogleAuthProvider**

Criar `apps/backend/src/session/infra/provider/in-memory-google-auth-provider.ts`:

```typescript
import { injectable } from "inversify"

import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either.js"
import { InvalidGoogleTokenError } from "@/session/application/error/invalid-google-token-error.js"
import type {
	GoogleAuthProvider,
	GoogleUserInfo,
} from "@/session/application/provider/google-auth-provider.js"

@injectable()
export class InMemoryGoogleAuthProvider implements GoogleAuthProvider {
	private validTokens = new Map<string, GoogleUserInfo>()

	public addValidToken(idToken: string, userInfo: GoogleUserInfo): void {
		this.validTokens.set(idToken, userInfo)
	}

	public async verify(
		idToken: string,
	): Promise<Either<InvalidGoogleTokenError, GoogleUserInfo>> {
		const userInfo = this.validTokens.get(idToken)
		if (!userInfo) {
			return failure(new InvalidGoogleTokenError())
		}
		return success(userInfo)
	}
}
```

- [ ] **Step 3: Criar GoogleAuthProviderImpl**

Criar `apps/backend/src/session/infra/provider/google-auth-provider-impl.ts`:

```typescript
import { OAuth2Client } from "google-auth-library"
import { injectable } from "inversify"

import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either.js"
import { InvalidGoogleTokenError } from "@/session/application/error/invalid-google-token-error.js"
import type {
	GoogleAuthProvider,
	GoogleUserInfo,
} from "@/session/application/provider/google-auth-provider.js"
import { env } from "@/shared/infra/env/index.js"

@injectable()
export class GoogleAuthProviderImpl implements GoogleAuthProvider {
	private readonly client: OAuth2Client

	constructor() {
		this.client = new OAuth2Client(env.GOOGLE_CLIENT_ID)
	}

	public async verify(
		idToken: string,
	): Promise<Either<InvalidGoogleTokenError, GoogleUserInfo>> {
		try {
			const ticket = await this.client.verifyIdToken({
				idToken,
				audience: env.GOOGLE_CLIENT_ID,
			})
			const payload = ticket.getPayload()
			if (!payload || !payload.sub || !payload.email || !payload.name) {
				return failure(new InvalidGoogleTokenError())
			}
			return success({
				sub: payload.sub,
				email: payload.email,
				name: payload.name,
				emailVerified: payload.email_verified ?? false,
			})
		} catch {
			return failure(new InvalidGoogleTokenError())
		}
	}
}
```

- [ ] **Step 4: Verificar compilação**

```bash
pnpm --filter backend tsc:check
```

Esperado: sem erros de tipo.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/session/application/provider apps/backend/src/session/infra/provider
git commit -m "feat(backend): add GoogleAuthProvider interface and implementations"
```

## Critérios de Sucesso

- Interface `GoogleAuthProvider` em camada de aplicação (sem dependência de infra)
- `InMemoryGoogleAuthProvider` permite adicionar tokens válidos e simular verificação
- `GoogleAuthProviderImpl` usa `google-auth-library` e mapeia erros para `InvalidGoogleTokenError`
- Ambas implementações retornam `Either` consistente
