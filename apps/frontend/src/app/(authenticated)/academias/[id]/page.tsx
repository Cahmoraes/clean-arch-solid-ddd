"use client"

import { ArrowLeft, MapPin, Phone } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { useCreateCheckIn } from "@/features/check-ins/api"
import { type Gym, useGymById } from "@/features/gyms/api"
import { useAuthStore } from "@/lib/auth/auth-store"
import { ApiError } from "@/lib/errors"

function DetailLoading() {
	return (
		<div data-testid="gym-detail-loading" className="flex flex-col gap-4">
			<Skeleton className="h-10 w-2/3" />
			<Skeleton className="h-24 w-full" />
			<Skeleton className="h-10 w-1/3" />
		</div>
	)
}

function DetailError({
	message,
	onRetry,
}: {
	message?: string
	onRetry: () => void
}) {
	return (
		<EmptyState
			title="Não foi possível carregar a academia"
			description={message ?? "Tente novamente."}
			action={
				<Button
					variant="outline"
					onClick={onRetry}
					data-testid="gym-detail-retry"
				>
					Tentar novamente
				</Button>
			}
		/>
	)
}

function checkInErrorMessage(error: unknown): string {
	if (error instanceof ApiError) {
		if (error.status === 409) {
			return "Você já fez check-in recentemente ou está distante demais da academia."
		}
		if (error.status === 403) {
			return "Você precisa estar autenticado para fazer check-in."
		}
		return error.userMessage
	}
	return "Não foi possível registrar o check-in. Tente novamente."
}

interface UserCoords {
	latitude: number
	longitude: number
}

function getUserPosition(timeoutMs = 5000): Promise<UserCoords | null> {
	if (typeof navigator === "undefined" || !navigator.geolocation) {
		return Promise.resolve(null)
	}
	return new Promise((resolve) => {
		navigator.geolocation.getCurrentPosition(
			(pos) =>
				resolve({
					latitude: pos.coords.latitude,
					longitude: pos.coords.longitude,
				}),
			() => resolve(null),
			{ timeout: timeoutMs, enableHighAccuracy: false },
		)
	})
}

interface CheckInButtonProps {
	gym: Gym
}

function CheckInButton({ gym }: CheckInButtonProps) {
	const userId = useAuthStore((state) => state.user?.id)
	const { mutateAsync, isPending } = useCreateCheckIn()
	const [isLocating, setIsLocating] = useState(false)
	const busy = isPending || isLocating

	async function handleCheckIn() {
		if (!userId) {
			toast.error("Você precisa estar autenticado para fazer check-in.")
			return
		}
		setIsLocating(true)
		const coords = (await getUserPosition()) ?? {
			latitude: gym.latitude,
			longitude: gym.longitude,
		}
		setIsLocating(false)
		try {
			await mutateAsync({
				userId,
				gymId: gym.id,
				userLatitude: coords.latitude,
				userLongitude: coords.longitude,
			})
			toast.success("Check-in registrado com sucesso!")
		} catch (submitError) {
			toast.error(checkInErrorMessage(submitError))
		}
	}

	return (
		<Button
			type="button"
			data-testid="gym-detail-checkin"
			onClick={handleCheckIn}
			disabled={busy}
			aria-busy={busy}
		>
			{busy ? "Registrando check-in..." : "Fazer check-in"}
		</Button>
	)
}

function DetailCard({ gym }: { gym: Gym }) {
	return (
		<article
			data-testid="gym-detail-card"
			className="flex flex-col gap-6 rounded-[12px] border border-light-gray bg-pure-white p-6"
		>
			<header className="flex flex-col gap-2">
				<h1
					id="gym-detail-title"
					data-testid="gym-detail-title"
					className="font-display text-3xl font-medium text-pure-black"
				>
					{gym.title}
				</h1>
				{gym.description ? (
					<p
						data-testid="gym-detail-description"
						className="text-base text-stone"
					>
						{gym.description}
					</p>
				) : null}
			</header>

			<dl className="grid gap-3 text-sm text-near-black sm:grid-cols-2">
				{gym.phone ? (
					<div className="flex items-center gap-2">
						<Phone aria-hidden className="h-4 w-4 text-stone" />
						<dt className="sr-only">Telefone</dt>
						<dd data-testid="gym-detail-phone">{gym.phone}</dd>
					</div>
				) : null}
				<div className="flex items-center gap-2">
					<MapPin aria-hidden className="h-4 w-4 text-stone" />
					<dt className="sr-only">Localização</dt>
					<dd data-testid="gym-detail-location">
						{gym.latitude.toFixed(4)}, {gym.longitude.toFixed(4)}
					</dd>
				</div>
			</dl>

			<div>
				<CheckInButton gym={gym} />
			</div>
		</article>
	)
}

interface DetailBodyProps {
	isLoading: boolean
	isError: boolean
	errorMessage?: string
	onRetry: () => void
	gym: Gym | undefined
}

function DetailBody({
	isLoading,
	isError,
	errorMessage,
	onRetry,
	gym,
}: DetailBodyProps) {
	if (isLoading) return <DetailLoading />
	if (isError) return <DetailError message={errorMessage} onRetry={onRetry} />
	if (gym) return <DetailCard gym={gym} />
	return null
}

export default function GymDetailPage() {
	const params = useParams<{ id: string }>()
	const id = params?.id
	const query = useGymById(id)

	return (
		<section
			aria-labelledby="gym-detail-title"
			className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6"
		>
			<div>
				<Link
					href="/academias"
					data-testid="gym-back-link"
					className="inline-flex items-center gap-2 text-sm text-mid-gray hover:text-near-black"
				>
					<ArrowLeft aria-hidden className="h-4 w-4" />
					Voltar para a busca
				</Link>
			</div>

			<DetailBody
				isLoading={query.isLoading}
				isError={query.isError}
				errorMessage={query.error?.userMessage}
				onRetry={() => query.refetch()}
				gym={query.data}
			/>
		</section>
	)
}
