import {
  ArgumentsHost,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
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

  it('always returns message as a single string', () => {
    const { host, json } = mockHost();
    filter.catch(new BadRequestException(['email must be an email', 'name too short']), host);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: 'email must be an email. name too short',
      }),
    );
  });

  it('passes field errors through when present', () => {
    const { host, json } = mockHost();
    const errors = [{ field: 'email', message: 'Email is already registered' }];
    filter.catch(new ConflictException({ message: 'Email is already registered', errors }), host);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 409, message: 'Email is already registered', errors }),
    );
  });

  it('omits errors when there are none (401, 429)', () => {
    const { host, json } = mockHost();
    filter.catch(new UnauthorizedException('Invalid email or password'), host);
    expect(json.mock.calls[0][0]).not.toHaveProperty('errors');
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

  it('never sends field errors on 5xx', () => {
    const { host, json } = mockHost();
    vi.spyOn(filter['logger'], 'error').mockImplementation(() => undefined);
    filter.catch(
      new InternalServerErrorException({ message: 'boom', errors: [{ field: 'x', message: 'y' }] }),
      host,
    );
    expect(json.mock.calls[0][0]).not.toHaveProperty('errors');
    expect(json.mock.calls[0][0]).toMatchObject({ message: 'Internal server error' });
  });
});
