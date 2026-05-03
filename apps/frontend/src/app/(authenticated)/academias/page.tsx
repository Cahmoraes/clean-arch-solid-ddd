"use client"

import { Plus, Search } from "lucide-react"
import Link from "next/link"
import { useId, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useGymsByName } from "@/features/gyms/api"
import { GymPagination } from "@/features/gyms/components/gym-pagination"
import { GymResults } from "@/features/gyms/components/gym-results"
import { useAuthStore } from "@/lib/auth/auth-store"

const RESULTS_PER_PAGE = 20

export default function AcademiasPage() {
	const user = useAuthStore((state) => state.user)
	const inputId = useId()
	const [draftQuery, setDraftQuery] = useState("")
	const [submittedQuery, setSubmittedQuery] = useState("")
	const [page, setPage] = useState(1)

	const trimmed = submittedQuery.trim()
	const query = useGymsByName({ name: trimmed, page })
	const items = query.data ?? []
	const showPagination =
		Boolean(trimmed) && !query.isLoading && !query.isError && items.length > 0

	function onSearch(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setSubmittedQuery(draftQuery)
		setPage(1)
	}

	return (
		<section
			aria-labelledby="academias-title"
			className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6"
		>
			<header className="flex items-start justify-between gap-4">
				<div className="flex flex-col gap-2">
					<h1
						id="academias-title"
						className="font-display text-3xl font-medium text-pure-black"
					>
						Academias
					</h1>
					<p className="text-sm text-mid-gray">
						Busque por nome para encontrar uma academia próxima.
					</p>
				</div>
				{user?.role === "ADMIN" ? (
					<Button asChild variant="primary" size="sm">
						<Link href="/admin/academias/nova" data-testid="gym-create-link">
							<Plus aria-hidden className="h-4 w-4" />
							Cadastrar
						</Link>
					</Button>
				) : null}
			</header>

			<form
				onSubmit={onSearch}
				className="flex flex-col gap-2 sm:flex-row sm:items-center"
				aria-label="Buscar academias"
			>
				<label htmlFor={inputId} className="sr-only">
					Buscar academias por nome
				</label>
				<Input
					id={inputId}
					data-testid="gym-search-input"
					placeholder="Ex.: Iron Gym"
					value={draftQuery}
					onChange={(event) => setDraftQuery(event.target.value)}
				/>
				<Button type="submit" data-testid="gym-search-submit">
					<Search aria-hidden className="h-4 w-4" />
					Buscar
				</Button>
			</form>

			<div data-testid="gym-results" className="flex flex-col gap-4">
				<GymResults
					query={trimmed}
					isLoading={query.isLoading}
					isError={query.isError}
					errorMessage={query.error?.userMessage}
					onRetry={() => query.refetch()}
					items={items}
				/>
			</div>

			{showPagination ? (
				<GymPagination
					page={page}
					hasPrevious={page > 1}
					hasNext={items.length >= RESULTS_PER_PAGE}
					onPrevious={() => setPage((current) => Math.max(1, current - 1))}
					onNext={() => setPage((current) => current + 1)}
				/>
			) : null}
		</section>
	)
}
