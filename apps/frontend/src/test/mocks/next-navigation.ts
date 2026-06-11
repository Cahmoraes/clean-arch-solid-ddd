import { vi } from "vitest"

export const useRouter = vi.fn(() => ({
	push: vi.fn(),
	replace: vi.fn(),
	back: vi.fn(),
	forward: vi.fn(),
	refresh: vi.fn(),
	prefetch: vi.fn(),
}))

export const usePathname = vi.fn(() => "/")

export const useSearchParams = vi.fn(() => new URLSearchParams())
