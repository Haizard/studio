
import type { NextAuthOptions, User as NextAuthUser } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
// import { connectToSuperAdminDB, getTenantConnection } from './db';
// import SuperAdminUserModel from '@/models/SuperAdmin/SuperAdminUser';
// import TenantUserModel from '@/models/Tenant/User'; // Assuming User model for tenants
// import bcrypt from 'bcryptjs';

// Extend NextAuthUser to include role and potentially schoolCode
interface CustomUser extends NextAuthUser {
  id: string;
  role?: string | null;
  schoolCode?: string | null; // For tenant users
  // Add any other custom properties
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'user@example.com' },
        password: { label: 'Password', type: 'password' },
        schoolCode: { label: 'School Code (Optional)', type: 'text', placeholder: 'SCH001' }
      },
      async authorize(credentials, req) {
        if (!credentials) return null;

        // TODO: Implement actual database user lookup and password verification
        // This is a placeholder for demonstration.
        // In a real app, you would:
        // 1. Determine if it's a superadmin login (e.g., if schoolCode is empty or based on email domain)
        //    or a tenant login (if schoolCode is provided).
        // 2. Connect to the appropriate database (SuperAdmin DB or Tenant DB via getTenantConnection).
        // 3. Fetch the user by email/username.
        // 4. Compare the provided password with the stored hashed password using bcrypt.compare.
        // 5. Return the user object if credentials are valid, otherwise null.

        // Placeholder logic:
        if (credentials.email === 'admin@example.com' && credentials.password === 'password') {
          return { 
            id: 'superadmin-1', 
            email: 'admin@example.com', 
            name: 'Super Admin',
            role: 'superadmin' 
          } as CustomUser;
        }
        if (credentials.email === 'teacher@schoola.com' && credentials.password === 'password' && credentials.schoolCode === 'SCHA') {
          return { 
            id: 'teacher-1-scha', 
            email: 'teacher@schoola.com', 
            name: 'SchoolA Teacher', 
            role: 'teacher',
            schoolCode: 'SCHA'
          } as CustomUser;
        }
        if (credentials.email === 'student@schoolb.com' && credentials.password === 'password' && credentials.schoolCode === 'SCHB') {
          return { 
            id: 'student-1-schb', 
            email: 'student@schoolb.com', 
            name: 'SchoolB Student', 
            role: 'student',
            schoolCode: 'SCHB'
          } as CustomUser;
        }
        
        return null; // Authentication failed
      }
    })
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      // Persist user id and role to the token
      if (user) {
        const customUser = user as CustomUser;
        token.uid = customUser.id;
        token.role = customUser.role;
        token.schoolCode = customUser.schoolCode;
        token.email = customUser.email;
        token.name = customUser.name;
      }
      return token;
    },
    async session({ session, token }) {
      // Add id and role to the session object
      if (session.user) {
        const customSessionUser = session.user as CustomUser;
        customSessionUser.id = token.uid as string;
        customSessionUser.role = token.role as string;
        customSessionUser.schoolCode = token.schoolCode as string | undefined;
        customSessionUser.email = token.email as string | undefined;
        customSessionUser.name = token.name as string | undefined;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
    // error: '/auth/error', // Custom error handling page
  },
  secret: process.env.NEXTAUTH_SECRET, // Make sure this is set in .env.local
};
