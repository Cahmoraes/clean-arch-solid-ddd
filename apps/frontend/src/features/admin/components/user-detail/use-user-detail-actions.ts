"use client"

import { type MouseEvent, useEffect, useState } from "react"
import { useActivateUser } from "@/features/admin/api/use-activate-user"
import { useDeleteUser } from "@/features/admin/api/use-delete-user"
import { useDemoteFromAdmin } from "@/features/admin/api/use-demote-from-admin"
import { usePromoteToAdmin } from "@/features/admin/api/use-promote-to-admin"
import { useSuspendUser } from "@/features/admin/api/use-suspend-user"
import type { AdminUser } from "@/features/admin/api/use-users"
import { useAuthStore } from "@/lib/auth/auth-store"

const SUPER_ADMIN_EMAIL = "admin@admin.com"

export interface UserDetailPermissions {
	canSuspend: boolean
	canActivate: boolean
	canPromoteToAdmin: boolean
	canDemoteFromAdmin: boolean
	canDelete: boolean
	isLocked: boolean
}

function isProtectedAccount(
	user: AdminUser,
	currentUserId: string | null | undefined,
): boolean {
	return currentUserId === user.id || user.email === SUPER_ADMIN_EMAIL
}

function resolvePermissions(
	user: AdminUser,
	currentUserId: string | null | undefined,
): UserDetailPermissions {
	const isLocked = user.status === "locked"
	const canSuspend =
		(user.status === "activated" || isLocked) &&
		user.role !== "ADMIN" &&
		currentUserId !== user.id
	const canActivate = user.status === "suspended" || isLocked
	const canPromoteToAdmin =
		user.status === "activated" &&
		user.role === "MEMBER" &&
		user.email !== SUPER_ADMIN_EMAIL
	const canDemoteFromAdmin =
		user.role === "ADMIN" && !isProtectedAccount(user, currentUserId)
	const canDelete = !isProtectedAccount(user, currentUserId)
	return {
		canSuspend,
		canActivate,
		canPromoteToAdmin,
		canDemoteFromAdmin,
		canDelete,
		isLocked,
	}
}

function getErrorMessage(mutation: {
	isError: boolean
	error?: { userMessage?: string } | null
}): string | null {
	return mutation.isError ? (mutation.error?.userMessage ?? null) : null
}

export interface UserDetailActions {
	permissions: UserDetailPermissions
	flags: {
		isPending: boolean
		isActivating: boolean
		isSuspending: boolean
		isPromoting: boolean
		isDemoting: boolean
		isDeleting: boolean
	}
	errorMessage: string | null
	confirm: {
		suspendOpen: boolean
		promoteOpen: boolean
		demoteOpen: boolean
		deleteOpen: boolean
		setSuspendOpen: (open: boolean) => void
		setPromoteOpen: (open: boolean) => void
		setDemoteOpen: (open: boolean) => void
		setDeleteOpen: (open: boolean) => void
	}
	onActivate: () => void
	onConfirmSuspend: (event: MouseEvent<HTMLButtonElement>) => void
	onConfirmPromote: (event: MouseEvent<HTMLButtonElement>) => void
	onConfirmDemote: (event: MouseEvent<HTMLButtonElement>) => void
	onConfirmDelete: (event: MouseEvent<HTMLButtonElement>) => void
}

interface UseUserDetailActionsOptions {
	onDeleteSuccess?: () => void
}

export function useUserDetailActions(
	user: AdminUser,
	options?: UseUserDetailActionsOptions,
): UserDetailActions {
	const currentUser = useAuthStore((state) => state.user)
	const activateUser = useActivateUser()
	const suspendUser = useSuspendUser()
	const promoteToAdmin = usePromoteToAdmin()
	const demoteFromAdmin = useDemoteFromAdmin()
	const deleteUser = useDeleteUser()
	const [suspendOpen, setSuspendOpen] = useState(false)
	const [promoteOpen, setPromoteOpen] = useState(false)
	const [demoteOpen, setDemoteOpen] = useState(false)
	const [deleteOpen, setDeleteOpen] = useState(false)

	useEffect(() => {
		setSuspendOpen(false)
		setPromoteOpen(false)
		setDemoteOpen(false)
		setDeleteOpen(false)
	}, [])

	const isPending =
		activateUser.isPending ||
		suspendUser.isPending ||
		promoteToAdmin.isPending ||
		demoteFromAdmin.isPending ||
		deleteUser.isPending

	const errorMessage =
		getErrorMessage(deleteUser) ??
		getErrorMessage(demoteFromAdmin) ??
		getErrorMessage(promoteToAdmin) ??
		getErrorMessage(suspendUser) ??
		getErrorMessage(activateUser)

	function onConfirmSuspend(event: MouseEvent<HTMLButtonElement>) {
		event.preventDefault()
		suspendUser.mutate(user.id, {
			onSuccess: () => setSuspendOpen(false),
			onError: () => setSuspendOpen(false),
		})
	}

	function onConfirmPromote(event: MouseEvent<HTMLButtonElement>) {
		event.preventDefault()
		promoteToAdmin.mutate(user.id, {
			onSuccess: () => setPromoteOpen(false),
			onError: () => setPromoteOpen(false),
		})
	}

	function onConfirmDemote(event: MouseEvent<HTMLButtonElement>) {
		event.preventDefault()
		demoteFromAdmin.mutate(user.id, {
			onSuccess: () => setDemoteOpen(false),
			onError: () => setDemoteOpen(false),
		})
	}

	function onConfirmDelete(event: MouseEvent<HTMLButtonElement>) {
		event.preventDefault()
		deleteUser.mutate(user.id, {
			onSuccess: () => {
				setDeleteOpen(false)
				options?.onDeleteSuccess?.()
			},
			onError: () => setDeleteOpen(false),
		})
	}

	return {
		permissions: resolvePermissions(user, currentUser?.id),
		flags: {
			isPending,
			isActivating: activateUser.isPending,
			isSuspending: suspendUser.isPending,
			isPromoting: promoteToAdmin.isPending,
			isDemoting: demoteFromAdmin.isPending,
			isDeleting: deleteUser.isPending,
		},
		errorMessage,
		confirm: {
			suspendOpen,
			promoteOpen,
			demoteOpen,
			deleteOpen,
			setSuspendOpen,
			setPromoteOpen,
			setDemoteOpen,
			setDeleteOpen,
		},
		onActivate: () => activateUser.mutate(user.id),
		onConfirmSuspend,
		onConfirmPromote,
		onConfirmDemote,
		onConfirmDelete,
	}
}
