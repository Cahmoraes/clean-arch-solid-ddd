"use client"

import dynamic from "next/dynamic"
import { useEffect } from "react"
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

export function GymLocationPicker({
  value,
  onChange,
  error,
}: GymLocationPickerProps) {
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
    initialLatitude: value.latitude || null,
    initialLongitude: value.longitude || null,
  })

  useEffect(() => {
    onChange({
      address,
      latitude: latitude ?? 0,
      longitude: longitude ?? 0,
    })
  }, [address, latitude, longitude, onChange])

  async function onSearchClick() {
    await handleSearch()
  }

  async function onMapClick(lat: number, lng: number) {
    await handleMapClick(lat, lng)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">
          Endereço completo <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-2">
          <input
            data-testid="gym-location-address"
            type="text"
            value={address}
            onChange={(e) => handleAddressChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                void onSearchClick()
              }
            }}
            placeholder="Ex.: Av. Paulista, 1578, São Paulo - SP"
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button
            type="button"
            data-testid="gym-location-search"
            variant="outline"
            disabled={isSearching}
            onClick={() => void onSearchClick()}
          >
            {isSearching ? "Buscando..." : "Buscar"}
          </Button>
        </div>
        {searchError && (
          <p className="text-sm text-destructive">{searchError}</p>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-input">
        <LeafletMap
          latitude={latitude}
          longitude={longitude}
          onMapClick={(lat, lng) => void onMapClick(lat, lng)}
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
            Longitude <span className="rounded bg-muted px-1 text-xs">auto</span>
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
