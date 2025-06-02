
'use client';
import React from 'react';
import { Typography, Empty } from 'antd';
import { HomeOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

interface DormitoryPageProps {
  params: { schoolCode: string };
}

export default function DormitoryPage({ params }: DormitoryPageProps) {
  const { schoolCode } = params;

  return (
    <div>
      <Title level={2} className="mb-6">
        <HomeOutlined className="mr-2" /> Dormitory Management
      </Title>
      <Paragraph>
        This section will handle room allocations, student boarding details, and dormitory-related administration for {schoolCode.toUpperCase()}.
      </Paragraph>
      <Empty description="Dormitory module coming soon!" />
    </div>
  );
}
