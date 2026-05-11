import { Test, TestingModule } from '@nestjs/testing';
import { ShuttleModule } from './shuttle.module';
import { ShuttleService } from './shuttle.service';

describe('ShuttleService', () => {
  let service: ShuttleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ShuttleModule],
    }).compile();

    service = module.get<ShuttleService>(ShuttleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
