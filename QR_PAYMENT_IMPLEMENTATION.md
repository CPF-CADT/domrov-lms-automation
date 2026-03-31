# QR Payment System - Complete Implementation Guide

## 🎯 Overview

This document describes the complete KHQR payment system implementation with custom and predefined package support.

---

## 🏗️ Architecture

### Backend Flow

```
1. Frontend Request → Payment Controller
2. Payment Controller → Payment Flow Service
3. Payment Flow Service:
   - Creates Payment Record
   - Calls Payment Service to generate QR
   - Sends QR via WebSocket Gateway
   - Starts polling Bakong API (5s interval, 3min timeout)
4. Bakong API Check → Update Payment Status
5. On Success → Credit User Wallet → Send WebSocket Status Update
```

### Frontend Flow

```
1. User selects package or custom amount
2. Click "Proceed to Payment"
3. Frontend sends request to:
   - `/payment/custom-payment` (custom) OR
   - `/payment/start-payment/{packageId}` (predefined)
4. Backend generates QR and sends via WebSocket
5. Frontend displays modal with:
   - QR code
   - Payment instructions
   - Manual check button
   - Timeout handling
6. User scans QR and pays
7. Backend polls Bakong API
8. On success:
   - Backend credits wallet
   - Sends PAID status via WebSocket
   - Frontend shows success confirmation
   - Balance updates
```

---

## 📱 Endpoints

### 1. Custom Payment

```
POST /payment/custom-payment

Request Body:
{
  "credits": 890000,
  "currency": "USD"  // optional, defaults to USD
}

Response:
{
  "success": true,
  "data": {
    "paymentId": 123,
    "message": "Custom payment initiated",
    "amount": 1.40,
    "credits": 890000
  }
}
```

### 2. Regular Package Payment

```
POST /payment/start-payment/{packageId}

Response:
{
  "success": true,
  "data": {
    "paymentId": 123,
    "message": "Payment initiated"
  }
}
```

### 3. Check Transaction by Hash

```
POST /payment/check_transaction_by_short_hash

Request:
{
  "hash": "8465d723",      // 8-char Bakong hash
  "amount": 1.40,          // USD amount
  "currency": "USD"
}

Response:
{
  "success": true,
  "data": {
    "responseCode": 0,
    "responseMessage": "Getting transaction successfully.",
    "data": {
      "hash": "8465d723",
      "fromAccountId": "...",
      "toAccountId": "...",
      "currency": "USD",
      "amount": 1.40,
      "createdDateMs": 1586852120700
    }
  }
}
```

### 4. Get Credit Packages

```
GET /wallet/packages

Response:
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Starter Pack",
      "description": "Perfect for beginners",
      "credits": 100000,
      "bonusCredits": 10000,
      "price": 0.20,
      "currency": "USD",
      "isActive": true
    },
    ...
  ]
}
```

### 5. Get Wallet Balance

```
GET /wallet/balance

Response:
{
  "success": true,
  "data": {
    "id": 1,
    "creditBalance": 890000,
    "user": { "id": 2, "email": "user@example.com" }
  }
}
```

---

## 💻 Frontend Integration

### Using Updated CreditPurchaseClient

The updated component handles:

- ✅ Package selection (predefined or custom)
- ✅ Real-time balance display
- ✅ WebSocket connection management
- ✅ Payment modal with QR code
- ✅ Manual payment check
- ✅ Timeout handling
- ✅ Success confirmation
- ✅ Error handling
- ✅ Automatic balance refresh

### Component Hierarchy

```
CreditPurchaseClient (Main)
├── Package Selection
├── Custom Amount Input
├── Order Summary
└── KhqrPaymentModal (Shows on payment)
    ├── Khqr (QR display)
    ├── Status Messages
    ├── Manual Check Button
    └── Payment Info
```

### Key Features

**1. WebSocket Integration**

```typescript
// Automatically connects on mount
// Listens for:
- QR_READY: Receives QR code
- PAYMENT_STATUS: Receives payment updates (PAID/UNPAID/EXPIRED)
// Automatically reconnects on disconnect
```

