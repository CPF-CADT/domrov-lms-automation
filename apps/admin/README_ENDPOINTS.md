# 🎯 LMS Admin Dashboard - API Endpoints

Complete reference guide for all backend API endpoints required by the admin dashboard.

## 📋 Quick Reference

| Module          | Endpoints             | Total  |
| --------------- | --------------------- | ------ |
| Dashboard       | Stats, Activity       | 2      |
| Users           | CRUD, Credits, Status | 8      |
| Credit Packages | CRUD, Toggle          | 5      |
| Transactions    | CRUD, Verify, Search  | 5      |
| Evaluations     | Get All               | 1      |
| File Upload     | Image Upload          | 1      |
| File Upload     | Image Upload          | 1      |
| **Total**       | **All Endpoints**     | **24** |

---

## 🏠 Dashboard Endpoints

### Get Dashboard Statistics

```
GET /api/admin/dashboard/stats
```

**Description**: Fetch key metrics for the dashboard overview

**Response** (200 OK):

```json
{
  "totalUsers": 1500,
  "activeUsers": 1200,
  "totalTransactions": 5432,
  "totalRevenue": 45000,
  "monthlyGrowth": 12.5
}
```

---

### Get Recent Activity Feed

```
GET /api/admin/dashboard/recent-activity
```

**Description**: Fetch recent user and system activities

**Response** (200 OK):

```json
{
  "activities": [
    {
      "id": "act_001",
      "type": "user_registration",
      "description": "New user registered",
      "user": "John Doe",
      "timestamp": "2026-03-01T10:30:00Z",
      "amount": null
    },
    {
      "id": "act_002",
      "type": "purchase",
      "description": "User purchased credits",
      "user": "Jane Smith",
      "timestamp": "2026-03-01T09:15:00Z",
      "amount": 49.99
    }
  ]
}
```

---

## 👥 User Management Endpoints

### Get All Users (Paginated & Searchable)

```
GET /api/admin/users?page=1&limit=10&status=active&search=
```

**Query Parameters**:

- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `status` (string): Filter by status - `active|suspended|all` (default: all)
- `search` (string): Search by name or email

**Response** (200 OK):

```json
{
  "data": [
    {
      "id": "user_001",
      "name": "John Doe",
      "email": "john@example.com",
      "credits": 500,
      "status": "active",
      "joinDate": "2026-01-15T00:00:00Z",
      "lastActivity": "2026-03-01T10:00:00Z",
      "totalPurchased": 12
    }
  ],
  "total": 1500,
  "page": 1,
  "limit": 10
}
```

---

### Get User Details

```
GET /api/admin/users/:userId
```

**URL Parameters**:

- `userId` (string): User ID

**Response** (200 OK):

```json
{
  "id": "user_001",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+855 92 123 4567",
  "credits": 500,
  "status": "active",
  "joinDate": "2026-01-15T00:00:00Z",
  "totalSpent": 500.0,
  "recentTransactions": [
    {
      "id": "txn_001",
      "amount": 49.99,
      "date": "2026-03-01T00:00:00Z",
      "status": "completed"
    }
  ]
}
```

---

### Add Credits to User

```
POST /api/admin/users/:userId/credits/add
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body**:

```json
{
  "amount": 100,
  "reason": "bonus|refund|promo|other",
  "adminNote": "Monthly promotion bonus"
}
```

**Response** (200 OK):

```json
{
  "userId": "user_001",
  "previousBalance": 500,
  "newBalance": 600,
  "transactionId": "txn_001",
  "timestamp": "2026-03-01T10:30:00Z"
}
```

---

### Deduct Credits from User

```
POST /api/admin/users/:userId/credits/deduct
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body**:

```json
{
  "amount": 50,
  "reason": "refund|adjustment|chargeback|other",
  "adminNote": "Customer requested refund"
}
```

**Response** (200 OK):

```json
{
  "userId": "user_001",
  "previousBalance": 600,
  "newBalance": 550,
  "transactionId": "txn_002",
  "timestamp": "2026-03-01T10:35:00Z"
}
```

---

### Toggle User Status

