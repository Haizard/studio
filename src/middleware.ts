
import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const { pathname, origin } = req.nextUrl;

  // Get the session token
  // The secret should be the same as in your `authOptions`
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    console.error("NEXTAUTH_SECRET is not set. Middleware cannot function properly.");
    // Allow request to proceed but log error, or redirect to an error page
    return NextResponse.next();
  }
  const token = await getToken({ req, secret });

  // Define protected route patterns
  const isSuperAdminRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/schools'); // SuperAdmin specific top-level routes
  const isSchoolPortalRoute = /^\/[^/]+\/portal/.test(pathname); // Matches /[schoolCode]/portal/...

  // If trying to access a protected route without a token, redirect to login
  if ((isSuperAdminRoute || isSchoolPortalRoute) && !token) {
    const loginUrl = new URL('/login', origin);
    // Add callbackUrl so user is redirected back after login
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // If user is authenticated, perform role-based access control
  if (token) {
    const userRole = token.role as string;
    const userSchoolCode = token.schoolCode as string | undefined;

    // SuperAdmin route protection
    if (isSuperAdminRoute && userRole !== 'superadmin') {
      // If not a superadmin, redirect to a generic access denied or their respective dashboard
      // For simplicity, redirecting to home or login.
      // A more sophisticated approach would be to redirect to their specific portal if applicable
      // or an access denied page.
      console.warn(`Access Denied: User ${token.email} (role: ${userRole}) tried to access SuperAdmin route ${pathname}`);
      return NextResponse.redirect(new URL('/', origin)); // Or /login or an access-denied page
    }

    // School Portal route protection
    if (isSchoolPortalRoute) {
      const schoolCodeFromPath = pathname.split('/')[1];
      if (userRole === 'superadmin') {
        // Superadmins can access any school portal (if logic allows)
        // Or you might want to restrict superadmins from direct portal access unless they 'impersonate'
        // For now, allowing access.
      } else {
        // Tenant users (teacher, student, admin)
        if (!userSchoolCode || userSchoolCode.toLowerCase() !== schoolCodeFromPath.toLowerCase()) {
          // User is trying to access a portal for a school they don't belong to
          console.warn(`Access Denied: User ${token.email} (school: ${userSchoolCode}) tried to access portal for school ${schoolCodeFromPath}`);
          return NextResponse.redirect(new URL('/', origin)); // Or /login or an access-denied page
        }
        // Further role-based checks within the portal can be done here or in page components
        // e.g., if a student tries to access /portal/admin/...
      }
    }
  }

  return NextResponse.next();
}

// Specify which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login page itself to avoid redirect loops
     * - public website routes (/[schoolCode] without /portal)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|login|auth/error).*)',
     // This regex ensures we match /dashboard, /schools and /[schoolCode]/portal routes
     // but not /[schoolCode]/ (public website homepage) or /[schoolCode]/about etc.
     '/dashboard/:path*',
     '/schools/:path*',
     '/:schoolCode/portal/:path*',
  ],
};
