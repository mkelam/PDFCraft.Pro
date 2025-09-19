# Paystack Integration Guide - PDFCraft.Pro

## Overview

This guide documents the complete Paystack payment integration for PDFCraft.Pro, replacing the previous Stripe integration. Paystack enables seamless payment processing for Nigerian, Ghanaian, South African, and Kenyan markets.

## Features Implemented

### ✅ Core Payment Features
- **Transaction Initialization**: Create secure payment sessions
- **Payment Verification**: Server-side transaction verification
- **Webhook Handling**: Real-time payment status updates
- **Plan Management**: Starter (₦25) and Pro (₦75) subscription tiers
- **Multi-Currency Support**: NGN, USD, GHS, ZAR, KES

### ✅ Security Features
- **Webhook Signature Verification**: Cryptographic validation of incoming webhooks
- **Rate Limiting**: Protection against payment abuse
- **Input Validation**: Comprehensive request validation with Joi
- **SQL Injection Protection**: Parameterized database queries

### ✅ Database Integration
- **Transaction Tracking**: Complete payment history storage
- **User Plan Updates**: Automatic subscription tier management
- **Metadata Storage**: Custom transaction data preservation

## API Endpoints

### Payment Endpoints

#### Initialize Payment
```http
POST /api/paystack/initialize
Content-Type: application/json

{
  "email": "user@example.com",
  "plan": "starter", // or "pro"
  "userId": 123 // optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment initialized successfully",
  "data": {
    "authorization_url": "https://checkout.paystack.com/...",
    "access_code": "access_code_here",
    "reference": "pdfcraft_1703123456_abc123",
    "plan": {
      "name": "Starter",
      "price": 2500,
      "currency": "NGN"
    },
    "amount": 25.00
  }
}
```

#### Verify Payment
```http
GET /api/paystack/verify/:reference
```

**Response:**
```json
{
  "success": true,
  "message": "Payment verification completed",
  "data": {
    "status": "success",
    "reference": "pdfcraft_1703123456_abc123",
    "amount": 25.00,
    "currency": "NGN",
    "paid_at": "2024-12-20T10:30:00Z",
    "customer": {
      "email": "user@example.com"
    }
  }
}
```

#### Webhook Handler
```http
POST /api/paystack/webhook
X-Paystack-Signature: signature_here
Content-Type: application/json

{
  "event": "charge.success",
  "data": {
    "reference": "pdfcraft_1703123456_abc123",
    "status": "success",
    "amount": 2500,
    "customer": {
      "email": "user@example.com"
    }
  }
}
```

### Information Endpoints

#### Get Payment Plans
```http
GET /api/paystack/plans
```

#### Get Payment History
```http
GET /api/paystack/history
Authorization: Bearer jwt_token_here
```

#### Get Supported Currencies
```http
GET /api/paystack/currencies
```

## Database Schema

### Payment Transactions Table
```sql
CREATE TABLE payment_transactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  reference VARCHAR(255) UNIQUE NOT NULL,
  user_id INT,
  email VARCHAR(255) NOT NULL,
  plan ENUM('starter', 'pro') NOT NULL,
  amount INT NOT NULL, -- Amount in kobo/cents
  currency VARCHAR(3) DEFAULT 'NGN',
  status ENUM('pending', 'success', 'failed', 'abandoned') DEFAULT 'pending',
  paystack_reference VARCHAR(255),
  access_code VARCHAR(255),
  authorization_url TEXT,
  gateway_response TEXT,
  paid_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verified_at TIMESTAMP NULL,
  metadata JSON,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
```

### Updated Users Table
```sql
ALTER TABLE users
ADD COLUMN last_payment_at TIMESTAMP NULL,
ADD COLUMN subscription_status ENUM('active', 'expired', 'cancelled') DEFAULT NULL,
ADD COLUMN subscription_expires_at TIMESTAMP NULL;
```

## Environment Configuration

### Required Environment Variables
```bash
# Paystack API Keys
PAYSTACK_SECRET_KEY=sk_test_your_test_key
PAYSTACK_PUBLIC_KEY=pk_test_your_public_key

# Application URLs
FRONTEND_URL=https://pdfcraft.pro
API_URL=https://api.pdfcraft.pro

# Database Configuration
DB_HOST=your-mysql-host
DB_NAME=pdfcraft_db
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# JWT Secret
JWT_SECRET=your_64_character_secret_key
```

### Paystack Dashboard Configuration

