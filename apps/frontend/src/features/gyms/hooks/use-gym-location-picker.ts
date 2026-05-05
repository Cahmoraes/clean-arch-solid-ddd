import { useState } from "react"

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org"

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

export function useGymLocationPicker(
  options: UseGymLocationPickerOptions = {},
): UseGymLocationPickerReturn {
  const [address, setAddress] = useState(options.initialAddress ?? "")
  const [latitude, setLatitude] = useState<number | null>(options.initialLatitude ?? null)
  const [longitude, setLongitude] = useState<number | null>(options.initialLongitude ?? null)
  const [isSearching, setIsSearching] = useState(false)
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  function handleAddressChange(value: string) {
    setAddress(value)
    setSearchError(null)
  }

  async function handleSearch(): Promise<void> {
    const trimmed = address.trim()
    if (!trimmed) return

    setIsSearching(true)
    setSearchError(null)

    try {
      const url = `${NOMINATIM_BASE}/search?q=${encodeURIComponent(trimmed)}&format=json&limit=1`
      const response = await fetch(url, {
        headers: { "Accept-Language": "pt-BR,pt;q=0.9" },
      })
      const data = await response.json()

      if (!Array.isArray(data) || data.length === 0) {
        setSearchError("Endereço não encontrado. Tente ser mais específico.")
        return
      }

      setLatitude(parseFloat(data[0].lat))
      setLongitude(parseFloat(data[0].lon))
    } catch {
      setSearchError("Erro ao buscar endereço. Verifique sua conexão.")
    } finally {
      setIsSearching(false)
    }
  }

  async function handleMapClick(lat: number, lng: number): Promise<void> {
    setLatitude(lat)
    setLongitude(lng)

    setIsReverseGeocoding(true)
    try {
      const url = `${NOMINATIM_BASE}/reverse?lat=${lat}&lon=${lng}&format=json`
      const response = await fetch(url, {
        headers: { "Accept-Language": "pt-BR,pt;q=0.9" },
      })
      const data = await response.json()
      if (data?.display_name) {
        setAddress(data.display_name)
      }
    } catch {
      // falha silenciosa — coordenadas já foram atualizadas
    } finally {
      setIsReverseGeocoding(false)
    }
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
