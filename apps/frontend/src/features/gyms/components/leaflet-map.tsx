"use client"

import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet"

// Corrige ícone padrão do Leaflet (problema com bundlers modernos)
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)
	._getIconUrl
L.Icon.Default.mergeOptions({
	iconRetinaUrl:
		"https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
	iconUrl:
		"https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
	shadowUrl:
		"https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
})

interface MapClickHandlerProps {
	onMapClick: (lat: number, lng: number) => void
}

function MapClickHandler({ onMapClick }: MapClickHandlerProps) {
	useMapEvents({
		click(e) {
			onMapClick(e.latlng.lat, e.latlng.lng)
		},
	})
	return null
}

interface LeafletMapProps {
	latitude: number | null
	longitude: number | null
	onMapClick: (lat: number, lng: number) => void
}

const DEFAULT_CENTER: [number, number] = [-14.235, -51.9253] // centro do Brasil
const DEFAULT_ZOOM = 4
const MARKER_ZOOM = 15

export default function LeafletMap({
	latitude,
	longitude,
	onMapClick,
}: LeafletMapProps) {
	const hasPosition = latitude !== null && longitude !== null
	const center: [number, number] = hasPosition
		? [latitude, longitude]
		: DEFAULT_CENTER
	const zoom = hasPosition ? MARKER_ZOOM : DEFAULT_ZOOM

	return (
		<MapContainer
			center={center}
			zoom={zoom}
			style={{ height: "300px", width: "100%", borderRadius: "8px" }}
			key={`${latitude}-${longitude}`}
		>
			<TileLayer
				attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
				url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
			/>
			<MapClickHandler onMapClick={onMapClick} />
			{hasPosition && <Marker position={[latitude, longitude]} />}
		</MapContainer>
	)
}
