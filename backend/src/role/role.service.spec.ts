import { Test, TestingModule } from '@nestjs/testing';
import { RoleModule } from './role.module';
import { RolesService } from './role.service';

describe('RoleService', () => {
  let service: RolesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [RoleModule],
    }).compile();

    service = module.get<RolesService>(RolesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
