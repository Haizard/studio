
'use client';
import React from 'react';
import { Typography, Empty } from 'antd';
import { UserOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

interface StudentProfilePageProps {
  params: { schoolCode: string };
}

export default function StudentProfilePage({ params }: StudentProfilePageProps) {
  const { schoolCode } = params;

  return (
    <div>
      <Title level={2} className="mb-6">
        <UserOutlined className="mr-2" /> My Profile
      </Title>
      <Paragraph>
        Students will be able to view and manage their profile information here.
      </Paragraph>
      <Empty description="Student Profile module coming soon!" />
    </div>
  );
}
