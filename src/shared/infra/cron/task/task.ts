export interface Task {
  execute(): Promise<void>
}
