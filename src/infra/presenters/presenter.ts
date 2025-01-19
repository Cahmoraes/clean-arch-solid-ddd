export interface Presenter<Output> {
  format<Input extends Array<any>>(data: Input): Output
}
