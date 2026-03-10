import { Test, TestingModule } from '@nestjs/testing';
import { VehicleServiceController } from './vehicle_service.controller';

describe('VehicleServiceController', () => {
  let controller: VehicleServiceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VehicleServiceController],
    }).compile();

    controller = module.get<VehicleServiceController>(VehicleServiceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
