# Quick Integration Guide

## 🚀 How to Integrate the New QR Payment System

### Step 1: Backend - No Changes Required

The backend is already updated! The custom payment endpoint is ready at:

```
POST /payment/custom-payment
```

### Step 2: Frontend - Replace Components

#### Option A: Replace Entire Component (Recommended)

```bash
# Backup your current file
cp apps/react-client/src/features/CreditPurchase/CreditPurchaseClient.tsx \
   apps/react-client/src/features/CreditPurchase/CreditPurchaseClient.tsx.bak

# Replace with updated version
cp apps/react-client/src/features/CreditPurchase/CreditPurchaseClientUpdated.tsx \
   apps/react-client/src/features/CreditPurchase/CreditPurchaseClient.tsx
```

#### Option B: Manual Integration

If you have customizations in your current component, merge these changes:

1. **Add KhqrPaymentModal**
   - Copy the new `KhqrPaymentModal.tsx` to your project
   - Import in CreditPurchaseClient

2. **Update handlePayment()**

   ```typescript
   const handlePayment = async () => {
     if (selectedPackId === "custom") {
       // Call custom-payment endpoint
       const response = await fetch("/payment/custom-payment", {
         method: "POST",
         headers: {
           "Content-Type": "application/json",
           Authorization: `Bearer ${token}`,
         },
         body: JSON.stringify({
           credits: customTokenAmount,
           currency: "USD",
         }),
       });
     } else {
       // Call regular endpoint
       const response = await fetch(`/payment/start-payment/${packageId}`, {
         method: "POST",
         headers: { Authorization: `Bearer ${token}` },
       });
     }
     setIsPaymentModalOpen(true);
   };
   ```

3. **Update JSX**
   - Add custom amount input section
   - Add KhqrPaymentModal component

### Step 3: Verify Configuration

#### Check Environment Variables

```bash
# .env file in react-client root
VITE_API_URL=http://localhost:3000  # or your backend URL
```

#### Check localStorage Usage

```javascript
// JWT token should be in localStorage
localStorage.setItem("jwtToken", token);

// User ID should be in localStorage
localStorage.setItem("userId", userId);
```

### Step 4: Test the Flow

#### Test as a User

1. Navigate to Credit Purchase page
2. Test predefined package:
   - Click a package
   - Click "Proceed to Payment"
   - Verify QR displays in modal
3. Test custom amount:
   - Select "Custom Token Pack"
   - Enter: 890000
   - Verify price shows: $1.40
   - Click "Proceed to Payment"
   - Verify modal displays correctly

#### Test in Browser Console

```javascript
// Check WebSocket connection
console.log(localStorage.getItem("jwtToken")); // Should have token
console.log(localStorage.getItem("userId")); // Should have number

// Check API connectivity
fetch("http://localhost:3000/wallet/balance", {
  headers: { Authorization: `Bearer ${localStorage.getItem("jwtToken")}` },
})
  .then((r) => r.json())
  .then(console.log);
```

### Step 5: Handle Edge Cases

#### No JWT Token

```typescript
// Component handles gracefully:
if (!token) {
  setError("User not authenticated");
  return;
}
```

#### Network Offline

```typescript
// Manual check button always available:
<button onClick={handleManualCheck}>
  Check Payment
</button>
```

#### Payment Timeout

```typescript
// Shows message and offers retry:
{status === 'EXPIRED' && (
  <button onClick={handleRetryPayment}>Retry</button>
)}
```

---

## 📱 Component Usage Example

### Simple Usage

```typescript
import CreditPurchaseClient from '@/features/CreditPurchase/CreditPurchaseClient';

export default function CreditsPage() {
  return (
    <div>
      <CreditPurchaseClient />
    </div>
  );
}
```

### With Routing

```typescript
// In your router
{
  path: '/credits',
  component: CreditPurchaseClient,
  requireAuth: true,
}
```

---

## 🔧 Troubleshooting Integration

### Issue: Component Not Rendering

```
Check:
1. Imports are correct
2. Dependencies installed (socket.io-client, etc.)
3. No TypeScript errors
4. CSS classes available
```

### Issue: WebSocket Not Connecting

```
Check:
1. Backend running on correct port
2. VITE_API_URL set correctly
3. JWT token in localStorage
4. Browser console for errors
```

### Issue: Payment Endpoint Not Found

```
Check:
1. Backend updated with custom-payment endpoint
2. Payment controller imported
3. Module registered in app.module.ts
4. Database migrations run
```

### Issue: Balance Not Updating

```
Check:
1. /wallet/balance endpoint working
2. User authenticated
3. Wallet service installed
4. Database transaction committed
```

---

## 📊 API Compatibility

### Frontend Requirements

- Node.js 16+
- React 18+
- TypeScript 4.8+
- socket.io-client 4.5+

### Backend Requirements

- NestJS 9+
- TypeORM 0.3+
- Node.js 16+
- PostgreSQL 12+

---

## 🎯 Success Criteria

After integration, verify:

✅ Custom payment endpoint working  
✅ QR code displays in modal  
✅ WebSocket delivers QR in real-time  
✅ Payment status updates on success  
✅ User balance increases after payment  
✅ Error handling works  
✅ Timeout handling works  
✅ Mobile responsive

---

## 📞 Need Help?

If something breaks during integration:

1. **Check the logs**

   ```bash
   # Backend
   tail -f logs/error.log

   # Frontend (browser console)
   F12 → Console → Check for red errors
   ```

2. **Verify configuration**

   ```bash
   # Backend env
   echo $BAKONG_TOKEN
   echo $BAKONG_API

   # Frontend env
   cat .env | grep VITE_API
   ```

3. **Test API directly**

   ```bash
   curl -X GET http://localhost:3000/wallet/packages \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

4. **Check database**
   ```bash
   # Verify payment record created
   SELECT * FROM payment WHERE user_id = YOUR_USER_ID ORDER BY created_at DESC;
   ```

---

## ✨ Next Steps After Integration

1. **Monitor in production**
   - Watch for payment errors
   - Track success rate
   - Monitor response times

2. **Gather feedback**
   - User experience
   - Any pain points
   - Suggestions

3. **Optimize if needed**
   - Cache QR codes
   - Adjust polling interval
   - Improve error messages

4. **Add features later**
   - Payment history
   - Refund support
   - Analytics
   - Email receipts

---

**Total Integration Time**: 15-30 minutes  
**Complexity**: Low (mostly copy-paste)  
**Risk**: Low (backward compatible)

Good luck! 🚀
