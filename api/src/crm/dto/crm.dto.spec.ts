import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  AddSegmentMemberDto,
  CreateActivityDto,
  CreateCampaignDto,
  CreateOpportunityDto,
  CreateTicketDto,
  UpdateOpportunityDto,
} from './crm.dto.js';

const validId = '11111111-1111-4111-8111-111111111111';

describe('CRM DTO validation', () => {
  it('accepts a valid opportunity relationship and date', async () => {
    const dto = plainToInstance(CreateOpportunityDto, {
      title: 'New ERP rollout', leadId: validId, expectedValue: 120000,
      probability: 60, expectedCloseDate: '2026-12-01',
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects malformed lead and customer relationship IDs', async () => {
    const dto = plainToInstance(CreateOpportunityDto, {
      title: 'Bad relationship', leadId: 'not-a-uuid', customerId: 'also-invalid',
    });
    const errors = await validate(dto);
    expect(errors.map(error => error.property)).toEqual(expect.arrayContaining(['leadId', 'customerId']));
  });

  it('rejects invalid expected close dates on updates', async () => {
    const dto = plainToInstance(UpdateOpportunityDto, { expectedCloseDate: 'next Tuesday' });
    expect((await validate(dto)).map(error => error.property)).toContain('expectedCloseDate');
  });

  it('rejects malformed activity relationship IDs and due dates', async () => {
    const dto = plainToInstance(CreateActivityDto, {
      activityType: 'meeting', subject: 'Product demo', customerId: 'bad-id', dueAt: 'not-a-date',
    });
    const errors = await validate(dto);
    expect(errors.map(error => error.property)).toEqual(expect.arrayContaining(['customerId', 'dueAt']));
  });

  it('requires exactly one segment-member identifier at service level and validates identifier format here', async () => {
    const dto = plainToInstance(AddSegmentMemberDto, { leadId: 'not-a-uuid' });
    expect((await validate(dto)).map(error => error.property)).toContain('leadId');
  });

  it('rejects invalid campaign date formats', async () => {
    const dto = plainToInstance(CreateCampaignDto, { name: 'Winter outreach', startDate: 'someday' });
    expect((await validate(dto)).map(error => error.property)).toContain('startDate');
  });

  it('rejects malformed ticket assignee IDs and dates', async () => {
    const dto = plainToInstance(CreateTicketDto, {
      subject: 'Customer cannot sign in', customerId: validId,
      assignedUserId: 'not-a-uuid', dueAt: 'tomorrow morning',
    });
    const errors = await validate(dto);
    expect(errors.map(error => error.property)).toEqual(expect.arrayContaining(['assignedUserId', 'dueAt']));
  });
});
