# Hostinger Email DNS Configuration Guide
## Complete Setup for PDFLab.Pro Email Service

**Date:** October 24, 2025
**Domain:** pdflab.pro
**Email Service:** Hostinger Email

---

## 📋 Overview

To use Hostinger's email service (noreply@pdflab.pro, support@pdflab.pro), you need to configure 4 critical DNS records:

1. **MX Records** - Allow receiving emails
2. **SPF Records** - Prevent email spoofing
3. **DKIM Records** - Verify email authenticity
4. **DMARC Records** - Email authentication policy

---

## 🚀 Step-by-Step Setup

### **Step 1: Access Hostinger DNS Manager**

1. Log in to **Hostinger Control Panel** (hpanel.hostinger.com)
2. Go to **Domains** section
3. Click on **pdflab.pro** domain
4. Click **DNS / Name Servers** button
5. You'll see the DNS records management page

---

### **Step 2: Add MX Records (Mail Exchange)**

**Purpose:** Tells the internet where to deliver emails sent to @pdflab.pro

**Click "Add Record" and enter these MX records:**

| Type | Name | Points To | Priority | TTL |
|------|------|-----------|----------|-----|
| MX | @ | mx1.hostinger.com | 10 | 14400 |
| MX | @ | mx2.hostinger.com | 20 | 14400 |

**Exact Settings:**
```
Record 1:
Type: MX
Name: @ (or leave blank for root domain)
Points to: mx1.hostinger.com
Priority: 10
TTL: 14400 (or default)

Record 2:
Type: MX
Name: @ (or leave blank)
Points to: mx2.hostinger.com
Priority: 20
TTL: 14400
```

⚠️ **Note:** Lower priority number = higher priority. mx1 (priority 10) will be tried first.

---

### **Step 3: Add SPF Record (Sender Policy Framework)**

**Purpose:** Prevents spammers from sending emails pretending to be from @pdflab.pro

**Click "Add Record" and enter SPF:**

| Type | Name | Value | TTL |
|------|------|-------|-----|
| TXT | @ | `v=spf1 include:_spf.hostinger.com ~all` | 14400 |

**Exact Settings:**
```
Type: TXT
Name: @ (or leave blank)
Value: v=spf1 include:_spf.hostinger.com ~all
TTL: 14400
```

**What this means:**
- `v=spf1` - SPF version 1
- `include:_spf.hostinger.com` - Allow Hostinger's servers to send email
- `~all` - Soft fail for other servers (recommended for testing)

💡 **After testing, change to `-all` (hard fail) for maximum security:**
```
v=spf1 include:_spf.hostinger.com -all
```

---

### **Step 4: Add DKIM Record (DomainKeys Identified Mail)**

**Purpose:** Adds digital signature to outgoing emails to prove they're legitimate

**⚠️ IMPORTANT:** You need to get your DKIM key from Hostinger first!

#### **How to Get Your DKIM Key:**

1. In Hostinger Control Panel, go to **Emails**
2. Click on **Email Accounts**
3. Look for **DKIM Settings** or **Email Authentication**
4. Click **Generate DKIM Key** (if not already generated)
5. Copy the DKIM record shown

**The DKIM record will look like this:**

| Type | Name | Value | TTL |
|------|------|-------|-----|
| TXT | default._domainkey | `v=DKIM1; k=rsa; p=MIGfMA0GCSq...` (long key) | 14400 |

**Exact Settings:**
```
Type: TXT
Name: default._domainkey
Value: v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQ... (copy from Hostinger)
TTL: 14400
```

📌 **Can't find DKIM settings?** Contact Hostinger support - they'll provide your DKIM key.

---

### **Step 5: Add DMARC Record (Domain-based Message Authentication)**

**Purpose:** Tells receiving servers what to do with emails that fail SPF/DKIM checks

**Click "Add Record" and enter DMARC:**

| Type | Name | Value | TTL |
|------|------|-------|-----|
| TXT | _dmarc | `v=DMARC1; p=quarantine; rua=mailto:dmarc@pdflab.pro` | 14400 |

