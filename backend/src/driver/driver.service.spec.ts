import { Test, TestingModule } from '@nestjs/testing';
import { DriverModule } from './driver.module';
import { DriverService } from './driver.service';

describe('DriverService', () => {
  let service: DriverService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [DriverModule],
    }).compile();

    service = module.get<DriverService>(DriverService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
