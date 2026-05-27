"use client"

import { Users } from "lucide-react"
import type { MouseEvent } from "react"
import { useEffect, useMemo, useState } from "react"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@/components/ui/pagination"
import { Skeleton } from "@/components/ui/skeleton"
import { useUserStats } from "@/features/admin/api/use-user-stats"
import {
	ADMIN_USERS_DEFAULT_LIMIT,
	type AdminUser,
	useUsers,
} from "@/features/admin/api/use-users"
import { UserDetailModal } from "@/features/admin/components/user-detail-modal"
import { UserFilterBar } from "@/features/admin/components/user-filter-bar"
import { UserRow } from "@/features/admin/components/user-row"
import type { UserFilter, UserStats } from "@/features/admin/types"
import { useDebounce } from "@/hooks/use-debounce"
import type { ApiError } from "@/lib/errors"

const SKELETON_ROWS = 5
const SKELETON_KEYS = Array.from(
	{ length: SKELETON_ROWS },
	(_, idx) => `sk-${idx}`,
)

function clampPage(page: number, totalPages: number): number {
	if (totalPages <= 0) return 1
	if (page < 1) return 1
	if (page > totalPages) return totalPages
	return page
}

function pageNumbers(currentPage: number, totalPages: number): number[] {
	if (totalPages <= 0) return []
	const max = Math.min(totalPages, 5)
	const start = Math.max(1, Math.min(currentPage - 2, totalPages - max + 1))
	return Array.from({ length: max }, (_, idx) => start + idx)
}

function LoadingState() {
	return (
		<ul
			data-testid="admin-users-skeleton"
			aria-label="Carregando usuários"
			className="flex flex-col gap-2"
		>
			{SKELETON_KEYS.map((key) => (
				<li key={key}>
					<Skeleton className="h-16 w-full" />
				</li>
			))}
		</ul>
	)
}

function ErrorState({ error }: { error: ApiError | null }) {
	return (
		<div
			data-testid="admin-users-error"
			role="alert"
			className="rounded-[12px] border border-border bg-accent px-4 py-6 text-sm text-foreground"
		>
			{error?.userMessage ??
				"Não foi possível carregar a lista de usuários. Tente novamente."}
		</div>
	)
}

function UsersEmpty() {
	return (
		<EmptyState
			icon={Users}
			title="Nenhum usuário cadastrado"
			description="Quando novas contas forem criadas, elas aparecerão aqui."
		/>
	)
}

interface UsersPaginationProps {
	page: number
	totalPages: number
	onChange: (target: number) => void
}

function UsersPagination({ page, totalPages, onChange }: UsersPaginationProps) {
	function handlePrev(event: MouseEvent) {
		event.preventDefault()
		if (page > 1) onChange(page - 1)
	}
	function handleNext(event: MouseEvent) {
		event.preventDefault()
		if (page < totalPages) onChange(page + 1)
	}
	function handleSelect(event: MouseEvent, target: number) {
		event.preventDefault()
		onChange(target)
	}
	return (
		<Pagination data-testid="admin-users-pagination">
			<PaginationContent>
				<PaginationItem>
					<PaginationPrevious
						data-testid="admin-users-prev"
						aria-disabled={page <= 1}
						onClick={handlePrev}
					/>
				</PaginationItem>
				{pageNumbers(page, totalPages).map((p) => (
					<PaginationItem key={p}>
						<PaginationLink
							data-testid={`admin-users-page-${p}`}
							isActive={p === page}
							onClick={(event) => handleSelect(event, p)}
						>
							{p}
						</PaginationLink>
					</PaginationItem>
				))}
				<PaginationItem>
					<PaginationNext
						data-testid="admin-users-next"
						aria-disabled={page >= totalPages}
						onClick={handleNext}
					/>
				</PaginationItem>
			</PaginationContent>
		</Pagination>
	)
}

interface UsersListProps {
	users: ReadonlyArray<AdminUser>
	page: number
	totalPages: number
	onPageChange: (target: number) => void
	onSelect: (user: AdminUser) => void
}

