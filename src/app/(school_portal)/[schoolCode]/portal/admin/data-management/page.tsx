
'use client';
import React from 'react';
import { Typography, Card, Row, Col, Button } from 'antd';
import { UploadOutlined, DownloadOutlined, FileExcelOutlined } from '@ant-design/icons';
import Link from 'next/link';

const { Title, Paragraph } = Typography;

interface DataManagementPageProps {
  params: { schoolCode: string };
}

export default function DataManagementPage({ params }: DataManagementPageProps) {
  const { schoolCode } = params;
  const basePortalPath = `/${schoolCode}/portal/admin/data-management`;

  const dataSections = [
    { 
      title: 'Import Students', 
      icon: <UploadOutlined />, 
      link: `${basePortalPath}/import-students`, 
      description: 'Bulk import new student data from a CSV or Excel file.',
      comingSoon: true,
      isExportLink: false,
    },
    { 
      title: 'Export Students', 
      icon: <DownloadOutlined />, 
      link: `/api/${schoolCode}/portal/admin/data-management/export/students`, 
      description: 'Export student roster and details to a CSV or Excel file.',
      comingSoon: false,
      isExportLink: true,
    },
    { 
      title: 'Import Marks', 
      icon: <UploadOutlined />, 
      link: `${basePortalPath}/import-marks`, 
      description: 'Bulk upload student assessment marks from a template.',
      comingSoon: true,
      isExportLink: false,
    },
    { 
      title: 'Export Marks', 
      icon: <DownloadOutlined />, 
      link: `${basePortalPath}/export-marks`, 
      description: 'Export marks for a class, subject, or exam.',
      comingSoon: true,
      isExportLink: false,
    },
  ];

  return (
    <div>
      <Title level={2} className="mb-6">
        <FileExcelOutlined className="mr-2" /> Data Import & Export
      </Title>
      <Paragraph className="mb-8">
        Manage bulk data operations for your school. Please use the provided templates for all data imports to ensure compatibility.
      </Paragraph>
        <Row gutter={[16, 24]}>
            {dataSections.map(section => (
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
                    ) : section.isExportLink ? (
                        <a href={section.link} download>
                            <Button type="primary">Proceed</Button>
                        </a>
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
    </div>
  );
}
