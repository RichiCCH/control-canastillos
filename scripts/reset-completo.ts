import { db } from '../db';
import { sql } from 'drizzle-orm';

async function resetCompleto() {
  console.log('🗑️  Eliminando todas las tablas y enums...');

  try {
    // Eliminar tablas en orden inverso de dependencias
    await db.execute(sql`DROP TABLE IF EXISTS movimientos_detalle CASCADE`);
    console.log('✅ Tabla movimientos_detalle eliminada');

    await db.execute(sql`DROP TABLE IF EXISTS movimientos CASCADE`);
    console.log('✅ Tabla movimientos eliminada');

    await db.execute(sql`DROP TABLE IF EXISTS inventario CASCADE`);
    console.log('✅ Tabla inventario eliminada');

    await db.execute(sql`DROP TABLE IF EXISTS productos CASCADE`);
    console.log('✅ Tabla productos eliminada');

    await db.execute(sql`DROP TABLE IF EXISTS canastillos CASCADE`);
    console.log('✅ Tabla canastillos eliminada');

    await db.execute(sql`DROP TABLE IF EXISTS users CASCADE`);
    console.log('✅ Tabla users eliminada');

    await db.execute(sql`DROP TABLE IF EXISTS almacenes CASCADE`);
    console.log('✅ Tabla almacenes eliminada');

    // Eliminar enums
    await db.execute(sql`DROP TYPE IF EXISTS estado_canastillo CASCADE`);
    await db.execute(sql`DROP TYPE IF EXISTS tipo_canastillo CASCADE`);
    await db.execute(sql`DROP TYPE IF EXISTS tipo_producto CASCADE`);
    await db.execute(sql`DROP TYPE IF EXISTS estado_movimiento CASCADE`);
    console.log('✅ Enums eliminados');

    console.log('\n🎉 Reset completo exitoso!');
    console.log('Ahora ejecuta:');
    console.log('  npm run db:push');
    console.log('  npm run db:seed');

  } catch (error) {
    console.error('❌ Error durante el reset:', error);
    process.exit(1);
  }
}

resetCompleto();
