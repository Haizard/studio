
import React from 'react';
import { Typography, Card, Row, Col, Button, Timeline, List, Divider } from 'antd';
import { SolutionOutlined, DownloadOutlined, PhoneOutlined, MailOutlined, CalendarOutlined, ProfileOutlined } from '@ant-design/icons';
import Image from 'next/image';

interface AdmissionsPageProps {
  params: { schoolCode: string };
}

export default async function AdmissionsPage({ params }: AdmissionsPageProps) {
  const { schoolCode } = params; // Used for dynamic links if needed, or to fetch school-specific info later

  const admissionSteps = [
    'Complete and submit the online application form by the deadline.',
    'Attach all required documents, including previous academic records and birth certificate.',
    'Pay the non-refundable application fee.',
    'Eligible candidates will be invited for an entrance examination.',
    'Successful candidates will be invited for an interview.',
    'Admission offers will be sent out via email.',
  ];

  const keyDates = [
    { date: 'October 1st, 2024', event: 'Applications Open for 2025 Intake' },
    { date: 'November 30th, 2024', event: 'Application Submission Deadline' },
    { date: 'December 15th, 2024', event: 'Entrance Examination Day' },
    { date: 'January 10th, 2025', event: 'Interview Invitations Sent' },
    { date: 'January 25th, 2025', event: 'Admission Offers Released' },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <Typography.Title level={2} className="mb-8 text-center">
        <SolutionOutlined className="mr-2" /> Admissions at {schoolCode.toUpperCase()} School
      </Typography.Title>

      <Row gutter={[24, 24]}>
        <Col xs={24} md={16}>
          <Card className="shadow-lg mb-6">
            <Typography.Title level={3} className="mb-4 text-primary">
              Join Our Community
            </Typography.Title>
            <Typography.Paragraph className="text-lg">
              Welcome to {schoolCode.toUpperCase()} School! We are delighted you are considering us for your child's education. Our school is dedicated to fostering a supportive and challenging environment where students can thrive academically, socially, and personally. We look for passionate learners who are eager to contribute to our vibrant school community.
            </Typography.Paragraph>
            <Typography.Paragraph>
              Our admissions process is designed to identify students who will benefit most from our unique educational approach and who will, in turn, enrich our school environment. We encourage you to explore our website to learn more about our programs, values, and the opportunities we offer.
            </Typography.Paragraph>
          </Card>

          <Card title={<><ProfileOutlined className="mr-2"/>How to Apply</>} className="shadow-lg mb-6">
            <Typography.Paragraph>
              Applying to {schoolCode.toUpperCase()} School involves a few key steps. Please follow the process below carefully:
            </Typography.Paragraph>
            <List
              dataSource={admissionSteps}
              renderItem={(item, index) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Avatar shape="circle" className="bg-primary text-white">{index + 1}</Avatar>}
                    title={<Typography.Text>{item}</Typography.Text>}
                  />
                </List.Item>
              )}
              className="mb-4"
            />
            <Typography.Paragraph strong>
              Please ensure all information provided is accurate and all required documents are submitted before the deadline.
            </Typography.Paragraph>
          </Card>

          <Card title={<><CalendarOutlined className="mr-2"/>Key Admission Dates</>} className="shadow-lg mb-6">
            <Timeline mode="left">
              {keyDates.map(item => (
                <Timeline.Item key={item.event} label={<Typography.Text strong>{item.date}</Typography.Text>}>
                  {item.event}
                </Timeline.Item>
              ))}
            </Timeline>
            <Typography.Paragraph type="secondary" className="mt-4">
              *Dates are subject to change. Please check back regularly or contact the admissions office for the most up-to-date information.
            </Typography.Paragraph>
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card className="shadow-lg mb-6">
            <Image
              src="https://placehold.co/600x400.png"
              alt="Students learning"
              width={600}
              height={400}
              className="w-full h-auto object-cover rounded-md mb-4"
              data-ai-hint="students classroom"
            />
            <Typography.Title level={4}>Why Choose Us?</Typography.Title>
            <List size="small">
              <List.Item>Experienced and dedicated faculty.</List.Item>
              <List.Item>State-of-the-art facilities.</List.Item>
              <List.Item>Focus on holistic development.</List.Item>
              <List.Item>Strong community involvement.</List.Item>
              <List.Item>Excellent academic track record.</List.Item>
            </List>
          </Card>

          <Card title="Download Forms" className="shadow-lg mb-6">
            <Typography.Paragraph>
              Download the necessary admission forms below. Please ensure you select the correct form for your desired level of entry.
            </Typography.Paragraph>
            <Button 
              type="primary" 
              icon={<DownloadOutlined />} 
              href="/path/to/admission-form-primary.pdf" // Placeholder
              target="_blank"
              className="mb-2 w-full"
              disabled // Disabled until actual forms are available
            >
              Admission Form (Primary)
            </Button>
            <Button 
              type="primary" 
              icon={<DownloadOutlined />} 
              href="/path/to/admission-form-secondary.pdf" // Placeholder
              target="_blank"
              className="w-full"
              disabled // Disabled until actual forms are available
            >
              Admission Form (Secondary)
            </Button>
            <Typography.Paragraph type="secondary" className="text-xs mt-2">
              Note: Form download links are placeholders. Actual forms will be managed by the school administration.
            </Typography.Paragraph>
          </Card>
          
          <Card title="Contact Admissions" className="shadow-lg">
            <Typography.Paragraph>
              For any inquiries regarding the admissions process, please feel free to contact our admissions office:
            </Typography.Paragraph>
            <Typography.Paragraph>
              <MailOutlined className="mr-2 text-primary" /> 
              <a href="mailto:admissions@example.com">admissions@{schoolCode.toLowerCase()}.school.domain</a> {/* Placeholder email */}
            </Typography.Paragraph>
            <Typography.Paragraph>
              <PhoneOutlined className="mr-2 text-primary" /> +123 456 7890 {/* Placeholder phone */}
            </Typography.Paragraph>
             <Typography.Paragraph>
              Office Hours: Monday - Friday, 9:00 AM - 4:00 PM
            </Typography.Paragraph>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

// Minimalist Avatar component if needed for simple number display, or use AntD Avatar
const Avatar: React.FC<{ children: React.ReactNode; className?: string; shape?: 'circle' | 'square'}> = ({ children, className, shape = 'circle' }) => (
  <div className={`flex items-center justify-center w-8 h-8 text-sm font-semibold ${shape === 'circle' ? 'rounded-full' : 'rounded-md'} ${className}`}>
    {children}
  </div>
);
