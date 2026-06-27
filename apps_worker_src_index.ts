import { revertStaleCancelRequests } from './services/orders';

// cron.schedule('*/5 * * * *', async () => {
//   const { reverted } = await revertStaleCancelRequests();
//   if (reverted > 0) console.log(`[cron] Reverted ${reverted} stale cancel_requested order(s)`);
// });