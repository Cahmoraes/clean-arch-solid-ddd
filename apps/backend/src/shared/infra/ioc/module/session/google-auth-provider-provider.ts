import type { ResolutionContext } from "inversify"
import type { GoogleAuthProvider } from "@/session/application/provider/google-auth-provider.js"
import { GoogleAuthProviderImpl } from "@/session/infra/provider/google-auth-provider-impl.js"
import { InMemoryGoogleAuthProvider } from "@/session/infra/provider/in-memory-google-auth-provider.js"
import { env, isProduction } from "@/shared/infra/env"

export class GoogleAuthProviderProvider {
	public static provide(context: ResolutionContext): GoogleAuthProvider {
		if (GoogleAuthProviderProvider.shouldUseRealProvider()) {
			return context.get(GoogleAuthProviderImpl, { autobind: true })
		}
		return context.get(InMemoryGoogleAuthProvider, { autobind: true })
	}

	// Usa o provider real do Google somente em produção e quando o seam de
	// teste não foi explicitamente habilitado via GOOGLE_AUTH_PROVIDER.
	// Mantém o in-memory em test (comportamento existente) e permite habilitá-lo
	// em produção (ex.: E2E rodando com Prisma) sem expor o provider real.
	private static shouldUseRealProvider(): boolean {
		return isProduction() && env.GOOGLE_AUTH_PROVIDER !== "in-memory"
	}
}
