import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_kvJW2NRgKwl6@ep-solitary-cherry-add629aj-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function checkDB() {
  try {
    console.log('✓ Conectado a la base de datos\n');
    
    // Verificar usuarios
    const users = await sql`SELECT id, nombre, email, password, rol, almacen_id FROM users ORDER BY id LIMIT 5`;
    console.log('--- Usuarios disponibles para login ---');
    users.forEach(u => {
      console.log(`\nNombre/Email: ${u.nombre}`);
      console.log(`Password: ${u.password}`);
      console.log(`Rol: ${u.rol}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkDB();
