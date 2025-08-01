
'use client'; 

import type { Metadata } from 'next';
import './globals.css';
import 'react-quill/dist/quill.snow.css'; // Import Quill styles here
import { Toaster } from "@/components/ui/toaster";
import { ConfigProvider } from 'antd';
import { getAntdTheme } from '@/lib/themeConfig';
import React from 'react';
import { SessionProvider } from 'next-auth/react';

// Metadata can be defined statically or dynamically
// For now, static metadata:
// export const metadata: Metadata = {
//   title: 'Unified School Management System',
//   description: 'Comprehensive school management and public website platform.',
// };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const antdTheme = getAntdTheme();

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />
        <title>Unified School Management System</title>
        <meta name="description" content="Comprehensive school management and public website platform." />
      </head>
      <body className="font-sans antialiased">
        <SessionProvider>
          <ConfigProvider theme={antdTheme}>
            {children}
            <Toaster />
          </ConfigProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
