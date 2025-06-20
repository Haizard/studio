
import React from 'react';
import { Typography, Card, Row, Col, Form, Input, Button, Divider } from 'antd';
import { HomeOutlined, PhoneOutlined, MailOutlined, SendOutlined, EnvironmentOutlined } from '@ant-design/icons';
import Image from 'next/image';

interface ContactPageProps {
  params: { schoolCode: string };
}

export default async function ContactPage({ params }: ContactPageProps) {
  const { schoolCode } = params; // Used for dynamic links if needed, or to fetch school-specific info later

  // Placeholder data - In future, this would come from WebsiteSettings
  const schoolName = `${schoolCode.toUpperCase()} School`;
  const contactEmail = `info@${schoolCode.toLowerCase()}.school.example.com`;
  const contactPhone = "+123 456 7890";
  const schoolAddress = "123 Education Lane, Knowledge City, KC 12345";

  return (
    <div className="container mx-auto px-4 py-8">
      <Typography.Title level={2} className="mb-8 text-center">
        <MailOutlined className="mr-2" /> Contact {schoolName}
      </Typography.Title>

      <Row gutter={[24, 32]}>
        <Col xs={24} md={12}>
          <Card title="Get in Touch" className="shadow-lg h-full">
            <Typography.Paragraph className="mb-6">
              We're here to help! Whether you have questions about admissions, our programs, or anything else, please don't hesitate to reach out.
            </Typography.Paragraph>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <HomeOutlined className="text-primary text-2xl mr-4 mt-1" />
                <div>
                  <Typography.Text strong>Our Address:</Typography.Text>
                  <Typography.Paragraph className="!mb-0">{schoolAddress}</Typography.Paragraph>
                </div>
              </div>
              <div className="flex items-start">
                <PhoneOutlined className="text-primary text-2xl mr-4 mt-1" />
                <div>
                  <Typography.Text strong>Call Us:</Typography.Text>
                  <Typography.Paragraph className="!mb-0">
                    <a href={`tel:${contactPhone}`} className="text-primary hover:underline">{contactPhone}</a>
                  </Typography.Paragraph>
                </div>
              </div>
              <div className="flex items-start">
                <MailOutlined className="text-primary text-2xl mr-4 mt-1" />
                <div>
                  <Typography.Text strong>Email Us:</Typography.Text>
                  <Typography.Paragraph className="!mb-0">
                    <a href={`mailto:${contactEmail}`} className="text-primary hover:underline">{contactEmail}</a>
                  </Typography.Paragraph>
                </div>
              </div>
            </div>
            
            <Divider>Office Hours</Divider>
            <Typography.Paragraph className="text-center">
              Monday - Friday: 8:00 AM - 5:00 PM <br />
              (Closed on public holidays)
            </Typography.Paragraph>
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card title="Send Us a Message" className="shadow-lg h-full">
            <Form layout="vertical" name="contact_form" onFinish={() => {
              // Placeholder for actual form submission logic
              // For now, this will just trigger validation if rules are set
              alert('Contact form submission is a placeholder. This feature will be implemented later.');
            }}>
              <Form.Item
                name="name"
                label="Full Name"
                rules={[{ required: true, message: 'Please enter your name!' }]}
              >
                <Input placeholder="Your Full Name" />
              </Form.Item>
              <Form.Item
                name="email"
                label="Email Address"
                rules={[{ required: true, message: 'Please enter your email!' }, { type: 'email', message: 'Please enter a valid email!' }]}
              >
                <Input placeholder="your.email@example.com" />
              </Form.Item>
              <Form.Item
                name="subject"
                label="Subject"
                rules={[{ required: true, message: 'Please enter a subject!' }]}
              >
                <Input placeholder="Subject of your message" />
              </Form.Item>
              <Form.Item
                name="message"
                label="Message"
                rules={[{ required: true, message: 'Please enter your message!' }]}
              >
                <Input.TextArea rows={4} placeholder="Write your message here..." />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" icon={<SendOutlined />}>
                  Send Message
                </Button>
              </Form.Item>
            </Form>
            <Typography.Paragraph type="secondary" className="text-xs mt-2">
              Please note: This form is a UI placeholder. Message submission functionality will be implemented in a future update.
            </Typography.Paragraph>
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]} className="mt-12">
        <Col span={24}>
            <Card title={<><EnvironmentOutlined className="mr-2"/>Our Location</>} className="shadow-lg">
                <Typography.Paragraph className="mb-4">
                    Find us easily using the map below or visit us at our campus. We look forward to welcoming you!
                </Typography.Paragraph>
                <div className="bg-gray-200 h-80 rounded-md flex items-center justify-center text-gray-500 overflow-hidden">
                     <Image 
                        src="https://placehold.co/800x400.png?text=School+Map+Location" 
                        alt="School Map Location Placeholder" 
                        width={800} 
                        height={400} 
                        className="w-full h-full object-cover"
                        data-ai-hint="map school location"
                    />
                </div>
                <Typography.Paragraph type="secondary" className="text-xs mt-2 text-center">
                    Map integration is a placeholder.
                </Typography.Paragraph>
            </Card>
        </Col>
      </Row>
    </div>
  );
}
