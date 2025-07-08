'use client';

import React, { useState } from 'react';
import { Button, Typography, Input, Card, Space, Form, Alert } from 'antd';
import { SearchOutlined, LoginOutlined, ReadOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const { Title, Paragraph } = Typography;

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onFinish = ({ schoolCode }: { schoolCode: string }) => {
    if (!schoolCode || schoolCode.trim() === '') {
      setError('Please enter a school code.');
      return;
    }
    setLoading(true);
    setError('');
    // The router push will navigate to the school's public website.
    // The existence of the school will be handled by the [schoolCode] pages.
    router.push(`/${schoolCode.trim().toLowerCase()}`);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-light-gray p-4 sm:p-8">
      <Card className="w-full max-w-2xl shadow-xl">
        <div className="text-center">
          <ReadOutlined style={{ fontSize: '48px', color: 'var(--ant-primary-color)' }} className="mb-4" />
          <Title level={2} className="text-primary">Unified School Management System</Title>
          <Paragraph className="text-secondary-default mb-8">
            The all-in-one platform to manage academics, finance, and communication for educational institutions.
          </Paragraph>
          
          <Title level={4}>Find Your School</Title>
          <Paragraph type="secondary" className="mb-6">
            Enter your school's unique code below to visit its public website.
          </Paragraph>

          <Form onFinish={onFinish}>
            <Space.Compact style={{ width: '100%' }}>
              <Form.Item
                name="schoolCode"
                noStyle
                rules={[{ required: true, message: 'Please input a school code!' }]}
              >
                <Input
                  size="large"
                  placeholder="e.g. springfield, riverdale"
                  prefix={<SearchOutlined />}
                  onChange={() => error && setError('')}
                />
              </Form.Item>
              <Form.Item noStyle>
                <Button type="primary" htmlType="submit" size="large" loading={loading}>
                  Go
                </Button>
              </Form.Item>
            </Space.Compact>
            {error && <Alert message={error} type="error" showIcon className="mt-2 text-left" />}
          </Form>

          <div className="mt-10 pt-6 border-t border-gray-200">
            <Paragraph>
              Are you an administrator, teacher, or student?
            </Paragraph>
            <Link href="/login">
              <Button type="default" size="large" icon={<LoginOutlined />}>
                Go to Login Portal
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
