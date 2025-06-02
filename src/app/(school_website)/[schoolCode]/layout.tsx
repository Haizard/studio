
import React from 'react';
import Link from 'next/link';
import { HomeOutlined, InfoCircleOutlined, ReadOutlined, ContactsOutlined, CalendarOutlined, PictureOutlined } from '@ant-design/icons'; // AntD icons for flair

interface PublicWebsiteLayoutProps {
  children: React.ReactNode;
  params: { schoolCode: string };
}

// Placeholder: Fetch website settings (logo, nav links, colors) for schoolCode
// For now, we'll use static data.
const getWebsiteSettings = async (schoolCode: string) => {
  return {
    schoolName: `${schoolCode.toUpperCase()} High School`, // Placeholder
    logoUrl: `https://placehold.co/150x50.png?text=${schoolCode.toUpperCase()}`, // Placeholder logo
    navLinks: [
      { label: 'Home', slug: '', icon: <HomeOutlined /> },
      { label: 'About Us', slug: '/about', icon: <InfoCircleOutlined /> },
      { label: 'Admissions', slug: '/admissions', icon: <ReadOutlined /> },
      { label: 'News', slug: '/news', icon: <ReadOutlined /> },
      { label: 'Events', slug: '/events', icon: <CalendarOutlined /> },
      { label: 'Gallery', slug: '/gallery', icon: <PictureOutlined /> },
      { label: 'Contact', slug: '/contact', icon: <ContactsOutlined /> },
    ],
    primaryColor: '#1677ff', // Default primary color from your theme
    footerText: `© ${new Date().getFullYear()} ${schoolCode.toUpperCase()} High School. All Rights Reserved.`,
  };
};

export default async function PublicWebsiteLayout({ children, params }: PublicWebsiteLayoutProps) {
  const { schoolCode } = params;
  const settings = await getWebsiteSettings(schoolCode);

  return (
    // The primary color can be injected as a CSS variable if needed for deeper customization
    // <html lang="en" style={{ '--website-primary-color': settings.primaryColor } as React.CSSProperties}>
    <html lang="en">
      <head>
        {/* Favicon link can be added here based on settings.faviconUrl */}
        <title>{settings.schoolName}</title>
      </head>
      <body className="font-sans text-dark-text bg-light-gray flex flex-col min-h-screen">
        <header className="bg-white shadow-md sticky top-0 z-50">
          <nav className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap justify-between items-center">
            <Link href={`/${schoolCode}`} className="flex items-center">
              <img 
                src={settings.logoUrl} 
                alt={`${settings.schoolName} Logo`} 
                className="h-10 sm:h-12 mr-3"
                data-ai-hint="school logo" 
              />
              <span className="text-xl sm:text-2xl font-bold text-primary whitespace-nowrap">
                {settings.schoolName}
              </span>
            </Link>
            <ul className="flex flex-wrap items-center space-x-2 sm:space-x-4 md:space-x-6 mt-2 sm:mt-0">
              {settings.navLinks.map(link => (
                <li key={link.slug}>
                  <Link 
                    href={`/${schoolCode}${link.slug}`} 
                    className="text-gray-600 hover:text-primary px-2 py-1 rounded-md text-sm sm:text-base flex items-center gap-1 transition-colors duration-200"
                  >
                    {link.icon}
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </header>
        
        <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        
        <footer style={{ backgroundColor: settings.primaryColor }} className="text-white py-8 mt-auto">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p>{settings.footerText}</p>
            {/* Add social links, other footer info here if needed */}
          </div>
        </footer>
      </body>
    </html>
  );
}
