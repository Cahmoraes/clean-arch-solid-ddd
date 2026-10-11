import { afterEach, beforeEach, describe, expect, it } from "vitest"
import type { ActiveRecipientsProvider } from "@/notification/application/provider/active-recipients.provider.js"
import { NoticeAudience } from "@/notification/domain/value-object/notice-audience.js"
import type { StatusTypes } from "@/user/domain/value-object/status"

export interface RecipientSeedUser {
	id: string
	role: "MEMBER" | "ADMIN"
	status: StatusTypes
	deleted: boolean
}

export interface ActiveRecipientsProviderContractContext {
	provider: ActiveRecipientsProvider
	seed(users: RecipientSeedUser[]): Promise<void>
	newId(): string
	cleanup(): Promise<void>
}

function audience(value: "ALL" | "MEMBERS" | "ADMINS"): NoticeAudience {
	const result = NoticeAudience.create(value)
	if (result.isFailure()) throw result.value
	return result.value
}

export function describeActiveRecipientsProviderContract(
	name: string,
	factory: () => Promise<ActiveRecipientsProviderContractContext>,
): void {
	describe(`ActiveRecipientsProvider contract (${name})`, () => {
		let context: ActiveRecipientsProviderContractContext
		let activeMember: string
		let suspendedMember: string
		let activeAdmin: string
		let deletedAdmin: string
		let lockedAdmin: string
		let lockedMember: string
		let ours: Set<string>

		beforeEach(async () => {
			context = await factory()
			activeMember = context.newId()
			suspendedMember = context.newId()
			activeAdmin = context.newId()
			deletedAdmin = context.newId()
			lockedAdmin = context.newId()
			lockedMember = context.newId()
			ours = new Set([
				activeMember,
				suspendedMember,
				activeAdmin,
				deletedAdmin,
				lockedAdmin,
				lockedMember,
			])
			await context.seed([
				{
					id: activeMember,
					role: "MEMBER",
					status: "activated",
					deleted: false,
				},
				{
					id: suspendedMember,
					role: "MEMBER",
					status: "suspended",
					deleted: false,
				},
				{ id: activeAdmin, role: "ADMIN", status: "activated", deleted: false },
				{ id: deletedAdmin, role: "ADMIN", status: "activated", deleted: true },
				{ id: lockedAdmin, role: "ADMIN", status: "locked", deleted: false },
				{ id: lockedMember, role: "MEMBER", status: "locked", deleted: false },
			])
		})

		afterEach(async () => {
			await context.cleanup()
		})

		async function idsFor(
			value: "ALL" | "MEMBERS" | "ADMINS",
		): Promise<string[]> {
			const ids = await context.provider.listActiveUserIds(audience(value))
			return ids.filter((id) => ours.has(id)).sort()
		}

		it("MEMBERS lists only active, non-deleted members", async () => {
			expect(await idsFor("MEMBERS")).toEqual([activeMember])
		})

		it("ADMINS lists only active, non-deleted admins", async () => {
			expect(await idsFor("ADMINS")).toEqual([activeAdmin])
		})

		it("excludes locked users, the status that is neither activated nor suspended, for every audience", async () => {
			for (const value of ["ALL", "MEMBERS", "ADMINS"] as const) {
				const ids = await idsFor(value)
				expect(ids).not.toContain(lockedAdmin)
				expect(ids).not.toContain(lockedMember)
			}
		})

		it("ALL lists every active, non-deleted user regardless of role", async () => {
			expect(await idsFor("ALL")).toEqual([activeMember, activeAdmin].sort())
		})
	})
}
