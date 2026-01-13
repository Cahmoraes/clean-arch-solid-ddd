import type { Presenter } from "./presenter"

export class JSONPresenter implements Presenter {
	public format<Input>(data: Input): unknown {
		return data as unknown
	}
}
