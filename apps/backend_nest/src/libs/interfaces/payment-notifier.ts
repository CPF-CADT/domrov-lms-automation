export interface PaymentNotifier {
    sendQr(qr: string): void;
    sendStatus(status: string): void;
}