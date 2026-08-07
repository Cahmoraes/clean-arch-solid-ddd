import type { LucideIcon } from "lucide-react"
import {
	Check,
	CircleCheck,
	CircleSlash,
	MoreHorizontal,
	Pencil,
	TriangleAlert,
	X,
} from "lucide-react"

export type StatusIconTone = "success" | "warning" | "danger"

export const STATUS_ICON: Record<StatusIconTone, LucideIcon> = {
	success: CircleCheck,
	warning: TriangleAlert,
	danger: CircleSlash,
}

export type ActionIconName = "edit" | "moreActions" | "approve" | "reject"

export const ACTION_ICON: Record<ActionIconName, LucideIcon> = {
	edit: Pencil,
	moreActions: MoreHorizontal,
	approve: Check,
	reject: X,
}
