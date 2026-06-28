const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

/*const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'tcg_pos',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});*/


/*const pool = mysql.createPool({
  host: process.env.MYSQLHOST || 'thomas.proxy.rlwy.net',
  user: process.env.MYSQLUSER || 'root',
  port: parseInt(process.env.MYSQLPORT, 10) || 59394,
  password: process.env.MYSQLPASSWORD || 'oZCdRYYavXImuWFpjSQAJxsjYsUszgpO',
  database: process.env.MYSQLDATABASE || 'railway',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});*/


const pool = mysql.createPool({
  host: process.env.Host || process.env.DB_HOST,
  user: process.env.Database_user || process.env.DB_USER,
  port: process.env.Port_number || process.env.DB_PORT,
  password: process.env.Database_password || process.env.DB_PASSWORD,
  database: process.env.Database_name || process.env.DB_NAME,
  
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});


async function initDB() {
  try {

    // 1. First try to connect to the database directly
    let conn;
    try {
      conn = await pool.getConnection();
      console.log('Successfully connected to the database.');
      conn.release();
    } catch (err) {
      // 2. If the database doesn't exist, try to create it (mostly for local development)
      if (err.code === 'ER_BAD_DB_ERROR') {
        console.log('Database does not exist. Attempting to create it...');
        const tempConnection = await mysql.createConnection({
          host: process.env.Host || process.env.DB_HOST,
          user: process.env.Database_user || process.env.DB_USER,
          password: process.env.Database_password || process.env.DB_PASSWORD,
          port: process.env.Port_number || process.env.DB_PORT,
        });

        const dbName = process.env.Database_name || process.env.DB_NAME;
        await tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
        await tempConnection.end();
        console.log('Database created successfully.');
      } else {
        throw err; // Re-throw if it's an access denied or other error
      }
    }

    // Connect without a database first to ensure the database exists
    connection = await mysql.createConnection({
      //host: process.env.DB_HOST || '127.0.0.1',
      //host: process.env.MYSQLHOST || 'thomas.proxy.rlwy.net',
      host: process.env.Host,
      //user: process.env.DB_USER || 'root',
      //user: process.env.MYSQLUSER || 'root',
      user: process.env.Database_user,
      //password: process.env.DB_PASSWORD || ''
      //password: process.env.MYSQLPASSWORD || 'oZCdRYYavXImuWFpjSQAJxsjYsUszgpO',
      password: process.env.Database_password,
      //port: process.env.MYSQLPORT || 59394,
      port: process.env.Port_number || 3306,

    });

    // Create database if not exists
    //await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'tcg_pos'}\``);
    //await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.MYSQLDATABASE || 'railway'}\``);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.Database_name}\``);
    await connection.end();


    // Now initialize schema using the pool
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');

      // Execute the schema statements one by one (splitting on semicolons)
      const conn = await pool.getConnection();
      try {
        const statements = schemaSql
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0);

        for (const sql of statements) {
          await conn.query(sql);
        }
        console.log('Database schema checked/initialized successfully.');
      } finally {
        conn.release();
      }
    }

    // Seed default admin user if no users exist
    const [users] = await pool.query('SELECT * FROM users LIMIT 1');
    if (users.length === 0) {
      const defaultAdminEmail = 'admin@tcg.com';
      const defaultAdminPass = 'admin123';
      const hash = await bcrypt.hash(defaultAdminPass, 10);
      await pool.query(
        'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
        ['Administrator', defaultAdminEmail, hash, 'admin']
      );
      console.log('----------------------------------------------------');
      console.log('Default Admin Created!');
      console.log(`Email: ${defaultAdminEmail}`);
      console.log(`Password: ${defaultAdminPass}`);
      console.log('----------------------------------------------------');
    }
  } catch (error) {
    console.error('Error during database initialization:', error.message || error);
  }
}

module.exports = {
  pool,
  initDB
};
