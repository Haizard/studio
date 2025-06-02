
'use client';
import React from 'react';
import { Typography, Empty } from 'antd';
import { FolderOpenOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

interface StudentResourcesPageProps {
  params: { schoolCode: string };
}

export default function StudentResourcesPage({ params }: StudentResourcesPageProps) {
  const { schoolCode } = params;

  return (
    <div>
      <Title level={2} className="mb-6">
        <FolderOpenOutlined className="mr-2" /> Learning Resources
      </Title>
      <Paragraph>
        Students will find learning materials shared by their teachers in this section.
      </Paragraph>
      <Empty description="Student Resources module coming soon!" />
    </div>
  );
}
