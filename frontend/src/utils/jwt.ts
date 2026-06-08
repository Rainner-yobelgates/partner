type JwtPayload = {
  exp?: number
  [key: string]: unknown
}

const decodeBase64Url = (value: string) => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(base64.length + ((4 - base64.length % 4) % 4), '=')

  return atob(padded)
}

export const getJwtExpiresAt = (token: string | null | undefined): number | null => {
  if (!token)
    return null

  try {
    const payloadPart = token.split('.')[1]
    if (!payloadPart)
      return null

    const payload = JSON.parse(decodeBase64Url(payloadPart)) as JwtPayload

    return typeof payload.exp === 'number' ? payload.exp * 1000 : null
  }
  catch {
    return null
  }
}

export const isJwtExpired = (token: string | null | undefined, skewMs = 0) => {
  const expiresAt = getJwtExpiresAt(token)

  return expiresAt === null || Date.now() + skewMs >= expiresAt
}
