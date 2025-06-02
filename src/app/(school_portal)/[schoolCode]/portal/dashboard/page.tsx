
'use client';
import React from 'react';
import { Typography, Card, Row, Col, Statistic, Spin } from 'antd';
import { TeamOutlined, BookOutlined, ProfileOutlined } from '@ant-design/icons';
import { useSession } from 'next-auth/react';

const { Title, Paragraph, Text } = Typography;

interface SchoolPortalDashboardPageProps {
  params: { schoolCode: string };
}

export default function SchoolPortalDashboardPage({ params }: SchoolPortalDashboardPageProps) {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div className="flex justify-center items-center h-full"><Spin size="large" /></div>;
  }
  
  // You can further check session?.user.schoolCode against params.schoolCode for stricter access
  // or if a superadmin is viewing this page. Middleware should largely handle this.

  return (
    <div>
      <Title level={2}>School Portal Dashboard: {params.schoolCode.toUpperCase()}</Title>
      <Paragraph>
        Welcome, <Text strong>{(session?.user as any)?.name || (session?.user as any)?.email}</Text>!
        Role: <Text code>{(session?.user as any)?.role}</Text>.
      </Paragraph>
      <Paragraph>This is the management portal for your school.</Paragraph>

      <Row gutter={16} className="mt-8">
        <Col xs={24} sm={12} md={8}>
          <Card hoverable>
            <Statistic
              title="Active Students"
              value={0} // Placeholder - fetch from API for this school
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card hoverable>
            <Statistic
              title="Teaching Staff"
              value={0} // Placeholder - fetch from API for this school
              prefix={<ProfileOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card hoverable>
            <Statistic
              title="Subjects Offered"
              value={0} // Placeholder - fetch from API for this school
              prefix={<BookOutlined />}
            />
          </Card>
        </Col>
      </Row>
       <Paragraph className="mt-8">
        Use the sidebar to navigate through various modules like student management, academics, examinations, and more.
      </Paragraph>
    </div>
  );
}
