export class StatusCode {
  static OK(): number {
    return 200
  }

  static UNAUTHORIZED(): number {
    return 401
  }

  static BAD_REQUEST(): number {
    return 400
  }

  static NOT_FOUND(): number {
    return 404
  }

  static INTERNAL_SERVER_ERROR(): number {
    return 500
  }

  static CONFLICT(): number {
    return 409
  }

  static CREATED(): number {
    return 201
  }
}
