import { Activity } from "lucide-react"
import { EmptyState } from "@/components/ui/empty-state"

export interface UserActivityEvent {
	id: string
	description: string
	occurredAt: string
}

export interface ActivityTabProps {
	events?: UserActivityEvent[]
}

export function ActivityTab({ events = [] }: ActivityTabProps) {
	if (events.length === 0) {
		return (
			<EmptyState
				icon={Activity}
				title="Sem dados de atividade disponíveis"
				description="O histórico de atividade deste usuário ainda não está disponível."
			/>
		)
	}

	return (
		<ul className="flex flex-col gap-3">
			{events.map((event) => (
				<li key={event.id} className="flex items-start gap-3">
					<span
						aria-hidden="true"
						className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-accent"
					/>
					<div className="flex flex-col gap-0.5">
						<span className="text-sm text-foreground">{event.description}</span>
						<span className="text-xs text-muted-foreground">
							{event.occurredAt}
						</span>
					</div>
				</li>
			))}
		</ul>
	)
}
