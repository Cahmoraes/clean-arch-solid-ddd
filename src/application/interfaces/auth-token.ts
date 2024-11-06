export type Payload = string | Buffer | object

export interface AuthToken {
  sign(payload: Payload, privateKey: string): string
}
