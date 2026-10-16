import { HttpResponse, http } from "msw"
import { endpoint } from "./handlers"
import { server } from "./server"

const BRASIL_API_FERIADOS_URL = "https://brasilapi.com.br/api/feriados/v1"

export interface NotaMock {
	data: string
	texto: string
	atualizadoEm: string
}

export interface NotasMockOpcoes {
	semente?: NotaMock[]
	feriados?: unknown[]
	feriadosComErro?: boolean
	criacaoComErroDeRede?: boolean
	forcar409NaCriacao?: boolean
	aoAtualizar?: () => void
}

export function criarNotaMock(data: string, texto: string): NotaMock {
	return { data, texto, atualizadoEm: "2026-10-01T12:00:00.000Z" }
}

interface CorpoNota {
	data?: string
	texto?: string
}

async function lerCriacao(request: Request): Promise<{
	data: string
	texto: string
}> {
	const corpo = (await request.json().catch(() => ({}))) as CorpoNota
	return { data: corpo.data ?? "", texto: corpo.texto ?? "" }
}

function resposta409(): Response {
	return HttpResponse.json(
		{
			code: "NOTA_JA_EXISTE",
			message: "Esse dia já tem nota — edite a atual",
		},
		{ status: 409 },
	)
}

function resposta404(): Response {
	return HttpResponse.json(
		{ message: "Nota não encontrada — recarregue o mês" },
		{ status: 404 },
	)
}

function existeNota(notas: NotaMock[], data: string): boolean {
	return notas.some((nota) => nota.data === data)
}

function noIntervalo(nota: NotaMock, de: string, ate: string): boolean {
	return nota.data >= de && nota.data <= ate
}

function paramsDeIntervalo(request: Request): { de: string; ate: string } {
	const url = new URL(request.url)
	return {
		de: url.searchParams.get("de") ?? "",
		ate: url.searchParams.get("ate") ?? "",
	}
}

function temConflito(
	notas: NotaMock[],
	data: string,
	forcar409: boolean,
): boolean {
	if (forcar409) return true
	return existeNota(notas, data)
}

function criarNota(
	notas: NotaMock[],
	data: string,
	texto: string,
	forcar409: boolean,
): NotaMock | null {
	if (temConflito(notas, data, forcar409)) return null
	const nota: NotaMock = {
		data,
		texto,
		atualizadoEm: new Date().toISOString(),
	}
	notas.push(nota)
	return nota
}

function aplicarAtualizacao(
	notas: NotaMock[],
	data: string,
	texto: string | undefined,
): NotaMock | null {
	const indice = notas.findIndex((nota) => nota.data === data)
	const atual = notas[indice]
	if (indice < 0 || !atual) return null
	const atualizada: NotaMock = {
		data: atual.data,
		texto: texto ?? atual.texto,
		atualizadoEm: new Date().toISOString(),
	}
	notas[indice] = atualizada
	return atualizada
}

export interface NotasMockLoja {
	salvar: (nota: NotaMock) => void
}

/**
 * Substitui os handlers padrão de training-notes por uma loja em memória
 * isolada por teste. Os overrides entram via `server.use` e têm precedência
 * sobre os handlers estáticos de `handlers.ts`.
 */
export function instalarNotasMock(opcoes: NotasMockOpcoes = {}): NotasMockLoja {
	const {
		semente = [],
		feriados = [],
		feriadosComErro = false,
		criacaoComErroDeRede = false,
		forcar409NaCriacao = false,
		aoAtualizar,
	} = opcoes
	const notas = semente.map((nota) => ({ ...nota }))

	server.use(
		http.get(`${BRASIL_API_FERIADOS_URL}/2026`, () => {
			if (feriadosComErro) return HttpResponse.error()
			return HttpResponse.json(feriados)
		}),
		http.get(endpoint("/training-notes"), ({ request }) => {
			const { de, ate } = paramsDeIntervalo(request)
			return HttpResponse.json(
				notas.filter((nota) => noIntervalo(nota, de, ate)),
			)
		}),
		http.post(endpoint("/training-notes"), async ({ request }) => {
			if (criacaoComErroDeRede) return HttpResponse.error()
			const corpo = await lerCriacao(request)
			const nota = criarNota(notas, corpo.data, corpo.texto, forcar409NaCriacao)
			if (!nota) return resposta409()
			return HttpResponse.json({ id: "nota-teste", ...nota }, { status: 201 })
		}),
		http.put(endpoint("/training-notes/:date"), async ({ params, request }) => {
			aoAtualizar?.()
			const corpo = (await request.json().catch(() => ({}))) as CorpoNota
			const atualizada = aplicarAtualizacao(
				notas,
				String(params.date ?? ""),
				corpo.texto,
			)
			if (!atualizada) return resposta404()
			return HttpResponse.json({ id: "nota-teste", ...atualizada })
		}),
		http.delete(endpoint("/training-notes/:date"), ({ params }) => {
			const data = String(params.date ?? "")
			const indice = notas.findIndex((nota) => nota.data === data)
			if (indice < 0) return resposta404()
			notas.splice(indice, 1)
			return new HttpResponse(null, { status: 204 })
		}),
	)

	return {
		salvar: (nota) => {
			notas.push({ ...nota })
		},
	}
}
