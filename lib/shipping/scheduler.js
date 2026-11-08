import { query } from '../db';
import { runDue } from './scraper';
import { notifyQueued } from './notify';

// Steps 4 and 6: the timer that drives everything, started once when the server boots
// (see instrumentation.js). There is no Laravel here; this plays the role of the scheduler.
//   every 5 minutes: scrape accounts whose last run is over ~1 hour old (so each shop
//                    is checked hourly, and a server restart doesn't skip an hour)
//   every 2 minutes: send queued customer notices

const SCRAPE_EVERY = 5 * 60 * 1000;
const NOTIFY_EVERY = 2 * 60 * 1000;

let started = false;

export async function startShippingScheduler() {
  // Opt-in per server: only the live server sets SHIPPING_SYNC=on. A developer machine that
  // happens to point at the live database must never scrape or message customers.
  if (started || process.env.SHIPPING_SYNC !== 'on') return;
  started = true;

  // A crash in the middle of a send leaves rows in "sending". We can't know whether the
  // message went out, so mark them failed rather than risk telling the customer twice.
  try {
    await query("UPDATE shipping_bills SET notify_status = 'failed', notify_error = 'interrupted' WHERE notify_status = 'sending'");
    await query("UPDATE shipping_scrape_runs SET status = 'failed', error = 'interrupted', finished_at = NOW() WHERE status = 'running'");
  } catch (e) {
    console.error('shipping scheduler startup:', e.message);
  }

  const scrape = () => runDue().catch(e => console.error('shipping scrape:', e.message));
  const notify = () => notifyQueued().catch(e => console.error('shipping notify:', e.message));
  setTimeout(scrape, 60 * 1000).unref?.(); // let the server finish starting first
  setInterval(scrape, SCRAPE_EVERY).unref?.();
  setInterval(notify, NOTIFY_EVERY).unref?.();
  console.log('shipping scheduler started');
}
