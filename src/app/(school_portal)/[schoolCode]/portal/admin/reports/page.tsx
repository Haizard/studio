
'use client';
import React from 'react';
import { Typography, Empty, Card, Row, Col } from 'antd';
import { BarChartOutlined, SolutionOutlined } from '@ant-design/icons';
import Link from 'next/link';

const { Title, Paragraph } = Typography;

interface AdminReportsPageProps {
  params: { schoolCode: string };
}

export default function AdminReportsPage({ params }: AdminReportsPageProps) {
  const { schoolCode } = params;
  const basePortalPath = `/${schoolCode}/portal/admin/reports`;

  const reportSections = [
    { 
      title: 'Student Term Report', 
      icon: <SolutionOutlined />, 
      link: `${basePortalPath}/student-term-report`, 
      description: 'Generate and view individual student performance reports for a specific term.' 
    },
    // Add more report types here as they are developed
  ];

  return (
    <div>
      <Title level={2} className="mb-6">
        <BarChartOutlined className="mr-2" /> Reports Generation
      </Title>
      <Paragraph className="mb-8">
        This section allows administrators to generate various reports for {schoolCode.toUpperCase()}.
      </Paragraph>

      {reportSections.length > 0 ? (
         <Row gutter={[16, 24]}>
            {reportSections.map(section => (
            <Col xs={24} sm={12} lg={8} key={section.title}>
                <Link href={section.link}>
                <Card hoverable className="h-full">
                    <div className="flex flex-col items-center text-center">
                    <div className="text-4xl mb-4 text-primary">{section.icon}</div>
                    <Title level={4}>{section.title}</Title>
                    <Paragraph type="secondary">{section.description}</Paragraph>
                    </div>
                </Card>
                </Link>
            </Col>
            ))}
        </Row>
      ) : (
        <Empty description="Reporting modules coming soon!" />
      )}
    </div>
  );
}
