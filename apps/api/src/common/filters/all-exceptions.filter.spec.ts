import { ArgumentsHost, BadRequestException, NotFoundException } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter.js';

function mockHost() {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  const host = {
    switchToHttp: () => ({
      getRequest: () => ({ method: 'GET', originalUrl: '/api/x' }),
      getResponse: () => ({ status }),
    }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();

  it('returns the http exception status and message', () => {
    const { host, status, json } = mockHost();
    filter.catch(new NotFoundException('Nope'), host);
    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404, message: 'Nope', path: '/api/x' }),
    );
  });

  it('keeps validation message arrays', () => {
    const { host, json } = mockHost();
    filter.catch(new BadRequestException(['email must be an email']), host);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400, message: ['email must be an email'] }),
    );
  });

  it('hides details of unknown errors', () => {
    const { host, status, json } = mockHost();
    vi.spyOn(filter['logger'], 'error').mockImplementation(() => undefined);
    filter.catch(new Error('db password leaked in message'), host);
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 500, message: 'Internal server error' }),
    );
  });
});
