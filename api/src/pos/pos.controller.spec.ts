import { PosController } from './pos.controller.js';
import { PosService } from './pos.service.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.js';
import type { Response } from 'express';

describe('PosController current shift response', () => {
  it('serializes a missing open shift as JSON null instead of an empty response body', async () => {
    const currentShift = vi.fn().mockResolvedValue(null);
    const controller = new PosController({ currentShift } as unknown as PosService);
    const json = vi.fn().mockReturnThis();
    const status = vi.fn().mockReturnValue({ json });
    const response = { status, json } as unknown as Response;
    const request = { user: { userId: 'user-1' } as AuthenticatedUser };

    await controller.currentShift(request, response);

    expect(currentShift).toHaveBeenCalledWith(request.user);
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith(null);
  });

  it('serializes an open shift as JSON', async () => {
    const shift = { id: 'shift-1', status: 'open' };
    const currentShift = vi.fn().mockResolvedValue(shift);
    const controller = new PosController({ currentShift } as unknown as PosService);
    const json = vi.fn().mockReturnThis();
    const status = vi.fn().mockReturnValue({ json });
    const response = { status, json } as unknown as Response;

    await controller.currentShift(
      { user: { userId: 'user-1' } as AuthenticatedUser },
      response,
    );

    expect(json).toHaveBeenCalledWith(shift);
  });
});
