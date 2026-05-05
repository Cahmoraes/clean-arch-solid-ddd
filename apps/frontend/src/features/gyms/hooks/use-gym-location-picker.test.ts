import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useGymLocationPicker } from "./use-gym-location-picker"

const NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search"
const NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse"

describe("useGymLocationPicker", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe("handleSearch", () => {
    it("atualiza latitude e longitude ao encontrar endereço", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => [{ lat: "-23.5505", lon: "-46.6333", display_name: "Av. Paulista, São Paulo" }],
      } as Response)

      const { result } = renderHook(() => useGymLocationPicker())

      act(() => {
        result.current.handleAddressChange("Av. Paulista, São Paulo")
      })

      await act(async () => {
        await result.current.handleSearch()
      })

      expect(result.current.latitude).toBe(-23.5505)
      expect(result.current.longitude).toBe(-46.6333)
      expect(result.current.searchError).toBeNull()
      expect(result.current.isSearching).toBe(false)
    })

    it("define searchError quando endereço não é encontrado", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      } as Response)

      const { result } = renderHook(() => useGymLocationPicker())
      act(() => { result.current.handleAddressChange("endereço inexistente xpto") })

      await act(async () => {
        await result.current.handleSearch()
      })

      expect(result.current.searchError).toBe("Endereço não encontrado. Tente ser mais específico.")
      expect(result.current.latitude).toBeNull()
    })

    it("define searchError em caso de falha de rede", async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"))

      const { result } = renderHook(() => useGymLocationPicker())
      act(() => { result.current.handleAddressChange("Av. Paulista") })

      await act(async () => {
        await result.current.handleSearch()
      })

      expect(result.current.searchError).toBe("Erro ao buscar endereço. Verifique sua conexão.")
    })

    it("não faz requisição quando address está vazio", async () => {
      const { result } = renderHook(() => useGymLocationPicker())

      await act(async () => {
        await result.current.handleSearch()
      })

      expect(fetch).not.toHaveBeenCalled()
    })
  })

  describe("handleMapClick", () => {
    it("atualiza latitude e longitude ao clicar no mapa", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ display_name: "Av. Paulista, 1578, São Paulo" }),
      } as Response)

      const { result } = renderHook(() => useGymLocationPicker())

      await act(async () => {
        await result.current.handleMapClick(-23.5505, -46.6333)
      })

      expect(result.current.latitude).toBe(-23.5505)
      expect(result.current.longitude).toBe(-46.6333)
    })

    it("atualiza address com geocodificação reversa bem-sucedida", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ display_name: "Av. Paulista, 1578, São Paulo" }),
      } as Response)

      const { result } = renderHook(() => useGymLocationPicker())

      await act(async () => {
        await result.current.handleMapClick(-23.5505, -46.6333)
      })

      expect(result.current.address).toBe("Av. Paulista, 1578, São Paulo")
    })

    it("mantém address anterior quando geocodificação reversa falha", async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"))

      const { result } = renderHook(() => useGymLocationPicker({
        initialAddress: "Endereço anterior",
        initialLatitude: 0,
        initialLongitude: 0,
      }))

      await act(async () => {
        await result.current.handleMapClick(-23.5505, -46.6333)
      })

      expect(result.current.latitude).toBe(-23.5505)
      expect(result.current.longitude).toBe(-46.6333)
      expect(result.current.address).toBe("Endereço anterior")
    })
  })
})
