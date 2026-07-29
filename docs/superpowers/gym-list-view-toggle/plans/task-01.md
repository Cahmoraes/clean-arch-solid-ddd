# Task 1: Extrair `resolveLocation` para módulo compartilhado

**Status:** DONE
**PRD:** N/A
**Spec:** ../specs/gym-list-view-toggle-design.md
**Tier:** cheap
**Depends on:** N/A

## Visão Geral

`resolveLocation` é hoje uma função privada dentro de `gym-card.tsx` que formata a localização de uma `Gym` para exibição (endereço quando disponível, senão coordenadas). A task 5 (`GymRow`) precisa da mesma lógica sem duplicá-la. Esta task move a função, ao pé da letra, para um módulo compartilhado em `features/gyms/lib/`, exporta-a nomeadamente, e atualiza `gym-card.tsx` para importar dela. Nenhuma mudança de comportamento — `gym-card.test.tsx` deve continuar passando sem alteração.

## Arquivos

- Create: `apps/frontend/src/features/gyms/lib/resolve-location.ts`
- Create (test): `apps/frontend/src/features/gyms/lib/resolve-location.test.ts`
- Modify: `apps/frontend/src/features/gyms/components/gym-card.tsx`

### Conformidade com as Skills Padrão

- `refactoring`: extração de função existente para um novo módulo, preservando comportamento (mover ao pé da letra, sem reescrever a lógica).
- `typescript-advanced`: garantir que o tipo `Gym` importado e a assinatura de `resolveLocation` permaneçam corretos após a extração para o novo módulo.
- `code-style`: nomear o novo arquivo/módulo e o export seguindo as convenções já usadas em `features/gyms/lib/` e `features/gyms/components/`.
- `test-antipatterns`: o teste novo deve cobrir os dois ramos reais da função (endereço presente vs. ausente) sem reescrever a lógica testada; `gym-card.test.tsx` não deve ser tocado nem enfraquecido.

## Passos

- **Step 1: Write the failing test**

```ts
// apps/frontend/src/features/gyms/lib/resolve-location.test.ts
import { describe, expect, test } from "vitest"
import type { Gym } from "@/features/gyms/api"
import { resolveLocation } from "./resolve-location"

const baseGym: Gym = {
	id: "g1",
	title: "VOLT Centro",
	description: null,
	phone: null,
	address: null,
	imageKey: null,
	latitude: -23.5,
	longitude: -46.6,
}

describe("resolveLocation", () => {
	test("retorna o endereço quando presente", () => {
		const gym: Gym = { ...baseGym, address: "Rua A, 100" }
		expect(resolveLocation(gym)).toBe("Rua A, 100")
	})

	test("retorna as coordenadas formatadas quando o endereço está ausente", () => {
		const gym: Gym = { ...baseGym, address: null }
		expect(resolveLocation(gym)).toBe("-23.5000, -46.6000")
	})
})
```

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend test resolve-location.test.ts`
Expected: FAIL with `Failed to resolve import "./resolve-location"` (o módulo `resolve-location.ts` ainda não existe)

- **Step 3: Write minimal implementation**

```ts
// apps/frontend/src/features/gyms/lib/resolve-location.ts
import type { Gym } from "@/features/gyms/api"

export function resolveLocation(gym: Gym): string {
	if (gym.address) return gym.address
	return `${gym.latitude.toFixed(4)}, ${gym.longitude.toFixed(4)}`
}
```

Em seguida, atualizar `gym-card.tsx`: remover a definição privada de `resolveLocation` e importar do novo módulo.

```ts
// apps/frontend/src/features/gyms/components/gym-card.tsx
import { MapPin, Pencil } from "lucide-react"
import { motion } from "motion/react"
import Link from "next/link"
import type { Gym } from "@/features/gyms/api"
import { GymImage } from "@/features/gyms/components/gym-image"
import { resolveLocation } from "@/features/gyms/lib/resolve-location"

export interface GymCardProps {
	gym: Gym
	adminEditHref?: string
}

// (função privada resolveLocation removida daqui — agora importada acima)

const cardMotionVariants = {
	rest: {
		y: 0,
		scale: 1,
		boxShadow: "0 0 0 0px rgba(57,229,140,0), 0 0px 0px 0px rgba(0,0,0,0)",
	},
	hover: {
		y: -3,
		scale: 1.015,
		boxShadow:
			"0 0 0 1px rgba(57,229,140,0.45), 0 10px 30px -12px rgba(0,0,0,0.5)",
	},
}
```

O restante de `gym-card.tsx` (a função `GymCard`) permanece idêntico — o único uso de `resolveLocation(gym)` no JSX continua funcionando pois a assinatura é a mesma.

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend test resolve-location.test.ts gym-card.test.tsx`
Expected: PASS (ambos os arquivos, incluindo os 11 testes existentes de `gym-card.test.tsx` sem alteração)

- **Step 5: Commit**

```bash
git add apps/frontend/src/features/gyms/lib/resolve-location.ts apps/frontend/src/features/gyms/lib/resolve-location.test.ts apps/frontend/src/features/gyms/components/gym-card.tsx
git commit -m "refactor: extrai resolveLocation para módulo compartilhado em features/gyms/lib"
```

## Critérios de Sucesso

- `apps/frontend/src/features/gyms/lib/resolve-location.ts` exporta `resolveLocation(gym: Gym): string` nomeadamente.
- `gym-card.tsx` não contém mais definição própria de `resolveLocation`, apenas o import do novo módulo.
- `gym-card.test.tsx` passa sem nenhuma alteração no seu conteúdo.
- `resolve-location.test.ts` cobre os dois ramos (endereço presente / ausente).
- `pnpm --filter frontend test` verde para os arquivos afetados.
