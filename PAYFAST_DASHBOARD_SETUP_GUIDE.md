# PayFast Dashboard Setup Guide

**Time Required**: 5 minutes
**Status**: Step 1 of 3

---

## 🎯 Step 1: Update PayFast Dashboard URLs

This is **CRITICAL** for your payment integration to work!

### What You Need

- **PayFast Account Credentials**
- **Merchant ID**: 25263515
- **Merchant Key**: cyxcghcf5hsbl

---

## 📝 Step-by-Step Instructions

### 1. Login to PayFast

Go to: **https://www.payfast.co.za/login**

Enter your credentials and login.

---

### 2. Navigate to Integration Settings

Once logged in:

1. Click on **"Settings"** in the top menu
2. Click on **"Integration"** from the dropdown menu

OR

Go directly to: **https://www.payfast.co.za/settings/integration**

---

### 3. Verify Your Merchant Credentials

On the Integration page, verify:

- **Merchant ID**: Should show `25263515` ✅
- **Merchant Key**: Should show `cyxcghcf5hsbl` ✅

If these don't match, you're in the wrong account!

---

### 4. Configure URLs (CRITICAL!)

Scroll down to find these fields and enter **EXACTLY** as shown:

#### Return URL (Success URL)
```
https://api.pdflab.pro/api/payfast/return
```
**What it does**: Where users are redirected after successful payment

#### Cancel URL
```
https://api.pdflab.pro/api/payfast/cancel
```
**What it does**: Where users are redirected if they cancel payment

#### Notify URL (IPN/Webhook URL)
```
https://api.pdflab.pro/api/payfast/notify
```
**What it does**: PayFast sends payment notifications here (MOST IMPORTANT!)

---

### 5. Enable Instant Transaction Notification (ITN)

Find the checkbox or toggle for:
- **"Enable Instant Transaction Notification"** or
- **"Enable IPN"** or
- **"Enable Webhooks"**

✅ **ENABLE THIS!** This is critical for your backend to receive payment notifications.

---

### 6. Passphrase (Optional but Recommended)

If you see a **"Passphrase"** field:

**Option A - Generate One** (Recommended):
1. Click "Generate" or enter a secure passphrase
2. **COPY IT IMMEDIATELY**
3. Add it to your `backend/.env.production`:
   ```env
   PAYFAST_PASSPHRASE=your_generated_passphrase_here
   ```

**Option B - Skip for Now**:
- You can leave it empty
- Your integration will still work
- You can add it later

---

### 7. Save Settings

1. Scroll to the bottom of the page
2. Click **"Save"** or **"Update Settings"**
3. Wait for confirmation message

✅ **You should see a success message!**

---

### 8. Verify Settings (Double-Check!)

Scroll back up and verify:

| Setting | Expected Value |
|---------|---------------|
| Merchant ID | `25263515` ✅ |
| Return URL | `https://api.pdflab.pro/api/payfast/return` ✅ |
| Cancel URL | `https://api.pdflab.pro/api/payfast/cancel` ✅ |
| Notify URL | `https://api.pdflab.pro/api/payfast/notify` ✅ |
| ITN/IPN | **Enabled** ✅ |

---

## ✅ Verification Checklist

After saving, verify:

