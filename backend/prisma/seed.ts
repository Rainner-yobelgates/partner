import * as bcrypt from 'bcrypt';
import { DriverType, OrderStatus, Permission, PrismaClient, ServiceType, Status, VehicleType } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({adapter});

async function main() {
  console.log('🌱 Seeding database...');

  // ROLES
  const superAdminRole = await prisma.role.upsert({
    where: { name: 'Super Admin' },
    update: {},
    create: { name: 'Super Admin', description: 'Full access', status: Status.ACTIVE },
  });

  const adminRole = await prisma.role.upsert({
    where: { name: 'Admin' },
    update: {},
    create: { name: 'Admin', description: 'Administrative access', status: Status.ACTIVE },
  });

  const operatorRole = await prisma.role.upsert({
    where: { name: 'Operator' },
    update: {},
    create: { name: 'Operator', description: 'Operational access', status: Status.ACTIVE },
  });

  console.log('✔ Roles seeded');

  // PERMISSIONS
  const resources = ['users', 'vehicles', 'drivers', 'orders', 'shuttles', 'trip_sheets'];
  const actions = ['create', 'read', 'update', 'delete'];

  const permissions:Permission[] = [];
  for (const resource of resources) {
    for (const action of actions) {
      const perm = await prisma.permission.upsert({
        where: { resource_action: { resource, action } },
        update: {},
        create: { resource, action, description: `Can ${action} ${resource}` },
      });
      permissions.push(perm);
    }
  }

  console.log('✔ Permissions seeded');

  // ROLE PERMISSIONS (Super Admin gets all)
  for (const perm of permissions) {
    await prisma.rolePermission.create({
      data: { role_id: superAdminRole.id, permission_id: perm.id },
    }).catch(() => {});
  }

  console.log('✔ Role permissions seeded');

  // USERS
  const hash = (p: string) => bcrypt.hashSync(p, 10);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@example.com' },
    update: {},
    create: {
      email: 'superadmin@example.com',
      username: 'superadmin',
      password: hash('SuperAdmin123!'),
      role_id: superAdminRole.id,
      status: Status.ACTIVE,
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      username: 'admin',
      password: hash('Admin123!'),
      role_id: adminRole.id,
      status: Status.ACTIVE,
    },
  });

  await prisma.user.upsert({
    where: { email: 'operator@example.com' },
    update: {},
    create: {
      email: 'operator@example.com',
      username: 'operator',
      password: hash('Operator123!'),
      role_id: operatorRole.id,
      status: Status.ACTIVE,
    },
  });

  console.log('✔ Users seeded');

  // VEHICLES
  const vehicle1 = await prisma.vehicle.create({
    data: {
      plate_number: 'B 1234 ABC',
      hull_number: 'HN-001',
      vehicle_type: VehicleType.HIACE,
      brand: 'Toyota',
      model: 'HiAce Commuter',
      status: Status.ACTIVE,
      created_by: admin.id,
    },
  });

  const vehicle2 = await prisma.vehicle.create({
    data: {
      plate_number: 'B 5678 DEF',
      hull_number: 'HN-002',
      vehicle_type: VehicleType.MEDIUM_BUS,
      brand: 'Isuzu',
      model: 'Elf',
      status: Status.ACTIVE,
      created_by: admin.id,
    },
  });

  console.log('✔ Vehicles seeded');

  // DRIVERS
  const driver1 = await prisma.driver.create({
    data: {
      name: 'Budi Santoso',
      phone_number: '081234567890',
      emergency_contact: '081234567891',
      address: 'Jl. Merdeka No. 1, Jakarta',
      type: DriverType.MAIN,
      vehicle_id: vehicle1.id,
      status: Status.ACTIVE,
      created_by: admin.id,
    },
  });

  const driver2 = await prisma.driver.create({
    data: {
      name: 'Rina Susanti',
      phone_number: '081234567892',
      emergency_contact: '081234567893',
      address: 'Jl. Sudirman No. 5, Jakarta',
      type: DriverType.ASSISTANT,
      vehicle_id: vehicle1.id,
      status: Status.ACTIVE,
      created_by: admin.id,
    },
  });

  console.log('✔ Drivers seeded');

  // VEHICLE SERVICE
  await prisma.vehicleService.create({
    data: {
      vehicle_id: vehicle1.id,
      service_date: new Date('2025-03-01'),
      service_type: ServiceType.OIL_CHANGE,
      cost: 350000,
      description: 'Ganti oli mesin',
      status: Status.ACTIVE,
      created_by: admin.id,
    },
  });

  console.log('✔ Vehicle services seeded');

  // ROUTE
  const route = await prisma.route.create({
    data: {
      origin: 'Jakarta Pusat',
      destination: 'Bandung',
      distance: 150.5,
      estimated_time: 180,
      status: Status.ACTIVE,
      created_by: admin.id,
    },
  });

  console.log('✔ Routes seeded');

  // CONTRACT
  const contract = await prisma.contract.create({
    data: {
      contract_number: 'CTR-2025-001',
      contact_person: 'Bapak Ahmad Fauzi',
      phone_number: '021-5551234',
      email: 'ahmad@ptabc.co.id',
      address: 'Jl. Sudirman Kav. 52, Jakarta',
      start_date: new Date('2025-01-01'),
      end_date: new Date('2025-12-31'),
      status: Status.ACTIVE,
      created_by: admin.id,
    },
  });

  // CONTRACT INVOICE
  await prisma.contractInvoice.create({
    data: {
      contract_id: contract.id,
      period_month: 4,
      period_year: 2025,
      gross_amount: 50000000,
      tax_amount: 5500000,
      net_amount: 55500000,
      status: 'UNPAID',
      created_by: admin.id,
    },
  });

  console.log('✔ Contracts & invoices seeded');

  // SHUTTLE
  await prisma.shuttle.create({
    data: {
      contract_id: contract.id,
      vehicle_id: vehicle1.id,
      route_id: route.id,
      scheduled_date: new Date('2025-04-15'),
      crew_incentive: 150000,
      fuel: 200000,
      toll_fee: 50000,
      lainnya: 0,
      status: Status.ACTIVE,
      created_by: admin.id,
    },
  });

  console.log('✔ Shuttles seeded');

  // ORDER
  const order = await prisma.order.create({
    data: {
      order_number: 'ORD-2025-0001',
      customer_name: 'PT. Sejahtera Abadi',
      customer_phone: '021-7771234',
      customer_email: 'booking@sejahtera.co.id',
      order_date: new Date('2025-04-01'),
      usage_date: new Date('2025-04-20'),
      standby_time: new Date('2025-04-20T07:00:00'),
      pickup_location: 'Gedung Wisma 46, Jakarta Pusat',
      dropoff_location: 'Bandara Soekarno-Hatta',
      total_vehicles: 1,
      total_amount: 1500000,
      status: OrderStatus.CONFIRMED,
      notes: 'Siapkan air mineral',
      created_by: admin.id,
    },
  });

  // ORDER VEHICLE
  const orderVehicle = await prisma.orderVehicle.create({
    data: {
      order_id: order.id,
      vehicle_id: vehicle1.id,
      driver_id: driver1.id,
      assistant_driver_id: driver2.id,
      status: Status.ACTIVE,
      created_by: admin.id,
    },
  });

  console.log('✔ Orders seeded');

  // TRIP SHEET
  await prisma.tripSheet.create({
    data: {
      order_vehicle_id: orderVehicle.id,
      driver_id: driver1.id,
      assistant_id: driver2.id,
      destination: 'Bandara Soekarno-Hatta',
      fuel_cost: 150000,
      toll_fee: 45000,
      parking_fee: 20000,
      expense_notes: 'BBM Pertamax + tol lingkar luar',
      status: Status.ACTIVE,
      created_by: admin.id,
    },
  });

  console.log('✔ Trip sheets seeded');

  console.log('\n✅ Seeding completed!');
  console.log('\n👤 Login credentials:');
  console.log('   superadmin@example.com / SuperAdmin123!');
  console.log('   admin@example.com      / Admin123!');
  console.log('   operator@example.com   / Operator123!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });