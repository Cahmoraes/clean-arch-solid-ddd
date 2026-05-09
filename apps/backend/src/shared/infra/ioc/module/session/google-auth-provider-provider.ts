import type { ResolutionContext } from "inversify"

import type { GoogleAuthProvider } from "@/session/application/provider/google-auth-provider.js"
import { GoogleAuthProviderImpl } from "@/session/infra/provider/google-auth-provider-impl.js"
import { InMemoryGoogleAuthProvider } from "@/session/infra/provider/in-memory-google-auth-provider.js"
import { isProduction } from "@/shared/infra/env"

export class GoogleAuthProviderProvider {
	public static provide(context: ResolutionContext): GoogleAuthProvider {
		if (isProduction()) {
			return context.get(GoogleAuthProviderImpl, { autobind: true })
		}

		return context.get(InMemoryGoogleAuthProvider, { autobind: true })
	}
}
