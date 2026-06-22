import { create } from "zustand"
import { writeSidebarCollapseCookie } from "@/lib/ui-state/sidebar-collapse-cookie"

export interface SidebarCollapseState {
	collapsed: boolean
	toggle: () => void
	setCollapsed: (collapsed: boolean) => void
	/** Seedeia o estado vindo do servidor sem reescrever o cookie. */
	hydrate: (collapsed: boolean) => void
}

export const useSidebarCollapseStore = create<SidebarCollapseState>(
	(set, get) => ({
		collapsed: false,
		toggle: () => {
			const next = !get().collapsed
			writeSidebarCollapseCookie(next)
			set({ collapsed: next })
		},
		setCollapsed: (collapsed: boolean) => {
			writeSidebarCollapseCookie(collapsed)
			set({ collapsed })
		},
		hydrate: (collapsed: boolean) => set({ collapsed }),
	}),
)
