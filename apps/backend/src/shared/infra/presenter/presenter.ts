export interface Presenter {
	format<Input extends Array<any>>(data: Input): unknown
}
