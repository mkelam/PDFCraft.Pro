import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import FacebookProvider from "next-auth/providers/facebook"
import LinkedInProvider from "next-auth/providers/linkedin"
import { AuthOptions } from "next-auth"

const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    // FacebookProvider({
    //   clientId: process.env.FACEBOOK_CLIENT_ID || "",
    //   clientSecret: process.env.FACEBOOK_CLIENT_SECRET || "",
    // }),
    // LinkedInProvider({
    //   clientId: process.env.LINKEDIN_CLIENT_ID || "",
    //   clientSecret: process.env.LINKEDIN_CLIENT_SECRET || "",
    // })
  ],
  pages: {
    signIn: '/login',
    signUp: '/signup',
    error: '/auth/error',
  },
  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      // Allow all sign-ins for now
      // You can add custom logic here to validate users
      return true
    },
    async jwt({ token, account, user }) {
      // Persist the OAuth access_token to the token right after signin
      if (account) {
        token.accessToken = account.access_token
        token.provider = account.provider
      }
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      // Send properties to the client
      if (token) {
        session.accessToken = token.accessToken as string
        session.provider = token.provider as string
        session.user.id = token.id as string
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      // Redirect to dashboard after successful authentication
      if (url.startsWith("/") || url.startsWith(baseUrl)) {
        return `${baseUrl}/dashboard`
      }
      return baseUrl
    }
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }