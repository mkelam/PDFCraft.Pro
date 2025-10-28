# PayFast Integration - Quick Start Guide 🚀

**Your PayFast integration is configured and ready to use!**

---

## ✅ What's Been Configured

### 1. Production Credentials
- **Merchant ID**: `25263515` ✅
- **Merchant Key**: `cyxcghcf5hsbl` ✅
- **Mode**: Production (Live Payments) ✅

### 2. Files Updated
- ✅ `backend/.env.production` - Production credentials added
- ✅ `backend/.env.development` - Development/sandbox credentials added
- ✅ `backend/src/services/payfast.service.ts` - Already implemented
- ✅ `backend/src/controllers/payfast.controller.ts` - Already implemented
- ✅ `backend/src/routes/payfast.routes.ts` - Already registered
- ✅ `backend/src/config/index.ts` - PayFast config validated

### 3. Database Schema
- ✅ `payment_transactions` table exists in schema
- ✅ Migration file created: `002_payfast_payment_table.sql`

---

## 🎯 Next Steps (5 Minutes)

### Step 1: Configure PayFast Dashboard URLs (Required)

Login to your PayFast dashboard and set these URLs:

1. Go to: https://www.payfast.co.za/login
2. Navigate to: **Settings → Integration**
3. Configure these URLs:

```
Return URL:  https://api.pdflab.pro/api/payfast/return
Cancel URL:  https://api.pdflab.pro/api/payfast/cancel
Notify URL:  https://api.pdflab.pro/api/payfast/notify
```

4. Enable **Instant Transaction Notification (ITN)** ✅
5. Save settings ✅

### Step 2: Generate Passphrase (Optional but Recommended)

1. In PayFast dashboard, generate a **Passphrase**
2. Add it to your `.env.production`:
   ```env
   PAYFAST_PASSPHRASE=your_generated_passphrase
   ```

### Step 3: Test Locally (Development)

```bash
# Start the backend server
cd backend
npm run dev

# Open test interface in browser
http://localhost:3001/test-payfast-integration.html

# Or test via API
curl http://localhost:3001/api/payfast/plans
```

---

## 🧪 Quick Test Commands

### 1. Get Available Plans
```bash
curl http://localhost:3001/api/payfast/plans
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "starter",
      "name": "Starter",
      "price": 129,
      "currency": "ZAR"
    }
  ]
}
```

### 2. Initialize Payment
```bash
curl -X POST http://localhost:3001/api/payfast/initialize \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "firstName": "Test",
    "lastName": "User",
    "plan": "starter"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "payment_url": "https://www.payfast.co.za/eng/process",
    "payment_id": "guest_starter_1729728000000",
    "amount": 129
  }
}
```

---

## 📊 Subscription Plans (South African Pricing)

| Plan | Monthly Price | Features |
|------|---------------|----------|
| **Starter** | R129 (~$7 USD) | 100 conversions/month, 25MB files, OCR |
| **Pro** | R349 (~$19 USD) | Unlimited conversions, 100MB files, All features |
| **Enterprise** | R1,799 (~$99 USD) | Unlimited conversions, 500MB files, API access |

---

## 🔄 Payment Flow

1. **User clicks "Upgrade" on frontend** → Frontend calls `/api/payfast/initialize`
2. **Backend generates payment form** → Returns payment URL and ID
3. **Frontend redirects user to PayFast** → User enters card details
4. **PayFast processes payment** → User completes payment
5. **User redirected back to app** → Return URL with payment confirmation
6. **PayFast sends webhook (IPN)** → Backend receives notification at `/api/payfast/notify`
7. **Backend verifies webhook** → Validates signature and updates user subscription
8. **User access granted** → User can now use paid features

---

## 🚀 Deployment Checklist

### Before Going Live

- [ ] PayFast dashboard URLs configured
- [ ] ITN (webhooks) enabled in PayFast
- [ ] Passphrase generated and configured (optional)
- [ ] Test R1 payment completed successfully
- [ ] Webhook received and verified
- [ ] User subscription upgraded correctly
- [ ] Production environment variables set
- [ ] SSL certificate installed on server
- [ ] Domain pointing to production server

### Production Environment Variables Required

```env
NODE_ENV=production
PAYFAST_MERCHANT_ID=25263515
PAYFAST_MERCHANT_KEY=cyxcghcf5hsbl
PAYFAST_PASSPHRASE=your_passphrase_here
PAYFAST_MODE=production
```

---

## 🔐 Security Features

✅ **Signature Verification** - All payments verified with MD5 signatures
✅ **IP Whitelisting** - Only PayFast IPs can send webhooks
✅ **Rate Limiting** - Protection against abuse
✅ **Transaction Logging** - All payments logged to database
✅ **Error Handling** - Comprehensive error recovery

---

## 🛠️ Available Test Interface

Open in your browser after starting the server:

```
http://localhost:3001/test-payfast-integration.html
```

This interface allows you to:
- ✅ View available plans
- ✅ Initialize test payments
- ✅ Check payment status
- ✅ See all API endpoints

---

## 📞 Support & Documentation

### PayFast Resources
- **Dashboard**: https://www.payfast.co.za/login
- **Documentation**: https://developers.payfast.co.za/docs
- **Support**: support@payfast.co.za
- **Phone**: +27 (0)21 100 3939

### Project Documentation
- **Full Setup Guide**: `backend/PAYFAST_SETUP_COMPLETE.md`
- **Database Schema**: `backend/src/migrations/001_initial_schema.sql`
- **PayFast Service**: `backend/src/services/payfast.service.ts`
- **PayFast Controller**: `backend/src/controllers/payfast.controller.ts`

---

## 🎉 You're Ready!

Your PayFast integration is **fully configured** and ready for testing!

### Quick Actions:
1. ✅ Start server: `cd backend && npm run dev`
2. ✅ Open test page: http://localhost:3001/test-payfast-integration.html
3. ✅ Test payment flow with sandbox mode
4. ✅ Configure PayFast dashboard URLs
5. ✅ Deploy to production!

---

**Need Help?**
- Check server logs: `pm2 logs pdflab-api`
- Review PayFast dashboard for transaction history
- Test webhook delivery in PayFast portal

---

*Last Updated: October 23, 2025*
*PDFLab.Pro - Payment Integration Complete* ✅
