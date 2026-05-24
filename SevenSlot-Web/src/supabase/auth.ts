import { supabase } from './client'

const EMAIL_DOMAIN = 'accounts.sevenslot.local'
const ACCOUNT_ID_RE = /^[A-Za-z0-9_]{2,24}$/

export function validateAccountId(id: string): string | null {
  if (!id) return 'Account ID is required'
  if (!ACCOUNT_ID_RE.test(id)) return 'Account ID must be 2–24 chars (letters, numbers, underscore)'
  return null
}

export function validatePassword(pw: string): string | null {
  if (!pw) return 'Password is required'
  if (pw.length < 8) return 'Password must be at least 8 characters'
  return null
}

const toEmail = (accountId: string) => `${accountId.toLowerCase()}@${EMAIL_DOMAIN}`

export async function signIn(accountId: string, password: string) {
  return supabase.auth.signInWithPassword({ email: toEmail(accountId), password })
}

export async function signUp(accountId: string, password: string) {
  return supabase.auth.signUp({
    email: toEmail(accountId),
    password,
    options: { data: { username: accountId } },
  })
}

export async function signOut() {
  return supabase.auth.signOut()
}
