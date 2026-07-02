import mysql from 'mysql2/promise';

async function main() {
  const rootConn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || '118.27.147.48',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_ROOT_USER || 'root',
    password: process.env.MYSQL_ROOT_PASSWORD || '',
  });

  const dbName = process.env.MYSQL_DATABASE || 'pp_systems_online';
  const user = process.env.MYSQL_USER || 'ppstore';
  const pass = process.env.MYSQL_PASSWORD || 'PPstore2026!';

  console.log(`Creating database ${dbName}...`);
  await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

  console.log(`Creating user ${user}...`);
  try {
    await rootConn.query(`CREATE USER IF NOT EXISTS '${user}'@'%' IDENTIFIED BY '${pass}'`);
  } catch (e) {
    console.log('User may already exist, updating password...');
    await rootConn.query(`ALTER USER '${user}'@'%' IDENTIFIED BY '${pass}'`);
  }

  await rootConn.query(`GRANT ALL PRIVILEGES ON \`${dbName}\`.* TO '${user}'@'%'`);
  await rootConn.query('FLUSH PRIVILEGES');

  console.log('Database and user created successfully!');
  console.log(`  Database: ${dbName}`);
  console.log(`  User: ${user}`);

  await rootConn.end();
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
