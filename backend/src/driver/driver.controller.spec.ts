import { Test, TestingModule } from '@nestjs/testing';
import { DriverModule } from './driver.module';
import { DriverController } from './driver.controller';

describe('DriverController', () => {
  let controller: DriverController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [DriverModule],
    }).compile();

    controller = module.get<DriverController>(DriverController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
