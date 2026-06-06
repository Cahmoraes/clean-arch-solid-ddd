"use client"

import { Plus, Search } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense, useId, useState } from "react"
import { PageContainer } from "@/components/layout/page-container"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { SearchBar } from "@/components/ui/search-bar"
import { useAllGyms, useGymsByName } from "@/features/gyms/api"
import { GymPagination } from "@/features/gyms/components/gym-pagination"
import { GymResults } from "@/features/gyms/components/gym-results"
import { useAuthStore } from "@/lib/auth/auth-store"

const RESULTS_PER_PAGE = 20

interface AcademiasContentProps {
	initialSearch: string
}

function AcademiasContent({ initialSearch }: AcademiasContentProps) {
	const user = useAuthStore((state) => state.user)
	const isAdmin = user?.role === "ADMIN"
	const inputId = useId()
	const [draftQuery, setDraftQuery] = useState(initialSearch)
	const [submittedQuery, setSubmittedQuery] = useState(initialSearch)
	const [page, setPage] = useState(1)

	const trimmed = submittedQuery.trim()
	const isBrowseMode = trimmed.length === 0

	const allGymsQuery = useAllGyms({ page, enabled: isBrowseMode })
	const searchQuery = useGymsByName({ name: trimmed, page })
	const activeQuery = isBrowseMode ? allGymsQuery : searchQuery
	const items = activeQuery.data ?? []
	const showPagination =
		!activeQuery.isLoading && !activeQuery.isError && items.length > 0

	function onSearch(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setSubmittedQuery(draftQuery)
		setPage(1)
	}

	return (
		<PageContainer
			as="section"
			width="wide"
			aria-labelledby="academias-title"
			className="gap-0"
		>
			<PageHeader
				eyebrow="Rede"
				title="Academias"
				subtitle="Busque por nome ou navegue pelas academias disponíveis."
				action={
					isAdmin ? (
						<Button asChild variant="primary" size="sm">
							<Link href="/admin/academias/nova" data-testid="gym-create-link">
								<Plus aria-hidden className="h-4 w-4" />
								Cadastrar
							</Link>
						</Button>
					) : undefined
				}
			/>

			<form
				onSubmit={onSearch}
				className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center"
				aria-label="Buscar academias"
			>
				<label htmlFor={inputId} className="sr-only">
					Buscar academias por nome
				</label>
				<SearchBar
					id={inputId}
					data-testid="gym-search-input"
					placeholder="Buscar academia por nome"
					value={draftQuery}
					onChange={(event) => setDraftQuery(event.target.value)}
					className="w-full sm:max-w-md"
				/>
				<Button type="submit" data-testid="gym-search-submit">
					<Search aria-hidden className="h-4 w-4" />
					Buscar
				</Button>
			</form>

			<div data-testid="gym-results" className="flex flex-col gap-4">
				<GymResults
					query={trimmed}
					isBrowseMode={isBrowseMode}
					isLoading={activeQuery.isLoading}
					isError={activeQuery.isError}
					errorMessage={activeQuery.error?.userMessage}
					onRetry={() => activeQuery.refetch()}
					items={items}
					isAdmin={isAdmin}
				/>
			</div>

			{showPagination ? (
				<div className="mt-8">
					<GymPagination
						page={page}
						hasPrevious={page > 1}
						hasNext={items.length >= RESULTS_PER_PAGE}
						onPrevious={() => setPage((current) => Math.max(1, current - 1))}
						onNext={() => setPage((current) => current + 1)}
					/>
				</div>
			) : null}
		</PageContainer>
	)
}

function AcademiasPageInner() {
	const searchParams = useSearchParams()
	const initialSearch = searchParams?.get("search") ?? ""
	return <AcademiasContent initialSearch={initialSearch} />
}

export default function AcademiasPage() {
	return (
		<Suspense fallback={<AcademiasContent initialSearch="" />}>
			<AcademiasPageInner />
		</Suspense>
	)
}
