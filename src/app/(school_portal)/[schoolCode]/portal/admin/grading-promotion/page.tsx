'use client';
import React from 'react';
import { Typography, Empty, Card, Row, Col, Button } from 'antd';
import { RocketOutlined, FileDoneOutlined } from '@ant-design/icons';
import Link from 'next/link';

const { Title, Paragraph } = Typography;

interface GradingPromotionPageProps {
  params: { schoolCode: string };
}

export default function GradingPromotionPage({ params }: GradingPromotionPageProps) {
  const { schoolCode } = params;
  const basePortalPath = `/${schoolCode}/portal/admin/grading-promotion`;

  const sections = [
    { 
      title: 'Process Promotions', 
      icon: <RocketOutlined />, 
      link: `${basePortalPath}/process`, 
      description: 'Run the promotion/repetition process for students based on their end-of-year results.',
      comingSoon: false
    },
    { 
      title: 'Generate Transcripts', 
      icon: <FileDoneOutlined />, 
      link: `${basePortalPath}/transcripts`, 
      description: 'Generate official student transcripts and final report cards.',
      comingSoon: true 
    },
  ];

  return (
    <div>
      <Title level={2} className="mb-6">
        <RocketOutlined className="mr-2" /> Grading & Promotion
      </Title>
      <Paragraph className="mb-8">
        Manage end-of-year student promotions, repetitions, and generate final academic transcripts.
      </Paragraph>
        <Row gutter={[16, 24]}>
            {sections.map(section => (
            <Col xs={24} sm={12} lg={8} key={section.title}>
                <Card 
                    hoverable={!section.comingSoon} 
                    className="h-full"
                >
                    <div className="flex flex-col items-center text-center">
                    <div className="text-4xl mb-4 text-primary">{section.icon}</div>
                    <Title level={4}>{section.title}</Title>
                    <Paragraph type="secondary">{section.description}</Paragraph>
                    {section.comingSoon ? (
                        <Button type="primary" disabled>Coming Soon</Button>
                    ) : (
                         <Link href={section.link}>
                            <Button type="primary">Proceed</Button>
                        </Link>
                    )}
                    </div>
                </Card>
            </Col>
            ))}
        </Row>
      <Empty description="Grading & Promotion module under development. Final promotion logic is pending." className="mt-8" />
    </div>
  );
}
