import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

// 1️⃣ ENABLE CORS: This is usually the main issue on localhost
@WebSocketGateway({ cors: { origin: 'http://localhost:5173/' }, transports: ['websocket'] })
export class PaymentGateway {
  @WebSocketServer()
  server: Server;

  private clients: Map<number, Socket> = new Map();

  handleConnection(client: Socket) {
    const userId = Number(client.handshake.query.userId);
    if (userId) this.clients.set(userId, client);
  }

  handleDisconnect(client: Socket) {
    const userId = Number(client.handshake.query.userId);
    this.clients.delete(userId);
  }

  sendQr(userId: number, qrCode: string) {
    const client = this.clients.get(userId);
    if (client) client.emit('QR_READY', { qr: qrCode });
  }

  sendStatus(userId: number, status: string) {
    const client = this.clients.get(userId);
    if (client) client.emit('PAYMENT_STATUS', { status });
  }
}