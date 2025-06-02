
"use client";

import React from 'react';
import { Button as AntButton, Typography, Space, Card } from 'antd';
import { SmileOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-light-gray p-8">
      <Card className="w-full max-w-2xl shadow-xl">
        <div className="text-center">
          <SmileOutlined style={{ fontSize: '48px', color: '#1677ff' }} className="mb-4" />
          <Title level={2} className="text-primary">Welcome to the School Management System</Title>
          <Paragraph className="text-secondary-default mb-8">
            This is the starting point for your new application. Tailwind CSS and Ant Design are configured.
          </Paragraph>
          
          <Space wrap size="large">
            <AntButton type="primary" size="large">
              AntD Primary Button
            </AntButton>
            <AntButton size="large">
              AntD Default Button
            </AntButton>
            <button className="bg-accent text-white font-semibold py-2 px-6 rounded-DEFAULT hover:bg-opacity-80 transition-colors text-base">
              Tailwind Styled Button
            </button>
          </Space>

          <div className="mt-10 p-4 border border-dashed border-primary-dark rounded-DEFAULT">
            <Title level={4} className="!text-primary-dark !mb-2">Next Steps:</Title>
            <ul className="list-disc list-inside text-left text-dark-text">
              <li>Explore the Ant Design component library.</li>
              <li>Start building out layouts and pages based on your roadmap.</li>
              <li>Define your Mongoose models.</li>
              <li>Implement API routes for data handling.</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
