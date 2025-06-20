
'use client';
import React from 'react';
import { Typography, Empty, Card, Row, Col, List } from 'antd';
import { AreaChartOutlined, FileTextOutlined, DollarOutlined, LineChartOutlined } from '@ant-design/icons';
import Link from 'next/link';

const { Title, Paragraph } = Typography;

interface AdminFinancialReportsPageProps {
  params: { schoolCode: string };
}

const potentialReports = [
  { title: 'Fee Collection Summary', description: 'Summary of fees collected over a period.', icon: <DollarOutlined />, link: '#' },
  { title: 'Outstanding Balances', description: 'Report on students with pending fee payments.', icon: <FileTextOutlined />, link: '#' },
  { title: 'Income Statement', description: 'Detailed statement of income (revenue).', icon: <LineChartOutlined />, link: '#' },
  { title: 'Expense Report', description: 'Detailed report on school expenditures (Future).', icon: <AreaChartOutlined />, link: '#' },
];

export default function AdminFinancialReportsPage({ params }: AdminFinancialReportsPageProps) {
  const { schoolCode } = params;

  return (
    <div>
      <Title level={2} className="mb-6">
        <AreaChartOutlined className="mr-2" /> Financial Reports
      </Title>
      <Paragraph className="mb-8">
        Access various financial reports for {schoolCode.toUpperCase()}. More detailed reports will be added in future updates.
      </Paragraph>

      {potentialReports.length > 0 ? (
         <Row gutter={[16, 24]}>
            {potentialReports.map(report => (
            <Col xs={24} sm={12} md={8} lg={6} key={report.title}>
                <Card 
                    hoverable={report.link !== '#'} 
                    className="h-full"
                    title={
                        <Space>
                            {React.cloneElement(report.icon, {style: {color: 'var(--ant-primary-color)'}})}
                            {report.title}
                        </Space>
                    }
                >
                    <Paragraph type="secondary" className="mb-4">{report.description}</Paragraph>
                    {report.link === '#' ? (
                        <Button type="primary" disabled>Coming Soon</Button>
                    ) : (
                        <Link href={report.link}>
                            <Button type="primary">View Report</Button>
                        </Link>
                    )}
                </Card>
            </Col>
            ))}
        </Row>
      ) : (
        <Empty description="Financial reporting modules are under development. Please check back later!" />
      )}
    </div>
  );
}

// Minimalist Space component if needed, or use AntD's Space
const Space: React.FC<{children: React.ReactNode}> = ({ children }) => <div className="flex items-center gap-2">{children}</div>;


    