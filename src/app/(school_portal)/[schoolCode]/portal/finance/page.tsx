
'use client';
import React from 'react';
import { Typography, Empty } from 'antd';
import { DollarCircleOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

interface FinancePageProps {
  params: { schoolCode: string };
}

export default function FinancePage({ params }: FinancePageProps) {
  const { schoolCode } = params;

  return (
    <div>
      <Title level={2} className="mb-6">
        <DollarCircleOutlined className="mr-2" /> Finance Management
      </Title>
      <Paragraph>
        This section will handle fees management, payment tracking, and financial reporting for {schoolCode.toUpperCase()}.
      </Paragraph>
      <Empty description="Finance module coming soon!" />
    </div>
  );
}