```
PATCH /api/admin/users/:userId/status
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body**:

```json
{
  "status": "active|suspended",
  "reason": "Suspicious activity"
}
```

**Response** (200 OK):

```json
{
  "id": "user_001",
  "status": "suspended",
  "reason": "Suspicious activity",
  "updatedAt": "2026-03-01T10:30:00Z"
}
```

---

### Delete User

```
DELETE /api/admin/users/:userId
Authorization: Bearer {token}
```

**Response** (200 OK):

```json
{
  "success": true,
  "message": "User deleted successfully",
  "deletedUserId": "user_001"
}
```

---

## 📦 Credit Packages Endpoints

### Get All Credit Packages

```
GET /api/admin/credit-packages?status=all
```

**Query Parameters**:

- `status` (string): Filter by status - `active|inactive|all` (default: all)

**Response** (200 OK):

```json
{
  "data": [
    {
      "id": "pkg_001",
      "name": "Starter Pack",
      "credits": 100,
      "price": 9.99,
      "currency": "USD",
      "bonusCredits": 10,
      "discountPercentage": 0,
      "isActive": true,
      "createdAt": "2026-01-01T00:00:00Z",
      "updatedAt": "2026-03-01T00:00:00Z"
    },
    {
      "id": "pkg_002",
      "name": "Pro Pack",
      "credits": 500,
      "price": 39.99,
      "currency": "USD",
      "bonusCredits": 50,
      "discountPercentage": 5,
      "isActive": true,
      "createdAt": "2026-01-15T00:00:00Z",
      "updatedAt": "2026-03-01T00:00:00Z"
    }
  ]
}
```

---

### Create Credit Package

```
POST /api/admin/credit-packages
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body**:

```json
{
  "name": "Enterprise Pack",
  "credits": 1000,
  "price": 79.99,
  "currency": "USD",
  "bonusCredits": 100,
  "discountPercentage": 10,
  "isActive": true
}
```

**Response** (201 Created):

```json
{
  "id": "pkg_003",
  "name": "Enterprise Pack",
  "credits": 1000,
  "price": 79.99,
  "currency": "USD",
  "bonusCredits": 100,
  "discountPercentage": 10,
  "isActive": true,
  "createdAt": "2026-03-01T10:30:00Z",
  "updatedAt": "2026-03-01T10:30:00Z"
}
```

---

### Update Credit Package

