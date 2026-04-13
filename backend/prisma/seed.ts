import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { DriverType, OrderStatus, Permission, PrismaClient, ServiceType, Status, VehicleType } from '../generated/prisma/client';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

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

  console.log('Roles seeded');

  const recapResources = ['client-recap', 'order-recap'];
  const resources = ['user', 'role', 'vehicle', 'vehicle-service', 'driver', 'route', 'client', 'contract', 'order', 'shuttle', 'trip_sheet', 'facility'];
  const actions = ['create', 'read', 'update', 'delete', 'detail'];

  const permissions: Permission[] = [];
  for (const resource of resources) {
    for (const action of actions) {
      const permission = await prisma.permission.upsert({
        where: { resource_action: { resource, action } },
        update: {},
        create: { resource, action, description: `Can ${action} ${resource}` },
      });
      permissions.push(permission);
    }
  }
  for (const resource of recapResources) {
    const action = 'read';

    const permission = await prisma.permission.upsert({
      where: { resource_action: { resource, action } },
      update: {},
      create: {
        resource,
        action,
        description: `Can ${action} ${resource}`,
      },
    });

    permissions.push(permission);
  }

  console.log('Permissions seeded');

  for (const permission of permissions) {
    await prisma.rolePermission.create({
      data: { role_id: superAdminRole.id, permission_id: permission.id },
    }).catch(() => {});
  }

  console.log('Role permissions seeded');

  const hash = (plain: string) => bcrypt.hashSync(plain, 10);

  await prisma.user.upsert({
    where: { email: 'superadmin@example.com' },
    update: {},
    create: {
      email: 'superadmin@example.com',
      username: 'superadmin',
      password: hash('superadmin123'),
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
      password: hash('admin123'),
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
      password: hash('operator123'),
      role_id: operatorRole.id,
      status: Status.ACTIVE,
    },
  });

  console.log('Users seeded');

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

  await prisma.vehicle.create({
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

  console.log('Vehicles seeded');

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

  console.log('Drivers seeded');

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

  console.log('Vehicle services seeded');

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

  console.log('Routes seeded');

  const client = await prisma.client.upsert({
    where: { name: 'PT. ABC Indonesia' },
    update: {},
    create: {
      name: 'PT. ABC Indonesia',
      code: 'ABC',
      contact_person: 'Ibu Lestari',
      phone_number: '021-1234567',
      email: 'procurement@ptabc.co.id',
      address: 'Jl. Sudirman Kav. 52, Jakarta',
      status: Status.ACTIVE,
      created_by: admin.id,
    },
  });

  console.log('Clients seeded');

  const contract = await prisma.contract.create({
    data: {
      contract_number: 'CTR-2025-001',
      client_id: client.id,
      contract_month: 4,
      contract_year: 2025,
      contact_person: 'Bapak Ahmad Fauzi',
      phone_number: '021-5551234',
      email: 'ahmad@ptabc.co.id',
      contract_value: 3500000,
      address: 'Jl. Sudirman Kav. 52, Jakarta',
      status: Status.ACTIVE,
      created_by: admin.id,
    },
  });

  console.log('Contracts seeded');

  await prisma.shuttle.create({
    data: {
      client_id: client.id,
      vehicle_id: vehicle1.id,
      route_id: route.id,
      scheduled_date: new Date('2025-04-15'),
      crew_incentive: 150000,
      fuel: 200000,
      toll_fee: 50000,
      others: 0,
      status: Status.ACTIVE,
      created_by: admin.id,
    },
  });

  console.log('Shuttles seeded');

  const order = await prisma.order.create({
    data: {
      order_number: 'ORD-2025-0001',
      customer_name: 'PT. Sejahtera Abadi',
      customer_phone: '021-7771234',
      customer_email: 'booking@sejahtera.co.id',
      order_date: new Date('2025-04-01'),
      usage_date: new Date('2025-04-20'),
      start_date: new Date('2025-04-20'),
      finish_date: new Date('2025-04-20'),
      standby_time: new Date('2025-04-20T07:00:00'),
      pickup_location: 'Gedung Wisma 46, Jakarta Pusat',
      dropoff_location: 'Bandara Soekarno-Hatta',
      destination: 'Bandara Soekarno-Hatta',
      total_vehicles: 1,
      total_amount: 1500000,
      status: OrderStatus.CONFIRMED,
      notes: 'Siapkan air mineral',
      created_by: admin.id,
    },
  });

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

  console.log('Orders seeded');

  await prisma.tripSheet.create({
    data: {
      order_vehicle_id: orderVehicle.id,
      driver_id: driver1.id,
      assistant_id: driver2.id,
      destination: 'Bandara Soekarno-Hatta',
      fuel_cost: 150000,
      toll_fee: 45000,
      parking_fee: 20000,
      others: 0,
      expense_notes: 'BBM Pertamax + tol lingkar luar',
      status: Status.ACTIVE,
      created_by: admin.id,
    },
  });

  console.log('Trip sheets seeded');
  console.log('Seeding completed');
}

main()
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

