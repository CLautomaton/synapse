import { AuthOptions } from 'next-auth';
import { DefaultSession } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

declare module "next-auth" {
  interface Session {
    user: {
      id: string
    } & DefaultSession["user"]
  }

  interface JWT {
    id: string;
  }
}

export const authOptions: AuthOptions = {
  providers: [ 
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            throw new Error('Missing credentials');
          }

          // Use Firebase REST API to sign in with email/password
          const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
          if (!apiKey) {
            throw new Error('Firebase API key not configured');
          }

          // Authenticate with Firebase REST API
          const response = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                email: credentials.email,
                password: credentials.password,
                returnSecureToken: true,
              }),
            }
          );

          const data = await response.json();

          if (!response.ok || data.error) {
            throw new Error(data.error?.message || 'Invalid credentials');
          }

          // Use user data directly from Firebase REST API response
          // The REST API already validates credentials, so we can trust the response
          return {
            id: data.localId, // Firebase user UID
            name: data.displayName || data.email?.split('@')[0] || 'User',
            email: data.email || credentials.email,
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  debug: true,
  secret: process.env.NEXTAUTH_SECRET
}; 