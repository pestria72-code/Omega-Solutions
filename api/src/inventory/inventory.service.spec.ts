import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from '../database.service.js';
import { MembershipsService } from '../memberships/memberships.service.js';
import { AuditService } from '../audit/audit.service.js';
import { InventoryService } from './inventory.service.js';

type Mock = ReturnType<typeof vi.fn>;

describe('InventoryService warehouse validation', () => {
  let service: InventoryService;
  let db: { query: Mock; transaction: Mock };
  let memberships: { getMembership: Mock };
  let audit: { log: Mock };

  beforeEach(async () => {
    db = { query: vi.fn(), transaction: vi.fn() };
    memberships = { getMembership: vi.fn().mockResolvedValue({ companyId: 'company-1', branchId: null, role: 'owner' }) };
    audit = { log: vi.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: DatabaseService, useValue: db },
        { provide: MembershipsService, useValue: memberships },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get(InventoryService);
  });

  const user = { userId: 'user-1' } as any;

  it('rejects a blank warehouse code before writing to the database', async () => {
    await expect(service.createWarehouse(user, { code: '   ', name: 'Main' })).rejects.toThrow(BadRequestException);
    expect(db.query).not.toHaveBeenCalled();
  });

  it('rejects a blank warehouse name before writing to the database', async () => {
    await expect(service.createWarehouse(user, { code: 'MAIN', name: '   ' })).rejects.toThrow(BadRequestException);
    expect(db.query).not.toHaveBeenCalled();
  });

  it('normalizes warehouse codes and checks duplicates within the active company', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 'warehouse-1' }], rowCount: 1 });

    await expect(service.createWarehouse(user, { code: ' main ', name: 'Main' })).rejects.toThrow(ConflictException);
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE company_id=$1 AND UPPER(code)=UPPER($2)'),
      ['company-1', 'MAIN'],
    );
    expect(db.query).toHaveBeenCalledTimes(1);
  });
});
