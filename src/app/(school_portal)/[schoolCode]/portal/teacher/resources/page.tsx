
'use client';
import React from 'react';
import { Typography, Empty } from 'antd';
import { BookOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

interface TeacherResourcesPageProps {
  params: { schoolCode: string };
}

export default function TeacherResourcesPage({ params }: TeacherResourcesPageProps) {
  const { schoolCode } = params;

  return (
    <div>
      <Title level={2} className="mb-6">
        <BookOutlined className="mr-2" /> My Teaching Resources
      </Title>
      <Paragraph>
        Teachers will be able to upload, manage, and share teaching materials for their classes here.
      </Paragraph>
      <Empty description="Teacher Resources module coming soon!" />
    </div>
  );
}
