
import React from 'react';
import { Typography, Card, Row, Col, Button, Empty, Tag } from 'antd';
import Link from 'next/link';
import Image from 'next/image';
import type { IBlogArticle } from '@/models/Tenant/BlogArticle';
import { EditOutlined } from '@ant-design/icons';

interface BlogPageProps {
  params: { schoolCode: string };
}

async function getBlogArticles(schoolCode: string): Promise<IBlogArticle[]> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/${schoolCode}/website/blog`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      console.error(`Failed to fetch blog articles for ${schoolCode}: ${res.status} ${res.statusText}`);
      return [];
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching blog articles:', error);
    return [];
  }
}

export default async function BlogListingPage({ params }: BlogPageProps) {
  const { schoolCode } = params;
  const articles = await getBlogArticles(schoolCode);

  return (
    <div className="container mx-auto px-4 py-8">
      <Typography.Title level={2} className="mb-8 text-center">
        <EditOutlined className="mr-2" /> School Blog
      </Typography.Title>

      {articles.length === 0 ? (
        <div className="text-center">
          <Empty description="No blog articles found. Please check back later." />
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
                    <Link href={`/${schoolCode}/blog/${article.slug}`}>
                       <Image
                        alt={article.title}
                        src={article.featuredImageUrl}
                        width={600}
                        height={400}
                        className="w-full h-56 object-cover"
                        data-ai-hint="school blog students"
                      />
                    </Link>
                  ) : (
                    <Link href={`/${schoolCode}/blog/${article.slug}`}>
                      <div className="w-full h-56 bg-gray-200 flex items-center justify-center text-gray-400">
                        <EditOutlined style={{ fontSize: '48px' }} />
                      </div>
                    </Link>
                  )
                }
              >
                <Card.Meta
                  title={<Link href={`/${schoolCode}/blog/${article.slug}`} className="text-lg hover:text-primary">{article.title}</Link>}
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
                  {article.category && <Tag color="cyan" className="mr-1">{article.category}</Tag>}
                  {(article.tags && Array.isArray(article.tags)) && article.tags.map(tag => <Tag key={tag} className="text-xs">{tag}</Tag>)}
                </div>
                <div className="mt-auto pt-4">
                  <Link href={`/${schoolCode}/blog/${article.slug}`}>
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
