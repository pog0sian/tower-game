import { hashToken } from './crypto'

const CONTROL_CHARS_REGEX = /[\u0000-\u001f\u007f]/u
const FORBIDDEN_HTML_CHARS_REGEX = /[<>]/u
const FULL_NAME_ALLOWED_REGEX = /^[\p{L}\p{N} .,'-]+$/u
const GROUP_ALLOWED_REGEX = /^[\p{L}\p{N} .,_\-/#()+]+$/u

export const sanitizeIdentityInput = (value: string) => value.trim().replace(/\s+/g, ' ')

const isSafeIdentityText = (value: string, pattern: RegExp) => {
  if (!value) {
    return false
  }

  if (CONTROL_CHARS_REGEX.test(value) || FORBIDDEN_HTML_CHARS_REGEX.test(value)) {
    return false
  }

  return pattern.test(value)
}

export const isSafeFullName = (value: string) => isSafeIdentityText(value, FULL_NAME_ALLOWED_REGEX)

export const isSafeGroupName = (value: string) => isSafeIdentityText(value, GROUP_ALLOWED_REGEX)

export const hashIdentityFingerprint = (value: string) => hashToken(value)
