// Runs once when the Next.js server starts. Background timers live here.
// The import must sit inside this exact check so the Edge build drops it (it uses fs/crypto).
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startShippingScheduler } = await import('./lib/shipping/scheduler');
    startShippingScheduler();
  }
}