function UsersList({
	users,
	page,
	totalPages,
	onPageChange,
	onSelect,
}: UsersListProps) {
	return (
		<>
			<ul data-testid="admin-users-list" className="flex flex-col gap-2">
				{users.map((user) => (
					<UserRow key={user.id} user={user} onSelect={onSelect} />
				))}
			</ul>
			{totalPages > 1 ? (
				<UsersPagination
					page={page}
					totalPages={totalPages}
					onChange={onPageChange}
				/>
			) : null}
		</>
	)
}

interface UsersContentProps {
	isLoading: boolean
	isError: boolean
	error: ApiError | null
	users: ReadonlyArray<AdminUser> | undefined
	page: number
	totalPages: number
	onPageChange: (target: number) => void
	onSelect: (user: AdminUser) => void
}

function UsersContent({
	isLoading,
	isError,
	error,
	users,
	page,
	totalPages,
	onPageChange,
	onSelect,
}: UsersContentProps) {
	if (isLoading) return <LoadingState />
	if (isError) return <ErrorState error={error} />
	if (!users) return null
	if (users.length === 0) return <UsersEmpty />
	return (
		<UsersList
			users={users}
			page={page}
			totalPages={totalPages}
			onPageChange={onPageChange}
			onSelect={onSelect}
		/>
	)
}

export default function AdminUsersPage() {
	const [page, setPage] = useState(1)
	const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
	const [inputQuery, setInputQuery] = useState("")
	const debouncedQuery = useDebounce(inputQuery, 500)
	const limit = ADMIN_USERS_DEFAULT_LIMIT
	const [activeFilter, setActiveFilter] = useState<UserFilter>("all")
	const { data: statsData } = useUserStats()

	const emptyStats: UserStats = {
		total: 0,
		members: 0,
		admins: 0,
		active: 0,
		inactive: 0,
	}
	const stats: UserStats = statsData ?? emptyStats

	// biome-ignore lint/correctness/useExhaustiveDependencies: debouncedQuery é o gatilho intencional para resetar a página; não é consumido no corpo do efeito
	useEffect(() => {
		setPage(1)
	}, [debouncedQuery])

	const { data, isLoading, isError, error, isFetching } = useUsers({
		page,
		limit,
		query: debouncedQuery || undefined,
		filter: activeFilter,
	})

	const totalPages = useMemo(() => {
		if (!data) return 0
		return Math.max(1, Math.ceil(data.pagination.total / data.pagination.limit))
	}, [data])
	const activeSelectedUser = useMemo(() => {
		if (!selectedUser) return null
		return (
			data?.users.find((user) => user.id === selectedUser.id) ?? selectedUser
		)
	}, [data?.users, selectedUser])

	function handlePageChange(target: number) {
		setPage((current) => clampPage(target, Math.max(totalPages, current)))
		setSelectedUser(null)
	}

	function handleUserSelect(user: AdminUser) {
		setSelectedUser(user)
	}

	function handleModalClose() {
		setSelectedUser(null)
	}

	function handleFilterChange(filter: UserFilter) {
		setActiveFilter(filter)
		setPage(1)
	}

	return (
		<section
			data-testid="admin-users-page"
			className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6"
			aria-busy={isFetching}
		>
			<header className="flex flex-col gap-2">
				<h1 className="font-display text-3xl font-medium tracking-tight text-foreground">
					Usuários
				</h1>
				<p className="text-sm text-muted-foreground">
					Visualize todas as contas cadastradas na plataforma.
				</p>
				<UserFilterBar
					activeFilter={activeFilter}
					counts={stats}
					onFilterChange={handleFilterChange}
				/>
				<Input
					data-testid="admin-users-search"
					type="search"
					placeholder="Buscar por nome ou e-mail..."
					value={inputQuery}
					onChange={(e) => setInputQuery(e.target.value)}
					className="max-w-sm"
				/>
			</header>

			<UsersContent
				isLoading={isLoading}
				isError={isError}
				error={error ?? null}
				users={data?.users}
				page={page}
				totalPages={totalPages}
				onPageChange={handlePageChange}
				onSelect={handleUserSelect}
			/>

			{activeSelectedUser ? (
				<UserDetailModal
					user={activeSelectedUser}
					open={activeSelectedUser !== null}
					onClose={handleModalClose}
				/>
			) : null}
		</section>
	)
}