```
PATCH /api/admin/credit-packages/:packageId
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body** (all fields optional):

```json
{
  "name": "Updated Starter Pack",
  "price": 8.99,
  "discountPercentage": 5
}
```

**Response** (200 OK):

```json
{
  "id": "pkg_001",
  "name": "Updated Starter Pack",
  "credits": 100,
  "price": 8.99,
  "currency": "USD",
  "bonusCredits": 10,
  "discountPercentage": 5,
  "isActive": true,
  "updatedAt": "2026-03-01T10:35:00Z"
}
```

---

### Toggle Package Status

```
PATCH /api/admin/credit-packages/:packageId/toggle-status
Authorization: Bearer {token}
```

**Response** (200 OK):

```json
{
  "id": "pkg_001",
  "name": "Starter Pack",
  "isActive": false,
  "updatedAt": "2026-03-01T10:40:00Z"
}
```

---

### Delete Credit Package

```
DELETE /api/admin/credit-packages/:packageId
Authorization: Bearer {token}
```

**Response** (200 OK):

```json
{
  "success": true,
  "message": "Credit package deleted successfully",
  "deletedPackageId": "pkg_001"
}
```

---

## 💰 Transaction Management Endpoints

### Get All Transactions (Paginated & Searchable)

```
GET /api/admin/transactions?page=1&limit=10&status=all&search=
```

**Query Parameters**:

- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `status` (string): Filter - `paid|unpaid|all` (default: all)
- `search` (string): Search by transaction ID or username

**Response** (200 OK):

```json
{
  "data": [
    {
      "id": "TX-9814",
      "user": "Charlie Davis",
      "userId": "user_003",
      "amount": 9.99,
      "currency": "USD",
      "method": "bank_transfer",
      "status": "unpaid",
      "date": "2026-02-15T10:00:00Z",
      "userNote": "Amount mismatch - sent wrong amount",
      "proofImageUrl": "https://example.com/proof.jpg",
      "verificationNote": null,
      "verifiedAt": null
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 10
}
```

---

### Get Transaction Details

```
GET /api/admin/transactions/:transactionId
```

**Response** (200 OK):

```json
{
  "id": "TX-9814",
  "user": "Charlie Davis",
  "userId": "user_003",
  "amount": 9.99,
  "currency": "USD",
  "method": "bank_transfer",
  "status": "unpaid",
  "date": "2026-02-15T10:00:00Z",
  "userNote": "Amount mismatch - sent wrong amount",
  "proofImageUrl": "https://example.com/proof.jpg",
  "verificationNote": null,
  "verifiedAt": null,
  "transactionDetails": {
    "hash": "6f802c25",
    "fromAccountId": "aclbkhppxxx@aclb",
    "toAccountId": "vathanak_phy@aclb",
    "currency": "USD",
    "amount": 9.99,
    "description": "6f802c25 | KHQR",
    "trackingStatus": "Completed",
    "createdDate": "2026-02-15T10:00:00Z"
  }
}
```

---

### Verify Payment by Hash (Backend Integration)

```
POST /api/admin/transactions/verify-by-hash
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body**:

```json
{
  "transactionHash": "6f802c25",
  "amount": 121
}
```

**Response** (200 OK):

```json
{
  "status": "Success",
  "senderAccountId": "aclbkhppxxx@aclb",
  "recipientAccountId": "vathanak_phy@aclb",
  "amount": 121,
  "currency": "USD",
  "description": "6f802c25 | KHQR",
  "transactionDate": "2026-03-01T15:31:38 Asia/Phnom_Penh",
  "trackingStatus": "Completed"
}
```

**Error Response** (400 Bad Request):

```json
{
  "status": "Failed",
  "message": "Transaction not found or amount mismatch"
}
```

---

### Mark Transaction as Paid

```
POST /api/admin/transactions/:transactionId/verify
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body**:

```json
{
  "verificationNote": "Verified via payment backend - Hash: 6f802c25"
}
```

**Response** (200 OK):

```json
{
  "id": "TX-9814",
  "status": "paid",
  "verifiedAt": "2026-03-01T10:30:00Z",
  "verificationNote": "Verified via payment backend - Hash: 6f802c25"
}
```

---

### Mark Transaction as Unpaid (Reject Payment)

```
POST /api/admin/transactions/:transactionId/reject
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body**:

```json
{
  "reason": "Amount mismatch",
  "verificationNote": "User sent $100 instead of required $121"
}
```

**Response** (200 OK):

```json
{
  "id": "TX-9814",
  "status": "unpaid",
  "rejectionReason": "Amount mismatch",
  "rejectedAt": "2026-03-01T10:30:00Z",
  "verificationNote": "User sent $100 instead of required $121"
}
```

---

### Search Transactions

```
GET /api/admin/transactions/search?q=TX-9814&status=unpaid
```

**Query Parameters**:

- `q` (string): Search query (transaction ID or username)
- `status` (string): Filter by status - `paid|unpaid`

---

## 📋 Evaluations Endpoints

### Get All Evaluations

```
GET /api/admin/evaluations?page=1&limit=10&status=pending
```

**Query Parameters**:

- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `status` (string): Filter - `pending|approved|rejected|all` (default: all)

**Response** (200 OK):

```json
{
  "data": [
    {
      "id": "eval_001",
      "userId": "user_001",
      "userName": "John Doe",
      "type": "assignment",
      "status": "pending",
      "submittedAt": "2026-03-01T09:00:00Z",
      "reviewedAt": null,
      "reviewer": null
    }
  ],
  "total": 45,
  "page": 1
}
```

---

## 📸 File Upload Endpoints

### Upload Transaction Proof Image

```
POST /api/admin/transactions/:transactionId/upload-proof
Content-Type: multipart/form-data
Authorization: Bearer {token}

Form Data:
- file: <image file>
```

**Response** (200 OK):

```json
{
  "transactionId": "TX-9814",
  "proofImageUrl": "https://example.com/uploads/TX-9814-proof.jpg",
  "uploadedAt": "2026-03-01T10:30:00Z"
}
```

---

## 🔐 Authentication Endpoint

### Admin Login

```
POST /api/auth/login
Content-Type: application/json
```

**Request Body**:

```json
{
  "email": "admin@example.com",
  "password": "securePassword123",
  "role": "admin"
}
```

**Response** (200 OK):

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "admin_001",
    "name": "Admin User",
    "email": "admin@example.com",
    "role": "admin"
  },
  "expiresIn": 3600
}
```

---

## 🔗 Integration Notes

### Headers Required

All authenticated endpoints require:

```http
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

### Error Response Format

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### Status Codes

- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `500`: Server Error

---

## ✅ Implementation Checklist

- [ ] Create NestJS/Express controllers for all endpoints
- [ ] Add input validation (DTO/Schemas)
- [ ] Implement JWT authentication middleware
- [ ] Add database queries/ORM integration
- [ ] Implement error handling
- [ ] Add logging & monitoring
- [ ] Write unit tests
- [ ] Add API documentation (Swagger/OpenAPI)
- [ ] Set up CORS headers
- [ ] Configure rate limiting

---

**Last Updated**: March 1, 2026  
**Version**: 1.0.0
