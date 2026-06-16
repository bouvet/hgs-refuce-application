const TOKEN_KEY = "boss-app:token"
const REFRESH_TOKEN_KEY = "boss-app:refresh-token"

export function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

export function getAuthHeaders(): Record<string, string> {
  const token = getToken()
  if (!token) return {}
  return {
    Authorization: `Bearer ${token}`,
  }
}

export function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return true

    const payload = parts[1]
    const padding = 4 - (payload.length % 4)
    const paddedPayload = padding !== 4 ? payload + "=".repeat(padding) : payload

    const decoded = JSON.parse(atob(paddedPayload))
    const exp = decoded.exp

    if (!exp) return false

    return Date.now() >= exp * 1000
  } catch {
    return true
  }
}
