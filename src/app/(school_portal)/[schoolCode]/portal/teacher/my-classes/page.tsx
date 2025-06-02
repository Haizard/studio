
'use client';
import React from 'react';
import { Typography, Empty } from 'antd';
import { TeamOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

interface TeacherMyClassesPageProps {
  params: { schoolCode: string };
}

export default function TeacherMyClassesPage({ params }: TeacherMyClassesPageProps) {
  const { schoolCode } = params;

  return (
    <div>
      <Title level={2} className="mb-6">
        <TeamOutlined className="mr-2" /> My Classes
      </Title>
      <Paragraph>
        Teachers will see lists of students for their assigned classes, attendance records, and other class-specific information here.
      </Paragraph>
      <Empty description="My Classes module coming soon!" />
    </div>
  );
}
