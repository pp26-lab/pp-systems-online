import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

let pool;
let poolPromise;
let dbInitialized = false;

// Minutes MySQL's clock is ahead of UTC. DATETIME columns filled by NOW() /
// CURRENT_TIMESTAMP hold the server's local time, so mysql2 must be told that
// offset or every timestamp (and every date filter) is shifted by hours.
export let dbUtcOffsetMin = 0;

// The shop's own day boundaries (Laos/Thailand = UTC+7).
export const SHOP_UTC_OFFSET_MIN = parseInt(process.env.SHOP_UTC_OFFSET_MIN || '420');

function connConfig() {
  return {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER || 'ppstore',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'pp_systems_online',
  };
}

function offsetString(min) {
  const sign = min < 0 ? '-' : '+';
  const a = Math.abs(min);
  return `${sign}${String(Math.floor(a / 60)).padStart(2, '0')}:${String(a % 60).padStart(2, '0')}`;
}

export async function getPool() {
  if (pool) return pool;
  if (!poolPromise) {
    poolPromise = (async () => {
      try {
        const conn = await mysql.createConnection(connConfig());
        const [rows] = await conn.query('SELECT TIMESTAMPDIFF(MINUTE, UTC_TIMESTAMP(), NOW()) AS off');
        await conn.end();
        dbUtcOffsetMin = Math.round(Number(rows[0].off) / 15) * 15;
      } catch (e) {
        console.error('DB timezone detection failed:', e.message);
        dbUtcOffsetMin = 0;
      }
      pool = mysql.createPool({
        ...connConfig(),
        waitForConnections: true,
        connectionLimit: 20,
        queueLimit: 0,
        timezone: offsetString(dbUtcOffsetMin),
        // Calendar dates (expiry, delivery, sale end) stay "YYYY-MM-DD" instead of
        // becoming midnight in some timezone and slipping a day.
        dateStrings: ['DATE'],
      });
      return pool;
    })();
  }
  return poolPromise;
}

// SQL for "the shop-local calendar day of <column>". Only numbers are interpolated.
export function shopDay(column) {
  const delta = SHOP_UTC_OFFSET_MIN - dbUtcOffsetMin;
  return delta ? `DATE(${column} + INTERVAL ${Number(delta)} MINUTE)` : `DATE(${column})`;
}

// Today's date (YYYY-MM-DD) in the shop's timezone.
export function shopToday() {
  return new Date(Date.now() + SHOP_UTC_OFFSET_MIN * 60000).toISOString().slice(0, 10);
}

async function ensureInit() {
  if (!dbInitialized) {
    dbInitialized = true;
    try {
      await initDatabase();
    } catch (e) {
      console.error('DB init error:', e.message);
      dbInitialized = false;
    }
  }
}

export async function query(sql, params = []) {
  await ensureInit();
  const p = await getPool();
  const [rows] = await p.execute(sql, params);
  return rows;
}

export async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

