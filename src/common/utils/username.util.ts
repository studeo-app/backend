export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase()
}

export const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/
