interface User {
	name: string
	email: string
	password: string
	role: string
}

const createUser = (index: number): User => ({
	name: `User${Math.random() + index}`,
	email: `user${Math.random() + index}@example.com`,
	password: "password123",
	role: "MEMBER",
})

async function createUsers(count: number) {
	const promises = Array.from({ length: count }, (_, i) => {
		const user = createUser(i)
		return fetch("http://localhost:3333/users", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(user),
		}).then((response) => response.json())
	})
	return Promise.all(promises)
}

// Usage
createUsers(30).then((results) => {
	console.log(results)
})
