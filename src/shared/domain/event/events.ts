export const EVENTS = {
	USER_CREATED: "userCreated",
	PASSWORD_CHANGED: "passwordChanged",
	CHECK_IN_CREATED: "checkInCreated",
	USER_PROFILE_UPDATED: "userProfileUpdated",
	USER_ASSIGNED_BILLING_CUSTOMER_ID: "userAssignedBillingCustomerID",
} as const

export type EventTypes = (typeof EVENTS)[keyof typeof EVENTS]
