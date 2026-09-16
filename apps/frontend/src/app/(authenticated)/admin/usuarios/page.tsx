"use client"

import { Users } from "lucide-react"
import { useSearchParams } from "next/navigation"
import type { KeyboardEvent } from "react"
import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import { PageContainer } from "@/components/layout/page-container"
import { Checkbox } from "@/components/ui/checkbox"
import { EmptyState } from "@/components/ui/empty-state"
import { NumberedPagination } from "@/components/ui/numbered-pagination"
import { PageHeader } from "@/components/ui/page-header"
import { SearchBar } from "@/components/ui/search-bar"
import { Skeleton } from "@/components/ui/skeleton"
import { useBulkChangeUserStatus } from "@/features/admin/api/use-bulk-change-user-status"
import { useUserStats } from "@/features/admin/api/use-user-stats"
import {
	ADMIN_USERS_DEFAULT_LIMIT,
	type AdminUser,
	useUsers,
} from "@/features/admin/api/use-users"
import { BulkActionBar } from "@/features/admin/components/bulk-action-bar"
import {
	type BulkStatusAction,
	BulkStatusConfirmationDialog,
} from "@/features/admin/components/bulk-status-confirmation-dialog"
import { resolvePermissions } from "@/features/admin/components/user-detail/use-user-detail-actions"
import { UserDetailContainer } from "@/features/admin/components/user-detail/user-detail-container"
import { UserFilterBar } from "@/features/admin/components/user-filter-bar"
import { UserRow } from "@/features/admin/components/user-row"
import type { UserFilter } from "@/features/admin/types"
import { useDebounce } from "@/hooks/use-debounce"
import { useAuthStore } from "@/lib/auth/auth-store"
import type { ApiError } from "@/lib/errors"
import { useIsDesktop } from "@/lib/hooks/use-is-desktop"

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

interface UsersListProps {
	users: ReadonlyArray<AdminUser>
	page: number
	totalPages: number
	selectedUserId: string | null
	onPageChange: (target: number) => void
	onSelect: (user: AdminUser) => void
	selectedIds: Set<string>
	onToggleSelect: (user: AdminUser, checked: boolean) => void
	isUserSelectable: (user: AdminUser) => boolean
}

function resolvePageCheckboxState(
	selectedOnPageCount: number,
	selectableCount: number,
): boolean | "indeterminate" {
	if (selectableCount === 0 || selectedOnPageCount === 0) return false
	if (selectedOnPageCount === selectableCount) return true
	return "indeterminate"
}

