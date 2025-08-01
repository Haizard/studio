
'use client';
import React from 'react';
import { Typography, Card, Row, Col } from 'antd';
import { DollarCircleOutlined, BarsOutlined, CreditCardOutlined, AreaChartOutlined, FolderOpenOutlined, FileProtectOutlined } from '@ant-design/icons';
import Link from 'next/link';

const { Title, Paragraph } = Typography;

interface FinanceDashboardPageProps {
  params: { schoolCode: string };
}

export default function FinanceDashboardPage({ params }: FinanceDashboardPageProps) {
  const { schoolCode } = params;
  const basePortalPath = `/${schoolCode}/portal/admin/finance`;

  const financeSections = [
    { 
      title: 'Fee Structure Setup', 
      icon: <BarsOutlined />, 
      link: `${basePortalPath}/fee-structure`, 
      description: 'Define and manage individual fee items, categories, and applicability.' 
    },
    {
      title: 'Invoicing',
      icon: <FileProtectOutlined />,
      link: `${basePortalPath}/invoices`,
      description: 'Generate and manage student fee invoices for specific terms or years.'
    },
    { 
      title: 'Record Payments', 
      icon: <CreditCardOutlined />, 
      link: `${basePortalPath}/student-fees`, 
      description: 'Record and track individual student payments against fee items.' 
    },
    { 
      title: 'Expense Tracking', 
      icon: <FolderOpenOutlined />, 
      link: `${basePortalPath}/expenses`, 
      description: 'Record and manage all school expenditures and operational costs.' 
    },
     { 
      title: 'Financial Reports', 
      icon: <AreaChartOutlined />, 
      link: `${basePortalPath}/reports`, 
      description: 'View financial summaries, revenue reports, and outstanding balances.' 
    },
  ];

  return (
    <div>
      <Title level={2} className="mb-8">
        <DollarCircleOutlined className="mr-2" /> Finance Management
      </Title>
      <Paragraph className="mb-8">
        Oversee all financial operations for {schoolCode.toUpperCase()}, including fee structures, student payments, and reporting.
      </Paragraph>
      <Row gutter={[16, 24]}>
        {financeSections.map(section => (
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
    </div>
  );
}
