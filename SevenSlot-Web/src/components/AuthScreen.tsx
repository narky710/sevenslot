import React, { useState } from 'react'
import { signIn, signUp, validateAccountId, validatePassword } from '../supabase/auth'

export default function AuthScreen() {
  const [accountId, setAccountId] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bootstrapMode, setBootstrapMode] = useState(false)
  // One-shot banner: if the previous session was terminated by the idle
  // auto-signout timer, surface a friendly notice and clear the flag so it
  // doesn't reappear on subsequent sign-ins.
  const [signedOutReason] = useState<string | null>(() => {
    try {
      const r = window.sessionStorage.getItem('sevenslot:signedOutReason')
      if (r) window.sessionStorage.removeItem('sevenslot:signedOutReason')
      return r === 'inactivity' ? 'Signed out due to inactivity.' : null
    } catch { return null }
  })

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const idErr = validateAccountId(accountId)
    if (idErr) { setError(idErr); return }
    const pwErr = validatePassword(password)
    if (pwErr) { setError(pwErr); return }

    setBusy(true)
    try {
      if (bootstrapMode) {
        const { error: authError, data } = await signUp(accountId, password)
        if (authError) {
          if (/closed|signup/i.test(authError.message)) {
            setError('Public signup is closed. Ask your admin for an account.')
            setBootstrapMode(false)
          } else {
            setError(authError.message)
          }
        } else if (!data.session) {
          setError('Account created but no session was returned. Disable "Confirm email" in the Supabase dashboard (Auth → Providers → Email).')
        }
      } else {
        const { error: authError } = await signIn(accountId, password)
        if (authError) setError(authError.message)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={styles.stage}>
      <h1 style={styles.title}>SEVENSLOT</h1>
      {signedOutReason && (
        <div style={styles.notice} role="status">{signedOutReason}</div>
      )}
      <form onSubmit={onSubmit} style={styles.card}>
        <h2 style={styles.heading}>{bootstrapMode ? 'Bootstrap first admin' : 'Sign in'}</h2>
        <label style={styles.label}>
          Account ID
          <input
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            autoComplete="username"
            placeholder="2–24 letters/numbers/underscore"
            style={styles.input}
            disabled={busy}
          />
        </label>
        <label style={styles.label}>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={bootstrapMode ? 'new-password' : 'current-password'}
            style={styles.input}
            disabled={busy}
          />
        </label>
        {error && <div style={styles.error}>{error}</div>}
        <button type="submit" disabled={busy} style={styles.primary}>
          {busy ? 'Working…' : bootstrapMode ? 'Create first admin' : 'Sign in'}
        </button>
        <p style={styles.hint}>
          {bootstrapMode
            ? 'Only works once — first account ever becomes admin.'
            : 'Accounts are issued by an admin. Need one? Ask your admin.'}
        </p>
        <button
          type="button"
          onClick={() => { setBootstrapMode(!bootstrapMode); setError(null) }}
          style={styles.secondary}
          disabled={busy}
        >
          {bootstrapMode ? '← Back to sign in' : 'First-time setup? Bootstrap admin'}
        </button>
      </form>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  stage: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    color: '#fff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    background: '#0d0d18',
  },
  title: { fontSize: 32, fontWeight: 800, color: '#FFD93D', letterSpacing: 2, margin: '0 0 24px' },
  card: {
    width: '100%',
    maxWidth: 360,
    background: '#16162a',
    border: '1px solid #2A56D8',
    borderRadius: 12,
    padding: 24,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  heading: { margin: 0, fontSize: 18, fontWeight: 700 },
  label: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, opacity: 0.85 },
  input: {
    padding: '10px 12px',
    background: '#0d0d18',
    border: '1px solid #2A56D8',
    color: '#fff',
    borderRadius: 6,
    fontSize: 14,
  },
  primary: {
    padding: '10px 16px',
    background: '#FFD93D',
    border: 'none',
    color: '#0d0d18',
    fontWeight: 700,
    borderRadius: 6,
    cursor: 'pointer',
  },
  secondary: {
    padding: '8px 16px',
    background: 'transparent',
    border: 'none',
    color: '#8AA4FF',
    cursor: 'pointer',
    fontSize: 13,
  },
  error: {
    background: '#3a1212',
    border: '1px solid #ff5252',
    color: '#ffb3b3',
    padding: 10,
    borderRadius: 6,
    fontSize: 13,
  },
  hint: { fontSize: 12, opacity: 0.7, margin: 0, textAlign: 'center' },
  notice: {
    background: '#16162a',
    border: '1px solid #FFD93D',
    color: '#FFD93D',
    padding: '10px 14px',
    borderRadius: 6,
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
    maxWidth: 360,
  },
}