function UsersList({
	users,
	page,
	totalPages,
	selectedUserId,
	onPageChange,
	onSelect,
	selectedIds,
	onToggleSelect,
	isUserSelectable,
}: UsersListProps) {
	const selectableUsers = users.filter(isUserSelectable)
	const selectedOnPageCount = selectableUsers.filter((user) =>
		selectedIds.has(user.id),
	).length
	const pageCheckboxState = resolvePageCheckboxState(
		selectedOnPageCount,
		selectableUsers.length,
	)

	function handleTogglePage(checked: boolean) {
		for (const user of selectableUsers) {
			onToggleSelect(user, checked)
		}
	}

	return (
		<>
			{selectableUsers.length > 0 ? (
				<div className="flex items-center gap-2 px-1 pb-1">
					<Checkbox
						checked={pageCheckboxState}
						data-testid="admin-users-select-page"
						aria-label="Selecionar todos os usuários da página"
						onCheckedChange={(value) => handleTogglePage(value === true)}
					/>
					<span className="text-sm text-subtle">Selecionar página</span>
				</div>
			) : null}
			<ul data-testid="admin-users-list" className="flex flex-col gap-2">
				{users.map((user) => (
					<UserRow
						key={user.id}
						user={user}
						onSelect={onSelect}
						isSelected={user.id === selectedUserId}
						selectable
						checked={selectedIds.has(user.id)}
						selectDisabled={!isUserSelectable(user)}
						onToggleSelect={onToggleSelect}
					/>
				))}
			</ul>
			{totalPages > 1 ? (
				<NumberedPagination
					page={page}
					totalPages={totalPages}
					onChange={onPageChange}
					testIdPrefix="admin-users"
					className="mt-6"
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
	selectedIds: Set<string>
	onToggleSelect: (user: AdminUser, checked: boolean) => void
	isUserSelectable: (user: AdminUser) => boolean
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
	selectedIds,
	onToggleSelect,
	isUserSelectable,
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
			selectedIds={selectedIds}
			onToggleSelect={onToggleSelect}
			isUserSelectable={isUserSelectable}
		/>
	)
}

// FR-015: monta a mensagem anunciada por tecnologia assistiva quando a
// contagem de resultados ou a seleção mudam. Vazio durante o carregamento
// para não anunciar um total transitório/desatualizado.
function buildLiveAnnouncement(
	isLoading: boolean,
	total: number | undefined,
	selectedUser: AdminUser | null,
): string {
	if (isLoading || total === undefined) return ""
	const countText = `${total} usuário${total === 1 ? "" : "s"} encontrado${total === 1 ? "" : "s"}.`
	const selectionText = selectedUser ? `${selectedUser.name} selecionado.` : ""
	return [countText, selectionText].filter(Boolean).join(" ")
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
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
	const [bulkAction, setBulkAction] = useState<BulkStatusAction | null>(null)
	const bulkChangeUserStatus = useBulkChangeUserStatus()
	const currentUser = useAuthStore((state) => state.user)
	const [inputQuery, setInputQuery] = useState(initialQuery)
	const debouncedQuery = useDebounce(inputQuery, 500)
	const limit = ADMIN_USERS_DEFAULT_LIMIT
	const [activeFilter, setActiveFilter] = useState<UserFilter>("all")
	const { data: stats } = useUserStats()

	// biome-ignore lint/correctness/useExhaustiveDependencies: debouncedQuery é o gatilho intencional para resetar a página; não é consumido no corpo do efeito
	useEffect(() => {
		setPage(1)
	}, [debouncedQuery])

	// biome-ignore lint/correctness/useExhaustiveDependencies: page, activeFilter e debouncedQuery são os gatilhos intencionais para limpar a seleção; nenhum é consumido no corpo do efeito
	useEffect(() => {
		setSelectedIds(new Set())
	}, [page, activeFilter, debouncedQuery])

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

	// Marca a resolução do deep-link (?userId=) como concluída assim que os
	// dados chegam, independente de o usuário ter sido encontrado ou não —
	// evita reprocessar a busca a cada render e sinaliza ao efeito de
	// auto-seleção (FR-008) quando é seguro cair no fallback do primeiro
	// usuário. `deepLinkMatchedRef` guarda o resultado do match de forma
	// síncrona: o efeito de FR-008 roda no mesmo commit logo em seguida e
	// não pode confiar em `selectedUser` (state só reflete o `setSelectedUser`
	// abaixo em um próximo render), então lê o ref para não sobrescrever um
	// deep-link válido com o fallback do primeiro usuário. `deepLinkMatchedRef`
	// é resetado em `handlePageChange`: a proteção vale apenas para a página
	// em que o deep-link chegou — depois de uma troca de página (limpeza
	// explícita da seleção) o fallback de FR-008 volta a poder agir.
	const deepLinkResolvedRef = useRef(false)
	const deepLinkMatchedRef = useRef(false)

	useEffect(() => {
		if (deepLinkResolvedRef.current || !initialUserId || !data?.users?.length)
			return
		const found = data.users.find((user) => user.id === initialUserId)
		if (found) {
			setSelectedUser(found)
			deepLinkMatchedRef.current = true
		}
		deepLinkResolvedRef.current = true
	}, [data?.users, initialUserId])

	const activeSelectedUser = useMemo(() => {
		if (!selectedUser) return null
		return (
			data?.users.find((user) => user.id === selectedUser.id) ?? selectedUser
		)
	}, [data?.users, selectedUser])

	const listContainerRef = useRef<HTMLDivElement>(null)
	const isDesktop = useIsDesktop()

	// FR-008: seleciona o primeiro usuário quando há resultados e nenhum
	// usuário está selecionado. A seleção por ?userId= tem precedência
	// enquanto o deep-link ainda não foi resolvido — assim que a resolução
	// termina (encontrado ou não), o fallback pode agir: se encontrado,
	// selectedUser já está preenchido e o guard abaixo bloqueia; se o
	// userId é inválido/fora da lista atual, o fallback seleciona o
	// primeiro usuário em vez de deixar o painel vazio para sempre. Após uma
	// troca de página, `handlePageChange` zera `deepLinkMatchedRef` junto
	// com `selectedUser`, permitindo que este fallback selecione o primeiro
	// usuário da nova página normalmente. O guard `isFetching` evita
	// selecionar o primeiro usuário da página anterior: `useUsers` usa
	// `placeholderData: keepPreviousData`, então `data` ainda aponta para a
	// página antiga enquanto a nova página está sendo buscada — o fallback
	// só deve agir quando `data` já reflete a página atual.
	// Restrito ao desktop: no mobile a apresentação é sob demanda (drawer),
	// então selecionar automaticamente abriria o drawer sem ação do usuário.
	useEffect(() => {
		const deepLinkPending =
			Boolean(initialUserId) && !deepLinkResolvedRef.current
		if (
			!isDesktop ||
			deepLinkPending ||
			deepLinkMatchedRef.current ||
			selectedUser ||
			isFetching ||
			!data?.users?.length
		) {
			return
		}
		setSelectedUser(data.users[0])
	}, [isDesktop, initialUserId, data?.users, selectedUser, isFetching])

	function focusRow(userId: string) {
		const row = listContainerRef.current?.querySelector<HTMLElement>(
			`[data-testid="user-row-${userId}"] [role="button"]`,
		)
		row?.focus()
	}

	function handlePageChange(target: number) {
		setPage((current) => clampPage(target, Math.max(totalPages, current)))
		setSelectedUser(null)
		// Troca de página é uma limpeza explícita da seleção: o deep-link
		// (?userId=) só é válido para o resultado inicial da página em que
		// chegou. Sem resetar aqui, `deepLinkMatchedRef` continuaria `true`
		// para sempre e bloquearia o fallback de FR-008 (auto-selecionar o
		// primeiro usuário) nas páginas seguintes.
		deepLinkMatchedRef.current = false
	}

	function handleUserSelect(user: AdminUser) {
		setSelectedUser(user)
	}

	function handleModalClose() {
		setSelectedUser(null)
	}

	function handleUserPatched(patch: Partial<AdminUser>) {
		setSelectedUser((current) => (current ? { ...current, ...patch } : current))
	}

	function toggleSelect(user: AdminUser, checked: boolean) {
		setSelectedIds((current) => {
			const next = new Set(current)
			if (checked) next.add(user.id)
			else next.delete(user.id)
			return next
		})
	}

	function isUserSelectable(user: AdminUser): boolean {
		return resolvePermissions(user, currentUser).canChangeStatus
	}

	function handleBulkActivate() {
		setBulkAction("activate")
	}

	function handleBulkDeactivate() {
		setBulkAction("deactivate")
	}

	function handleBulkClear() {
		setSelectedIds(new Set())
	}

	function handleBulkDialogOpenChange(open: boolean) {
		if (open || bulkChangeUserStatus.isPending) return
		setBulkAction(null)
	}

	function handleBulkConfirm() {
		if (!bulkAction) return
		const submittedIds = Array.from(selectedIds)
		bulkChangeUserStatus.mutate(
			{ userIds: submittedIds, action: bulkAction },
			{
				onSuccess: () => {
					setSelectedIds((current) => {
						const remaining = new Set(current)
						for (const id of submittedIds) remaining.delete(id)
						return remaining
					})
					setBulkAction(null)
				},
			},
		)
	}

	function handleFilterChange(filter: UserFilter) {
		setActiveFilter(filter)
		setPage(1)
	}

	function handleListKeyNavigation(event: KeyboardEvent<HTMLDivElement>) {
		const list = data?.users
		if (!isArrowKey(event.key) || !list || list.length === 0) return
		event.preventDefault()
		const nextIndex = resolveNextIndex(list, activeSelectedUser, event.key)
		const nextUser = list[nextIndex]
		setSelectedUser(nextUser)
		focusRow(nextUser.id)
	}

	return (
		<PageContainer
			as="section"
			width="wide"
			data-testid="admin-users-page"
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

			<div
				role="status"
				aria-live="polite"
				data-testid="admin-users-live-region"
				className="sr-only"
			>
				{buildLiveAnnouncement(
					isLoading,
					data?.pagination.total,
					activeSelectedUser,
				)}
			</div>

			<div
				data-testid="admin-users-grid"
				className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,0.4fr)_minmax(0,0.6fr)]"
			>
				{/* biome-ignore lint/a11y/noStaticElementInteractions: navegação por teclado entre linhas da lista */}
				<div ref={listContainerRef} onKeyDown={handleListKeyNavigation}>
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
						selectedIds={selectedIds}
						onToggleSelect={toggleSelect}
						isUserSelectable={isUserSelectable}
					/>
				</div>

				<UserDetailContainer
					user={activeSelectedUser}
					onClose={handleModalClose}
					onUserPatched={handleUserPatched}
					onDrawerClosed={focusRow}
				/>
			</div>

			<BulkActionBar
				selectedCount={selectedIds.size}
				onActivate={handleBulkActivate}
				onDeactivate={handleBulkDeactivate}
				onClear={handleBulkClear}
			/>
			<BulkStatusConfirmationDialog
				open={bulkAction !== null}
				onOpenChange={handleBulkDialogOpenChange}
				action={bulkAction ?? "activate"}
				count={selectedIds.size}
				isPending={bulkChangeUserStatus.isPending}
				onConfirm={handleBulkConfirm}
			/>
		</PageContainer>
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
