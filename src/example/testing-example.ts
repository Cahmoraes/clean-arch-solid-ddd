import { Example } from './example'

export class TestingExample extends Example {
  performFetch() {
    return [{ title: 'testing' }]
  }
}