**2. Polling Fallback**

- Interval: 3 seconds
- Timeout: 5 minutes
- Manual check button for user control

**3. Error Handling**

- Invalid amounts rejected
- Missing user ID handled
- Payment failures with messages
- Timeout with retry option

**4. Balance Refresh**

- Automatic on success
- Uses wallet service
- Handles various response formats

---

## 🔄 Payment Flow Details

### Custom Payment Example

**Frontend:**

```javascript
// User enters 890,000 credits
const customAmount = 890000;
const price = customAmount * 0.00157302; // = $1.40

// Sends to backend
POST /payment/custom-payment
{
  "credits": 890000,
  "currency": "USD"
}
```

**Backend:**

```typescript
// 1. Creates Payment record with:
// - amount: 1.40
// - currency: USD
// - transactionDetails: { customCredits: 890000, isCustomPayment: true }
// - user: { id: userId }
// - creditPackage: null (no predefined package)

// 2. Generates QR code via PaymentService
const qr = paymentService.createQR({ currency: "USD", amount: 1.4 });

// 3. Sends QR via WebSocket
gateway.sendQr(userId, qr);

// 4. Starts polling (5s interval, 3min timeout)
const response = await paymentService.checkPayment(md5Hash);

// 5. On success:
// - Updates Payment.status to COMPLETED
// - Creates Payment with amount paid: 1.40
// - Gets credits from transactionDetails: 890,000
// - Updates UserCreditBalance
// - Creates WalletTransaction record
// - Sends PAID status via WebSocket
```

**Frontend (receives):**

```javascript
// On QR_READY event:
socket.on("QR_READY", (payload) => {
  setQrValue(payload.qr);
  // Displays QR in modal
});

// On PAYMENT_STATUS event (after user pays):
socket.on("PAYMENT_STATUS", (payload) => {
  if (payload.status === "PAID") {
    // Show success
    // Refresh balance
    // Close modal
  }
});
```

---

## 💾 Database Records Created

### Payment Entity

```sql
INSERT INTO payment (
  user_id,
  credit_package_id,        -- NULL for custom payments
  amount,                    -- 1.40
  currency,                  -- USD
  payment_method,            -- BAKOGN
  status,                    -- COMPLETED
  transaction_id,            -- '8465d723' (Bakong hash)
  transaction_details,       -- { customCredits: 890000, ... }
  created_at
) VALUES (...)
```

### UserCreditBalance Update

```
BEFORE: creditBalance = 1,000,000
UPDATE: creditBalance = 1,890,000 (+890,000)
```

### WalletTransaction Record

```sql
INSERT INTO wallet_transaction (
  wallet_id,
  type,               -- CREDIT
  reason,             -- PURCHASE
  amount,             -- 890,000
  balance_before,     -- 1,000,000
  balance_after,      -- 1,890,000
  description,        -- 'Custom credit purchase for 890,000 tokens'
  metadata,           -- { paymentId: 123, isCustomPayment: true }
  created_at
) VALUES (...)
```

---

## ⚙️ Configuration

### Environment Variables

```env
# Backend - payment.service.ts
BAKONG_TOKEN=your_bakong_token
BAKONG_API=https://staging-api.bakong.dev
BAKONG_BANK_ACCOUNT=your_bank_account
MERCHANT_NAME=Your Merchant Name
MERCHANT_CITY=Phnom Penh
PHONE_NUMBER=+855123456789

# Frontend - .env
VITE_API_URL=http://localhost:3000
```

### Constants

```typescript
// Frontend
CUSTOM_PRICE_RATE = 0.00157302;
PAYMENT_CHECK_INTERVAL = 3000; // 3 seconds
PAYMENT_TIMEOUT = 300000; // 5 minutes
SUCCESS_DISPLAY_TIME = 3000; // 3 seconds

// Backend
POLLING_INTERVAL = 5000; // 5 seconds
POLLING_TIMEOUT = 3 * 60 * 1000; // 3 minutes
INITIAL_DELAY = 15000; // Wait 15s before first poll
```

