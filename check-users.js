const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');

const connectionString = process.env.DATABASE_URL;
const client = postgres(connectionString);
const db = drizzle(client);

async function checkUsers() {
  const result = await client`SELECT id, nombre, email, rol, activo, almacen_id FROM users LIMIT 10`;
  console.log('Usuarios en la base de datos:');
  console.table(result);
  await client.end();
}

checkUsers().catch(console.error);
