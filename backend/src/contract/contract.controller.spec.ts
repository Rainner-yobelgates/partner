import { Test, TestingModule } from '@nestjs/testing';
import { ContractModule } from './contract.module';
import { ContractController } from './contract.controller';

describe('ContractController', () => {
  let controller: ContractController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ContractModule],
    }).compile();

    controller = module.get<ContractController>(ContractController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
