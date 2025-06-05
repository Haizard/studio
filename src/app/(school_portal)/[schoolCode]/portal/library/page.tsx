
'use client';
import React from 'react';
import { Typography, Card, Row, Col } from 'antd';
import { ReadOutlined, BookOutlined, UsergroupAddOutlined, ContainerOutlined, IssuesCloseOutlined, TeamOutlined as MembersIcon, HistoryOutlined } from '@ant-design/icons';
import Link from 'next/link';

const { Title, Paragraph } = Typography;

interface LibraryPageProps {
  params: { schoolCode: string };
}

export default function LibraryDashboardPage({ params }: LibraryPageProps) {
  const { schoolCode } = params;
  const basePortalPath = `/${schoolCode}/portal/library`;

  const librarySections = [
    { 
      title: 'Book Catalog', 
      icon: <BookOutlined />, 
      link: `${basePortalPath}/books`, 
      description: 'Manage the collection of books, including adding, editing, and removing titles.' 
    },
    { 
      title: 'Member Management', 
      icon: <MembersIcon />, 
      link: `${basePortalPath}/members`,
      description: 'View list of students and teachers as potential library members.' 
    },
     { 
      title: 'Circulation Desk', 
      icon: <ContainerOutlined />, 
      link: `${basePortalPath}/circulation`, 
      description: 'Handle book check-outs, check-ins, and renewals.' 
    },
    {
      title: 'Transaction History',
      icon: <HistoryOutlined />,
      link: `${basePortalPath}/transactions`,
      description: 'View all book borrowing and return records.'
    },
    { 
      title: 'Fine Management', 
      icon: <IssuesCloseOutlined />, 
      link: `${basePortalPath}/fines`, // Placeholder
      description: 'Track and manage fines for overdue or damaged books.' 
    },
  ];

  return (
    <div>
      <Title level={2} className="mb-8">
        <ReadOutlined className="mr-2" /> Library Management Dashboard
      </Title>
      <Paragraph className="mb-8">
        Oversee all library operations for {schoolCode.toUpperCase()}, from cataloging books to managing member activities.
      </Paragraph>
      <Row gutter={[16, 24]}>
        {librarySections.map(section => (
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

    
    