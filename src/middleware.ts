
import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const { pathname, origin, searchParams } = req.nextUrl;

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    console.error("CRITICAL: NEXTAUTH_SECRET is not set. Middleware and authentication will not function correctly.");
    // In a real scenario, you might want to redirect to a dedicated error page or show a maintenance message.
    // For now, allowing to proceed but this is a major configuration issue.
    return NextResponse.next();
  }
  const token = await getToken({ req, secret });

  const isLoggedIn = !!token;
  const userRole = token?.role as string | undefined;
  const userSchoolCode = token?.schoolCode as string | undefined;

  // Routes definitions
  const isSuperAdminOnlyRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/schools');
  const isSchoolPortalRoute = /^\/[^/]+\/portal/.test(pathname); // Matches /[schoolCode]/portal/...
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/auth/error'); // Add other auth routes if any

  // If user is logged in and tries to access login page, redirect them
  if (isLoggedIn && isAuthRoute) {
    if (userRole === 'superadmin') {
      return NextResponse.redirect(new URL('/dashboard', origin));
    }
    if (userRole && userSchoolCode) {
      return NextResponse.redirect(new URL(`/${userSchoolCode}/portal/dashboard`, origin));
    }
    return NextResponse.redirect(new URL('/', origin)); // Fallback to home
  }

  // If trying to access a protected route without a token, redirect to login
  if (!isLoggedIn && (isSuperAdminOnlyRoute || isSchoolPortalRoute)) {
    const loginUrl = new URL('/login', origin);
    loginUrl.searchParams.set('callbackUrl', pathname + searchParams.toString()); // Preserve query params
    
    // If accessing a school portal URL directly, prefill schoolCode on login page
    if (isSchoolPortalRoute) {
        const schoolCodeFromPath = pathname.split('/')[1];
        if (schoolCodeFromPath) {
            loginUrl.searchParams.set('schoolCode', schoolCodeFromPath);
        }
    }
    return NextResponse.redirect(loginUrl);
  }
  
  // If user is authenticated, perform role-based access control
  if (isLoggedIn) {
    // SuperAdmin route protection
    if (isSuperAdminOnlyRoute && userRole !== 'superadmin') {
      console.warn(`Access Denied: User ${token.email} (role: ${userRole}) tried to access SuperAdmin route ${pathname}`);
      // Redirect non-superadmins away from superadmin routes
      if (userSchoolCode) { // If they belong to a school, send them to their portal
        return NextResponse.redirect(new URL(`/${userSchoolCode}/portal/dashboard`, origin));
      }
      return NextResponse.redirect(new URL('/', origin)); // Fallback
    }

    // School Portal route protection
    if (isSchoolPortalRoute) {
      const schoolCodeFromPath = pathname.split('/')[1]?.toLowerCase();

      if (userRole === 'superadmin') {
        // Superadmins can access any school portal.
        // No specific check needed here for superadmin, they pass.
      } else {
        // Tenant users (admin, teacher, student)
        if (!userSchoolCode || userSchoolCode.toLowerCase() !== schoolCodeFromPath) {
          console.warn(`Access Denied: User ${token.email} (school: ${userSchoolCode}) tried to access portal for school ${schoolCodeFromPath}`);
          // If they have a school code but it's wrong, send them to their own portal
          if (userSchoolCode) {
             return NextResponse.redirect(new URL(`/${userSchoolCode}/portal/dashboard`, origin));
          }
          // If they somehow don't have a school code but are trying to access a portal
          return NextResponse.redirect(new URL('/login', origin)); // Send to login
        }
        // Additional checks for roles within a portal (e.g. student accessing admin section)
        // This is a simplified check. More granular checks should be inside page/layout components or specific API routes.
        if (userRole === 'student' && pathname.includes('/portal/admin/')) {
            console.warn(`Access Denied: Student ${token.email} tried to access admin section ${pathname}`);
            return NextResponse.redirect(new URL(`/${userSchoolCode}/portal/dashboard`, origin));
        }
         if (userRole === 'teacher' && pathname.includes('/portal/admin/')) {
            console.warn(`Access Denied: Teacher ${token.email} tried to access admin section ${pathname}`);
            return NextResponse.redirect(new URL(`/${userSchoolCode}/portal/dashboard`, origin));
        }

      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes are handled by their own authentication logic, if any)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets in /public folder (e.g. images, svgs)
     * Public website routes (e.g., `/[schoolCode]/` or `/[schoolCode]/about`) are NOT matched here by default,
     * allowing them to be public. Only portal and superadmin routes are explicitly protected.
     */
    '/dashboard/:path*',
    '/schools/:path*',
    '/:schoolCode/portal/:path*',
    '/login', // Match login to redirect if already authenticated
    // Add other specific paths that need protection or redirection logic
    // '/((?!api|_next/static|_next/image|favicon.ico|images).*)', // A broader matcher if needed, but be careful
  ],
};
