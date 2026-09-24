import {
	Check,
	CircleCheck,
	CircleSlash,
	MoreHorizontal,
	Pencil,
	type PixelIcon,
	TriangleAlert,
	X,
} from "@/components/ui/pixel-icons"

export type StatusIconTone = "success" | "warning" | "danger"

export const STATUS_ICON: Record<StatusIconTone, PixelIcon> = {
	success: CircleCheck,
	warning: TriangleAlert,
	danger: CircleSlash,
}

export type ActionIconName = "edit" | "moreActions" | "approve" | "reject"

export const ACTION_ICON: Record<ActionIconName, PixelIcon> = {
	edit: Pencil,
	moreActions: MoreHorizontal,
	approve: Check,
	reject: X,
}
