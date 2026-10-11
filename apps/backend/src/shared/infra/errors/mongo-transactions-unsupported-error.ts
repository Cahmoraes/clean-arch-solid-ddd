export class MongoTransactionsUnsupportedError extends Error {
	constructor() {
		super(
			"O MongoDB conectado não suporta transações: inicie o mongod com --replSet (replica set de um nó) e execute rs.initiate(). O serviço mongodb do compose.yaml já faz isso.",
		)
		this.name = "MongoTransactionsUnsupportedError"
	}
}
