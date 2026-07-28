import { query } from './db';

export async function logStockMovement({ shopId, productId, variantId, change, reason, note, referenceType, referenceId }) {
  try {
    await query(
      `INSERT INTO stock_movements (shop_id, product_id, variant_id, quantity_change, reason, note, reference_type, reference_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [shopId, productId, variantId || null, change, reason, note || '', referenceType || null, referenceId || null]
    );
  } catch (e) {
    console.error('Stock log error:', e.message);
  }
}
