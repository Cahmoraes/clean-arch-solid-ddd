export class BillingCustomerNotProvisionedError extends Error {
	constructor(userId?: string) {
		super(
			userId
				? `User ${userId} does not have a billing customer provisioned`
				: "User does not have a billing customer provisioned",
		)
		this.name = "BillingCustomerNotProvisionedError"
	}
}
