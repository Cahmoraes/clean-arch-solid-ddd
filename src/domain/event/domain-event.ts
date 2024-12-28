export interface DomainEvent {
  id: string
  name: string
  date: Date
  toJSON(): Record<string, unknown>
}
