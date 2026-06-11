/** biome-ignore-all lint/suspicious/useIterableCallbackReturn: <explanation> */
type State = "idle" | "loading" | "playing" | "paused" | "error" | "finished"
type EventState = "PLAY" | "PAUSE" | "STOP" | "ERROR" | "LOADED" | "FINISHED"

type Context = {
	volume: number
	currentTime: number
	retryCount: number
	hasFinished: boolean
}

type StateWithGuardAndContext = {
	state: State
	guard?: Guard
	assingAction?: AssignAction
}

type Guard = (context: Context) => boolean
type Assign = (context: Context) => void
type AssignAction = (context: Context) => Context

type StateConfig = {
	on?: Partial<Record<EventState, StateWithGuardAndContext>>
	assingAction?: AssignAction
	entry?: Assign[]
	exit?: Assign[]
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

type TransitionOutput = {
	state: State
	context: Context
}

function transition(
	machine: FSM,
	current: State,
	event: EventState,
	context: Context,
): TransitionOutput {
	const t = machine[current].on?.[event]
	if (!t) return { state: current, context }

	if (t.guard && !t.guard(context)) return { state: current, context }

	// Transforma context antes dos side effects
	const newContext = t.assingAction ? t.assingAction(context) : context

	machine[current].exit?.forEach((fn) => fn(newContext))
	machine[t.state].entry?.forEach((fn) => fn(newContext))

	return { state: t.state, context: newContext }
}

const initial_state: State = "idle"
const initialContext: Context = {
	currentTime: 0,
	hasFinished: false,
	retryCount: 3,
	volume: 10,
}
const { state: state_1, context: second_context } = transition(
	machine,
	initial_state,
	"PLAY",
	initialContext,
)
console.log("state 1:", state_1)
const { state: state_2, context: third_context } = transition(
	machine,
	state_1,
	"LOADED",
	second_context,
)
console.log("state 2:", state_2)
const { state: state_3, context: fourty_context } = transition(
	machine,
	state_2,
	"FINISHED",
	third_context,
)
console.log("state 3:", state_3, fourty_context)
