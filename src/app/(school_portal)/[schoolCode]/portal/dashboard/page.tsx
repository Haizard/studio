
import React from 'react';
import { Typography, Card, Row, Col, Statistic } from 'antd';
import { TeamOutlined, BookOutlined, ProfileOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

interface SchoolPortalDashboardPageProps {
  params: { schoolCode: string };
}

export default function SchoolPortalDashboardPage({ params }: SchoolPortalDashboardPageProps) {
  return (
    <div>
      <Title level={2}>School Portal Dashboard: {params.schoolCode.toUpperCase()}</Title>
      <Paragraph>Welcome to the management portal for your school.</Paragraph>

      <Row gutter={16} className="mt-8">
        <Col xs={24} sm={12} md={8}>
          <Card hoverable>
            <Statistic
              title="Active Students"
              value={0} // Placeholder
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card hoverable>
            <Statistic
              title="Teaching Staff"
              value={0} // Placeholder
              prefix={<ProfileOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card hoverable>
            <Statistic
              title="Subjects Offered"
              value={0} // Placeholder
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
