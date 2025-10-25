# Social Authentication Setup Guide - PDFCraft.Pro

This guide will help you set up Google, Facebook, and LinkedIn authentication for PDFCraft.Pro.

## Prerequisites

1. ✅ NextAuth.js installed
2. ✅ Social authentication utilities created
3. ✅ Login and signup pages updated
4. ✅ Authentication context configured

## Step 1: Google OAuth Setup

### 1.1 Create Google OAuth Application

1. Go to [Google Cloud Console](https://console.developers.google.com/)
2. Create a new project or select existing project
3. Enable "Google+ API" and "Google OAuth2 API"
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Configure OAuth consent screen:
   - Application name: "PDFCraft.Pro"
   - Authorized domains: `localhost`, `pdfcraft.pro`
6. Create OAuth 2.0 Client ID:
   - Application type: "Web application"
   - Authorized redirect URIs:
     - Development: `http://localhost:3000/api/auth/callback/google`
     - Production: `https://pdfcraft.pro/api/auth/callback/google`

### 1.2 Get Google Credentials

Copy the following values:
- **Client ID**: `1234567890-abcdefghijklmnop.apps.googleusercontent.com`
- **Client Secret**: `ABCD-EfGh_IjKlMnOpQrStUvWx`

Add to `.env.local`:
```bash
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## Step 2: Facebook OAuth Setup

### 2.1 Create Facebook Application

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app → "Consumer" type
3. Add "Facebook Login" product
4. Configure Facebook Login settings:
   - Valid OAuth Redirect URIs:
     - Development: `http://localhost:3000/api/auth/callback/facebook`
     - Production: `https://pdfcraft.pro/api/auth/callback/facebook`

### 2.2 Get Facebook Credentials

From App Dashboard:
- **App ID**: `1234567890123456`
- **App Secret**: `abcdef1234567890abcdef1234567890`

Add to `.env.local`:
```bash
FACEBOOK_CLIENT_ID=your-facebook-app-id
FACEBOOK_CLIENT_SECRET=your-facebook-app-secret
```

## Step 3: LinkedIn OAuth Setup

### 3.1 Create LinkedIn Application

1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/)
2. Create a new app
3. Fill in basic information:
   - App name: "PDFCraft.Pro"
   - Company: Your company
   - Privacy policy URL: `https://pdfcraft.pro/privacy`
   - App logo: Upload your logo
4. In "Auth" tab, add redirect URLs:
   - Development: `http://localhost:3000/api/auth/callback/linkedin`
   - Production: `https://pdfcraft.pro/api/auth/callback/linkedin`

### 3.2 Get LinkedIn Credentials

From Auth tab:
- **Client ID**: `abcdefghij1234567890`
- **Client Secret**: `ABCDEFGH12345678`

Add to `.env.local`:
```bash
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret
```

## Step 4: NextAuth Configuration

✅ **Development Environment Ready**: Your `.env.local` has been configured with:

```bash
# NextAuth Configuration
NEXTAUTH_SECRET=XAQC978pLyyJHiOt51q9XkXfK47WuDmxyhqIJtDMBOQ=
NEXTAUTH_URL=http://localhost:3000

# Backend API
NEXT_PUBLIC_API_URL=http://localhost:3010

# Social Providers (Replace with real credentials)
GOOGLE_CLIENT_ID=your-google-client-id-from-console-developers-google-com
GOOGLE_CLIENT_SECRET=your-google-client-secret-from-console-developers-google-com
FACEBOOK_CLIENT_ID=your-facebook-app-id-from-developers-facebook-com
FACEBOOK_CLIENT_SECRET=your-facebook-app-secret-from-developers-facebook-com
LINKEDIN_CLIENT_ID=your-linkedin-client-id-from-linkedin-developers
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret-from-linkedin-developers

# PayFast Payment Gateway
PAYFAST_MERCHANT_ID=your-payfast-merchant-id-from-payfast-co-za
PAYFAST_MERCHANT_KEY=your-payfast-merchant-key-from-payfast-co-za
PAYFAST_PASSPHRASE=your-payfast-passphrase-from-payfast-co-za
PAYFAST_SANDBOX=true
```

