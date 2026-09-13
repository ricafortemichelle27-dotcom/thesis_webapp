import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
};

const db = await mysql.createConnection(dbConfig);
console.log('DB_NAME=' + process.env.DB_NAME);

const [tables] = await db.query(
  'SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME'
);
console.log('TABLES=' + JSON.stringify(tables.map((t) => t.TABLE_NAME)));

const target = ['users', 'events', 'attendance', 'certificates'];
for (const table of target) {
  const [exists] = await db.query(
    'SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
    [table]
  );

  if (exists[0].c) {
    console.log('TABLE=' + table);
    const [cols] = await db.query(
      'SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION',
      [table]
    );
    console.log(JSON.stringify(cols, null, 2));

    const [show] = await db.query('SHOW CREATE TABLE ' + table);
    console.log('CREATE=' + show[0]['Create Table']);
  }
}

const [fks] = await db.query(
  'SELECT TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL ORDER BY TABLE_NAME, COLUMN_NAME'
);
console.log('FKS=' + JSON.stringify(fks));

const [statusVals] = await db.query('SELECT DISTINCT status FROM users WHERE status IS NOT NULL ORDER BY status');
console.log('STATUS_VALUES=' + JSON.stringify(statusVals));

const [usersIdx] = await db.query('SHOW INDEX FROM users');
console.log('USERS_INDEXES=' + JSON.stringify(usersIdx));

await db.end();
