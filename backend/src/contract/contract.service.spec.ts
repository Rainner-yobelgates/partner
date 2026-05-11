import { Test, TestingModule } from '@nestjs/testing';
import { ContractModule } from './contract.module';
import { ContractService } from './contract.service';

describe('ContractService', () => {
  let service: ContractService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ContractModule],
    }).compile();

    service = module.get<ContractService>(ContractService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
