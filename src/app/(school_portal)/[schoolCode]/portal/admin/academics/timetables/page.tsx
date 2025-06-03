
'use client';
import React from 'react';
import { Typography, Empty } from 'antd';
import { ScheduleOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

interface TimetableManagementPageProps {
  params: { schoolCode: string };
}

export default function TimetableManagementPage({ params }: TimetableManagementPageProps) {
  const { schoolCode } = params;

  return (
    <div>
      <Title level={2} className="mb-6">
        <ScheduleOutlined className="mr-2" /> Timetable Management
      </Title>
      <Paragraph>
        This section will allow administrators to create, manage, and publish class and teacher timetables for {schoolCode.toUpperCase()}.
      </Paragraph>
      <Empty description="Timetable Management module coming soon!" />
    </div>
  );
}
