import type { Logger } from './logger'

interface MethodParams {
  instance: object
  message: string
}

export class TestingLogger implements Logger {
  public detecteErrorMethod = false
  public detecteWarnMethod = false
  public detecteInfoMethod = false
  public params: MethodParams = {
    instance: {},
    message: '',
  }

  public error(instance: object, message: string): void {
    this.params = { instance, message }
    this.detecteErrorMethod = true
  }

  public warn(instance: object, message: string): void {
    this.params = { instance, message }
    this.detecteWarnMethod = true
  }

  public info(instance: object, message: string): void {
    this.params = { instance, message }
    this.detecteInfoMethod = true
  }
}
