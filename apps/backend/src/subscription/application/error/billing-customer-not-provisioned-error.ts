import { DomainError } from "@/shared/domain/error/domain-error.js"

export class BillingCustomerNotProvisionedError extends DomainError {
	public readonly kind = "conflict" as const

	constructor(userId?: string) {
		super(
			userId
				? `User ${userId} does not have a billing customer provisioned`
				: "User does not have a billing customer provisioned",
		)
		this.name = "BillingCustomerNotProvisionedError"
	}
}
