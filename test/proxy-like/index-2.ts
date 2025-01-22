export interface Data {
  name: string
  status: number
  message: string
}

export class PromiseLikePattern<T = Partial<Data>> {
  private data: Partial<Data>

  constructor() {
    this.data = {}
  }

  public name(name: string) {
    this.data.name = name
    return this
  }

  public status(status: number) {
    this.data.status = status
    return this
  }

  public message(message: string) {
    this.data.message = message
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
    return this.data as T
  }
}

main()

async function main() {
  const promiseLike = new PromiseLikePattern()
    .name('any_name')
    .status(200)
    .message('any_message')

  const result = await promiseLike
  console.log(result)
}
