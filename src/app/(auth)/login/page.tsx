
'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Form, Input, Button, Typography, Alert, Space } from 'antd';
import { MailOutlined, LockOutlined, HomeOutlined } from '@ant-design/icons';

const { Title } = Typography;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(searchParams.get('error'));

  const onFinish = async (values: any) => {
    setLoading(true);
    setError(null);

    const callbackUrl = searchParams.get('callbackUrl') || '/';

    const result = await signIn('credentials', {
      redirect: false,
      email: values.email,
      password: values.password,
      schoolCode: values.schoolCode,
      // callbackUrl: callbackUrl // Let signIn handle redirect based on result
    });

    setLoading(false);

    if (result?.error) {
      setError(result.error === "CredentialsSignin" ? "Invalid email or password." : result.error);
    } else if (result?.ok) {
      // Determine redirect path based on user type or a default
      // For now, redirecting to callbackUrl or a sensible default.
      // This logic can be expanded if user.role is available here or via getSession()
      router.push(callbackUrl === '/login' ? '/' : callbackUrl);
    }
  };

  return (
    <>
      <Title level={2} className="text-center mb-8 text-primary">
        Login
      </Title>
      {error && (
        <Alert message={error} type="error" showIcon className="mb-4" />
      )}
      <Form
        name="login"
        initialValues={{ remember: true }}
        onFinish={onFinish}
        layout="vertical"
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
          tooltip="Leave empty if you are a Super Administrator."
        >
          <Input prefix={<HomeOutlined />} placeholder="School Code (Optional)" size="large" />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block size="large">
            Log in
          </Button>
        </Form.Item>
      </Form>
       <Paragraph className="text-center mt-4 text-sm">
        <Link href="/">
          <Button type="link">Back to Home</Button>
        </Link>
      </Paragraph>
    </>
  );
}

// Minimalist Link and Paragraph for this page as they are not complex components
const Link: React.FC<React.AnchorHTMLAttributes<HTMLAnchorElement>> = ({ href, children, ...props }) => (
  <a href={href} {...props}>{children}</a>
);
const Paragraph: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({ children, ...props }) => (
  <p {...props}>{children}</p>
);
