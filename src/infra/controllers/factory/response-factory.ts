export interface ResponseInput {
  status: number
  [key: string]: any
}

export class ResponseFactory {
  public static create(input: ResponseInput) {
    const { status, ...rest } = input
    return {
      status: status,
      body: this.extractBody(rest),
    }
  }

  private static extractBody(rest: any) {
    return rest.body
      ? Array.isArray(rest.body)
        ? rest.body
        : { ...rest.body }
      : rest
  }
}
