import { Example } from "./example"

export class TestingExample extends Example {
	protected performFetch() {
		return [{ title: "testing" }]
	}
}
