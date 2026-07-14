import mysql from 'mysql2/promise';

let pool;
let dbInitialized = false;

export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST || '127.0.0.1',
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      user: process.env.MYSQL_USER || 'ppstore',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'pp_systems_online',
      waitForConnections: true,
      connectionLimit: 20,
      queueLimit: 0,
      timezone: '+00:00',
    });
  }
  return pool;
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
  const p = getPool();
  const [rows] = await p.execute(sql, params);
  return rows;
}

export async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

export async function initDatabase() {
  const p = getPool();
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
