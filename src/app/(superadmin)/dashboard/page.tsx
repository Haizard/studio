
import React from 'react';
import { Typography, Card, Row, Col, Statistic } from 'antd';
import { DeploymentUnitOutlined, UsergroupAddOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

export default function SuperAdminDashboardPage() {
  return (
    <div>
      <Title level={2}>SuperAdmin Dashboard</Title>
      <Paragraph>Welcome to the Super Administration Panel.</Paragraph>
      
      <Row gutter={16} className="mt-8">
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="Total Schools Managed"
              value={0} // Placeholder value
              prefix={<DeploymentUnitOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="Active Admin Users"
              value={0} // Placeholder value
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
