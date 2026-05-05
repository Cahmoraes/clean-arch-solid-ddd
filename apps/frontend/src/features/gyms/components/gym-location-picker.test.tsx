import { act, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { renderWithProviders } from "@/test/render"
import { GymLocationPicker } from "./gym-location-picker"

vi.mock("./leaflet-map", () => ({
  default: ({
    onMapClick,
  }: {
    latitude: number | null
    longitude: number | null
    onMapClick: (lat: number, lng: number) => void
  }) => (
    <div data-testid="mock-map">
      <button
        type="button"
        data-testid="simulate-map-click"
        onClick={() => onMapClick(-10.123, -45.678)}
      >
        Simular clique no mapa
      </button>
    </div>
  ),
}))

const NOMINATIM_RESULT = [
  { lat: "-23.5505", lon: "-46.6333", display_name: "Av. Paulista, São Paulo" },
]

const NOMINATIM_REVERSE = { display_name: "Rua Revertida, 1, São Paulo" }

describe("GymLocationPicker", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("renderiza input de endereço, botão buscar e mapa", () => {
    const onChange = vi.fn()
    renderWithProviders(
      <GymLocationPicker
        value={{ address: "", latitude: 0, longitude: 0 }}
        onChange={onChange}
      />,
    )
    expect(screen.getByTestId("gym-location-address")).toBeInTheDocument()
    expect(screen.getByTestId("gym-location-search")).toBeInTheDocument()
    expect(screen.getByTestId("mock-map")).toBeInTheDocument()
  })

  it("chama onChange com lat/lng após busca bem-sucedida", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => NOMINATIM_RESULT,
    } as Response))

    const onChange = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(
      <GymLocationPicker
        value={{ address: "", latitude: 0, longitude: 0 }}
        onChange={onChange}
      />,
    )

    await user.type(screen.getByTestId("gym-location-address"), "Av. Paulista")
    await user.click(screen.getByTestId("gym-location-search"))

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ latitude: -23.5505, longitude: -46.6333 }),
      )
    })
  })

  it("exibe mensagem de erro quando endereço não encontrado", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response))

    const user = userEvent.setup()
    renderWithProviders(
      <GymLocationPicker
        value={{ address: "", latitude: 0, longitude: 0 }}
        onChange={vi.fn()}
      />,
    )

    await user.type(screen.getByTestId("gym-location-address"), "xyz inexistente")
    await user.click(screen.getByTestId("gym-location-search"))

    expect(
      await screen.findByText(/endereço não encontrado/i),
    ).toBeInTheDocument()
  })

  it("chama onChange com novas coords e address revertido ao clicar no mapa", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => NOMINATIM_REVERSE,
    } as Response))

    const onChange = vi.fn()
    renderWithProviders(
      <GymLocationPicker
        value={{ address: "Endereço antigo", latitude: 0, longitude: 0 }}
        onChange={onChange}
      />,
    )

    await act(async () => {
      await userEvent.click(screen.getByTestId("simulate-map-click"))
    })

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          latitude: -10.123,
          longitude: -45.678,
          address: "Rua Revertida, 1, São Paulo",
        }),
      )
    })
  })

  it("exibe mensagem de erro de formulário vinda da prop `error`", () => {
    renderWithProviders(
      <GymLocationPicker
        value={{ address: "", latitude: 0, longitude: 0 }}
        onChange={vi.fn()}
        error="Campo obrigatório"
      />,
    )
    expect(screen.getByText("Campo obrigatório")).toBeInTheDocument()
  })

  it("exibe campos read-only de latitude e longitude", () => {
    renderWithProviders(
      <GymLocationPicker
        value={{ address: "", latitude: -23.5505, longitude: -46.6333 }}
        onChange={vi.fn()}
      />,
    )
    expect(screen.getByTestId("gym-location-lat-display")).toHaveTextContent("-23.5505")
    expect(screen.getByTestId("gym-location-lng-display")).toHaveTextContent("-46.6333")
  })
})
