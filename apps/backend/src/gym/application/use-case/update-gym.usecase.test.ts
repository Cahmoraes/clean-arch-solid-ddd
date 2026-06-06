import { Gym } from "@/gym/domain/gym"
import { InMemoryGymRepository } from "@/shared/infra/database/repository/in-memory/in-memory-gym-repository"
import { GymNotFoundError } from "../error/gym-not-found-error"
import { GymWithCNPJAlreadyExistsError } from "../error/gym-with-cnpj-already-exists-error"
import { UpdateGymUseCase } from "./update-gym.usecase"

function makeSut() {
	const gymRepository = new InMemoryGymRepository()
	const sut = new UpdateGymUseCase(gymRepository)
	return { gymRepository, sut }
}

describe("UpdateGymUseCase", () => {
	test("atualiza os dados cadastrais de uma academia existente", async () => {
		const { gymRepository, sut } = makeSut()
		await gymRepository.save(
			Gym.restore({
				id: "gym-1",
				title: "Nome Antigo",
				latitude: 0,
				longitude: 0,
				cnpj: "11.222.333/0001-81",
				address: "Rua A, 1",
				imageKey: "gyms/atual.webp",
			}),
		)

		const result = await sut.execute({
			gymId: "gym-1",
			cnpj: "11.222.333/0001-81",
			title: "Nome Novo",
			description: "Atualizada",
			phone: "11999999999",
			latitude: -23.5,
			longitude: -46.6,
			address: "Rua B, 2",
		})

		expect(result.isSuccess()).toBe(true)
		const found = await gymRepository.gymOfId("gym-1")
		expect(found?.title).toBe("Nome Novo")
		expect(found?.address).toBe("Rua B, 2")
	})

	test("preserva o imageKey existente ao atualizar dados", async () => {
		const { gymRepository, sut } = makeSut()
		await gymRepository.save(
			Gym.restore({
				id: "gym-1",
				title: "Nome",
				latitude: 0,
				longitude: 0,
				cnpj: "11.222.333/0001-81",
				address: "Rua A, 1",
				imageKey: "gyms/atual.webp",
			}),
		)

		await sut.execute({
			gymId: "gym-1",
			cnpj: "11.222.333/0001-81",
			title: "Nome Editado",
			latitude: 0,
			longitude: 0,
			address: "Rua A, 1",
		})

		const found = await gymRepository.gymOfId("gym-1")
		expect(found?.imageKey).toBe("gyms/atual.webp")
	})

	test("retorna GymNotFoundError quando a academia não existe", async () => {
		const { sut } = makeSut()
		const result = await sut.execute({
			gymId: "inexistente",
			cnpj: "11.222.333/0001-81",
			title: "Qualquer",
			latitude: 0,
			longitude: 0,
			address: "Rua A, 1",
		})
		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(GymNotFoundError)
	})

	test("retorna conflito quando o CNPJ pertence a outra academia", async () => {
		const { gymRepository, sut } = makeSut()
		await gymRepository.save(
			Gym.restore({
				id: "gym-1",
				title: "Academia 1",
				latitude: 0,
				longitude: 0,
				cnpj: "11.222.333/0001-81",
				address: "Rua A, 1",
			}),
		)
		await gymRepository.save(
			Gym.restore({
				id: "gym-2",
				title: "Academia 2",
				latitude: 0,
				longitude: 0,
				cnpj: "11.444.777/0001-61",
				address: "Rua B, 2",
			}),
		)

		const result = await sut.execute({
			gymId: "gym-2",
			cnpj: "11.222.333/0001-81",
			title: "Academia 2",
			latitude: 0,
			longitude: 0,
			address: "Rua B, 2",
		})

		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(GymWithCNPJAlreadyExistsError)
	})
})
