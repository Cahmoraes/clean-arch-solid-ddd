import type { Container } from 'inversify'

export function LazyInject<Dependency = object>(
  serviceIdentifier: string | symbol,
): Dependency {
  let lazyContainer: Container | null = null
  const proxy = new Proxy(
    {},
    {
      get(_, property) {
        return async function (...args: unknown[]): Promise<void> {
          if (!lazyContainer) {
            const container = await importContainerWithLazyLoading()
            lazyContainer = container
          }
          const dependency = lazyContainer.get<any>(serviceIdentifier)
          Reflect.apply(dependency[property], dependency, args)
        }
      },
    },
  )
  return proxy as Dependency
}

async function importContainerWithLazyLoading(): Promise<Container> {
  try {
    const { container } = await import('../ioc/container')
    return container
  } catch {
    throw new Error('Failed to import container with lazy loading')
  }
}
