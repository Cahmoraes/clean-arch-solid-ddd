export class Example {
	fetchTodos() {
		const result = this.performFetch()
		return [...result, { title: "extra" }]
	}

	/* c8 ignore start */
	protected performFetch() {
		return [{ title: "production" }]
	}
	/* c8 ignore stop */
}