1. **Get API Keys**:
   - Visit [Paystack Dashboard](https://dashboard.paystack.com/#/settings/developer)
   - Copy Test/Live Secret and Public keys

2. **Configure Webhook**:
   - Go to Settings > Webhooks
   - Add webhook URL: `https://api.pdfcraft.pro/api/paystack/webhook`
   - Select events: `charge.success`, `charge.dispute.create`, `invoice.create`

## Payment Flow

### Frontend Integration
1. **Plan Selection**: User selects Starter or Pro plan
2. **Payment Initialization**: Call `/api/paystack/initialize`
3. **Redirect to Paystack**: Use returned `authorization_url`
4. **Payment Completion**: Paystack redirects back to your app
5. **Verification**: Call `/api/paystack/verify/:reference`

### Backend Processing
1. **Webhook Reception**: Receive real-time payment events
2. **Signature Verification**: Validate webhook authenticity
3. **Plan Upgrade**: Update user's subscription automatically
4. **Notification**: Send confirmation emails (optional)

## Pricing Structure

```typescript
const plans = {
  free: {
    name: 'Free',
    price: 0,
    conversions_limit: 3,
    max_file_size: 10 * 1024 * 1024 // 10MB
  },
  starter: {
    name: 'Starter',
    price: 2500, // ₦25.00
    conversions_limit: 100,
    max_file_size: 25 * 1024 * 1024 // 25MB
  },
  pro: {
    name: 'Pro',
    price: 7500, // ₦75.00
    conversions_limit: -1, // Unlimited
    max_file_size: 100 * 1024 * 1024 // 100MB
  }
};
```

## Security Considerations

### Webhook Security
- All webhooks are verified using HMAC SHA512 signature
- Invalid signatures are rejected immediately
- Rate limiting prevents webhook abuse

### Data Protection
- Sensitive data is never logged
- Payment references are unique and unpredictable
- Database queries use parameterization to prevent SQL injection

### API Security
- Rate limiting on all payment endpoints
- Input validation with Joi schemas
- JWT authentication for user-specific endpoints

## Error Handling

### Common Errors

#### Payment Initialization Failed
```json
{
  "success": false,
  "message": "Payment initialization failed",
  "error": "Invalid plan selected"
}
```

#### Verification Failed
```json
{
  "success": false,
  "message": "Payment verification failed",
  "error": "Transaction not found"
}
```

#### Webhook Processing Failed
```json
{
  "success": false,
  "message": "Invalid signature"
}
```

## Testing

### Test Mode
- Use Paystack test keys for development
- Test cards: 4084084084084081 (Visa), 5060666666666666666 (Verve)
- Webhook testing with ngrok for local development

### Testing Checklist
- [ ] Payment initialization with valid/invalid data
- [ ] Successful payment flow end-to-end
- [ ] Failed payment handling
- [ ] Webhook signature verification
- [ ] Database transaction recording
- [ ] User plan upgrades
- [ ] Rate limiting functionality

## Deployment

### Production Setup
1. **Update Environment**: Switch to live Paystack keys
2. **Database Migration**: Run payment table migration
3. **Webhook Configuration**: Update webhook URL in Paystack dashboard
4. **SSL Certificate**: Ensure HTTPS for all payment endpoints
5. **Monitor Logs**: Set up payment monitoring and alerts

### Hostinger VPS Deployment
```bash
# 1. Update environment variables
cp .env.paystack.example .env
nano .env  # Fill in production values

# 2. Run database migrations
mysql -u username -p database_name < src/migrations/add_payment_transactions.sql

# 3. Build and restart application
npm run build
pm2 restart pdfcraft-api

# 4. Test payment flow
curl -X POST https://api.pdfcraft.pro/api/paystack/plans
```

## Monitoring

### Key Metrics
- Payment success rate
- Average transaction amount
- Plan upgrade conversions
- Webhook processing latency

### Logging
- All payment events are logged with structured data
- Error tracking with context information
- Webhook events logged for audit trail

## Support

### Common Issues

**Issue**: "Invalid signature" webhook errors
**Solution**: Verify webhook secret key matches Paystack dashboard

**Issue**: Payment verification fails
**Solution**: Check transaction reference format and API key validity

**Issue**: Plan upgrade doesn't work
**Solution**: Verify user ID in payment metadata and database connectivity

### Debug Mode
Enable detailed logging by setting `NODE_ENV=development` and checking application logs.

## Migration from Stripe

The Paystack integration fully replaces the previous Stripe implementation:

### Removed
- Stripe SDK and dependencies
- Stripe webhook handling
- Dollar-based pricing

### Added
- Paystack integration with African market support
- Naira-based pricing (₦25 Starter, ₦75 Pro)
- Enhanced webhook security
- Multi-currency support

---

**Last Updated**: December 2024
**Status**: Production Ready ✅
**Next Steps**: Frontend integration and testing