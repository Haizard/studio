
'use client';
import React from 'react';
import { Typography, Empty } from 'antd';
import { MedicineBoxOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

interface PharmacyPageProps {
  params: { schoolCode: string };
}

export default function PharmacyPage({ params }: PharmacyPageProps) {
  const { schoolCode } = params;

  return (
    <div>
      <Title level={2} className="mb-6">
        <MedicineBoxOutlined className="mr-2" /> School Pharmacy / Health
      </Title>
      <Paragraph>
        This section will manage student health records, medication dispensing, and other pharmacy-related activities for {schoolCode.toUpperCase()}.
      </Paragraph>
      <Empty description="Pharmacy/Health module coming soon!" />
    </div>
  );
}
