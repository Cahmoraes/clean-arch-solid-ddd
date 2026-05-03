import "vitest"

declare module "vitest" {
	interface Assertion<T = unknown> {
		toSatisfyApiSpec(): T
	}
	interface AsymmetricMatchersContaining {
		toSatisfyApiSpec(): unknown
	}
}
