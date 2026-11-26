import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { logger } from './logging';

type AuthenticatedSocket = Socket & { data: { userId?: string } };

/** Payment verification results are pushed to authenticated user sockets. */
@WebSocketGateway({
  cors: { origin: true, credentials: true },
})
export class PaymentGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly clients = new Map<string, Set<AuthenticatedSocket>>();

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    const started = performance.now();
    let userId: string;
    try {
      userId = await this.authenticate(client);
    } catch (error) {
      const fields = { operation: 'authenticate', duration_ms: performance.now() - started };
      if (error instanceof UnauthorizedException) {
        logger.debug('payment.websocket', 'Payment socket authentication rejected', { ...fields, outcome: 'rejected' });
      } else {
        logger.warn('payment.websocket', 'Payment socket authentication failed', { ...fields, outcome: 'failed' });
      }
      client.disconnect(true);
      return;
    }
    client.data.userId = userId;
    const sockets = this.clients.get(userId) ?? new Set<AuthenticatedSocket>();
    sockets.add(client);
    this.clients.set(userId, sockets);
    logger.debug('payment.websocket', 'Payment socket authenticated', {
      operation: 'authenticate', outcome: 'completed', duration_ms: performance.now() - started,
    });
  }

  handleDisconnect(client: AuthenticatedSocket): void {
    const userId = client.data?.userId;
    if (!userId) return;
    const sockets = this.clients.get(userId);
    sockets?.delete(client);
    if (sockets?.size === 0) this.clients.delete(userId);
  }

  sendStatus(userId: string, paymentId: string, status: string, message?: string): void {
    this.emitToUser(userId, 'PAYMENT_STATUS', { paymentId, status, ...(message ? { message } : {}) });
  }

  private emitToUser(userId: string, event: string, payload: Record<string, string>): void {
    const clients = this.clients.get(userId);
    for (const client of clients ?? []) client.emit(event, payload);
    logger.debug('payment.websocket', 'Payment socket delivery attempted', {
      operation: 'send_status', outcome: clients?.size ? 'sent' : 'no_client',
    });
  }

  private async authenticate(client: AuthenticatedSocket): Promise<string> {
    const token = this.readToken(client);
    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }
    try {
      const payload = await this.jwt.verifyAsync<{ sub?: string }>(token, {
        secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
      });
      if (!payload.sub) throw new UnauthorizedException('Invalid access token');
      return String(payload.sub);
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid access token');
    }
  }

  private readToken(client: AuthenticatedSocket): string | undefined {
    const value = client.handshake.auth?.token
      ?? client.handshake.headers.authorization?.replace(/^Bearer\s+/i, '');
    return Array.isArray(value) ? value[0] : value;
  }
}
