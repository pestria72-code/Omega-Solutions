import { describe, expect, it, vi } from 'vitest';
import { PayrollService } from './payroll.service.js';

describe('PayrollService tenant and workflow guards',()=>{
 it('rejects malformed periods before reading employees',async()=>{
  const db={query:vi.fn(),transaction:vi.fn()} as never;
  const memberships={getMembership:vi.fn().mockResolvedValue({companyId:'company-a'})} as never;
  const service=new PayrollService(db,memberships);
  await expect(service.createRun({userId:'user-a',email:'a@b.test',fullName:'A',companyId:null,branchId:null,role:'owner',permissions:[]} ,{periodStart:'not-a-date',periodEnd:'2026-10-31'})).rejects.toThrow('valid periodStart');
  expect((db as {query:ReturnType<typeof vi.fn>}).query).not.toHaveBeenCalled();
 });
 it('rejects reversed periods before reading employees',async()=>{
  const db={query:vi.fn(),transaction:vi.fn()} as never;
  const memberships={getMembership:vi.fn().mockResolvedValue({companyId:'company-a'})} as never;
  const service=new PayrollService(db,memberships);
  await expect(service.createRun({userId:'user-a',email:'a@b.test',fullName:'A',companyId:null,branchId:null,role:'owner',permissions:[]} ,{periodStart:'2026-11-01',periodEnd:'2026-10-01'})).rejects.toThrow('end on or after');
 });
});
