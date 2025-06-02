
import React from 'react';
import { Typography, Card, Row, Col, Button, Empty, Tag } from 'antd';
import Link from 'next/link';
import Image from 'next/image';
import type { INewsArticle } from '@/models/Tenant/NewsArticle'; // Adjust path if needed
import { ReadOutlined } from '@ant-design/icons';

interface NewsPageProps {
  params: { schoolCode: string };
}

async function getNewsArticles(schoolCode: string): Promise<INewsArticle[]> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/${schoolCode}/website/news`, {
      cache: 'no-store', // Fetch fresh data on each request
    });
    if (!res.ok) {
      // Log error or handle specific error codes
      console.error(`Failed to fetch news for ${schoolCode}: ${res.status} ${res.statusText}`);
      const errorBody = await res.json().catch(() => ({})); // Try to parse error, default to empty obj
      console.error("Error body:", errorBody);
      return [];
    }
    const data = await res.json();
    return Array.isArray(data) ? data : []; // Ensure it returns an array
  } catch (error) {
    console.error('Error fetching news articles:', error);
    return [];
  }
}

export default async function NewsListingPage({ params }: NewsPageProps) {
  const { schoolCode } = params;
  const articles = await getNewsArticles(schoolCode);

  return (
    <div className="container mx-auto px-4 py-8">
      <Typography.Title level={2} className="mb-8 text-center">
        <ReadOutlined className="mr-2" /> School News & Announcements
      </Typography.Title>

      {articles.length === 0 ? (
        <div className="text-center">
          <Empty description="No news articles found at the moment. Please check back later." />
        </div>
      ) : (
        <Row gutter={[24, 24]}>
          {articles.map((article) => (
            <Col xs={24} sm={12} md={8} key={article._id as string}>
              <Card
                hoverable
                className="h-full flex flex-col"
                cover={
                  article.featuredImageUrl ? (
                    <Link href={`/${schoolCode}/news/${article.slug}`}>
                       <Image
                        alt={article.title}
                        src={article.featuredImageUrl}
                        width={600}
                        height={400}
                        className="w-full h-56 object-cover"
                        data-ai-hint="news article students"
                      />
                    </Link>
                  ) : (
                    <Link href={`/${schoolCode}/news/${article.slug}`}>
                      <div className="w-full h-56 bg-gray-200 flex items-center justify-center text-gray-400">
                        <ReadOutlined style={{ fontSize: '48px' }} />
                      </div>
                    </Link>
                  )
                }
              >
                <Card.Meta
                  title={<Link href={`/${schoolCode}/news/${article.slug}`} className="text-lg hover:text-primary">{article.title}</Link>}
                  description={
                    <Typography.Paragraph ellipsis={{ rows: 3 }}>
                      {article.summary || article.content.substring(0, 150) + '...'}
                    </Typography.Paragraph>
                  }
                />
                <div className="mt-4">
                  <Typography.Text type="secondary" className="text-xs block mb-1">
                    Published: {new Date(article.publishedDate).toLocaleDateString()}
                  </Typography.Text>
                  {article.category && <Tag color="blue" className="mr-1">{article.category}</Tag>}
                  {(article.tags && Array.isArray(article.tags)) && article.tags.map(tag => <Tag key={tag} className="text-xs">{tag}</Tag>)}
                </div>
                <div className="mt-auto pt-4">
                  <Link href={`/${schoolCode}/news/${article.slug}`}>
                    <Button type="primary" ghost>Read More</Button>
                  </Link>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
}

    