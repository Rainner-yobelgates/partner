import { Test, TestingModule } from '@nestjs/testing';
import { VehicleServiceModule } from './vehicle-service.module';
import { VehicleServiceController } from './vehicle-service.controller';

describe('VehicleServiceController', () => {
  let controller: VehicleServiceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [VehicleServiceModule],
    }).compile();

    controller = module.get<VehicleServiceController>(VehicleServiceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