---

## 🧪 Testing

### Test Scenario 1: Custom Payment

```
1. Navigate to Credit Purchase
2. Select "Custom Amount"
3. Enter: 890000
4. Verify price shows: $1.40
5. Click "Proceed to Payment"
6. Verify QR code displays
7. Simulate Bakong payment with 8-char hash
8. Verify success message
9. Verify balance increased by 890000
```

### Test Scenario 2: Predefined Package

```
1. Select a predefined package
2. Click "Proceed to Payment"
3. Modal opens with correct package name/amount
4. User pays
5. Verify credits match package credits + bonusCredits
```

### Test Scenario 3: Timeout Handling

```
1. Open payment modal
2. Don't pay
3. Wait 5 minutes
4. Verify "Payment Timeout" message
5. Verify retry option available
```

---

## 🐛 Troubleshooting

### Issue: QR Code Not Appearing

- **Cause**: WebSocket disconnected
- **Fix**: Check browser console, verify jwtToken in localStorage, reload page

### Issue: Payment Status Never Updates

- **Cause**: Bakong API unavailable or hash mismatch
- **Fix**: Use manual check button, verify Bakong credentials in env

### Issue: Custom Amount Calculation Wrong

- **Cause**: CUSTOM_PRICE_RATE mismatch between frontend/backend
- **Fix**: Ensure both use 0.00157302, adjust if needed

### Issue: Balance Not Updating

- **Cause**: Wallet service error
- **Fix**: Check wallet balance endpoint, verify user authentication

---

## 📊 Monitoring

### Key Metrics to Track

```
- Payment initiation rate
- Successful payment rate
- Average payment time
- Timeout rate
- Custom vs regular payment ratio
- Average custom payment amount
- Failed transaction reasons
```

### Logs to Monitor

```
Backend:
[PaymentFlowService] Payment initiated
[PaymentFlowService] Payment polling started
[PaymentFlowService] Payment completed
[PaymentFlowService] Payment polling error

Frontend:
WebSocket connected/disconnected
QR received
Payment status received
Payment timeout
Manual check attempted
```

---

## 🔐 Security Notes

- ✅ All endpoints require JWT authentication
- ✅ User ID verified from JWT token
- ✅ Payment amount validated
- ✅ Idempotency check (prevents duplicate crediting)
- ✅ Database transactions ensure atomicity
- ✅ Bakong hash verified (8 characters)
- ✅ WebSocket auth token required
- ✅ CORS configured for frontend domain

---

## 📝 Implementation Checklist

- ✅ Custom payment endpoint added
- ✅ Custom payment DTO created
- ✅ Payment flow service updated
- ✅ Payment handling logic updated
- ✅ KHQR payment modal created
- ✅ Updated CreditPurchaseClient
- ✅ WebSocket integration verified
- ✅ Error handling implemented
- ✅ Balance refresh on success
- ✅ Documentation complete

---

## 🚀 Next Steps

1. Deploy backend changes
2. Update frontend to use CreditPurchaseClientUpdated
3. Configure Bakong credentials
4. Test payment flow end-to-end
5. Monitor logs for issues
6. Gather user feedback
7. Optimize based on metrics

---

## 📚 Related Files

- Backend: `/apps/backend_nest/src/modules/wallet/`
  - `payment.controller.ts` - Endpoints
  - `payment-flow.service.ts` - Business logic
  - `payment.gateway.ts` - WebSocket
  - `payment.service.ts` - Bakong integration

- Frontend: `/apps/react-client/src/features/CreditPurchase/`
  - `KhqrPaymentModal.tsx` - Payment modal
  - `CreditPurchaseClientUpdated.tsx` - Main component
  - `khqr.tsx` - QR display component

- DTOs: `/apps/backend_nest/src/libs/dtos/wallet/`
  - `custom-payment.dto.ts` - Custom payment DTO
  - `start-payment-response.dto.ts` - Response DTO
