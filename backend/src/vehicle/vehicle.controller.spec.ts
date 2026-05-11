import { Test, TestingModule } from '@nestjs/testing';
import { VehicleModule } from './vehicle.module';
import { VehicleController } from './vehicle.controller';

describe('VehicleController', () => {
  let controller: VehicleController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [VehicleModule],
    }).compile();

    controller = module.get<VehicleController>(VehicleController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
