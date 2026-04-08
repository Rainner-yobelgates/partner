export const PHONE_MIN_LENGTH = 8
export const PHONE_MAX_LENGTH = 15

export const sanitizePhoneNumber = (value: string) => value.replace(/\D/g, '').slice(0, PHONE_MAX_LENGTH)

export const isValidPhoneNumber = (value: string) => {
  if (!value)
    return false

  return new RegExp(`^\\d{${PHONE_MIN_LENGTH},${PHONE_MAX_LENGTH}}$`).test(value)
}

export const optionalPhoneRule = (value: string) => {
  if (!value)
    return true

  return isValidPhoneNumber(value) || `Nomor telepon harus ${PHONE_MIN_LENGTH}-${PHONE_MAX_LENGTH} digit angka`
}
