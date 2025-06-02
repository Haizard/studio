
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Button, Typography, Form, Input, message, Spin, Card, Row, Col } from 'antd';
import { SaveOutlined, SettingOutlined } from '@ant-design/icons';
import type { IWebsiteSettings } from '@/models/Tenant/WebsiteSettings'; 

const { Title } = Typography;
const { TextArea } = Input;

interface SchoolSettingsPageProps {
  params: { schoolCode: string };
}

export default function SchoolSettingsPage({ params }: SchoolSettingsPageProps) {
  const { schoolCode } = params;
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);

  const API_URL = `/api/${schoolCode}/portal/settings`;

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(API_URL);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch school settings');
      }
      const data: IWebsiteSettings = await response.json();
      form.setFieldsValue({
        schoolName: data.schoolName,
        tagline: data.tagline,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        address: data.address,
        footerText: data.footerText,
        logoUrl: data.logoUrl,
        faviconUrl: data.faviconUrl,
        primaryColor: data.primaryColor,
        secondaryColor: data.secondaryColor,
        aboutUsContent: data.aboutUsContent, // Load new field
      });
      setSettingsId(data._id); 
    } catch (error: any) {
      message.error(error.message || 'Could not load school settings.');
    } finally {
      setLoading(false);
    }
  }, [schoolCode, form, API_URL]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const onFinish = async (values: any) => {
    setSaving(true);
    try {
      const payload = { ...values };
      if (settingsId) {
        payload._id = settingsId; 
      }

      const response = await fetch(API_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save settings');
      }
      message.success('School settings saved successfully!');
      fetchSettings(); 
    } catch (error: any) {
      message.error(error.message || 'Could not save school settings.');
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return <div className="flex justify-center items-center h-full"><Spin size="large" tip="Loading settings..." /></div>;
  }

  return (
    <div>
      <Title level={2} className="mb-8"><SettingOutlined className="mr-2" />School & Website Settings</Title>
      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          name="schoolSettingsForm"
        >
          <Title level={4} className="mb-4">Basic Information</Title>
          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Form.Item
                name="schoolName"
                label="School Name"
                rules={[{ required: true, message: 'Please input the school name!' }]}
              >
                <Input placeholder="e.g., Springfield High School" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="tagline" label="School Tagline (Optional)">
                <Input placeholder="e.g., Excellence in Education" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="contactEmail" label="Contact Email (Optional)" rules={[{ type: 'email' }]}>
                <Input placeholder="e.g., info@springfield.edu" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="contactPhone" label="Contact Phone (Optional)">
                <Input placeholder="e.g., +1-555-123-4567" />
              </Form.Item>
            </Col>
             <Col xs={24} md={8}>
              <Form.Item name="address" label="School Address (Optional)">
                <Input placeholder="e.g., 123 Main St, Springfield" />
              </Form.Item>
            </Col>
          </Row>

          <Title level={4} className="mt-6 mb-4">Website Appearance</Title>
          <Row gutter={24}>
             <Col xs={24} md={12}>
              <Form.Item name="logoUrl" label="Logo URL (Optional)">
                <Input placeholder="https://example.com/logo.png" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="faviconUrl" label="Favicon URL (Optional)">
                <Input placeholder="https://example.com/favicon.ico" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="primaryColor" label="Website Primary Color (Hex, Optional)" help="Default is Ant Design blue.">
                <Input placeholder="#1677ff" />
              </Form.Item>
            </Col>
             <Col xs={24} md={12}>
              <Form.Item name="secondaryColor" label="Website Secondary Color (Hex, Optional)" help="Used for accents.">
                <Input placeholder="#5A5A5A" />
              </Form.Item>
            </Col>
             <Col xs={24}>
              <Form.Item name="footerText" label="Website Footer Text (Optional)">
                <TextArea rows={3} placeholder="e.g., © 2024 Springfield High School. All Rights Reserved." />
              </Form.Item>
            </Col>
          </Row>

          <Title level={4} className="mt-6 mb-4">"About Us" Page Content</Title>
          <Row gutter={24}>
            <Col xs={24}>
              <Form.Item name="aboutUsContent" label="Content for About Us Page">
                <TextArea rows={10} placeholder="Enter the content for your school's 'About Us' page. You can use basic HTML for formatting if needed." />
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item className="mt-6">
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
              Save Settings
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
