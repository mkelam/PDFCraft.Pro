# Frontend Authentication Testing Guide

## Quick Start

**Test Page URL:** `file:///C:/Users/Mac/OneDrive/Desktop/Projects/pdflab.pro/frontend-auth-test.html`

The test page has been opened in your browser automatically.

---

## System Status

✅ **Backend Running:** http://localhost:3015
✅ **Frontend Running:** http://localhost:3002
✅ **Authentication Fix:** Applied and verified
✅ **Test Suite Ready:** 6 comprehensive tests

---

## Test Flow (Step-by-Step)

### Test 1: User Registration ✅
1. Click **"Register New User"** button
2. **Expected:** Success message with user ID
3. **What it tests:** User creation and email sending

### Test 2: User Login ✅
1. Click **"Login"** button (credentials auto-filled)
2. **Expected:** Token received, email_verified: NO
3. **What it tests:** JWT token generation

### Test 3: Conversion Without Auth 🔒
1. Select any PDF file
2. Click **"Try Convert Without Auth"**
3. **Expected:** ❌ 401 Unauthorized - "Access token required"
4. **What it tests:** Authentication enforcement

### Test 4: Conversion With Unverified Email 🔒
1. Select any PDF file
2. Click **"Try Convert (Unverified Email)"**
3. **Expected:** ❌ 403 Forbidden - "Email verification required"
4. **What it tests:** Email verification enforcement

### Test 5: Simulate Email Verification 📧
1. Click **"Manually Verify Email (Dev Only)"**
2. This simulates what would happen when user clicks email link
3. **Note:** In production, this is done via email verification link

**Manual Step Required:**
Open backend database and run:
```sql
UPDATE users SET email_verified = 1 WHERE email = 'test.frontend@pdflab.pro';
```

Or use this quick command:
```bash
cd backend && npx ts-node -e "
const sqlite3 = require('better-sqlite3');
const db = sqlite3('./data/pdflab.db');
db.prepare('UPDATE users SET email_verified = 1 WHERE email = ?').run('test.frontend@pdflab.pro');
console.log('Email verified!');
db.close();
"
```

### Test 6: Login Again (Get Verified Token) ✅
1. Click **"Login"** button again
2. **Expected:** New token with email_verified: YES
3. **What it tests:** Token refresh with updated status

### Test 7: Successful Conversion ✅
1. Select any PDF file
2. Click **"Convert PDF to PowerPoint"**
3. **Expected:** ✅ 202 Accepted - Job ID returned
4. **What it tests:** Full authenticated conversion flow

---

## What Each Test Verifies

| Test | Authentication | Email Verification | Expected Result |
|------|---------------|-------------------|-----------------|
| No Auth | ❌ Missing | N/A | 401 Unauthorized |
| Unverified Email | ✅ Valid Token | ❌ Not Verified | 403 Forbidden |
| Verified Email | ✅ Valid Token | ✅ Verified | 202 Accepted |

---

## Test Results Dashboard

The test page includes a real-time stats dashboard:
- **Tests Run** - Total number of tests executed
- **Passed** - Number of successful tests
- **Failed** - Number of failed tests
- **Success Rate** - Percentage of passing tests

**Target Success Rate:** 100% (all 6 tests passing)

---

## Console Log

The black console at the bottom shows:
- ✅ Green text = Success
- ❌ Red text = Error
- ℹ️ Blue text = Info
- ⚠️ Yellow text = Warning

All API requests and responses are logged in real-time.

---

## Expected Authentication Flow

```
1. User Registers
   ↓
2. User Receives Email (check backend logs)
   ↓
3. User Logs In (gets token, but email_verified=0)
   ↓
4. User Tries to Convert → BLOCKED (403 Forbidden)
   ↓
5. User Clicks Email Verification Link (or manual DB update)
   ↓
6. User Logs In Again (gets new token with email_verified=1)
   ↓
7. User Converts PDF → SUCCESS (202 Accepted)
```

---

## Sample Test PDF

If you don't have a PDF file handy, create one:

**Option 1:** Create simple test PDF
```javascript
// Run in browser console
const doc = new jsPDF();
doc.text("Test PDF for Authentication", 10, 10);
doc.save("test-auth.pdf");
```

**Option 2:** Use existing test file
Look for `simple-test.pdf` or `test.pdf` in the project root.

---

## Troubleshooting

### CORS Errors
If you see CORS errors in console:
- ✅ Backend already configured with CORS
- ✅ localhost:3002 is whitelisted
- Try refreshing the page

### "Cannot connect to API"
Check backend is running:
```bash
# Should show output
curl http://localhost:3015/
```

If not running:
```bash
cd backend
PORT=3015 npx ts-node --transpile-only src/server.ts
```

### Email Verification Not Working
The test uses a dev workaround. To properly verify:

1. Check backend logs for verification email
2. Find the verification token in logs
3. Open: `http://localhost:3015/api/auth/verify-email/{TOKEN}`

Or manually update database as shown in Test 5.

---

## Backend Logs to Monitor

Watch the backend terminal for:

```bash
✅ PASS: User registration
📧 Email sent to: test.frontend@pdflab.pro
🔑 Login successful
🚫 Conversion blocked - Email not verified (403)
✅ Conversion started - Job ID: xxx-xxx-xxx
```

---

## Critical Security Tests

These are the most important tests that verify the fix:

### ✅ Test 3: No Auth = 401
**Before Fix:** ❌ Conversion allowed (SECURITY BREACH)
**After Fix:** ✅ Conversion blocked with 401

### ✅ Test 4: Unverified Email = 403
**Before Fix:** ❌ Conversion allowed (SECURITY BREACH)
**After Fix:** ✅ Conversion blocked with 403

### ✅ Test 7: Verified + Auth = 202
**Before Fix:** ✅ Worked (but so did everything else)
**After Fix:** ✅ Only this scenario works

---

## Success Criteria

**All 6 tests must show:**
- ✅ Tests 1-2: Registration and Login work
- ✅ Test 3: Request without token is REJECTED (401)
- ✅ Test 4: Request without email verification is REJECTED (403)
- ✅ Test 5: Email verification process works
- ✅ Test 7: Authenticated + verified request SUCCEEDS (202)

**Expected Final Stats:**
```
Tests Run: 6
Passed: 6
Failed: 0
Success Rate: 100%
```

---

## Next Steps After Testing

If all tests pass:
1. ✅ Authentication system is production-ready
2. ✅ Security vulnerability is fixed
3. ✅ Move to payment integration testing
4. ✅ Prepare for production deployment

If any tests fail:
1. Check backend logs for errors
2. Verify server is running on port 3015
3. Ensure database is accessible
4. Review CORS configuration

---

## API Endpoints Being Tested

```
POST /api/auth/register
POST /api/auth/login
POST /api/convert/pdf-to-ppt (with various auth states)
```

---

## Contact & Support

- **Test Page:** `frontend-auth-test.html`
- **Backend API:** http://localhost:3015
- **Frontend App:** http://localhost:3002
- **Database:** `backend/data/pdflab.db`

---

**Happy Testing! 🚀**
