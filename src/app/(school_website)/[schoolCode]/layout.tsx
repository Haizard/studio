
import React from 'react';
import Link from 'next/link';
import { HomeOutlined, InfoCircleOutlined, ReadOutlined, ContactsOutlined, CalendarOutlined, PictureOutlined, BookOutlined, SolutionOutlined, UsergroupAddOutlined, EditOutlined } from '@ant-design/icons';
import { getTenantConnection } from '@/lib/db';
import WebsiteSettingsModel, { IWebsiteSettings } from '@/models/Tenant/WebsiteSettings';
import mongoose from 'mongoose';

interface PublicWebsiteLayoutProps {
  children: React.ReactNode;
  params: { schoolCode: string };
}

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.WebsiteSettings) {
    tenantDb.model<IWebsiteSettings>('WebsiteSettings', WebsiteSettingsModel.schema);
  }
}

const getWebsiteSettingsData = async (schoolCode: string): Promise<Partial<IWebsiteSettings>> => {
  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Settings = tenantDb.models.WebsiteSettings as mongoose.Model<IWebsiteSettings>;
    
    let settings = await Settings.findOne().lean<IWebsiteSettings | null>();
    if (!settings) {
      // Return minimal defaults if no settings are found
      return {
        schoolName: `${schoolCode.toUpperCase()} School (Setup Pending)`,
        logoUrl: `https://placehold.co/150x50.png?text=${schoolCode.toUpperCase()}`,
        footerText: `© ${new Date().getFullYear()} ${schoolCode.toUpperCase()} School. All Rights Reserved.`,
        primaryColor: '#1677ff', // Default AntD primary
      };
    }
    return settings;
  } catch (error) {
    console.error(`Error fetching website settings for ${schoolCode} in layout:`, error);
    // Fallback defaults in case of error
    return {
      schoolName: `${schoolCode.toUpperCase()} School (Error Loading Settings)`,
      logoUrl: `https://placehold.co/150x50.png?text=${schoolCode.toUpperCase()}`,
      footerText: `© ${new Date().getFullYear()} ${schoolCode.toUpperCase()} School. All Rights Reserved.`,
      primaryColor: '#1677ff',
    };
  }
};

export default async function PublicWebsiteLayout({ children, params }: PublicWebsiteLayoutProps) {
  const { schoolCode } = params;
  const settings = await getWebsiteSettingsData(schoolCode);

  const navLinks = settings.navLinks && settings.navLinks.length > 0 
    ? settings.navLinks.sort((a,b) => a.order - b.order)
    : [
        { label: 'Home', slug: '', icon: <HomeOutlined />, order: 0 },
        { label: 'About Us', slug: '/about', icon: <InfoCircleOutlined />, order: 1 },
        { label: 'Academics', slug: '/academics', icon: <BookOutlined />, order: 2 },
        { label: 'Admissions', slug: '/admissions', icon: <SolutionOutlined />, order: 3 },
        { label: 'News', slug: '/news', icon: <ReadOutlined />, order: 4 },
        { label: 'Blog', slug: '/blog', icon: <EditOutlined />, order: 5 },
        { label: 'Events', slug: '/events', icon: <CalendarOutlined />, order: 6 },
        { label: 'Gallery', slug: '/gallery', icon: <PictureOutlined />, order: 7 },
        { label: 'Staff', slug: '/staff', icon: <UsergroupAddOutlined />, order: 8 },
        { label: 'Contact', slug: '/contact', icon: <ContactsOutlined />, order: 9 },
      ];

  const pageTitle = settings.schoolName || `${schoolCode.toUpperCase()} High School`;
  const primaryColor = settings.primaryColor || '#1677ff';

  return (
    <html lang="en" style={{ '--website-primary-color': primaryColor } as React.CSSProperties}>
      <head>
        {settings.faviconUrl && <link rel="icon" href={settings.faviconUrl} />}
        <title>{pageTitle}</title>
      </head>
      <body className="font-sans text-dark-text bg-light-gray flex flex-col min-h-screen">
        <header className="bg-white shadow-md sticky top-0 z-50">
          <nav className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap justify-between items-center">
            <Link href={`/${schoolCode}`} className="flex items-center">
              {settings.logoUrl ? (
                <img 
                  src={settings.logoUrl} 
                  alt={`${settings.schoolName} Logo`} 
                  className="h-10 sm:h-12 mr-3 object-contain"
                  data-ai-hint="school logo"
                />
              ) : (
                 <div 
                  className="h-10 sm:h-12 w-auto mr-3 flex items-center justify-center bg-gray-200 text-gray-500 rounded"
                  data-ai-hint="school logo placeholder"
                >
                  <span className="text-xs p-1">{schoolCode.toUpperCase()}</span>
                </div>
              )}
              <span className="text-xl sm:text-2xl font-bold whitespace-nowrap" style={{ color: primaryColor }}>
                {settings.schoolName}
              </span>
            </Link>
            <ul className="flex flex-wrap items-center space-x-2 sm:space-x-4 md:space-x-6 mt-2 sm:mt-0">
              {navLinks.map(link => (
                <li key={link.slug}>
                  <Link 
                    href={`/${schoolCode}${link.slug}`} 
                    className="text-gray-600 hover:text-[var(--website-primary-color)] px-2 py-1 rounded-md text-sm sm:text-base flex items-center gap-1 transition-colors duration-200"
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
        
        <footer style={{ backgroundColor: primaryColor }} className="text-white py-8 mt-auto">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p>{settings.footerText || `© ${new Date().getFullYear()} ${settings.schoolName}. All Rights Reserved.`}</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
