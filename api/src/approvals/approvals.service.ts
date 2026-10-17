import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database.service.js';
import { MembershipsService } from '../memberships/memberships.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.js';

@Injectable()
export class ApprovalsService {
  constructor(private readonly db:DatabaseService, private readonly memberships:MembershipsService, private readonly audit:AuditService) {}
  private async companyFor(user:AuthenticatedUser) {
    return user.companyId ? this.memberships.getMembershipForCompany(user.userId,user.companyId) : this.memberships.getMembership(user.userId);
  }
  async inbox(user:AuthenticatedUser) {
    const {companyId}=await this.companyFor(user);
    return (await this.db.query(`SELECT a.id,a.entity_type,a.entity_id,a.status,a.requested_at,a.requester_user_id,u.full_name AS requester_name,
      r.request_number,r.title,r.required_by,r.status AS requisition_status
      FROM approval_requests a JOIN users u ON u.id=a.requester_user_id
      JOIN requisitions r ON a.entity_type='requisition' AND r.id=a.entity_id AND r.company_id=a.company_id
      WHERE a.company_id=$1 AND a.status='pending' AND a.requester_user_id<>$2 ORDER BY a.requested_at`,[companyId,user.userId])).rows;
  }
  async decide(user:AuthenticatedUser,id:string,decision:'approved'|'rejected',note?:string) {
    const membership=await this.companyFor(user);
    const entityId=await this.db.transaction(async client=>{
      const result=await client.query('SELECT * FROM approval_requests WHERE company_id=$1 AND id=$2 FOR UPDATE',[membership.companyId,id]);
      const row=result.rows[0];
      if(!row) throw new NotFoundException('Approval request not found.');
      if(row.status!=='pending') throw new BadRequestException('This approval has already been decided.');
      if(row.requester_user_id===user.userId) throw new BadRequestException('Requesters cannot approve or reject their own requests.');
      if(row.entity_type!=='requisition') throw new BadRequestException('Unsupported approval request type.');
      const req=await client.query('SELECT id,status FROM requisitions WHERE company_id=$1 AND id=$2 FOR UPDATE',[membership.companyId,row.entity_id]);
      if(!req.rows[0] || req.rows[0].status!=='pending_approval') throw new BadRequestException('The requisition is not awaiting approval.');
      await client.query('UPDATE approval_requests SET status=$1,approver_user_id=$2,decision_note=$3,decided_at=NOW() WHERE company_id=$4 AND id=$5',[decision,user.userId,note??null,membership.companyId,id]);
      await client.query('UPDATE requisitions SET status=$1,updated_at=NOW() WHERE company_id=$2 AND id=$3',[decision,membership.companyId,row.entity_id]);
      return row.entity_id as string;
    });
    await this.audit.log({userId:user.userId,companyId:membership.companyId,branchId:membership.branchId,action:decision==='approved'?'approve':'reject',entityType:'approval_request',entityId:id,oldValues:{status:'pending'},newValues:{status:decision,entityId,note:note??null},ipAddress:null});
    return {id,entityId,status:decision};
  }
}
