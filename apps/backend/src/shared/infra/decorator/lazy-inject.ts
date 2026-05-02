import { container } from "../ioc/container"

export function LazyInject<Dependency = object>(
	serviceIdentifier: string | symbol,
): Dependency {
	const proxy = new Proxy(
		{},
		{
			get(_, property): CallableFunction {
				const dependency = container.get<any>(serviceIdentifier)
				return (...args: unknown[]): unknown =>
					Reflect.apply(dependency[property], dependency, args)
			},
		},
	)
	return proxy as Dependency
}
