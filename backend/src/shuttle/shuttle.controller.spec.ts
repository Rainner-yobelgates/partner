import { Test, TestingModule } from '@nestjs/testing';
import { ShuttleModule } from './shuttle.module';
import { ShuttleController } from './shuttle.controller';

describe('ShuttleController', () => {
  let controller: ShuttleController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ShuttleModule],
    }).compile();

    controller = module.get<ShuttleController>(ShuttleController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
