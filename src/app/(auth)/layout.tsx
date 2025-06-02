
import React from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-light-gray">
      <div className="p-8 bg-white shadow-xl rounded-lg w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
