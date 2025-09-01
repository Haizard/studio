
'use client';

import React, { useState, useEffect } from 'react';
import { signIn, getCsrfToken } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Form, Input, Button, Alert, Typography } from 'antd';
import { MailOutlined, LockOutlined, HomeOutlined, ReadOutlined } from '@ant-design/icons';
import Link from 'next/link';

const { Title, Paragraph, Text } = Typography;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const initialSchoolCode = searchParams.get('schoolCode') || '';

  useEffect(() => {
    const callbackError = searchParams.get('error');
    if (callbackError) {
      if (callbackError === "CredentialsSignin") {
        setError("Invalid email, password, or school code. Please check your credentials and try again.");
      } else if (callbackError === "Callback") {
         setError("There was an issue redirecting you after login. Please try logging in again.");
      }
      else {
        setError(`Login failed: ${callbackError}`);
      }
    }

    
    // Get CSRF token
    const fetchCsrfToken = async () => {
      try {
        const token = await getCsrfToken();
        setCsrfToken(token || null);
      } catch (error) {
        console.error('Failed to fetch CSRF token:', error);
      }
    };
    
    fetchCsrfToken();
  }, [searchParams]);

  const onFinish = async (values: any) => {
    setLoading(true);
    setError(null);

    const callbackUrlFromQuery = searchParams.get('callbackUrl');
    
    const result = await signIn('credentials', {
      redirect: false,
      email: values.email,
      password: values.password,
      schoolCode: values.schoolCode ? values.schoolCode.trim() : undefined,
      csrfToken: csrfToken,
    });

    setLoading(false);

    if (result?.error) {
      if (result.error === "CredentialsSignin") {
        setError("Invalid email, password, or school code. Please check your credentials and try again.");
      } else {
        setError(`Login error: ${result.error}. If this persists, contact support.`);
      }
    } else if (result?.ok) {
        // The middleware handles routing to the correct dashboard based on role.
        // The callbackUrl from the query string is already a full, valid path.
        const finalRedirectUrl = callbackUrlFromQuery ? callbackUrlFromQuery : '/';
        router.push(finalRedirectUrl);
    }
  };

  return (
    <>
      <div className="text-center mb-6">
        <ReadOutlined style={{ fontSize: '48px', color: 'var(--ant-primary-color)' }} />
      </div>
      <Title level={2} className="text-center mb-8 text-primary">
        School System Login
      </Title>

      <Alert
        message="Login Instructions"
        description={
          <div>
            <p className="mb-1"><strong>For School Users (Admin, Teacher, Student):</strong> Enter your email, password, and your school's code.</p>
            <p className="mb-0"><strong>For System Administrators:</strong> Enter your super admin credentials and leave the School Code field blank.</p>
          </div>
        }
        type="info"
        showIcon
        className="mb-6"
      />

      {error && (
        <Alert message={error} type="error" showIcon closable className="mb-4" onClose={() => setError(null)} />
      )}
      <Form
        name="login"
        initialValues={{ remember: true, schoolCode: initialSchoolCode }}
        onFinish={onFinish}
        layout="vertical"
        key={initialSchoolCode} // Re-initialize form if schoolCode from query changes
      >
        <Form.Item
          name="email"
          rules={[{ required: true, message: 'Please input your Email!' }, { type: 'email', message: 'Please enter a valid email!' }]}
        >
          <Input prefix={<MailOutlined />} placeholder="Email Address" size="large" />
        </Form.Item>

        <Form.Item
          name="password"
          rules={[{ required: true, message: 'Please input your Password!' }]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="Password" size="large" />
        </Form.Item>

        <Form.Item
          name="schoolCode"
          tooltip="Leave empty if you are a Super Administrator. Otherwise, enter your school's unique code."
        >
          <Input prefix={<HomeOutlined />} placeholder="School Code (Optional)" size="large" />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block size="large" className="mt-2">
            Log in
          </Button>
        </Form.Item>
      </Form>
       <Paragraph className="text-center mt-6 text-sm">
        <Text type="secondary">
          Accessing a public school website?{' '}
          <Link href="/" className="text-primary hover:underline">
            Find a school.
          </Link> 
        </Text>
      </Paragraph>
    </>
  );
}
