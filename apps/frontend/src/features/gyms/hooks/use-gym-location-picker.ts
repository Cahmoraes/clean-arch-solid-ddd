import { useState } from "react"

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org"
const NOMINATIM_HEADERS = { "Accept-Language": "pt-BR,pt;q=0.9" }

interface NominatimSearchItem {
	lat: string
	lon: string
}

interface GeocodeCoords {
	lat: number
	lng: number
}

interface GeocodeResult {
	coords: GeocodeCoords | null
	error: string | null
}

interface UseGymLocationPickerOptions {
	initialAddress?: string
	initialLatitude?: number | null
	initialLongitude?: number | null
}

export interface UseGymLocationPickerReturn {
	address: string
	latitude: number | null
	longitude: number | null
	isSearching: boolean
	isReverseGeocoding: boolean
	searchError: string | null
	handleAddressChange: (value: string) => void
	handleSearch: () => Promise<void>
	handleMapClick: (lat: number, lng: number) => Promise<void>
}

async function geocodeAddress(query: string): Promise<GeocodeResult> {
	try {
		const url = `${NOMINATIM_BASE}/search?q=${encodeURIComponent(query)}&format=json&limit=1`
		const response = await fetch(url, { headers: NOMINATIM_HEADERS })
		const data: unknown = await response.json()
		if (!Array.isArray(data) || data.length === 0) {
			return {
				coords: null,
				error: "Endereço não encontrado. Tente ser mais específico.",
			}
		}
		const [first] = data as NominatimSearchItem[]
		return {
			coords: { lat: parseFloat(first.lat), lng: parseFloat(first.lon) },
			error: null,
		}
	} catch {
		return {
			coords: null,
			error: "Erro ao buscar endereço. Verifique sua conexão.",
		}
	}
}

async function reverseGeocode(
	lat: number,
	lng: number,
): Promise<string | null> {
	try {
		const url = `${NOMINATIM_BASE}/reverse?lat=${lat}&lon=${lng}&format=json`
		const response = await fetch(url, { headers: NOMINATIM_HEADERS })
		const data: { display_name?: string } = await response.json()
		return data.display_name ?? null
	} catch {
		return null
	}
}

type SetState<T> = (value: T) => void

async function runSearch(
	address: string,
	setIsSearching: SetState<boolean>,
	setSearchError: SetState<string | null>,
	setLatitude: SetState<number>,
	setLongitude: SetState<number>,
): Promise<void> {
	const trimmed = address.trim()
	if (!trimmed) return
	setIsSearching(true)
	setSearchError(null)
	const { coords, error } = await geocodeAddress(trimmed)
	setIsSearching(false)
	if (error) {
		setSearchError(error)
		return
	}
	if (coords) {
		setLatitude(coords.lat)
		setLongitude(coords.lng)
	}
}

async function runMapClick(
	lat: number,
	lng: number,
	setLatitude: SetState<number>,
	setLongitude: SetState<number>,
	setIsReverseGeocoding: SetState<boolean>,
	setAddress: SetState<string>,
): Promise<void> {
	setLatitude(lat)
	setLongitude(lng)
	setIsReverseGeocoding(true)
	const displayName = await reverseGeocode(lat, lng)
	setIsReverseGeocoding(false)
	if (displayName) setAddress(displayName)
}

export function useGymLocationPicker(
	options: UseGymLocationPickerOptions = {},
): UseGymLocationPickerReturn {
	const [address, setAddress] = useState(options.initialAddress ?? "")
	const [latitude, setLatitude] = useState<number | null>(
		options.initialLatitude ?? null,
	)
	const [longitude, setLongitude] = useState<number | null>(
		options.initialLongitude ?? null,
	)
	const [isSearching, setIsSearching] = useState(false)
	const [isReverseGeocoding, setIsReverseGeocoding] = useState(false)
	const [searchError, setSearchError] = useState<string | null>(null)

	function handleAddressChange(value: string) {
		setAddress(value)
		setSearchError(null)
	}

	function handleSearch(): Promise<void> {
		return runSearch(
			address,
			setIsSearching,
			setSearchError,
			setLatitude as SetState<number>,
			setLongitude as SetState<number>,
		)
	}

	function handleMapClick(lat: number, lng: number): Promise<void> {
		return runMapClick(
			lat,
			lng,
			setLatitude as SetState<number>,
			setLongitude as SetState<number>,
			setIsReverseGeocoding,
			setAddress,
		)
	}

	return {
		address,
		latitude,
		longitude,
		isSearching,
		isReverseGeocoding,
		searchError,
		handleAddressChange,
		handleSearch,
		handleMapClick,
	}
}