- [ ] Return URL is correct (no typos!)
- [ ] Cancel URL is correct (no typos!)
- [ ] Notify URL is correct (no typos!)
- [ ] All URLs use `pdflab.pro` (not pdfcraft.pro!)
- [ ] All URLs use `https://` (not http://)
- [ ] All URLs start with `api.pdflab.pro` (not just pdflab.pro!)
- [ ] ITN/IPN is **ENABLED**
- [ ] Settings saved successfully
- [ ] Confirmation message appeared

---

## 🚨 Common Mistakes to Avoid

### ❌ WRONG URLs
```
http://pdflab.pro/...           (Missing 'api' subdomain)
https://pdflab.pro/...           (Missing 'api' subdomain)
https://api.pdfcraft.pro/...     (Old domain!)
```

### ✅ CORRECT URLs
```
https://api.pdflab.pro/api/payfast/return
https://api.pdflab.pro/api/payfast/cancel
https://api.pdflab.pro/api/payfast/notify
```

---

## 🧪 Test Your Configuration

### Before DNS/SSL (Local Testing Only)

For now, PayFast won't be able to reach your URLs until you:
1. Configure DNS (Step 2)
2. Get SSL certificate (Step 3)
3. Deploy your backend

But you can still:
- ✅ Save the settings in PayFast dashboard
- ✅ Test locally with your backend
- ✅ Initialize test payments

### After DNS/SSL (Production Testing)

Once Steps 2 & 3 are done:

1. **Initiate a test payment**:
   ```bash
   curl -X POST https://api.pdflab.pro/api/payfast/initialize \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "firstName": "Test",
       "lastName": "User",
       "plan": "starter"
     }'
   ```

2. **Complete payment on PayFast** (use test card or R1 payment)

3. **Verify webhook received**:
   ```bash
   # Check backend logs
   pm2 logs pdflab-api

   # Or check database
   mysql -u pdflab_user -p pdflab_prod
   SELECT * FROM payment_transactions ORDER BY created_at DESC LIMIT 5;
   ```

---

## 📸 Screenshot Guide

### What You Should See

1. **Settings Menu**
   - Look for "Settings" in top navigation
   - Click "Integration" from dropdown

2. **Integration Page**
   - Should show your Merchant ID (25263515)
   - Should show your Merchant Key (cyxcghcf5hsbl)
   - Three URL fields (Return, Cancel, Notify)
   - ITN/IPN enable checkbox
   - Optional: Passphrase field

3. **After Saving**
   - Success message: "Settings updated successfully" or similar
   - Your URLs should be visible in the fields

---

## 🆘 Troubleshooting

### Can't Find Integration Settings?

Try these menu paths:
- **Settings → Integration**
- **Account Settings → Integration**
- **Merchant Settings → Integration**
- **Developer → Integration**

Or search for: "Integration", "Webhooks", "IPN", "URLs"

### Settings Won't Save?

Common issues:
- ✅ Make sure URLs are **EXACTLY** as shown (no extra spaces!)
- ✅ Make sure all fields are filled
- ✅ Try refreshing the page and re-entering
- ✅ Try a different browser
- ✅ Contact PayFast support if persists

### Wrong Merchant ID Showing?

You might be logged into the wrong account:
- Check you're using account with Merchant ID `25263515`
- You might have multiple PayFast accounts
- Logout and login again
- Check your email for PayFast account confirmation

### Need Help?

**PayFast Support:**
- **Email**: support@payfast.co.za
- **Phone**: +27 (0)21 100 3939
- **Hours**: Mon-Fri, 8am-5pm SAST
- **Docs**: https://developers.payfast.co.za/docs

---

## ✅ Step 1 Complete!

Once you've saved your settings in PayFast dashboard, you're done with Step 1!

### What You've Accomplished:
✅ Logged into PayFast dashboard
✅ Found Integration settings
✅ Configured Return URL
✅ Configured Cancel URL
✅ Configured Notify URL (Webhook)
✅ Enabled ITN/IPN
✅ Saved settings
✅ Verified all URLs are correct

---

## 🎯 Next Steps

Now move to:

**Step 2**: Configure DNS Records
- File: `PAYFAST_DASHBOARD_SETUP_GUIDE.md` (you are here)
- Next: Configure your domain registrar

**Step 3**: Get SSL Certificate
- Install SSL with Let's Encrypt
- Secure your api.pdflab.pro domain

---

## 📋 Quick Reference

### Your Configuration
```
Merchant ID:    25263515
Merchant Key:   cyxcghcf5hsbl
Return URL:     https://api.pdflab.pro/api/payfast/return
Cancel URL:     https://api.pdflab.pro/api/payfast/cancel
Notify URL:     https://api.pdflab.pro/api/payfast/notify
ITN/IPN:        ENABLED
```

### Important Notes
- ✅ URLs must use `https://` (not http://)
- ✅ URLs must use `api.pdflab.pro` subdomain
- ✅ ITN/IPN **MUST** be enabled
- ✅ No trailing slashes in URLs
- ✅ Case-sensitive paths

---

**🎉 Great job! Step 1 is complete when you see that success message!**

*Last Updated: October 23, 2025*
*Part of: PDFLab.Pro PayFast Integration Guide*
