import { db } from '../db';
import { almacenes, users, productos, inventario } from '../db/schema';

async function seed() {
  console.log('🌱 Iniciando seed de la base de datos...');

  try {
    // 1. Crear almacenes
    console.log('📦 Creando almacenes...');
    const [almacenCentral, almacenNorte, almacenSur] = await db.insert(almacenes).values([
      {
        nombre: 'Almacén Central',
        ubicacion: 'Zona Centro - Calle Principal 123',
        descripcion: 'Almacén principal de distribución'
      },
      {
        nombre: 'Almacén Norte',
        ubicacion: 'Zona Norte - Av. Industrial 456',
        descripcion: 'Almacén de la zona norte de la ciudad'
      },
      {
        nombre: 'Almacén Sur',
        ubicacion: 'Zona Sur - Carretera Sur Km 10',
        descripcion: 'Almacén de la zona sur de la ciudad'
      }
    ]).returning();

    console.log('✅ Almacenes creados');

    // 2. Crear usuarios
    console.log('👥 Creando usuarios...');
    await db.insert(users).values([
      {
        nombre: 'Juan Pérez',
        email: 'juan.perez@empresa.com',
        almacenId: almacenCentral.id,
        rol: 'operador'
      },
      {
        nombre: 'María García',
        email: 'maria.garcia@empresa.com',
        almacenId: almacenNorte.id,
        rol: 'operador'
      },
      {
        nombre: 'Carlos López',
        email: 'carlos.lopez@empresa.com',
        almacenId: almacenSur.id,
        rol: 'operador'
      },
      {
        nombre: 'Ana Martínez',
        email: 'ana.martinez@empresa.com',
        almacenId: almacenCentral.id,
        rol: 'admin'
      }
    ]);

    console.log('✅ Usuarios creados');

    // 3. Crear catálogo de productos
    console.log('📋 Creando catálogo de productos...');
    const [prodNegro, prodColor, prodCooler, prodCaja] = await db.insert(productos).values([
      {
        codigo: 'CANEG',
        nombre: 'Canastillo Negro',
        tipo: 'canastillo_negro',
        descripcion: 'Canastillo plástico color negro estándar',
        unidadMedida: 'unidad',
        precioBase: '15.50',
        stockMinimo: 50,
        activo: 1
      },
      {
        codigo: 'CACOL',
        nombre: 'Canastillo Color',
        tipo: 'canastillo_color',
        descripcion: 'Canastillo plástico de colores variados',
        unidadMedida: 'unidad',
        precioBase: '18.00',
        stockMinimo: 30,
        activo: 1
      },
      {
        codigo: 'COOL',
        nombre: 'Cooler',
        tipo: 'cooler',
        descripcion: 'Cooler térmico para transporte de productos refrigerados',
        unidadMedida: 'unidad',
        precioBase: '45.00',
        stockMinimo: 20,
        activo: 1
      },
      {
        codigo: 'CAJA',
        nombre: 'Caja',
        tipo: 'caja',
        descripcion: 'Caja de cartón reforzado',
        unidadMedida: 'unidad',
        precioBase: '5.00',
        stockMinimo: 100,
        activo: 1
      }
    ]).returning();

    console.log('✅ 4 productos creados en el catálogo');

    // 4. Crear inventario inicial para cada almacén
    console.log('📊 Creando inventario inicial...');

    // Almacén Central
    await db.insert(inventario).values([
      { productoId: prodNegro.id, almacenId: almacenCentral.id, cantidad: 150 },
      { productoId: prodColor.id, almacenId: almacenCentral.id, cantidad: 200 },
      { productoId: prodCooler.id, almacenId: almacenCentral.id, cantidad: 80 },
      { productoId: prodCaja.id, almacenId: almacenCentral.id, cantidad: 500 }
    ]);

    // Almacén Norte
    await db.insert(inventario).values([
      { productoId: prodNegro.id, almacenId: almacenNorte.id, cantidad: 100 },
      { productoId: prodColor.id, almacenId: almacenNorte.id, cantidad: 120 },
      { productoId: prodCooler.id, almacenId: almacenNorte.id, cantidad: 50 },
      { productoId: prodCaja.id, almacenId: almacenNorte.id, cantidad: 300 }
    ]);

    // Almacén Sur
    await db.insert(inventario).values([
      { productoId: prodNegro.id, almacenId: almacenSur.id, cantidad: 80 },
      { productoId: prodColor.id, almacenId: almacenSur.id, cantidad: 90 },
      { productoId: prodCooler.id, almacenId: almacenSur.id, cantidad: 40 },
      { productoId: prodCaja.id, almacenId: almacenSur.id, cantidad: 250 }
    ]);

    console.log('✅ Inventario inicial creado');
    console.log('   Almacén Central: 150 negros, 200 color, 80 coolers, 500 cajas');
    console.log('   Almacén Norte: 100 negros, 120 color, 50 coolers, 300 cajas');
    console.log('   Almacén Sur: 80 negros, 90 color, 40 coolers, 250 cajas');

    console.log('\n🎉 Seed completado exitosamente!');
    console.log('\n📊 Resumen:');
    console.log('   - 3 almacenes');
    console.log('   - 4 usuarios');
    console.log('   - 4 tipos de productos en el catálogo');
    console.log('   - Inventario inicial en 3 almacenes');
    console.log('   - Total: 930 unidades distribuidas');
    console.log('\n💡 Puedes empezar a usar el sistema con:');
    console.log('   npm run dev');

  } catch (error) {
    console.error('❌ Error durante el seed:', error);
    process.exit(1);
  }
}

seed();
