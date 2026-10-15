import { BadRequestException } from '@nestjs/common';
import { ManufacturingService } from './manufacturing.service.js';
import { DatabaseService } from '../database.service.js';
import { MembershipsService } from '../memberships/memberships.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.js';
type Mock=ReturnType<typeof vi.fn>;

describe('ManufacturingService',()=>{
 const user:AuthenticatedUser={userId:'user-1',email:'owner@example.test',fullName:'Owner',companyId:'company-active',branchId:null,role:'owner',permissions:['manufacturing:read','manufacturing:write']};
 let db:{query:Mock;transaction:Mock};let memberships:{getMembership:Mock;getMembershipForCompany:Mock};let audit:{log:Mock};let service:ManufacturingService;
 beforeEach(()=>{
  db={query:vi.fn(),transaction:vi.fn()};
  const membership={companyId:'company-active',branchId:null,role:'owner'};
  memberships={getMembership:vi.fn().mockResolvedValue({companyId:'company-default'}),getMembershipForCompany:vi.fn().mockResolvedValue(membership)};
  audit={log:vi.fn().mockResolvedValue(undefined)};
  service=new ManufacturingService(db as unknown as DatabaseService,memberships as unknown as MembershipsService,audit as unknown as AuditService);
 });
 it('scopes BOM listing to the active company',async()=>{
  db.query.mockResolvedValue({rows:[],rowCount:0});
  await service.listBoms(user);
  expect(memberships.getMembershipForCompany).toHaveBeenCalledWith('user-1','company-active');
  expect(memberships.getMembership).not.toHaveBeenCalled();
  expect(db.query).toHaveBeenCalledWith(expect.stringContaining('WHERE b.company_id=$1'),['company-active']);
 });
 it('rejects duplicate material lines before writing',async()=>{
  await expect(service.createBom(user,{code:'BOM-1',name:'Assembly',productId:'product-finished',outputQuantity:1,lines:[
   {materialProductId:'material-1',quantity:2},{materialProductId:'material-1',quantity:3},
  ]})).rejects.toThrow(BadRequestException);
  expect(db.transaction).not.toHaveBeenCalled();
 });
 it('rejects service products before creating a BOM',async()=>{
  const client={query:vi.fn().mockResolvedValue({rows:[{id:'product-finished',is_service:false},{id:'material-1',is_service:true}],rowCount:2})};
  db.transaction.mockImplementation(async(callback:(client:unknown)=>Promise<unknown>)=>callback(client));
  await expect(service.createBom(user,{code:'BOM-1',name:'Assembly',productId:'product-finished',outputQuantity:1,lines:[{materialProductId:'material-1',quantity:2}]})).rejects.toThrow(BadRequestException);
  expect(client.query).toHaveBeenCalledTimes(1);
  expect(audit.log).not.toHaveBeenCalled();
 });
});
