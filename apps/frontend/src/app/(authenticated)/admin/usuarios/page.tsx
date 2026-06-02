"use client"

import { Users } from "lucide-react"
import { useSearchParams } from "next/navigation"
import type { KeyboardEvent, MouseEvent } from "react"
import { Suspense, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { EmptyState } from "@/components/ui/empty-state"
import { PageHeader } from "@/components/ui/page-header"
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@/components/ui/pagination"
import { SearchBar } from "@/components/ui/search-bar"
import { Skeleton } from "@/components/ui/skeleton"
import { useUserStats } from "@/features/admin/api/use-user-stats"
import {
	ADMIN_USERS_DEFAULT_LIMIT,
	type AdminUser,
	useUsers,
} from "@/features/admin/api/use-users"
import { UserDetailContainer } from "@/features/admin/components/user-detail/user-detail-container"
import { UserFilterBar } from "@/features/admin/components/user-filter-bar"
import { UserRow } from "@/features/admin/components/user-row"
import type { UserFilter } from "@/features/admin/types"
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
		<Pagination data-testid="admin-users-pagination" className="mt-6">
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
	selectedUserId: string | null
	onPageChange: (target: number) => void
	onSelect: (user: AdminUser) => void
}

function UsersList({
	users,
	page,
	totalPages,
	selectedUserId,
	onPageChange,
	onSelect,
}: UsersListProps) {
	return (
		<>
			<ul data-testid="admin-users-list" className="flex flex-col gap-2">
				{users.map((user) => (
					<UserRow
						key={user.id}
						user={user}
						onSelect={onSelect}
						isSelected={user.id === selectedUserId}
					/>
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
	selectedUserId: string | null
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
	selectedUserId,
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
			selectedUserId={selectedUserId}
			onPageChange={onPageChange}
			onSelect={onSelect}
		/>
	)
}

function isArrowKey(key: string): boolean {
	return key === "ArrowDown" || key === "ArrowUp"
}

function resolveNextIndex(
	list: ReadonlyArray<AdminUser>,
	current: AdminUser | null,
	key: string,
): number {
	const currentIndex = current
		? list.findIndex((user) => user.id === current.id)
		: -1
	const delta = key === "ArrowDown" ? 1 : -1
	return Math.min(Math.max(currentIndex + delta, 0), list.length - 1)
}

interface AdminUsersContentProps {
	initialQuery: string
	initialUserId: string | null
}

function AdminUsersContent({
	initialQuery,
	initialUserId,
}: AdminUsersContentProps) {
	const [page, setPage] = useState(1)
	const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
	const [inputQuery, setInputQuery] = useState(initialQuery)
	const debouncedQuery = useDebounce(inputQuery, 500)
	const limit = ADMIN_USERS_DEFAULT_LIMIT
	const [activeFilter, setActiveFilter] = useState<UserFilter>("all")
	const { data: stats } = useUserStats()

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

	useEffect(() => {
		if (!initialUserId || !data?.users?.length || selectedUser) return
		const found = data.users.find((user) => user.id === initialUserId)
		if (found) setSelectedUser(found)
	}, [data?.users, initialUserId, selectedUser])

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

	function handleEditUser(user: AdminUser) {
		toast.info(`Edição de ${user.name} estará disponível em breve.`)
	}

	function handleListKeyNavigation(event: KeyboardEvent<HTMLDivElement>) {
		const list = data?.users
		if (!isArrowKey(event.key) || !list || list.length === 0) return
		event.preventDefault()
		const nextIndex = resolveNextIndex(list, activeSelectedUser, event.key)
		setSelectedUser(list[nextIndex])
	}

	return (
		<section
			data-testid="admin-users-page"
			className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6"
			aria-busy={isFetching}
		>
			<div className="flex flex-col gap-5">
				<PageHeader
					eyebrow="Admin"
					title="Usuários"
					subtitle="Gerencie membros e administradores da plataforma"
					className="mb-0"
				/>
				<div className="flex flex-wrap items-center justify-between gap-3">
					<UserFilterBar
						activeFilter={activeFilter}
						stats={stats}
						onFilterChange={handleFilterChange}
						className="w-full [&>button]:flex-1 [&>button]:justify-center"
					/>
					<SearchBar
						data-testid="admin-users-search"
						placeholder="Buscar por nome ou e-mail..."
						value={inputQuery}
						onChange={(e) => setInputQuery(e.target.value)}
						className="w-full"
					/>
				</div>
			</div>

			<div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
				{/* biome-ignore lint/a11y/noStaticElementInteractions: navegação por teclado entre linhas da lista */}
				<div onKeyDown={handleListKeyNavigation}>
					<UsersContent
						isLoading={isLoading}
						isError={isError}
						error={error ?? null}
						users={data?.users}
						page={page}
						totalPages={totalPages}
						selectedUserId={activeSelectedUser?.id ?? null}
						onPageChange={handlePageChange}
						onSelect={handleUserSelect}
					/>
				</div>

				<UserDetailContainer
					user={activeSelectedUser}
					onClose={handleModalClose}
					onEdit={handleEditUser}
				/>
			</div>
		</section>
	)
}

function AdminUsersPageInner() {
	const searchParams = useSearchParams()
	const initialQuery = searchParams?.get("query") ?? ""
	const initialUserId = searchParams?.get("userId") ?? null
	return (
		<AdminUsersContent
			initialQuery={initialQuery}
			initialUserId={initialUserId}
		/>
	)
}

export default function AdminUsersPage() {
	return (
		<Suspense
			fallback={<AdminUsersContent initialQuery="" initialUserId={null} />}
		>
			<AdminUsersPageInner />
		</Suspense>
	)
}