**Exact Settings:**
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@pdflab.pro; pct=100
TTL: 14400
```

**What this means:**
- `v=DMARC1` - DMARC version 1
- `p=quarantine` - Put suspicious emails in spam folder
- `rua=mailto:dmarc@pdflab.pro` - Send reports to this email
- `pct=100` - Apply policy to 100% of emails

**DMARC Policy Options:**
- `p=none` - Monitor only (for testing - **START WITH THIS**)
- `p=quarantine` - Send to spam if failed (recommended)
- `p=reject` - Block completely if failed (strictest)

💡 **Recommended Progression:**
1. Start with `p=none` for 1 week (monitor)
2. Change to `p=quarantine` for 1 week (test)
3. Change to `p=reject` (maximum protection)

---

## 🎯 Quick Copy-Paste Values

### **Beginner-Friendly DMARC (Start Here):**
```
v=DMARC1; p=none; rua=mailto:dmarc@pdflab.pro
```

### **Production-Ready DMARC (After Testing):**
```
v=DMARC1; p=quarantine; rua=mailto:dmarc@pdflab.pro; pct=100; adkim=r; aspf=r
```

### **Maximum Security DMARC (Final):**
```
v=DMARC1; p=reject; rua=mailto:dmarc@pdflab.pro; ruf=mailto:dmarc@pdflab.pro; pct=100; adkim=s; aspf=s
```

---

## ✅ Verification Checklist

After adding all DNS records, verify they're working:

### **1. Check DNS Propagation (Wait 1-24 hours)**

Visit: https://www.whatsmydns.net/

Search for:
- `pdflab.pro` - MX records
- `pdflab.pro` - TXT records (SPF)
- `default._domainkey.pdflab.pro` - TXT records (DKIM)
- `_dmarc.pdflab.pro` - TXT records (DMARC)

### **2. Test Email Deliverability**

Visit: https://www.mail-tester.com/

1. Get the test email address shown
2. Send email from noreply@pdflab.pro to that address
3. Check your score (aim for 10/10)

### **3. Test SPF**

Visit: https://mxtoolbox.com/spf.aspx

Enter: `pdflab.pro`

Should show: ✅ `v=spf1 include:_spf.hostinger.com ~all`

### **4. Test DKIM**

Visit: https://mxtoolbox.com/dkim.aspx

Enter:
- Domain: `pdflab.pro`
- Selector: `default`

Should show: ✅ DKIM record found

### **5. Test DMARC**

Visit: https://mxtoolbox.com/dmarc.aspx

Enter: `pdflab.pro`

Should show: ✅ DMARC record found

---

## 🔧 Backend Configuration

Once DNS is configured, update your backend `.env` file:

```bash
# Hostinger SMTP Settings
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465  # SSL/TLS (recommended) or 587 for STARTTLS
SMTP_USER=noreply@pdflab.pro  # Your Hostinger email
SMTP_PASSWORD=your-email-password-here  # Get from Hostinger email settings
SMTP_FROM=PDFLab.Pro <noreply@pdflab.pro>

# Support Email
SUPPORT_EMAIL=support@pdflab.pro

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:3020  # Development
# FRONTEND_URL=https://pdflab.pro  # Production
```

### **Where to Find SMTP Password:**

1. Go to **Hostinger Control Panel** → **Emails**
2. Click on **noreply@pdflab.pro** email account
3. Click **Change Password** or **View Password**
4. Copy the password

---

## 🎨 Complete DNS Configuration Summary

After setup, your DNS records should look like this:

```
# MX Records (Mail Delivery)
pdflab.pro.  14400  MX  10  mx1.hostinger.com.
pdflab.pro.  14400  MX  20  mx2.hostinger.com.

# SPF Record (Sender Authentication)
pdflab.pro.  14400  TXT  "v=spf1 include:_spf.hostinger.com ~all"

# DKIM Record (Email Signature)
default._domainkey.pdflab.pro.  14400  TXT  "v=DKIM1; k=rsa; p=MIGfMA0..."

# DMARC Record (Email Policy)
_dmarc.pdflab.pro.  14400  TXT  "v=DMARC1; p=quarantine; rua=mailto:dmarc@pdflab.pro"
```

---

## ⚠️ Common Issues & Solutions

### **Issue 1: DNS Records Not Showing**
**Solution:** DNS propagation takes 1-24 hours. Check progress at whatsmydns.net

### **Issue 2: Emails Going to Spam**
**Checklist:**
- ✅ All 4 records configured (MX, SPF, DKIM, DMARC)
- ✅ DKIM key generated and correct
- ✅ SPF includes Hostinger servers
- ✅ DMARC policy set correctly
- ✅ Reverse DNS configured (contact Hostinger)

### **Issue 3: Can't Find DKIM Key**
**Solution:**
1. Contact Hostinger support via live chat
2. Ask: "Please provide my DKIM record for pdflab.pro"
3. They'll give you the exact TXT record to add

### **Issue 4: Mail Tester Score Below 10/10**
**Common Fixes:**
- Add reverse DNS (PTR record) - contact Hostinger
- Ensure all 4 records are present
- Wait 24 hours for DNS propagation
- Check email content for spam triggers

---

## 📞 Need Help?

### **Hostinger Support:**
- **Live Chat:** 24/7 via hpanel.hostinger.com
- **Email:** support@hostinger.com
- **Phone:** Check your region's number on their website

### **Ask Hostinger For:**
1. "My DKIM record for pdflab.pro"
2. "Help configuring email authentication records"
3. "Verify my email DNS is configured correctly"

---

## 🚀 Quick Start Checklist

- [ ] Log in to Hostinger Control Panel
- [ ] Navigate to Domains → pdflab.pro → DNS
- [ ] Add 2 MX records (mx1 and mx2)
- [ ] Add SPF TXT record
- [ ] Get DKIM key from Hostinger support
- [ ] Add DKIM TXT record
- [ ] Add DMARC TXT record (start with `p=none`)
- [ ] Wait 24 hours for DNS propagation
- [ ] Test with mail-tester.com (aim for 10/10)
- [ ] Update backend .env with SMTP credentials
- [ ] Send test email from application
- [ ] Monitor DMARC reports
- [ ] Upgrade DMARC to `p=quarantine` after 1 week
- [ ] Final upgrade to `p=reject` after another week

---

## 🎯 Expected Timeline

| Step | Time Required |
|------|---------------|
| Add DNS records | 15 minutes |
| DNS propagation | 1-24 hours |
| Get DKIM from Hostinger | 5-30 minutes (via support) |
| Test deliverability | 15 minutes |
| Configure backend | 10 minutes |
| **Total** | **2-26 hours** |

---

**Status:** Ready to configure DNS records!
**Next Step:** Log in to Hostinger and start adding MX records!

**Questions?** Contact Hostinger support - they're very helpful with email DNS setup! 🚀
