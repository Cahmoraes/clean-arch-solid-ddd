async function saveUserDataToCache() {
	console.log("🔹 Salvando no cache...")
	new Promise((resolve) =>
		setTimeout(() => {
			console.log("🔹 Dados salvos!")
			resolve(0)
		}, 3000),
	)
	console.log("✅ Cache salvo!")
}

async function execute() {
	console.log("🚀 Buscando usuários...")
	await new Promise((resolve) => setTimeout(resolve, 2000)) // Simula busca lenta
	saveUserDataToCache() // Sem await
	console.log("🏁 Finalizando execução...")
}

execute()
