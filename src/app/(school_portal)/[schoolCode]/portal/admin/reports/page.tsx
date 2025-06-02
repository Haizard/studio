
'use client';
import React from 'react';
import { Typography, Empty } from 'antd';
import { BarChartOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

interface AdminReportsPageProps {
  params: { schoolCode: string };
}

export default function AdminReportsPage({ params }: AdminReportsPageProps) {
  const { schoolCode } = params;

  return (
    <div>
      <Title level={2} className="mb-6">
        <BarChartOutlined className="mr-2" /> Reports Generation
      </Title>
      <Paragraph>
        This section will allow administrators to generate various reports, including academic performance, financial summaries, and student demographics for {schoolCode.toUpperCase()}.
      </Paragraph>
      <Empty description="Reporting module coming soon!" />
    </div>
  );
}