✅ **Production Environment Ready**: Your `.env.production.example` includes all production settings.

## Step 5: Testing Social Authentication

### 5.1 Development Testing

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000/login` or `http://localhost:3000/signup`

3. Click on social provider buttons:
   - "Continue with Google"
   - "Continue with Facebook"
   - "Continue with LinkedIn"

4. Complete OAuth flow and verify redirect to dashboard

### 5.2 Test Scenarios

✅ **Google Login:**
- User clicks "Continue with Google"
- Redirected to Google OAuth
- Grants permissions
- Redirected back to `/dashboard`
- User profile populated

✅ **Facebook Login:**
- User clicks "Continue with Facebook"
- Redirected to Facebook OAuth
- Grants permissions
- Redirected back to `/dashboard`
- User profile populated

✅ **LinkedIn Login:**
- User clicks "Continue with LinkedIn"
- Redirected to LinkedIn OAuth
- Grants permissions
- Redirected back to `/dashboard`
- User profile populated

## Step 6: Production Setup

### 6.1 Update Redirect URLs

For production deployment, update all OAuth applications with production URLs:

**Google:**
- `https://pdfcraft.pro/api/auth/callback/google`

**Facebook:**
- `https://pdfcraft.pro/api/auth/callback/facebook`

**LinkedIn:**
- `https://pdfcraft.pro/api/auth/callback/linkedin`

### 6.2 Production Environment Variables

Set in your hosting platform (Vercel, Netlify, etc.):

```bash
NEXTAUTH_SECRET=your-production-secret
NEXTAUTH_URL=https://pdfcraft.pro
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
FACEBOOK_CLIENT_ID=your-facebook-app-id
FACEBOOK_CLIENT_SECRET=your-facebook-app-secret
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret
```

## Troubleshooting

### Common Issues

**1. "Configuration Error" during OAuth:**
- Check redirect URLs match exactly
- Verify client ID and secret are correct
- Ensure OAuth application is enabled

**2. "Invalid Redirect URI":**
- Double-check redirect URLs in provider settings
- Ensure no trailing slashes
- Verify NEXTAUTH_URL is correct

**3. Authentication Works but User Not Created:**
- Check NextAuth configuration in `[...nextauth]/route.ts`
- Verify callback functions are implemented
- Check database/user creation logic

**4. Social Auth Button Not Working:**
- Verify NextAuth provider is configured
- Check browser console for errors
- Ensure SessionProvider is wrapped around app

### Debug Mode

Enable NextAuth debug mode by adding to `.env.local`:
```bash
NEXTAUTH_DEBUG=true
```

## Security Considerations

1. **Environment Variables:** Never commit real credentials to version control
2. **HTTPS Required:** Production OAuth requires HTTPS
3. **Redirect URI Validation:** Keep redirect URIs limited to your domains
4. **App Review:** Some providers require app review for production use
5. **Rate Limiting:** Implement rate limiting for authentication endpoints

## Current Status

✅ **Infrastructure Complete:**
- NextAuth.js configured
- Social providers setup
- Authentication context created
- Login/signup pages updated
- Error handling implemented
- Loading states added

⚠️ **Pending Configuration:**
- OAuth applications need to be created in each provider
- Environment variables need to be set
- Production redirect URLs need to be updated

## Need Help?

- **NextAuth.js Documentation:** https://next-auth.js.org/
- **Google OAuth:** https://developers.google.com/identity/protocols/oauth2
- **Facebook Login:** https://developers.facebook.com/docs/facebook-login/
- **LinkedIn API:** https://docs.microsoft.com/en-us/linkedin/

---

**Note:** This setup enables users to register/login using their existing social media accounts, providing a seamless authentication experience while maintaining security best practices.