
'use client';
import React from 'react';
import { Typography, Card, Row, Col } from 'antd';
import { ReadOutlined, CalendarOutlined, PictureOutlined, SettingOutlined } from '@ant-design/icons';
import Link from 'next/link';

const { Title, Paragraph } = Typography;

interface WebsiteManagementDashboardPageProps {
  params: { schoolCode: string };
}

export default function WebsiteManagementDashboardPage({ params }: WebsiteManagementDashboardPageProps) {
  const { schoolCode } = params;
  const basePortalPath = `/${schoolCode}/portal/admin/website-management`;

  const managementSections = [
    { title: 'Manage News Articles', icon: <ReadOutlined />, link: `${basePortalPath}/news`, description: 'Create, edit, and publish school news.' },
    { title: 'Manage Events', icon: <CalendarOutlined />, link: `${basePortalPath}/events`, description: 'Add and update school events calendar.' },
    { title: 'Manage Gallery', icon: <PictureOutlined />, link: `${basePortalPath}/gallery`, description: 'Upload and organize photos for the public gallery.' },
    { title: 'Website Settings', icon: <SettingOutlined />, link: `/${schoolCode}/portal/admin/settings`, description: 'Configure general website appearance and information.' },
  ];

  return (
    <div>
      <Title level={2} className="mb-8">Website Content Management</Title>
      <Paragraph className="mb-8">
        Manage the content and appearance of the public-facing website for {schoolCode.toUpperCase()}.
      </Paragraph>
      <Row gutter={[16, 24]}>
        {managementSections.map(section => (
          <Col xs={24} sm={12} lg={8} key={section.title}>
            <Link href={section.link}>
              <Card hoverable className="h-full">
                <div className="flex flex-col items-center text-center">
                  <div className="text-4xl mb-4 text-primary">{section.icon}</div>
                  <Title level={4}>{section.title}</Title>
                  <Paragraph type="secondary">{section.description}</Paragraph>
                </div>
              </Card>
            </Link>
          </Col>
        ))}
      </Row>
    </div>
  );
}
