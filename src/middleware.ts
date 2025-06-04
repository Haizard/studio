
import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const { pathname, origin, searchParams } = req.nextUrl;

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    console.error("CRITICAL: NEXTAUTH_SECRET is not set. Middleware and authentication will not function correctly.");
    return NextResponse.next();
  }
  const token = await getToken({ req, secret });

  const isLoggedIn = !!token;
  const userRole = token?.role as string | undefined;
  const userSchoolCode = token?.schoolCode as string | undefined;

  const isSuperAdminOnlyRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/schools');
  const isSchoolPortalRoute = /^\/[^/]+\/portal/.test(pathname);
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/auth/error');

  if (isLoggedIn && isAuthRoute) {
    if (userRole === 'superadmin') {
      return NextResponse.redirect(new URL('/dashboard', origin));
    }
    if (userRole && userSchoolCode) {
      return NextResponse.redirect(new URL(`/${userSchoolCode}/portal/dashboard`, origin));
    }
    return NextResponse.redirect(new URL('/', origin)); 
  }

  if (!isLoggedIn && (isSuperAdminOnlyRoute || isSchoolPortalRoute)) {
    const loginUrl = new URL('/login', origin);
    loginUrl.searchParams.set('callbackUrl', pathname + searchParams.toString());
    if (isSchoolPortalRoute) {
        const schoolCodeFromPath = pathname.split('/')[1];
        if (schoolCodeFromPath) {
            loginUrl.searchParams.set('schoolCode', schoolCodeFromPath);
        }
    }
    return NextResponse.redirect(loginUrl);
  }
  
  if (isLoggedIn) {
    if (isSuperAdminOnlyRoute && userRole !== 'superadmin') {
      console.warn(`Access Denied: User ${token.email} (role: ${userRole}) tried to access SuperAdmin route ${pathname}`);
      if (userSchoolCode) {
        return NextResponse.redirect(new URL(`/${userSchoolCode}/portal/dashboard`, origin));
      }
      return NextResponse.redirect(new URL('/', origin));
    }

    if (isSchoolPortalRoute) {
      const schoolCodeFromPath = pathname.split('/')[1]?.toLowerCase();

      if (userRole === 'superadmin') {
        // Superadmins can access any school portal.
      } else { // Tenant users (admin, teacher, student, finance)
        if (!userSchoolCode || userSchoolCode.toLowerCase() !== schoolCodeFromPath) {
          console.warn(`Access Denied: User ${token.email} (school: ${userSchoolCode}) tried to access portal for school ${schoolCodeFromPath}`);
          if (userSchoolCode) {
             return NextResponse.redirect(new URL(`/${userSchoolCode}/portal/dashboard`, origin));
          }
          return NextResponse.redirect(new URL('/login', origin));
        }

        // Specific role-based access within the /admin section of a school portal
        if (pathname.includes(`/${schoolCodeFromPath}/portal/admin/`)) {
          const isAdminPath = pathname.startsWith(`/${schoolCodeFromPath}/portal/admin/`);
          const isFinancePath = pathname.startsWith(`/${schoolCodeFromPath}/portal/admin/finance/`);

          if (userRole === 'finance') {
            if (isAdminPath && !isFinancePath) {
              console.warn(`Access Denied: Finance user ${token.email} tried to access non-finance admin section ${pathname}`);
              return NextResponse.redirect(new URL(`/${userSchoolCode}/portal/dashboard`, origin));
            }
            // Allowed if it's a finance path
          } else if (userRole === 'student' || userRole === 'teacher') {
            // Students and Teachers should not access any /admin section
            if (isAdminPath) {
              console.warn(`Access Denied: ${userRole} ${token.email} tried to access admin section ${pathname}`);
              return NextResponse.redirect(new URL(`/${userSchoolCode}/portal/dashboard`, origin));
            }
          }
          // 'admin' role (tenant admin) has access to all /admin paths within their school by default here
        }
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/schools/:path*',
    '/:schoolCode/portal/:path*',
    '/login',
  ],
};
