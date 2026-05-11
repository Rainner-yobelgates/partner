import { Test, TestingModule } from '@nestjs/testing';
import { RouteModule } from './route.module';
import { RouteService } from './route.service';

describe('RouteService', () => {
  let service: RouteService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [RouteModule],
    }).compile();

    service = module.get<RouteService>(RouteService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
