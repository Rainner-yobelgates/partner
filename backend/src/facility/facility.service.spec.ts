import { Test, TestingModule } from '@nestjs/testing';
import { FacilityModule } from './facility.module';
import { FacilityService } from './facility.service';

describe('FacilityService', () => {
  let service: FacilityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [FacilityModule],
    }).compile();

    service = module.get<FacilityService>(FacilityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
