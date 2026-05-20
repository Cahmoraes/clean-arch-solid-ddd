type State = "idle" | "loading" | "playing" | "paused" | "error" | "finished"
type EventState = "PLAY" | "PAUSE" | "STOP" | "ERROR" | "LOADED" | "FINISHED"
type Guard = () => boolean

type StateWithGuard = {
	state: State
	guard?: Guard
}

type StateConfig = {
	on?: Partial<Record<EventState, StateWithGuard>>
	entry?: CallableFunction[]
	exit?: CallableFunction[]
}

type FSM = Record<State, StateConfig>

// Funções de efeito
const spinnerOn = () => console.log("spinner on")
const spinnerOff = () => console.log("spinner off")

const machine: FSM = {
	idle: {
		on: {
			PLAY: {
				state: "loading",
			},
		},
	},
	loading: {
		on: {
			LOADED: {
				state: "playing",
			},
			ERROR: {
				state: "error",
			},
		},
		entry: [spinnerOn],
		exit: [spinnerOff],
	},
	playing: {
		on: {
			PAUSE: {
				state: "paused",
			},
			STOP: {
				state: "idle",
			},
			ERROR: {
				state: "error",
			},
			FINISHED: {
				state: "finished",
				guard() {
					return true
				},
			},
		},
	},
	paused: {
		on: {
			PLAY: {
				state: "playing",
			},
			STOP: {
				state: "idle",
			},
		},
	},
	error: {
		on: {
			STOP: {
				state: "idle",
			},
		},
	},
	finished: {},
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: intencional
function transition(machine: FSM, current: State, event: EventState): State {
	const transition = machine[current].on?.[event]
	if (!transition) return current
	// Guard primeiro — sem side effects se bloquear
	if (transition.guard && !transition.guard()) return current
	const exits = machine[current].exit
	if (exits) {
		for (const exit of exits) {
			exit()
		}
	}

	const entries = machine[transition.state].entry
	if (entries) {
		for (const entry of entries) {
			entry()
		}
	}

	return transition.state
}

const initial_state: State = "idle"
const state_1 = transition(machine, initial_state, "PLAY")
console.log("state 1:", state_1)
const state_2 = transition(machine, state_1, "LOADED")
console.log("state 2:", state_2)
const state_3 = transition(machine, state_2, "FINISHED")
console.log("state 3:", state_3)
