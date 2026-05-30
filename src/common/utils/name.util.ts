export function splitDisplayName(displayName?: string): {
  firstName: string
  lastName: string
} {
  if (!displayName?.trim()) {
    return { firstName: '', lastName: '' }
  }

  const parts = displayName.trim().split(/\s+/)
  const firstName = parts[0] ?? ''
  const lastName = parts.slice(1).join(' ')

  return { firstName, lastName }
}
