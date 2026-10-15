import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database.service.js';
import { MembershipsService } from '../memberships/memberships.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.js';
import type { CreateAccountDto } from './dto/create-account.dto.js';

const DEFAULT_ACCOUNTS = [
 {code:'1000',name:'Cash on Hand',type:'asset',side:'debit',system:'cash'},
 {code:'1010',name:'Bank Account',type:'asset',side:'debit',system:'bank'},
 {code:'1020',name:'M-Pesa Clearing',type:'asset',side:'debit',system:'mpesa'},
 {code:'1100',name:'Accounts Receivable',type:'asset',side:'debit',system:'accounts_receivable'},
 {code:'1200',name:'Inventory',type:'asset',side:'debit',system:'inventory'},
 {code:'1300',name:'Input VAT Recoverable',type:'asset',side:'debit',system:'input_tax'},
 {code:'2000',name:'Accounts Payable',type:'liability',side:'credit',system:'accounts_payable'},
 {code:'3000',name:'Owner Equity',type:'equity',side:'credit',system:'equity'},
 {code:'4000',name:'Sales Revenue',type:'income',side:'credit',system:'sales_revenue'},
 {code:'5000',name:'Purchases and Cost of Goods',type:'expense',side:'debit',system:'purchases_expense'},
 {code:'5100',name:'Operating Expenses',type:'expense',side:'debit',system:'operating_expense'}
] as const;
@Injectable()
export class AccountingService {
 constructor(private readonly db:DatabaseService,private readonly memberships:MembershipsService,private readonly audit:AuditService){}
 private companyFor(user:AuthenticatedUser){return user.companyId?this.memberships.getMembershipForCompany(user.userId,user.companyId):this.memberships.getMembership(user.userId);}
 async ensureDefaults(companyId:string){
  await this.db.transaction(async client=>{
   for(const a of DEFAULT_ACCOUNTS) await client.query(
    `INSERT INTO chart_of_accounts(company_id,code,name,account_type,normal_side,system_code)
     VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(company_id,code) DO NOTHING`,
    [companyId,a.code,a.name,a.type,a.side,a.system]);
  });
 }
 async listAccounts(user:AuthenticatedUser){
  const {companyId}=await this.companyFor(user);await this.ensureDefaults(companyId);
  return (await this.db.query(
   `SELECT a.id,a.company_id,a.code,a.name,a.account_type,a.normal_side,a.system_code,a.is_active,a.created_at,
    COALESCE(SUM(l.debit) FILTER (WHERE j.status='posted'),0)::numeric(14,2) AS total_debits,COALESCE(SUM(l.credit) FILTER (WHERE j.status='posted'),0)::numeric(14,2) AS total_credits,
    CASE WHEN a.normal_side='debit' THEN COALESCE(SUM(l.debit-l.credit) FILTER (WHERE j.status='posted'),0) ELSE COALESCE(SUM(l.credit-l.debit) FILTER (WHERE j.status='posted'),0) END::numeric(14,2) AS balance
    FROM chart_of_accounts a LEFT JOIN journal_entry_lines l ON l.account_id=a.id AND l.company_id=a.company_id
    LEFT JOIN journal_entries j ON j.id=l.journal_entry_id AND j.company_id=l.company_id AND j.status='posted'
    WHERE a.company_id=$1 GROUP BY a.id ORDER BY a.code`,[companyId])).rows;
 }
 async createAccount(user:AuthenticatedUser,dto:CreateAccountDto){
  const {companyId}=await this.companyFor(user);await this.ensureDefaults(companyId);
  const side=dto.normalSide??(['liability','equity','income'].includes(dto.accountType)?'credit':'debit');
  try{
   const r=await this.db.query(`INSERT INTO chart_of_accounts(company_id,code,name,account_type,normal_side)
    VALUES($1,$2,$3,$4,$5) RETURNING *`,[companyId,dto.code.trim(),dto.name.trim(),dto.accountType,side]);
   const a=r.rows[0];
   await this.audit.log({userId:user.userId,companyId,branchId:null,action:'accounting.account.create',entityType:'chart_of_account',entityId:String(a.id),oldValues:null,newValues:{code:dto.code,name:dto.name},ipAddress:null});
   return a;
  }catch(e){if((e as {code?:string}).code==='23505')throw new ConflictException('An account with this code or system code already exists.');throw e;}
 }
 async listJournals(user:AuthenticatedUser){
  const {companyId}=await this.companyFor(user);await this.ensureDefaults(companyId);
  return (await this.db.query(`SELECT j.id,j.company_id,j.entry_number,j.entry_date,j.description,j.source_type,j.source_id,j.status,j.posted_at,j.created_at,
   COALESCE(SUM(l.debit),0)::numeric(14,2) AS total_debits,COALESCE(SUM(l.credit),0)::numeric(14,2) AS total_credits
   FROM journal_entries j LEFT JOIN journal_entry_lines l ON l.journal_entry_id=j.id AND l.company_id=j.company_id
   WHERE j.company_id=$1 GROUP BY j.id ORDER BY j.entry_date DESC,j.created_at DESC LIMIT 200`,[companyId])).rows;
 }
 async getJournal(user:AuthenticatedUser,id:string){
  const {companyId}=await this.companyFor(user);
  const j=await this.db.query('SELECT * FROM journal_entries WHERE company_id=$1 AND id=$2',[companyId,id]);
  if(!j.rows[0])throw new NotFoundException('Journal entry not found.');
  const lines=await this.db.query(`SELECT l.*,a.code AS account_code,a.name AS account_name,a.account_type FROM journal_entry_lines l
   JOIN chart_of_accounts a ON a.id=l.account_id AND a.company_id=l.company_id
   WHERE l.company_id=$1 AND l.journal_entry_id=$2 ORDER BY a.code`,[companyId,id]);
  return {...j.rows[0],lines:lines.rows};
 }
}
