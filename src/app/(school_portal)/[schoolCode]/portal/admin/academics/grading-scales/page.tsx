
'use client';
import React from 'react';
import { Typography, Empty } from 'antd';
import { PercentageOutlined } from '@ant-design/icons'; // Or use a different icon

const { Title, Paragraph } = Typography;

interface GradingScalesPageProps {
  params: { schoolCode: string };
}

export default function GradingScalesPage({ params }: GradingScalesPageProps) {
  const { schoolCode } = params;

  return (
    <div>
      <Title level={2} className="mb-6">
        <PercentageOutlined className="mr-2" /> Grading Scale Management
      </Title>
      <Paragraph>
        Define and manage grading scales used for assessments and report cards for {schoolCode.toUpperCase()}.
      </Paragraph>
      <Empty description="Grading scale management UI coming soon!" />
    </div>
  );
}
