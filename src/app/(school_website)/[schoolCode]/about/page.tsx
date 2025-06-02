
import React from 'react';
import { Typography, Card, Empty, Alert } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { getTenantConnection } from '@/lib/db';
import WebsiteSettingsModel, { IWebsiteSettings } from '@/models/Tenant/WebsiteSettings';
import mongoose from 'mongoose';

interface AboutUsPageProps {
  params: { schoolCode: string };
}

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.WebsiteSettings) {
    tenantDb.model<IWebsiteSettings>('WebsiteSettings', WebsiteSettingsModel.schema);
  }
}

async function getAboutUsContent(schoolCode: string): Promise<Partial<IWebsiteSettings>> {
  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Settings = tenantDb.models.WebsiteSettings as mongoose.Model<IWebsiteSettings>;
    
    const settings = await Settings.findOne().select('schoolName aboutUsContent').lean<IWebsiteSettings | null>();
    if (!settings) {
      return {
        schoolName: `${schoolCode.toUpperCase()} School`,
        aboutUsContent: '', 
      };
    }
    return settings;
  } catch (error) {
    console.error(`Error fetching About Us content for ${schoolCode}:`, error);
    return {
      schoolName: `${schoolCode.toUpperCase()} School (Error)`,
      aboutUsContent: '<p>Error loading About Us content. Please try again later.</p>',
    };
  }
}

export default async function AboutUsPage({ params }: AboutUsPageProps) {
  const { schoolCode } = params;
  const settings = await getAboutUsContent(schoolCode);

  return (
    <div className="container mx-auto px-4 py-8">
      <Typography.Title level={2} className="mb-8 text-center">
        <InfoCircleOutlined className="mr-2" /> About {settings.schoolName || 'Our School'}
      </Typography.Title>

      <Card className="shadow-lg">
        {settings.aboutUsContent ? (
          <div 
            className="prose prose-lg max-w-none" 
            dangerouslySetInnerHTML={{ __html: settings.aboutUsContent }}
          />
        ) : (
          <Empty description="Content for the 'About Us' page has not been set up yet. Please check back later." />
        )}
      </Card>
      
      {!settings.aboutUsContent && process.env.NODE_ENV === 'development' && (
          <Alert 
            type="info" 
            message="Admin Tip" 
            description={`To add content to this page, go to the Admin Portal > Settings for school ${schoolCode.toUpperCase()} and fill in the "About Us Page Content" field.`}
            showIcon
            className="mt-6"
            />
      )}
    </div>
  );
}
