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

type AuthenticatedSocket = Socket & { data: { userId?: string } };

/** Compatibility events: QR_READY -> { qr }, PAYMENT_STATUS -> { status }. */
@WebSocketGateway({
  cors: { origin: true, credentials: true },
  transports: ['websocket'],
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
    const userId = await this.authenticate(client);
    client.data.userId = userId;
    const sockets = this.clients.get(userId) ?? new Set<AuthenticatedSocket>();
    sockets.add(client);
    this.clients.set(userId, sockets);
  }

  handleDisconnect(client: AuthenticatedSocket): void {
    const userId = client.data?.userId;
    if (!userId) return;
    const sockets = this.clients.get(userId);
    sockets?.delete(client);
    if (sockets?.size === 0) this.clients.delete(userId);
  }

  sendQr(userId: string, qr: string): void {
    this.emitToUser(userId, 'QR_READY', { qr });
  }

  sendStatus(userId: string, status: string): void {
    this.emitToUser(userId, 'PAYMENT_STATUS', { status });
  }

  private emitToUser(userId: string, event: string, payload: Record<string, string>): void {
    for (const client of this.clients.get(userId) ?? []) client.emit(event, payload);
  }

  private async authenticate(client: AuthenticatedSocket): Promise<string> {
    const token = this.readToken(client);
    if (!token) {
      this.reject(client);
      throw new UnauthorizedException('Authentication required');
    }
    try {
      const payload = await this.jwt.verifyAsync<{ sub?: string }>(token, {
        secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
      });
      if (!payload.sub) throw new UnauthorizedException('Invalid access token');
      const requestedUserId = this.readRequestedUserId(client);
      if (requestedUserId && requestedUserId !== String(payload.sub)) {
        this.reject(client);
        throw new UnauthorizedException('Socket user does not match token');
      }
      return String(payload.sub);
    } catch (error) {
      this.reject(client);
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid access token');
    }
  }

  private readToken(client: AuthenticatedSocket): string | undefined {
    const value = client.handshake.auth?.token
      ?? client.handshake.headers.authorization?.replace(/^Bearer\s+/i, '')
      ?? client.handshake.query.token;
    return Array.isArray(value) ? value[0] : value;
  }

  private readRequestedUserId(client: AuthenticatedSocket): string | undefined {
    const value = client.handshake.query.userId;
    return Array.isArray(value) ? value[0] : value;
  }

  private reject(client: AuthenticatedSocket): void {
    client.disconnect(true);
  }
}
