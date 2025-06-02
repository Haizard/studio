
import type { NextAuthOptions, User as NextAuthUser } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { connectToSuperAdminDB, getTenantConnection } from './db';
import SuperAdminUserModel, { ISuperAdminUser } from '@/models/SuperAdmin/SuperAdminUser';
// Import the schema definition directly
import { TenantUserSchemaDefinition, ITenantUser } from '@/models/Tenant/User';
import bcrypt from 'bcryptjs';

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

        const { email, password, schoolCode } = credentials;

        try {
          if (schoolCode && schoolCode.trim() !== '') {
            // Attempt Tenant Login
            const tenantDb = await getTenantConnection(schoolCode.trim().toLowerCase());
            // Ensure model is registered on this specific connection
            const TenantUserOnDB = tenantDb.models.User || tenantDb.model<ITenantUser>('User', TenantUserSchemaDefinition);
            const user = await TenantUserOnDB.findOne({ email: email.toLowerCase() }).lean();

            if (user && user.passwordHash) {
              const passwordMatch = await bcrypt.compare(password, user.passwordHash);
              if (passwordMatch) {
                return {
                  id: user._id.toString(),
                  email: user.email,
                  name: `${user.firstName} ${user.lastName}`,
                  role: user.role,
                  schoolCode: schoolCode.trim().toLowerCase(),
                } as CustomUser;
              }
            }
          } else {
            // Attempt SuperAdmin Login
            const superAdminDbInstance = await connectToSuperAdminDB();
            // Ensure model is registered on this specific connection
            const SuperAdminUserOnDB = superAdminDbInstance.models.SuperAdminUser || superAdminDbInstance.model<ISuperAdminUser>('SuperAdminUser', SuperAdminUserModel.schema);
            const user = await SuperAdminUserOnDB.findOne({ email: email.toLowerCase() }).lean();

            if (user && user.passwordHash) {
              const passwordMatch = await bcrypt.compare(password, user.passwordHash);
              if (passwordMatch) {
                return {
                  id: user._id.toString(),
                  email: user.email,
                  name: user.name,
                  role: user.role, // Should be 'superadmin'
                } as CustomUser;
              }
            }
          }
        } catch (error: any) {
          console.error("Authorization database error:", error.message);
          // Fall through to hardcoded credentials if DB operations fail (e.g., URI not set, school not found)
        }

        // Fallback to placeholder logic if DB auth fails or no user found
        // IMPORTANT: For production, remove these or secure them properly.
        // These are for development without needing a fully seeded DB initially.
        // Ensure placeholder passwords would be hashed in a real scenario or only use DB.
        const placeholderPassword = "password"; // Standard placeholder password

        if (email === 'admin@example.com' && password === placeholderPassword && (!schoolCode || schoolCode.trim() === '')) {
          console.warn("Using SuperAdmin placeholder login for admin@example.com");
          return {
            id: 'superadmin-placeholder-1',
            email: 'admin@example.com',
            name: 'Super Admin (Placeholder)',
            role: 'superadmin',
          } as CustomUser;
        }
        if (email === 'teacher@schoola.com' && password === placeholderPassword && schoolCode?.toLowerCase() === 'scha') {
          console.warn("Using Tenant placeholder login for teacher@schoola.com (SCHA)");
          return {
            id: 'teacher-placeholder-1-scha',
            email: 'teacher@schoola.com',
            name: 'SchoolA Teacher (Placeholder)',
            role: 'teacher',
            schoolCode: 'scha',
          } as CustomUser;
        }
         if (email === 'admin@schoola.com' && password === placeholderPassword && schoolCode?.toLowerCase() === 'scha') {
          console.warn("Using Tenant Admin placeholder login for admin@schoola.com (SCHA)");
          return {
            id: 'admin-scha-placeholder-1',
            email: 'admin@schoola.com',
            name: 'SchoolA Admin (Placeholder)',
            role: 'admin',
            schoolCode: 'scha',
          } as CustomUser;
        }
        if (email === 'student@schoolb.com' && password === placeholderPassword && schoolCode?.toLowerCase() === 'schb') {
          console.warn("Using Tenant placeholder login for student@schoolb.com (SCHB)");
          return {
            id: 'student-placeholder-1-schb',
            email: 'student@schoolb.com',
            name: 'SchoolB Student (Placeholder)',
            role: 'student',
            schoolCode: 'schb',
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
      if (user) {
        const customUser = user as CustomUser;
        token.uid = customUser.id;
        token.role = customUser.role;
        token.schoolCode = customUser.schoolCode; // This could be undefined for superadmin
        token.email = customUser.email; // Ensure email and name are passed too
        token.name = customUser.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const customSessionUser = session.user as CustomUser;
        customSessionUser.id = token.uid as string;
        customSessionUser.role = token.role as string | undefined;
        customSessionUser.schoolCode = token.schoolCode as string | undefined;
        customSessionUser.email = token.email as string | undefined;
        customSessionUser.name = token.name as string | undefined;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
    // error: '/auth/error', // Custom error handling page for NextAuth errors
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development', // Enable debug logs in development
};
