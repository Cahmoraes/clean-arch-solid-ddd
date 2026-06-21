import { create } from "zustand"
import { writeSidebarCollapseCookie } from "@/lib/ui-state/sidebar-collapse-cookie"

export interface SidebarCollapseState {
	collapsed: boolean
	toggle: () => void
	setCollapsed: (collapsed: boolean) => void
	/** Seedeia o estado vindo do servidor sem reescrever o cookie. */
	hydrate: (collapsed: boolean) => void
}

export const useSidebarCollapseStore = create<SidebarCollapseState>((set) => ({
	collapsed: false,
	toggle: () =>
		set((state) => {
			const next = !state.collapsed
			writeSidebarCollapseCookie(next)
			return { collapsed: next }
		}),
	setCollapsed: (collapsed: boolean) => {
		writeSidebarCollapseCookie(collapsed)
		set({ collapsed })
	},
	hydrate: (collapsed: boolean) => set({ collapsed }),
}))