export async function initDatabase() {
  const p = await getPool();
  const conn = await p.getConnection();
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS shops (
        id INT AUTO_INCREMENT PRIMARY KEY,
        license_key VARCHAR(255) UNIQUE NOT NULL,
        shop_name VARCHAR(255) NOT NULL DEFAULT 'My Shop',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(255) PRIMARY KEY,
        shop_id INT NOT NULL,
        license_key VARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL,
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS currencies (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT NOT NULL,
        code VARCHAR(10) NOT NULL,
        name VARCHAR(100) NOT NULL,
        symbol VARCHAR(10) NOT NULL,
        rate_to_lak DOUBLE NOT NULL DEFAULT 1,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_shop_currency (shop_id, code),
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT NOT NULL,
        sku VARCHAR(100),
        name_lo VARCHAR(500) NOT NULL DEFAULT '',
        name_th VARCHAR(500) NOT NULL DEFAULT '',
        name_en VARCHAR(500) NOT NULL DEFAULT '',
        description TEXT,
        category VARCHAR(255) DEFAULT '',
        cost_price DOUBLE NOT NULL DEFAULT 0,
        cost_currency VARCHAR(10) NOT NULL DEFAULT 'THB',
        freight_cost DOUBLE DEFAULT 0,
        customs_duty DOUBLE DEFAULT 0,
        proxy_fee DOUBLE DEFAULT 0,
        transfer_fee DOUBLE DEFAULT 0,
        exchange_rate_used DOUBLE NOT NULL DEFAULT 1,
        landed_cost_lak DOUBLE DEFAULT 0,
        selling_price_lak DOUBLE NOT NULL DEFAULT 0,
        image_url TEXT,
        barcode VARCHAR(255) DEFAULT '',
        sale_end_date DATE DEFAULT NULL,
        has_variants TINYINT NOT NULL DEFAULT 0,
        variant_label_1 VARCHAR(100) NOT NULL DEFAULT 'color',
        variant_label_2 VARCHAR(100) NOT NULL DEFAULT 'size',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_shop_sku (shop_id, sku),
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS inventory (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity INT NOT NULL DEFAULT 0,
        status ENUM('in_stock','in_transit','pre_order','ready_to_ship') NOT NULL DEFAULT 'in_stock',
        batch_number VARCHAR(255) DEFAULT '',
        expected_arrival DATE DEFAULT NULL,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS coupons (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT NOT NULL,
        code VARCHAR(50) NOT NULL,
        discount_type ENUM('percent', 'fixed') NOT NULL DEFAULT 'percent',
        discount_value DOUBLE NOT NULL,
        min_purchase DOUBLE DEFAULT 0,
        max_discount DOUBLE DEFAULT 0,
        usage_limit INT DEFAULT 0,
        times_used INT NOT NULL DEFAULT 0,
        expires_at DATE DEFAULT NULL,
        is_active TINYINT NOT NULL DEFAULT 1,
        note TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_shop_code (shop_id, code),
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS stock_movements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT NOT NULL,
        product_id INT NOT NULL,
        variant_id INT DEFAULT NULL,
        quantity_change INT NOT NULL,
        quantity_after INT DEFAULT NULL,
        reason VARCHAR(100) NOT NULL,
        note TEXT,
        reference_type VARCHAR(50) DEFAULT NULL,
        reference_id INT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_product (product_id),
        INDEX idx_shop_date (shop_id, created_at),
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS webhooks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT NOT NULL,
        name VARCHAR(100) NOT NULL DEFAULT '',
        url TEXT NOT NULL,
        events VARCHAR(500) NOT NULL DEFAULT '',
        secret VARCHAR(255) DEFAULT '',
        is_active TINYINT NOT NULL DEFAULT 1,
        last_fired_at DATETIME DEFAULT NULL,
        fail_count INT NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        parent_id INT DEFAULT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_shop_parent (shop_id, parent_id),
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT NOT NULL,
        name VARCHAR(255) NOT NULL DEFAULT '',
        phone VARCHAR(100) DEFAULT '',
        email VARCHAR(255) DEFAULT '',
        facebook_id VARCHAR(100) DEFAULT '',
        line_id VARCHAR(100) DEFAULT '',
        address TEXT,
        note TEXT,
        total_spent DOUBLE NOT NULL DEFAULT 0,
        order_count INT NOT NULL DEFAULT 0,
        last_order_at DATETIME DEFAULT NULL,
        is_blacklisted TINYINT NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_shop_phone (shop_id, phone),
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT NOT NULL,
        order_number VARCHAR(100) UNIQUE NOT NULL,
        customer_name VARCHAR(255) DEFAULT '',
        customer_phone VARCHAR(100) DEFAULT '',
        customer_address TEXT,
        subtotal DOUBLE NOT NULL DEFAULT 0,
        discount DOUBLE DEFAULT 0,
        tax DOUBLE DEFAULT 0,
        total DOUBLE NOT NULL DEFAULT 0,
        currency VARCHAR(10) NOT NULL DEFAULT 'LAK',
        exchange_rate_used DOUBLE DEFAULT 1,
        total_in_lak DOUBLE NOT NULL DEFAULT 0,
        payment_method VARCHAR(50) DEFAULT 'cash',
        order_type ENUM('walk_in','online','delivery') NOT NULL DEFAULT 'walk_in',
        delivery_date DATE DEFAULT NULL,
        shipping_notes TEXT,
        status ENUM('pending','completed','cancelled','shipping') NOT NULL DEFAULT 'completed',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT NOT NULL,
        order_id INT NOT NULL,
        product_id INT NOT NULL,
        variant_id INT DEFAULT NULL,
        quantity INT NOT NULL DEFAULT 1,
        unit_price DOUBLE NOT NULL,
        currency VARCHAR(10) NOT NULL DEFAULT 'LAK',
        total DOUBLE NOT NULL,
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS product_images (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT NOT NULL,
        product_id INT NOT NULL,
        image_url TEXT NOT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_product (product_id),
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS product_variants (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT NOT NULL,
        product_id INT NOT NULL,
        color VARCHAR(255) NOT NULL DEFAULT '',
        size VARCHAR(255) NOT NULL DEFAULT '',
        sku_suffix VARCHAR(100) DEFAULT '',
        quantity INT NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS exchange_rate_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT NOT NULL,
        from_currency VARCHAR(10) NOT NULL,
        to_currency VARCHAR(10) NOT NULL DEFAULT 'LAK',
        rate DOUBLE NOT NULL,
        recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS handoffs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT NOT NULL,
        facebook_user_id VARCHAR(100) NOT NULL,
        customer_name VARCHAR(255) DEFAULT '',
        message TEXT NOT NULL,
        source VARCHAR(50) NOT NULL DEFAULT 'facebook_messenger',
        status ENUM('pending', 'in_progress', 'resolved') NOT NULL DEFAULT 'pending',
        admin_notes TEXT,
        received_at DATETIME NOT NULL,
        resolved_at DATETIME DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_status (status),
        INDEX idx_fb_user (facebook_user_id),
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS admin_sessions (
        id VARCHAR(255) PRIMARY KEY,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS bot_api_keys (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT NOT NULL,
        key_hash VARCHAR(255) NOT NULL,
        key_preview VARCHAR(20) NOT NULL,
        name VARCHAR(100) DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_used_at DATETIME DEFAULT NULL,
        INDEX idx_key_hash (key_hash),
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS shop_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT UNIQUE NOT NULL,
        shop_name VARCHAR(255) NOT NULL DEFAULT 'My Shop',
        shop_phone VARCHAR(100) DEFAULT '',
        shop_address TEXT,
        shop_logo TEXT,
        receipt_footer TEXT,
        default_order_type ENUM('walk_in','online') NOT NULL DEFAULT 'walk_in',
        variant_label_1 VARCHAR(100) NOT NULL DEFAULT 'color',
        variant_label_2 VARCHAR(100) NOT NULL DEFAULT 'size',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
      )
    `);

    const cols = await conn.query("SHOW COLUMNS FROM shop_settings");
    const colNames = cols[0].map(c => c.Field);
    if (!colNames.includes('default_order_type')) {
      await conn.query("ALTER TABLE shop_settings ADD COLUMN default_order_type ENUM('walk_in','online') NOT NULL DEFAULT 'walk_in'");
    }
    if (!colNames.includes('variant_label_1')) {
      await conn.query("ALTER TABLE shop_settings ADD COLUMN variant_label_1 VARCHAR(100) NOT NULL DEFAULT 'color'");
    }
    if (!colNames.includes('variant_label_2')) {
      await conn.query("ALTER TABLE shop_settings ADD COLUMN variant_label_2 VARCHAR(100) NOT NULL DEFAULT 'size'");
    }
    if (!colNames.includes('whatsapp_template')) {
      await conn.query("ALTER TABLE shop_settings ADD COLUMN whatsapp_template TEXT DEFAULT NULL");
    }
    if (!colNames.includes('whatsapp_country_code')) {
      await conn.query("ALTER TABLE shop_settings ADD COLUMN whatsapp_country_code VARCHAR(10) NOT NULL DEFAULT '856'");
    }

    const prodCols = await conn.query("SHOW COLUMNS FROM products");
    const prodNames = prodCols[0].map(c => c.Field);
    if (!prodNames.includes('variant_label_1')) {
      await conn.query("ALTER TABLE products ADD COLUMN variant_label_1 VARCHAR(100) NOT NULL DEFAULT 'color'");
    }
    if (!prodNames.includes('variant_label_2')) {
      await conn.query("ALTER TABLE products ADD COLUMN variant_label_2 VARCHAR(100) NOT NULL DEFAULT 'size'");
    }
    if (!prodNames.includes('status')) {
      await conn.query("ALTER TABLE products ADD COLUMN status ENUM('active','hidden','pre_order','out_of_stock') NOT NULL DEFAULT 'active'");
    }
    if (!prodNames.includes('wholesale_price_lak')) {
      await conn.query("ALTER TABLE products ADD COLUMN wholesale_price_lak DOUBLE NOT NULL DEFAULT 0");
    }
    if (!prodNames.includes('member_price_lak')) {
      await conn.query("ALTER TABLE products ADD COLUMN member_price_lak DOUBLE NOT NULL DEFAULT 0");
    }
    if (!prodNames.includes('category_id')) {
      await conn.query("ALTER TABLE products ADD COLUMN category_id INT DEFAULT NULL, ADD INDEX idx_category (category_id)");
    }

    const orderCols = await conn.query("SHOW COLUMNS FROM orders");
    const orderNames = orderCols[0].map(c => c.Field);
    if (!orderNames.includes('customer_id')) {
      await conn.query("ALTER TABLE orders ADD COLUMN customer_id INT DEFAULT NULL, ADD INDEX idx_customer (customer_id)");
    }
    if (!orderNames.includes('tracking_number')) {
      await conn.query("ALTER TABLE orders ADD COLUMN tracking_number VARCHAR(255) DEFAULT ''");
    }
    if (!orderNames.includes('shipping_carrier')) {
      await conn.query("ALTER TABLE orders ADD COLUMN shipping_carrier VARCHAR(100) DEFAULT ''");
    }
    if (!orderNames.includes('internal_notes')) {
      await conn.query("ALTER TABLE orders ADD COLUMN internal_notes TEXT");
    }
    if (!orderNames.includes('payment_slip_url')) {
      await conn.query("ALTER TABLE orders ADD COLUMN payment_slip_url TEXT");
    }
    if (!orderNames.includes('coupon_code')) {
      await conn.query("ALTER TABLE orders ADD COLUMN coupon_code VARCHAR(50) DEFAULT ''");
    }
    if (!orderNames.includes('coupon_discount')) {
      await conn.query("ALTER TABLE orders ADD COLUMN coupon_discount DOUBLE NOT NULL DEFAULT 0");
    }
    // How much the customer has already paid (order currency). COD remaining = total - amount_paid.
    if (!orderNames.includes('amount_paid')) {
      await conn.query("ALTER TABLE orders ADD COLUMN amount_paid DOUBLE NOT NULL DEFAULT 0");
    }

    const custCols = await conn.query("SHOW COLUMNS FROM customers");
    const custNames = custCols[0].map(c => c.Field);
    if (!custNames.includes('customer_type')) {
      await conn.query("ALTER TABLE customers ADD COLUMN customer_type ENUM('retail','wholesale','member') NOT NULL DEFAULT 'retail'");
    }

    const settingCols = await conn.query("SHOW COLUMNS FROM shop_settings");
    const settingNames = settingCols[0].map(c => c.Field);
    if (!settingNames.includes('staff_pin')) {
      await conn.query("ALTER TABLE shop_settings ADD COLUMN staff_pin VARCHAR(20) DEFAULT ''");
    }
    if (!settingNames.includes('low_stock_threshold')) {
      await conn.query("ALTER TABLE shop_settings ADD COLUMN low_stock_threshold INT NOT NULL DEFAULT 5");
    }
    // Carriers the shop is willing to ship with, one per line; shown as choices on online orders.
    if (!settingNames.includes('shipping_carriers')) {
      await conn.query("ALTER TABLE shop_settings ADD COLUMN shipping_carriers TEXT DEFAULT NULL");
    }

    // Features each shop has bought. A row overrides the catalog default in lib/features.js.
    await conn.query(`
      CREATE TABLE IF NOT EXISTS shop_features (
        shop_id INT NOT NULL,
        feature_key VARCHAR(50) NOT NULL,
        enabled TINYINT(1) NOT NULL DEFAULT 1,
        expires_at DATE DEFAULT NULL,
        note VARCHAR(255) DEFAULT '',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (shop_id, feature_key),
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
      )
    `);

    // Back-office audit trail (who changed licenses, features, chat connections).
    await conn.query(`
      CREATE TABLE IF NOT EXISTS admin_audit_log (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT DEFAULT NULL,
        action VARCHAR(100) NOT NULL,
        detail TEXT,
        ip VARCHAR(64) DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_shop (shop_id)
      )
    `);

    // Messaging accounts a shop has connected (one Facebook page, one WhatsApp number, ...).
    // external_id is the page id / WhatsApp phone_number_id and maps incoming webhooks to a shop.
    await conn.query(`
      CREATE TABLE IF NOT EXISTS chat_channels (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT NOT NULL,
        platform ENUM('messenger','whatsapp','whatsapp_web') NOT NULL,
        external_id VARCHAR(64) NOT NULL,
        account_id VARCHAR(64) DEFAULT '',
        name VARCHAR(255) DEFAULT '',
        token_enc TEXT NOT NULL,
        status ENUM('active','pending','error','disabled') NOT NULL DEFAULT 'active',
        last_error TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_platform_external (platform, external_id),
        INDEX idx_shop (shop_id),
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
      )
    `);

    // One conversation per customer per channel.
    await conn.query(`
      CREATE TABLE IF NOT EXISTS chat_conversations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT NOT NULL,
        channel_id INT NOT NULL,
        platform ENUM('messenger','whatsapp','whatsapp_web') NOT NULL,
        external_user_id VARCHAR(64) NOT NULL,
        name VARCHAR(255) DEFAULT '',
        phone VARCHAR(50) DEFAULT '',
        avatar_url TEXT,
        customer_id INT DEFAULT NULL,
        status ENUM('open','done') NOT NULL DEFAULT 'open',
        unread_count INT NOT NULL DEFAULT 0,
        last_message_at DATETIME DEFAULT NULL,
        last_message_preview VARCHAR(255) DEFAULT '',
        last_inbound_at DATETIME DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_channel_user (channel_id, external_user_id),
        INDEX idx_shop_last (shop_id, last_message_at),
        INDEX idx_customer (customer_id),
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
        FOREIGN KEY (channel_id) REFERENCES chat_channels(id) ON DELETE CASCADE
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT NOT NULL,
        conversation_id INT NOT NULL,
        channel_id INT NOT NULL,
        direction ENUM('in','out') NOT NULL,
        type VARCHAR(20) NOT NULL DEFAULT 'text',
        text TEXT,
        media_file VARCHAR(255) DEFAULT NULL,
        media_mime VARCHAR(100) DEFAULT NULL,
        external_id VARCHAR(255) DEFAULT NULL,
        status ENUM('received','sending','sent','delivered','read','failed') NOT NULL DEFAULT 'received',
        error TEXT,
        order_id INT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_channel_external (channel_id, external_id),
        INDEX idx_conv (conversation_id, id),
        INDEX idx_shop (shop_id, id),
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
        FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE
      )
    `);

    // Older installs: add WhatsApp-by-scan (linked device) and the pending pairing state.
    for (const [table, column, wanted, def] of [
      ['chat_channels', 'platform', 'whatsapp_web', "ENUM('messenger','whatsapp','whatsapp_web') NOT NULL"],
      ['chat_channels', 'status', 'pending', "ENUM('active','pending','error','disabled') NOT NULL DEFAULT 'active'"],
      ['chat_conversations', 'platform', 'whatsapp_web', "ENUM('messenger','whatsapp','whatsapp_web') NOT NULL"],
    ]) {
      // Names come from the fixed list above, never from input.
      const [rows] = await conn.query(`SHOW COLUMNS FROM ${table} LIKE '${column}'`);
      if (rows[0] && !String(rows[0].Type).includes(`'${wanted}'`)) {
        await conn.query(`ALTER TABLE ${table} MODIFY ${column} ${def}`);
      }
    }

    // Raw webhook deliveries. Stored first, processed after, so nothing is lost on a crash.
    await conn.query(`
      CREATE TABLE IF NOT EXISTS chat_inbox_events (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        source VARCHAR(20) NOT NULL,
        payload MEDIUMTEXT NOT NULL,
        status ENUM('pending','done','failed','ignored') NOT NULL DEFAULT 'pending',
        attempts INT NOT NULL DEFAULT 0,
        last_error TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_status (status, id)
      )
    `);

    // Saved replies a shop sets up once and sends with one tap: text plus up to 5 photos or stickers.
    await conn.query(`
      CREATE TABLE IF NOT EXISTS chat_quick_replies (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT NOT NULL,
        title VARCHAR(60) NOT NULL,
        text TEXT,
        sort_order INT NOT NULL DEFAULT 0,
        use_count INT NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_shop (shop_id, sort_order),
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS chat_quick_reply_media (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT NOT NULL,
        reply_id INT NOT NULL,
        kind ENUM('image','sticker') NOT NULL DEFAULT 'image',
        file VARCHAR(255) NOT NULL,
        mime VARCHAR(100) NOT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        INDEX idx_reply (reply_id, sort_order),
        INDEX idx_shop (shop_id),
        FOREIGN KEY (reply_id) REFERENCES chat_quick_replies(id) ON DELETE CASCADE
      )
    `);

    // ---------------------------------------------------------------- shipping bills
    // Each shop's account on a carrier website (Anousith first). The login, if the site
    // needs one, is stored encrypted with CHANNEL_ENC_KEY, like chat tokens.
    await conn.query(`
      CREATE TABLE IF NOT EXISTS shipping_accounts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT NOT NULL,
        carrier VARCHAR(30) NOT NULL,
        sender_phone VARCHAR(50) NOT NULL DEFAULT '',
        login_enc TEXT,
        message_template TEXT,
        enabled TINYINT(1) NOT NULL DEFAULT 0,
        last_run_at DATETIME DEFAULT NULL,
        last_error TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_shop_carrier (shop_id, carrier),
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
      )
    `);
    // auto_notify: tell customers automatically (separate from server-side checking, which
    // needs the carrier's permission). account_ref: the carrier account bills came from, so
    // bills from a different account are never mixed in without the shop confirming.
    const [shipCols] = await conn.query('SHOW COLUMNS FROM shipping_accounts');
    const shipNames = shipCols.map(c => c.Field);
    if (!shipNames.includes('auto_notify')) {
      await conn.query('ALTER TABLE shipping_accounts ADD COLUMN auto_notify TINYINT(1) NOT NULL DEFAULT 1');
    }
    if (!shipNames.includes('account_ref')) {
      await conn.query("ALTER TABLE shipping_accounts ADD COLUMN account_ref VARCHAR(64) NOT NULL DEFAULT ''");
    }

    // Bills found on the carrier site. One row per tracking number per shop; the row is
    // also the notification queue (notify_status), so nothing extra is needed to run jobs.
    // Only the fields needed to match and notify are kept, not the whole page.
    await conn.query(`
      CREATE TABLE IF NOT EXISTS shipping_bills (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT NOT NULL,
        carrier VARCHAR(30) NOT NULL,
        tracking_number VARCHAR(64) NOT NULL,
        receiver_name VARCHAR(255) DEFAULT '',
        receiver_phone VARCHAR(50) DEFAULT '',
        receiver_phone_norm VARCHAR(20) NOT NULL DEFAULT '',
        destination VARCHAR(255) DEFAULT '',
        cod_amount DOUBLE NOT NULL DEFAULT 0,
        carrier_status VARCHAR(100) DEFAULT '',
        shipped_at DATETIME DEFAULT NULL,
        order_id INT DEFAULT NULL,
        match_status ENUM('pending','matched','no_match','ambiguous') NOT NULL DEFAULT 'pending',
        conversation_id INT DEFAULT NULL,
        notify_status ENUM('waiting','queued','sending','sent','failed','no_chat','off') NOT NULL DEFAULT 'waiting',
        notify_attempts INT NOT NULL DEFAULT 0,
        notify_error TEXT,
        notified_at DATETIME DEFAULT NULL,
        message_id BIGINT DEFAULT NULL,
        first_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_shop_tracking (shop_id, carrier, tracking_number),
        INDEX idx_phone (shop_id, receiver_phone_norm),
        INDEX idx_notify (notify_status, id),
        INDEX idx_order (order_id),
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
      )
    `);

    // One row per scraper run, for the shop's "last checked" line and for debugging.
    await conn.query(`
      CREATE TABLE IF NOT EXISTS shipping_scrape_runs (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT NOT NULL,
        carrier VARCHAR(30) NOT NULL,
        status ENUM('running','ok','failed','login_failed') NOT NULL DEFAULT 'running',
        bills_seen INT NOT NULL DEFAULT 0,
        bills_new INT NOT NULL DEFAULT 0,
        bills_matched INT NOT NULL DEFAULT 0,
        error TEXT,
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        finished_at DATETIME DEFAULT NULL,
        INDEX idx_shop_started (shop_id, started_at),
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
      )
    `);

    // Platform-wide settings entered in the back office (not per shop): the Meta app secret
    // and verify token, the public base URL, etc. Secret values are stored encrypted; the
    // value column is TEXT so a sealed blob fits. One Facebook app serves every page/shop.
    await conn.query(`
      CREATE TABLE IF NOT EXISTS platform_settings (
        name VARCHAR(64) PRIMARY KEY,
        value_enc TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Phones/browsers that asked for chat notifications while the screen is off (Web Push).
    // One row per browser endpoint; it belongs to the shop that was signed in when it subscribed.
    await conn.query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT NOT NULL,
        endpoint_hash CHAR(64) NOT NULL,
        endpoint TEXT NOT NULL,
        p256dh VARCHAR(255) NOT NULL,
        auth VARCHAR(255) NOT NULL,
        lang VARCHAR(5) NOT NULL DEFAULT 'lo',
        user_agent VARCHAR(255) DEFAULT '',
        fail_count INT NOT NULL DEFAULT 0,
        last_ok_at DATETIME DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_endpoint (endpoint_hash),
        INDEX idx_shop (shop_id),
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
      )
    `);

    // One-time clean-up: Facebook sends a sticker (👍) as two attachments of one message, and
    // older code stored the second as its own row ("<mid>#1"), so stickers showed twice. Remove
    // those copies (and their files) once; the flag row stops it running again.
    const [done] = await conn.query("SELECT 1 FROM platform_settings WHERE name = 'migr_sticker_dupes_v1'");
    if (!done.length) {
      const [dupes] = await conn.query(
        `SELECT d.id, d.shop_id, d.media_file FROM chat_messages d
         JOIN chat_messages o ON o.channel_id = d.channel_id
           AND o.external_id = SUBSTRING_INDEX(d.external_id, '#', 1) AND o.type = 'sticker'
         WHERE d.type = 'sticker' AND d.external_id LIKE '%#%'`
      );
      for (const d of dupes) {
        await conn.query('DELETE FROM chat_messages WHERE id = ?', [d.id]);
        if (d.media_file && d.media_file === path.basename(d.media_file)) {
          try { fs.unlinkSync(path.join(process.cwd(), 'data', 'chat-media', String(Number(d.shop_id)), d.media_file)); } catch { /* already gone */ }
        }
      }
      await conn.query("INSERT IGNORE INTO platform_settings (name, value_enc) VALUES ('migr_sticker_dupes_v1', ?)", [String(dupes.length)]);
      if (dupes.length) console.log(`chat: removed ${dupes.length} duplicate sticker message(s)`);
    }
  } finally {
    conn.release();
  }
}

export async function ensureShopData(shopId) {
  const existing = await queryOne('SELECT id FROM currencies WHERE shop_id = ? LIMIT 1', [shopId]);
  if (existing) return;

  await query(
    'INSERT INTO currencies (shop_id, code, name, symbol, rate_to_lak) VALUES (?, ?, ?, ?, ?)',
    [shopId, 'LAK', 'Lao Kip', '₭', 1]
  );
  await query(
    'INSERT INTO currencies (shop_id, code, name, symbol, rate_to_lak) VALUES (?, ?, ?, ?, ?)',
    [shopId, 'THB', 'Thai Baht', '฿', 600]
  );
  await query(
    'INSERT INTO currencies (shop_id, code, name, symbol, rate_to_lak) VALUES (?, ?, ?, ?, ?)',
    [shopId, 'USD', 'US Dollar', '$', 21500]
  );
  await query(
    'INSERT INTO currencies (shop_id, code, name, symbol, rate_to_lak) VALUES (?, ?, ?, ?, ?)',
    [shopId, 'CNY', 'Chinese Yuan', '¥', 2950]
  );

  const settingsExists = await queryOne('SELECT id FROM shop_settings WHERE shop_id = ?', [shopId]);
  if (!settingsExists) {
    const shop = await queryOne('SELECT shop_name FROM shops WHERE id = ?', [shopId]);
    await query(
      'INSERT INTO shop_settings (shop_id, shop_name) VALUES (?, ?)',
      [shopId, shop?.shop_name || 'My Shop']
    );
  }
}
