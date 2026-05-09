export const EVENTS = {
	USER_CREATED: "userCreated",
	PASSWORD_CHANGED: "passwordChanged",
	CHECK_IN_CREATED: "checkInCreated",
	CHECK_IN_REJECTED: "checkInRejected",
	USER_PROFILE_UPDATED: "userProfileUpdated",
	USER_ASSIGNED_BILLING_CUSTOMER_ID: "userAssignedBillingCustomerID",
	GOOGLE_ACCOUNT_LINKED: "googleAccountLinked",
} as const

export type EventTypes = (typeof EVENTS)[keyof typeof EVENTS]
