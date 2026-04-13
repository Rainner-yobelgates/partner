-- Align money columns with DECIMAL(15,2) (facility, vehicle_service, contract already use 15,2)

ALTER TABLE "Shuttle" ALTER COLUMN "crew_incentive" TYPE DECIMAL(15,2);
ALTER TABLE "Shuttle" ALTER COLUMN "fuel" TYPE DECIMAL(15,2);
ALTER TABLE "Shuttle" ALTER COLUMN "toll_fee" TYPE DECIMAL(15,2);
ALTER TABLE "Shuttle" ALTER COLUMN "others" TYPE DECIMAL(15,2);

ALTER TABLE "Order" ALTER COLUMN "total_amount" TYPE DECIMAL(15,2);

ALTER TABLE "TripSheet" ALTER COLUMN "fuel_cost" TYPE DECIMAL(15,2);
ALTER TABLE "TripSheet" ALTER COLUMN "toll_fee" TYPE DECIMAL(15,2);
ALTER TABLE "TripSheet" ALTER COLUMN "parking_fee" TYPE DECIMAL(15,2);
ALTER TABLE "TripSheet" ALTER COLUMN "stay_cost" TYPE DECIMAL(15,2);
