import { Test, TestingModule } from '@nestjs/testing';
import { VehicleModule } from './vehicle.module';
import { VehicleService } from './vehicle.service';

describe('VehicleService', () => {
  let service: VehicleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [VehicleModule],
    }).compile();

    service = module.get<VehicleService>(VehicleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
