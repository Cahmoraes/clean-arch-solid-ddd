export interface UserResponse {
	name?: string
	age?: number
	statusCode?: number
}

export class PromiseLikeProxy<T = UserResponse> {
	private data: UserResponse = {}

	constructor() {}

	name(name: string) {
		this.data = {
			...this.data,
			name,
		}
		return this
	}

	age(age: number) {
		this.data = {
			...this.data,
			age,
		}
		return this
	}

	public then<TResult1 = T, TResult2 = never>(
		onFulfilled: (value: T) => TResult1,
		onRejected?: (reason: any) => TResult2,
	): Promise<TResult1 | TResult2> {
		// A execução real ocorre aqui
		return this.execute().then(onFulfilled, onRejected)
	}

	private async execute(): Promise<T> {
		return {
			...this.data,
			statusCode: 200,
		} as T
	}
}

async function main() {
	const proxy = new PromiseLikeProxy()
	const result = await proxy.name("caique").age(31)
	console.log(result)
}

main()
