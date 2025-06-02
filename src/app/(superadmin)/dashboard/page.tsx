
'use client';
import React from 'react';
import { Typography, Card, Row, Col, Statistic, Spin } from 'antd';
import { DeploymentUnitOutlined, UsergroupAddOutlined } from '@ant-design/icons';
import { useSession } from 'next-auth/react';

const { Title, Paragraph, Text } = Typography;

export default function SuperAdminDashboardPage() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div className="flex justify-center items-center h-full"><Spin size="large" /></div>;
  }

  return (
    <div>
      <Title level={2}>SuperAdmin Dashboard</Title>
      <Paragraph>Welcome to the Super Administration Panel, <Text strong>{session?.user?.name || session?.user?.email}</Text>!</Paragraph>
      
      <Row gutter={16} className="mt-8">
        <Col xs={24} sm={12} md={8}>
          <Card hoverable>
            <Statistic
              title="Total Schools Managed"
              value={0} // Placeholder value - fetch from API
              prefix={<DeploymentUnitOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card hoverable>
            <Statistic
              title="Active Admin Users"
              value={0} // Placeholder value - fetch from API
              prefix={<UsergroupAddOutlined />}
            />
          </Card>
        </Col>
      </Row>
      <Paragraph className="mt-8">
        From here, you can manage schools, configure system settings, and oversee the entire platform.
      </Paragraph>
    </div>
  );
}
