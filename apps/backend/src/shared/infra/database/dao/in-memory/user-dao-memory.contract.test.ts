import { IdRecorder } from "test/repository-contract/id-recorder"
import { describeUserDaoContract } from "test/repository-contract/user-dao-contract"
import { UserDAOMemory } from "./user-dao-memory"

describeUserDaoContract("in-memory", async () => {
	const dao = new UserDAOMemory()
	const recorder = new IdRecorder()
	return {
		dao,
		newId: () => recorder.newId(),
		seed: async (users) => {
			for (const user of users) {
				dao.createFakeUser({
					id: user.id,
					name: user.name,
					email: user.email,
					role: user.role,
					status: user.status,
					createdAt: user.createdAt.toISOString(),
					isSuperAdmin: user.isSuperAdmin,
					deletedAt: user.deletedAt ? user.deletedAt.toISOString() : null,
				})
			}
		},
		cleanup: async () => dao.clear(),
	}
})
