"use client"

import { MotionConfig, motion } from "motion/react"
import type { ComponentProps } from "react"

export const staggerListVariants = {
	hidden: {},
	show: { transition: { staggerChildren: 0.07 } },
} as const

export const staggerItemVariants = {
	hidden: { opacity: 0, scale: 0.92 },
	show: {
		opacity: 1,
		scale: 1,
		transition: { type: "spring", stiffness: 280, damping: 22 },
	},
	exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
} as const

export function StaggerList(props: ComponentProps<typeof motion.ul>) {
	return (
		<MotionConfig reducedMotion="user">
			<motion.ul
				variants={staggerListVariants}
				initial="hidden"
				animate="show"
				{...props}
			/>
		</MotionConfig>
	)
}
