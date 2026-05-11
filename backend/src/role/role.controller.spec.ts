import { Test, TestingModule } from '@nestjs/testing';
import { RoleModule } from './role.module';
import { RolesController } from './role.controller';

describe('RolesController', () => {
  let controller: RolesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [RoleModule],
    }).compile();

    controller = module.get<RolesController>(RolesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
