
'use client';
import React from 'react';
import { Typography, Card, Row, Col } from 'antd';
import { MedicineBoxOutlined, UserOutlined, UnorderedListOutlined, HistoryOutlined } from '@ant-design/icons';
import Link from 'next/link';

interface PharmacyDashboardPageProps {
  params: { schoolCode: string };
}

export default function PharmacyDashboardPage({ params }: PharmacyDashboardPageProps) {
  const { schoolCode } = params;
  const basePortalPath = `/${schoolCode}/portal/pharmacy`;

  const healthSections = [
    { 
      title: 'Student Health Records', 
      icon: <UserOutlined />, 
      link: `${basePortalPath}/records`, 
      description: "View and manage student allergies, conditions, and emergency contacts.",
      comingSoon: true
    },
    { 
      title: 'Visit Log & Check-in', 
      icon: <HistoryOutlined />, 
      link: `${basePortalPath}/visits`,
      description: 'Log new student visits to the pharmacy and view past visit history.',
      comingSoon: false
    },
    { 
      title: 'Medication Inventory', 
      icon: <UnorderedListOutlined />, 
      link: `${basePortalPath}/inventory`, 
      description: 'Manage the stock of available medications and supplies.',
      comingSoon: false
    },
    {
      title: 'Dispense Medication',
      icon: <MedicineBoxOutlined />,
      link: `${basePortalPath}/visits`,
      description: 'Record the dispensation of medicine to students during a visit.',
      comingSoon: false
    },
  ];

  return (
    <div>
      <Title level={2} className="mb-8">
        <MedicineBoxOutlined className="mr-2" /> Pharmacy &amp; Health Management
      </Title>
      <Paragraph className="mb-8">
        Oversee student health records, manage visits, and track medication inventory for {schoolCode.toUpperCase()}.
      </Paragraph>
      <Row gutter={[16, 24]}>
        {healthSections.map(section => (
          <Col xs={24} sm={12} lg={8} key={section.title}>
            <Link href={section.link} legacyBehavior={section.comingSoon}>
                <Card 
                    hoverable={!section.comingSoon}
                    className="h-full"
                    title={<div className="flex items-center gap-2"><div className="text-xl text-primary">{section.icon}</div> <Title level={5} className="!mb-0">{section.title}</Title></div>}
                >
                    <Paragraph type="secondary">{section.description}</Paragraph>
                    {section.comingSoon ? (
                        <div className="text-orange-500 font-semibold mt-4">Coming Soon</div>
                    ) : (
                        <div className="text-primary hover:underline mt-4">Go to Module</div>
                    )}
                </Card>
            </Link>
          </Col>
        ))}
      </Row>
    </div>
  );
}
