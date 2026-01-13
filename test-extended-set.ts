import { DomainEventPublisher } from "@/shared/domain/event/domain-event-publisher"
import { UserCreatedEvent } from "@/user/domain/event/user-created-event"

// Teste para verificar comportamento do ExtendedSet com duplicatas
console.log("=== TESTE DE DUPLICAÇÃO DE SUBSCRIBERS ===")

// Limpar subscribers existentes
DomainEventPublisher.instance["subscribers"].clear()

const subscriber = async () => console.log("Event received!")

console.log("1. Adicionando subscriber pela primeira vez...")
DomainEventPublisher.instance.subscribe("userCreated", subscriber)
console.log(
	"Quantidade de subscribers:",
	DomainEventPublisher.instance["subscribers"].get("userCreated")?.size,
)

console.log("2. Tentando adicionar o MESMO subscriber novamente...")
DomainEventPublisher.instance.subscribe("userCreated", subscriber)
console.log(
	"Quantidade de subscribers após duplicação:",
	DomainEventPublisher.instance["subscribers"].get("userCreated")?.size,
)

console.log("3. Testando publicação do evento...")
const event = new UserCreatedEvent({
	email: "test@example.com",
	name: "Test User",
})

// Contar quantas vezes o subscriber é chamado
let callCount = 0
const countingSubscriber = async () => {
	callCount++
	console.log(`Subscriber chamado ${callCount} vez(es)`)
}

// Limpar e testar com subscriber que conta chamadas
DomainEventPublisher.instance["subscribers"].clear()
DomainEventPublisher.instance.subscribe("userCreated", countingSubscriber)
DomainEventPublisher.instance.subscribe("userCreated", countingSubscriber) // Tentar duplicar

console.log("4. Publicando evento...")
DomainEventPublisher.instance.publish(event)
console.log("Total de chamadas do subscriber:", callCount)

// Resultado esperado: callCount = 1 (ExtendedSet deve prevenir duplicação)
console.log("=== FIM DO TESTE ===")
