"use client"

import dynamic from "next/dynamic"
import { useEffect, useId } from "react"
import { Button } from "@/components/ui/button"
import { useGymLocationPicker } from "@/features/gyms/hooks/use-gym-location-picker"

const LeafletMap = dynamic(() => import("./leaflet-map"), { ssr: false })

export interface GymLocationValue {
	address: string
	latitude: number
	longitude: number
}

interface GymLocationPickerProps {
	value: GymLocationValue
	onChange: (value: GymLocationValue) => void
	error?: string
}

function AddressSearchInput({
	addressInputId,
	address,
	isSearching,
	searchError,
	onAddressChange,
	onSearchClick,
}: {
	addressInputId: string
	address: string
	isSearching: boolean
	searchError: string | null
	onAddressChange: (v: string) => void
	onSearchClick: () => void
}) {
	function handleKeyDown(e: React.KeyboardEvent) {
		if (e.key !== "Enter") return
		e.preventDefault()
		onSearchClick()
	}

	return (
		<div className="flex flex-col gap-1">
			<label htmlFor={addressInputId} className="text-sm font-medium">
				Endereço completo <span className="text-red-500">*</span>
			</label>
			<div className="flex gap-2">
				<input
					id={addressInputId}
					data-testid="gym-location-address"
					type="text"
					value={address}
					onChange={(e) => onAddressChange(e.target.value)}
					onKeyDown={handleKeyDown}
					placeholder="Ex.: Av. Paulista, 1578, São Paulo - SP"
					className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				/>
				<Button
					type="button"
					data-testid="gym-location-search"
					variant="outline"
					disabled={isSearching}
					onClick={onSearchClick}
				>
					{isSearching ? "Buscando..." : "Buscar"}
				</Button>
			</div>
			{searchError && <p className="text-sm text-destructive">{searchError}</p>}
		</div>
	)
}

function nullIfZero(n: number): number | null {
	return n !== 0 ? n : null
}

function coordOrZero(n: number | null): number {
	return n !== null ? n : 0
}

export function GymLocationPicker({
	value,
	onChange,
	error,
}: GymLocationPickerProps) {
	const addressInputId = useId()
	const {
		address,
		latitude,
		longitude,
		isSearching,
		isReverseGeocoding,
		searchError,
		handleAddressChange,
		handleSearch,
		handleMapClick,
	} = useGymLocationPicker({
		initialAddress: value.address,
		initialLatitude: nullIfZero(value.latitude),
		initialLongitude: nullIfZero(value.longitude),
	})

	useEffect(() => {
		onChange({
			address,
			latitude: coordOrZero(latitude),
			longitude: coordOrZero(longitude),
		})
	}, [address, latitude, longitude, onChange])

	return (
		<div className="flex flex-col gap-3">
			<AddressSearchInput
				addressInputId={addressInputId}
				address={address}
				isSearching={isSearching}
				searchError={searchError}
				onAddressChange={handleAddressChange}
				onSearchClick={() => void handleSearch()}
			/>

			<div className="overflow-hidden rounded-lg border border-input">
				<LeafletMap
					latitude={latitude}
					longitude={longitude}
					onMapClick={(lat: number, lng: number) =>
						void handleMapClick(lat, lng)
					}
				/>
				{isReverseGeocoding && (
					<p className="px-3 py-1 text-xs text-muted-foreground">
						Obtendo endereço...
					</p>
				)}
			</div>

			<div className="grid grid-cols-2 gap-3">
				<div className="flex flex-col gap-1">
					<span className="text-xs font-medium text-muted-foreground">
						Latitude <span className="rounded bg-muted px-1 text-xs">auto</span>
					</span>
					<div
						data-testid="gym-location-lat-display"
						className="rounded-md border border-dashed border-input bg-muted/30 px-3 py-2 font-mono text-sm text-muted-foreground"
					>
						{latitude?.toFixed(4) ?? "—"}
					</div>
				</div>
				<div className="flex flex-col gap-1">
					<span className="text-xs font-medium text-muted-foreground">
						Longitude{" "}
						<span className="rounded bg-muted px-1 text-xs">auto</span>
					</span>
					<div
						data-testid="gym-location-lng-display"
						className="rounded-md border border-dashed border-input bg-muted/30 px-3 py-2 font-mono text-sm text-muted-foreground"
					>
						{longitude?.toFixed(4) ?? "—"}
					</div>
				</div>
			</div>

			{error && <p className="text-sm text-destructive">{error}</p>}
		</div>
	)
}
