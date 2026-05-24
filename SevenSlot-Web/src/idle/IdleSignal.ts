// Module-singleton signal used by the 15-min auto-signout timer in
// App.tsx. Adapters call `notifyActivity()` after any successful play RPC;
// game views call `setAutoSpinning(true/false)` when auto-spin toggles.
// The timer subscribes to both and (a) resets on activity, (b) freezes
// while auto-spin is running. Decoupled this way so the three game views /
// adapters don't need to drill props through to the app root.

type Listener = () => void
type AutoSpinListener = (running: boolean) => void

const activityListeners = new Set<Listener>()
const autoSpinListeners = new Set<AutoSpinListener>()
let autoSpinFlag = false

export function notifyActivity(): void {
  for (const l of activityListeners) {
    try { l() } catch { /* listener errors must not break the spin path */ }
  }
}

export function setAutoSpinning(running: boolean): void {
  if (autoSpinFlag === running) return
  autoSpinFlag = running
  for (const l of autoSpinListeners) {
    try { l(running) } catch { /* listener errors must not break game flow */ }
  }
}

export function isAutoSpinningNow(): boolean {
  return autoSpinFlag
}

export function subscribeActivity(cb: Listener): () => void {
  activityListeners.add(cb)
  return () => { activityListeners.delete(cb) }
}

export function subscribeAutoSpin(cb: AutoSpinListener): () => void {
  autoSpinListeners.add(cb)
  return () => { autoSpinListeners.delete(cb) }
}
