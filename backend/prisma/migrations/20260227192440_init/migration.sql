-- CreateEnum
CREATE TYPE "Status" AS ENUM ('ACTIVE', 'INACTIVE', 'DELETED');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('EVALIA', 'MEDIUM_BUS', 'HIACE');

-- CreateEnum
CREATE TYPE "DriverType" AS ENUM ('ASSISTANT', 'CADANGAN', 'UTAMA');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('MAINTENANCE', 'REPAIR', 'OIL_CHANGE', 'INSPECTION');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" BIGSERIAL NOT NULL,
    "users_uuid" TEXT NOT NULL,
    "role_id" BIGINT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "status" "Status",
    "created_by" BIGINT,
    "updated_by" BIGINT,
    "deleted_by" BIGINT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" BIGSERIAL NOT NULL,
    "role_uuid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "Status",
    "created_by" BIGINT,
    "updated_by" BIGINT,
    "deleted_by" BIGINT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" BIGSERIAL NOT NULL,
    "permissions_uuid" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "created_by" BIGINT,
    "updated_by" BIGINT,
    "deleted_by" BIGINT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" BIGSERIAL NOT NULL,
    "role_permissions_uuid" TEXT NOT NULL,
    "role_id" BIGINT NOT NULL,
    "permission_id" BIGINT NOT NULL,
    "created_by" BIGINT,
    "updated_by" BIGINT,
    "deleted_by" BIGINT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" BIGSERIAL NOT NULL,
    "vehicles_uuid" TEXT NOT NULL,
    "plate_number" TEXT,
    "hull_number" TEXT,
    "vehicle_type" "VehicleType",
    "brand" TEXT,
    "model" TEXT,
    "status" "Status",
    "created_by" BIGINT,
    "updated_by" BIGINT,
    "deleted_by" BIGINT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Driver" (
    "id" BIGSERIAL NOT NULL,
    "drivers_uuid" TEXT NOT NULL,
    "vehicle_id" BIGINT,
    "name" TEXT,
    "phone_number" TEXT,
    "emergency_contact" TEXT,
    "address" TEXT,
    "type" "DriverType",
    "status" "Status",
    "created_by" BIGINT,
    "updated_by" BIGINT,
    "deleted_by" BIGINT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleService" (
    "id" BIGSERIAL NOT NULL,
    "vehicle_services_uuid" TEXT NOT NULL,
    "vehicle_id" BIGINT,
    "service_date" TIMESTAMP(3),
    "service_type" "ServiceType",
    "cost" DECIMAL(65,30),
    "description" TEXT,
    "status" "Status",
    "created_by" BIGINT,
    "updated_by" BIGINT,
    "deleted_by" BIGINT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Route" (
    "id" BIGSERIAL NOT NULL,
    "routes_uuid" TEXT NOT NULL,
    "origin" TEXT,
    "destination" TEXT,
    "distance" DECIMAL(65,30),
    "estimated_time" INTEGER,
    "status" "Status",
    "created_by" BIGINT,
    "updated_by" BIGINT,
    "deleted_by" BIGINT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Route_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" BIGSERIAL NOT NULL,
    "contracts_uuid" TEXT NOT NULL,
    "contract_number" TEXT,
    "contact_person" TEXT,
    "phone_number" TEXT,
    "email" TEXT,
    "address" TEXT,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "status" "Status",
    "created_by" BIGINT,
    "updated_by" BIGINT,
    "deleted_by" BIGINT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractInvoice" (
    "id" BIGSERIAL NOT NULL,
    "contract_invoices_uuid" TEXT NOT NULL,
    "contract_id" BIGINT NOT NULL,
    "period_month" INTEGER,
    "period_year" INTEGER,
    "gross_amount" DECIMAL(65,30),
    "tax_amount" DECIMAL(65,30),
    "net_amount" DECIMAL(65,30),
    "status" TEXT,
    "created_by" BIGINT,
    "updated_by" BIGINT,
    "deleted_by" BIGINT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shuttle" (
    "id" BIGSERIAL NOT NULL,
    "shuttles_uuid" TEXT NOT NULL,
    "contract_id" BIGINT,
    "vehicle_id" BIGINT,
    "route_id" BIGINT,
    "crew_incentive" DECIMAL(65,30),
    "scheduled_date" TIMESTAMP(3),
    "fuel" DECIMAL(65,30),
    "toll_fee" DECIMAL(65,30),
    "lainnya" DECIMAL(65,30),
    "status" "Status",
    "created_by" BIGINT,
    "updated_by" BIGINT,
    "deleted_by" BIGINT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shuttle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" BIGSERIAL NOT NULL,
    "orders_uuid" TEXT NOT NULL,
    "order_number" TEXT NOT NULL,
    "customer_name" TEXT,
    "customer_phone" TEXT,
    "customer_email" TEXT,
    "order_date" TIMESTAMP(3),
    "usage_date" TIMESTAMP(3),
    "standby_time" TIMESTAMP(3),
    "pickup_location" TEXT,
    "dropoff_location" TEXT,
    "total_vehicles" INTEGER,
    "total_amount" DECIMAL(65,30),
    "status" "OrderStatus",
    "notes" TEXT,
    "created_by" BIGINT,
    "updated_by" BIGINT,
    "deleted_by" BIGINT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderVehicle" (
    "id" BIGSERIAL NOT NULL,
    "order_vehicles_uuid" TEXT NOT NULL,
    "order_id" BIGINT,
    "vehicle_id" BIGINT,
    "driver_id" BIGINT,
    "assistant_driver_id" BIGINT,
    "status" "Status",
    "created_by" BIGINT,
    "updated_by" BIGINT,
    "deleted_by" BIGINT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderVehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripSheet" (
    "id" BIGSERIAL NOT NULL,
    "trip_sheets_uuid" TEXT NOT NULL,
    "order_vehicle_id" BIGINT,
    "driver_id" BIGINT,
    "assistant_id" BIGINT,
    "destination" TEXT,
    "fuel_cost" DECIMAL(65,30),
    "toll_fee" DECIMAL(65,30),
    "parking_fee" DECIMAL(65,30),
    "expense_notes" TEXT,
    "attachment" TEXT,
    "status" "Status",
    "created_by" BIGINT,
    "updated_by" BIGINT,
    "deleted_by" BIGINT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripSheet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_users_uuid_key" ON "User"("users_uuid");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Role_role_uuid_key" ON "Role"("role_uuid");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_permissions_uuid_key" ON "Permission"("permissions_uuid");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_resource_action_key" ON "Permission"("resource", "action");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_role_permissions_uuid_key" ON "RolePermission"("role_permissions_uuid");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_vehicles_uuid_key" ON "Vehicle"("vehicles_uuid");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_drivers_uuid_key" ON "Driver"("drivers_uuid");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleService_vehicle_services_uuid_key" ON "VehicleService"("vehicle_services_uuid");

