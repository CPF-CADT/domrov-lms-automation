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
    console.log("🔗 [WebSocket] Client connected");
    console.log("   Socket ID:", client.id);
    console.log("   User ID:", userId);
    if (userId) {
      this.clients.set(userId, client);
      console.log("   ✅ Registered user", userId, "with socket");
    } else {
      console.warn("   ⚠️  No userId in handshake query");
    }
  }

  handleDisconnect(client: Socket) {
    const userId = Number(client.handshake.query.userId);
    console.log("🔌 [WebSocket] Client disconnected");
    console.log("   Socket ID:", client.id);
    console.log("   User ID:", userId);
    this.clients.delete(userId);
    console.log("   ✅ Removed user", userId, "from registry");
  }

  sendQr(userId: number, qrCode: string) {
    console.log("💳 [Bakong QR] Received QR code from Bakong payment service");
    console.log("👤 User ID:", userId);
    console.log("🎯 QR Code Value:", qrCode);
    console.log("📏 QR Code Length:", qrCode.length);
    console.log("🔍 QR Code Prefix (first 50 chars):", qrCode.substring(0, 50));

    const client = this.clients.get(userId);
    if (client) {
      console.log("✅ Socket found for user", userId, "- Emitting QR_READY event");
      client.emit('QR_READY', { qr: qrCode });
      console.log("📤 QR_READY event emitted successfully");
    } else {
      console.error("❌ No socket found for user", userId, "- Cannot emit QR_READY");
    }
  }

  sendStatus(userId: number, status: string) {
    console.log("💰 [Payment Status] Updating payment status");
    console.log("👤 User ID:", userId);
    console.log("📊 Status:", status);

    const client = this.clients.get(userId);
    if (client) {
      console.log("✅ Socket found for user", userId, "- Emitting PAYMENT_STATUS event");
      client.emit('PAYMENT_STATUS', { status });
      console.log("📤 PAYMENT_STATUS event emitted successfully");
    } else {
      console.error("❌ No socket found for user", userId, "- Cannot emit PAYMENT_STATUS");
    }
  }
}