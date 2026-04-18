import { ContractError } from "./contract-error"

export function requires(
	condition: unknown,
	message: string,
): asserts condition {
	if (!condition) throw new ContractError(message)
}