-- CreateIndex
CREATE UNIQUE INDEX "Route_routes_uuid_key" ON "Route"("routes_uuid");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_contracts_uuid_key" ON "Contract"("contracts_uuid");

-- CreateIndex
CREATE UNIQUE INDEX "ContractInvoice_contract_invoices_uuid_key" ON "ContractInvoice"("contract_invoices_uuid");

-- CreateIndex
CREATE UNIQUE INDEX "Shuttle_shuttles_uuid_key" ON "Shuttle"("shuttles_uuid");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orders_uuid_key" ON "Order"("orders_uuid");

-- CreateIndex
CREATE UNIQUE INDEX "Order_order_number_key" ON "Order"("order_number");

-- CreateIndex
CREATE UNIQUE INDEX "OrderVehicle_order_vehicles_uuid_key" ON "OrderVehicle"("order_vehicles_uuid");

-- CreateIndex
CREATE UNIQUE INDEX "TripSheet_trip_sheets_uuid_key" ON "TripSheet"("trip_sheets_uuid");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Permission" ADD CONSTRAINT "Permission_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Permission" ADD CONSTRAINT "Permission_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Permission" ADD CONSTRAINT "Permission_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "Permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Driver" ADD CONSTRAINT "Driver_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Driver" ADD CONSTRAINT "Driver_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Driver" ADD CONSTRAINT "Driver_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Driver" ADD CONSTRAINT "Driver_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleService" ADD CONSTRAINT "VehicleService_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleService" ADD CONSTRAINT "VehicleService_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleService" ADD CONSTRAINT "VehicleService_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleService" ADD CONSTRAINT "VehicleService_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Route" ADD CONSTRAINT "Route_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Route" ADD CONSTRAINT "Route_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Route" ADD CONSTRAINT "Route_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractInvoice" ADD CONSTRAINT "ContractInvoice_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractInvoice" ADD CONSTRAINT "ContractInvoice_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractInvoice" ADD CONSTRAINT "ContractInvoice_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractInvoice" ADD CONSTRAINT "ContractInvoice_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shuttle" ADD CONSTRAINT "Shuttle_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shuttle" ADD CONSTRAINT "Shuttle_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shuttle" ADD CONSTRAINT "Shuttle_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "Route"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shuttle" ADD CONSTRAINT "Shuttle_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shuttle" ADD CONSTRAINT "Shuttle_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shuttle" ADD CONSTRAINT "Shuttle_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderVehicle" ADD CONSTRAINT "OrderVehicle_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderVehicle" ADD CONSTRAINT "OrderVehicle_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderVehicle" ADD CONSTRAINT "OrderVehicle_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderVehicle" ADD CONSTRAINT "OrderVehicle_assistant_driver_id_fkey" FOREIGN KEY ("assistant_driver_id") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderVehicle" ADD CONSTRAINT "OrderVehicle_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderVehicle" ADD CONSTRAINT "OrderVehicle_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderVehicle" ADD CONSTRAINT "OrderVehicle_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripSheet" ADD CONSTRAINT "TripSheet_order_vehicle_id_fkey" FOREIGN KEY ("order_vehicle_id") REFERENCES "OrderVehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripSheet" ADD CONSTRAINT "TripSheet_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripSheet" ADD CONSTRAINT "TripSheet_assistant_id_fkey" FOREIGN KEY ("assistant_id") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripSheet" ADD CONSTRAINT "TripSheet_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripSheet" ADD CONSTRAINT "TripSheet_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripSheet" ADD CONSTRAINT "TripSheet_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
