
'use client';
import React from 'react';
import { Typography, Card, Row, Col } from 'antd';
import { CalendarOutlined, UnorderedListOutlined, TeamOutlined, AppstoreAddOutlined, ScheduleOutlined as ScheduleIcon, CarryOutOutlined } from '@ant-design/icons'; // Changed ScheduleOutlined to ScheduleIcon to avoid conflict
import Link from 'next/link';

const { Title, Paragraph } = Typography;

interface AcademicsDashboardPageProps {
  params: { schoolCode: string };
}

export default function AcademicsDashboardPage({ params }: AcademicsDashboardPageProps) {
  const { schoolCode } = params;
  const basePortalPath = `/${schoolCode}/portal/admin/academics`;

  const academicSections = [
    { title: 'Academic Years', icon: <CalendarOutlined />, link: `${basePortalPath}/academic-years`, description: 'Manage school academic years.' },
    { title: 'Terms', icon: <CarryOutOutlined />, link: `${basePortalPath}/terms`, description: 'Manage academic terms within years.' },
    { title: 'Subjects', icon: <UnorderedListOutlined />, link: `${basePortalPath}/subjects`, description: 'Define and manage subjects offered.' },
    { title: 'Classes', icon: <TeamOutlined />, link: `${basePortalPath}/classes`, description: 'Manage classes, streams, and class teachers.' },
    { title: 'A-Level Combinations', icon: <AppstoreAddOutlined />, link: `${basePortalPath}/alevel-combinations`, description: 'Manage A-Level subject combinations.' },
    { title: 'Timetable Management', icon: <ScheduleIcon />, link: `${basePortalPath}/timetables`, description: 'Create and manage class timetables.' },
  ];

  return (
    <div>
      <Title level={2} className="mb-8">Academics Management</Title>
      <Paragraph className="mb-8">
        Oversee all academic settings for {schoolCode.toUpperCase()}, including academic years, terms, subjects, classes, and more.
      </Paragraph>
      <Row gutter={[16, 24]}>
        {academicSections.map(section => (
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
