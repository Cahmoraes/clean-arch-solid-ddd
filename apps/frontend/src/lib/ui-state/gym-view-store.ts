import { create } from "zustand"
import {
	type GymView,
	writeGymViewCookie,
} from "@/lib/ui-state/gym-view-cookie"

export interface GymViewState {
	view: GymView
	/** Flag interna: garante que hydrate só aplica na primeira chamada. */
	hydrated: boolean
	toggle: () => void
	setView: (view: GymView) => void
	/** Seedeia o estado vindo do cookie sem reescrevê-lo; ignora chamadas após a primeira. */
	hydrate: (view: GymView) => void
}

export const useGymViewStore = create<GymViewState>((set, get) => ({
	view: "cards",
	hydrated: false,
	toggle: () => {
		const next = get().view === "cards" ? "rows" : "cards"
		writeGymViewCookie(next)
		set({ view: next })
	},
	setView: (view: GymView) => {
		writeGymViewCookie(view)
		set({ view })
	},
	hydrate: (view: GymView) => {
		if (get().hydrated) return
		set({ view, hydrated: true })
	},
}))
