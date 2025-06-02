
import React from 'react';
import { Typography, Button, Card, Row, Col } from 'antd'; // AntD can be used for content blocks
import { ArrowRightOutlined, ReadOutlined, CalendarOutlined } from '@ant-design/icons';
import Image from 'next/image';
import Link from 'next/link';


interface PublicHomePageProps {
  params: { schoolCode: string };
}

export default function PublicHomePage({ params }: PublicHomePageProps) {
  const { schoolCode } = params;

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="relative rounded-lg overflow-hidden shadow-xl">
        <Image 
          src="https://placehold.co/1200x500.png" // Replace with dynamic image
          alt="School Campus" 
          width={1200} 
          height={500} 
          className="w-full object-cover"
          data-ai-hint="school campus building"
          priority
        />
        <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center text-center p-8">
          <Typography.Title level={1} className="!text-white !mb-4 text-3xl md:text-5xl">
            Welcome to {schoolCode.toUpperCase()} High School
          </Typography.Title>
          <Typography.Paragraph className="text-gray-200 text-lg md:text-xl max-w-2xl mb-8">
            Excellence in Education, Nurturing Future Leaders. Discover our programs and community.
          </Typography.Paragraph>
          <Link href={`/${schoolCode}/admissions`}>
            <Button type="primary" size="large" icon={<ArrowRightOutlined />}>
              Learn More About Admissions
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick Links / Features Section */}
      <Row gutter={[16, 16]} className="text-center">
        <Col xs={24} md={8}>
          <Card hoverable className="h-full">
            <ReadOutlined style={{ fontSize: '48px', color: 'var(--ant-primary-color)' }} className="mb-4" />
            <Typography.Title level={3}>Our Academics</Typography.Title>
            <Typography.Paragraph>
              Explore our comprehensive curriculum designed for holistic development.
            </Typography.Paragraph>
            <Link href={`/${schoolCode}/academics`}>
              <Button type="link">Discover Programs <ArrowRightOutlined /></Button>
            </Link>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card hoverable className="h-full">
            <CalendarOutlined style={{ fontSize: '48px', color: 'var(--ant-primary-color)' }} className="mb-4" />
            <Typography.Title level={3}>Upcoming Events</Typography.Title>
            <Typography.Paragraph>
              Stay updated with our school events, workshops, and activities.
            </Typography.Paragraph>
            <Link href={`/${schoolCode}/events`}>
              <Button type="link">View Calendar <ArrowRightOutlined /></Button>
            </Link>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card hoverable className="h-full">
            <UserOutlined style={{ fontSize: '48px', color: 'var(--ant-primary-color)' }} className="mb-4" />
            <Typography.Title level={3}>Join Our Community</Typography.Title>
            <Typography.Paragraph>
              Become a part of a vibrant and supportive learning environment.
            </Typography.Paragraph>
            <Link href={`/${schoolCode}/contact`}>
              <Button type="link">Contact Us <ArrowRightOutlined /></Button>
            </Link>
          </Card>
        </Col>
      </Row>

      {/* News Section (Placeholder) */}
      <div className="mt-12">
        <Typography.Title level={2} className="text-center mb-8">Latest News</Typography.Title>
        <Row gutter={[16, 16]}>
          {[1, 2, 3].map(item => (
            <Col xs={24} md={8} key={item}>
              <Card
                hoverable
                cover={
                  <Image 
                    alt={`News Article ${item}`} 
                    src={`https://placehold.co/600x400.png?text=News+${item}`} 
                    width={600} height={400}  
                    className="w-full h-48 object-cover"
                    data-ai-hint="news article students"
                  />
                }
              >
                <Card.Meta 
                  title={`Exciting School Event ${item}`} 
                  description="A brief summary of the news article. Read more to find out what happened..." 
                />
                <Link href={`/${schoolCode}/news/article-${item}-slug`} className="mt-4 inline-block">
                  <Button type="primary" ghost>Read More</Button>
                </Link>
              </Card>
            </Col>
          ))}
        </Row>
        <div className="text-center mt-8">
          <Link href={`/${schoolCode}/news`}>
            <Button size="large">View All News</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

// Placeholder icon, assuming UserOutlined is defined elsewhere or imported from AntD
const UserOutlined = (props: any) => (
  <svg {...props} viewBox="64 64 896 896" focusable="false" data-icon="user" width="1em" height="1em" fill="currentColor" aria-hidden="true">
    <path d="M858.5 763.6a374 374 0 00-80.6-119.5 375.63 375.63 0 00-119.5-80.6c-.4-.2-.8-.3-1.2-.5C719.5 518 760 444.7 760 362c0-137-111-248-248-248S264 225 264 362c0 82.7 40.5 156 102.8 199.1-.4.2-.8.3-1.2.5a375.63 375.63 0 00-119.5 80.6 374 374 0 00-80.6 119.5A371.7 371.7 0 00136 901.8a8 8 0 008 8.2h60c4.4 0 7.9-3.5 8-7.8 2-77.2 33-149.5 87.8-204.3 56.7-56.7 132-87.9 212.2-87.9s155.5 31.2 212.2 87.9C779 652.7 810 725 812 802.2c.1 4.4 3.6 7.8 8 7.8h60a8 8 0 008-8.2c-1-47.8-10.9-94.3-29.5-138.2zM512 534c-45.9 0-89.1-17.9-121.6-50.4S340 407.9 340 362c0-45.9 17.9-89.1 50.4-121.6S466.1 190 512 190s89.1 17.9 121.6 50.4S684 316.1 684 362c0 45.9-17.9 89.1-50.4 121.6S557.9 534 512 534z"></path>
  </svg>
);
