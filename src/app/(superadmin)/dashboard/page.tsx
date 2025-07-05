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
              prefix={<UserSwitchOutlined />}
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

// @ts-ignore
const UserSwitchOutlined = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    {...props}
  >
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
  </svg>
);
