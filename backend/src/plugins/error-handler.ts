import { Elysia } from 'elysia'

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message
  }

  return 'Unexpected server error'
}

export const errorHandlerPlugin = new Elysia({ name: 'error-handler' }).onError(
  ({ code, error, set }) => {
    if (code === 'VALIDATION') {
      set.status = 400
      return {
        ok: false,
        error: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: getErrorMessage(error),
      }
    }

    if (typeof set.status !== 'number' || set.status < 400) {
      set.status = 500
    }

    return {
      ok: false,
      error: code,
      message: getErrorMessage(error),
    }
  },
)
