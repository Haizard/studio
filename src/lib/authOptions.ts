
import type { NextAuthOptions, User as NextAuthUser } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { connectToSuperAdminDB, getTenantConnection } from './db';
import SuperAdminUserModel, { ISuperAdminUser } from '@/models/SuperAdmin/SuperAdminUser';
// Import the schema definition directly
import { TenantUserSchemaDefinition, ITenantUser } from '@/models/Tenant/User';
import bcrypt from 'bcryptjs';
import { logAudit } from './audit';
import type { NextRequest } from 'next/server';


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
        const reqObject = req as NextRequest;

        try {
          if (schoolCode && schoolCode.trim() !== '') {
            const tenantSchoolCode = schoolCode.trim().toLowerCase();
            const tenantDb = await getTenantConnection(tenantSchoolCode);
            const TenantUserOnDB = tenantDb.models.User || tenantDb.model<ITenantUser>('User', TenantUserSchemaDefinition);
            const user = await TenantUserOnDB.findOne({ email: email.toLowerCase() }).lean();

            if (user && user.passwordHash) {
              const passwordMatch = await bcrypt.compare(password, user.passwordHash);
              if (passwordMatch) {
                await logAudit(tenantSchoolCode, {
                  userId: user._id,
                  username: user.username,
                  action: 'LOGIN_SUCCESS',
                  entity: 'User',
                  details: 'User successfully logged in.',
                  req: reqObject,
                });
                return {
                  id: user._id.toString(),
                  email: user.email,
                  name: `${user.firstName} ${user.lastName}`,
                  role: user.role,
                  schoolCode: tenantSchoolCode,
                } as CustomUser;
              } else {
                 await logAudit(tenantSchoolCode, {
                    username: email.toLowerCase(),
                    action: 'LOGIN_FAIL',
                    entity: 'User',
                    details: 'Failed login attempt (invalid password).',
                    req: reqObject,
                });
              }
            }
          } else {
            // Attempt SuperAdmin Login
            const superAdminDbInstance = await connectToSuperAdminDB();
            const SuperAdminUserOnDB = superAdminDbInstance.models.SuperAdminUser || superAdminDbInstance.model<ISuperAdminUser>('SuperAdminUser', SuperAdminUserModel.schema);
            const user = await SuperAdminUserOnDB.findOne({ email: email.toLowerCase() }).lean();

            if (user && user.passwordHash) {
              const passwordMatch = await bcrypt.compare(password, user.passwordHash);
              if (passwordMatch) {
                // SuperAdmin login success logging could be implemented here if a central audit log is desired
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
        }
        
        // Log final failed attempt if user was not found for a specific tenant
        if (schoolCode) {
            await logAudit(schoolCode.trim().toLowerCase(), {
                username: email.toLowerCase(),
                action: 'LOGIN_FAIL',
                entity: 'User',
                details: 'Failed login attempt (user not found or other error).',
                req: reqObject,
            });
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
        token.schoolCode = customUser.schoolCode; 
        token.email = customUser.email;
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
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};
