import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PaymentGateway } from '../src/payment.gateway';

function socket(overrides: Record<string, unknown> = {}) {
  return {
    id: 'socket-1', data: {},
    handshake: { auth: { token: 'jwt-token' }, headers: {}, query: { userId: 'user-1' }, ...overrides },
    emit: jest.fn(), disconnect: jest.fn(),
  } as any;
}

describe('PaymentGateway', () => {
  const jwt = { verifyAsync: jest.fn() } as unknown as JwtService;
  const config = { getOrThrow: jest.fn().mockReturnValue('jwt-secret') } as unknown as ConfigService;

  beforeEach(() => jest.clearAllMocks());

  it('authenticates a socket and emits the legacy QR_READY payload', async () => {
    (jwt.verifyAsync as jest.Mock).mockResolvedValue({ sub: 'user-1' });
    const gateway = new PaymentGateway(jwt, config); const client = socket();
    await gateway.handleConnection(client); gateway.sendQr('user-1', 'qr-value');
    expect(client.emit).toHaveBeenCalledWith('QR_READY', { qr: 'qr-value' });
    expect(client.disconnect).not.toHaveBeenCalled();
  });

  it('emits PAYMENT_STATUS only to the authenticated user', async () => {
    (jwt.verifyAsync as jest.Mock).mockResolvedValueOnce({ sub: 'user-1' }).mockResolvedValueOnce({ sub: 'user-2' });
    const gateway = new PaymentGateway(jwt, config); const first = socket(); const second = socket({ query: { userId: 'user-2' } });
    await gateway.handleConnection(first); await gateway.handleConnection(second); gateway.sendStatus('user-1', 'PAID');
    expect(first.emit).toHaveBeenCalledWith('PAYMENT_STATUS', { status: 'PAID' });
    expect(second.emit).not.toHaveBeenCalled();
  });

  it('rejects a socket without a token', async () => {
    const gateway = new PaymentGateway(jwt, config); const client = socket({ auth: {}, query: {} });
    await expect(gateway.handleConnection(client)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(client.disconnect).toHaveBeenCalledWith(true);
  });

  it('rejects a query userId that does not match the JWT subject', async () => {
    (jwt.verifyAsync as jest.Mock).mockResolvedValue({ sub: 'user-1' });
    const gateway = new PaymentGateway(jwt, config); const client = socket({ query: { userId: 'user-2' } });
    await expect(gateway.handleConnection(client)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(client.disconnect).toHaveBeenCalledWith(true);
  });
});
