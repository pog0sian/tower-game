import { Elysia } from 'elysia'
import { getCurrentUserFromRequest } from '../modules/auth/session'

export const authPlugin = new Elysia({ name: 'auth-plugin' }).derive(async ({ request }) => ({
  currentUser: await getCurrentUserFromRequest(request),
}))
