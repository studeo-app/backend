export function splitDisplayName(displayName?: string): {
  firstName: string
  lastName: string
} {
  if (!displayName?.trim()) {
    return { firstName: '', lastName: '' }
  }

  const parts = displayName.trim().split(/\s+/)
  
  if (parts.length > 2) {
    const firstName = parts.slice(0, -2).join(' ')
    const lastName = parts.slice(-2).join(' ')
    return { firstName, lastName }
  } else {
    const firstName = parts[0] ?? ''
    const lastName = parts[1] ?? ''
    return { firstName, lastName }
  }
}
