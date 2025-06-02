
import React from 'react';
import { Typography, Tag, Breadcrumb, Alert, Button } from 'antd';
import Link from 'next/link';
import Image from 'next/image';
import type { INewsArticle } from '@/models/Tenant/NewsArticle'; 
import { CalendarOutlined, UserOutlined, TagsOutlined } from '@ant-design/icons';

interface SingleNewsPageProps {
  params: { schoolCode: string; slug: string };
}

async function getArticleBySlug(schoolCode: string, slug: string): Promise<INewsArticle | null> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/${schoolCode}/website/news?slug=${slug}`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      if (res.status === 404) return null; 
      console.error(`Failed to fetch article ${slug} for ${schoolCode}: ${res.status} ${res.statusText}`);
      const errorBody = await res.json().catch(() => ({}));
      console.error("Error body:", errorBody);
      return null;
    }
    return await res.json();
  } catch (error) {
    console.error('Error fetching article by slug:', error);
    return null;
  }
}


export default async function SingleNewsArticlePage({ params }: SingleNewsPageProps) {
  const { schoolCode, slug } = params;
  const article = await getArticleBySlug(schoolCode, slug);

  if (!article) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Alert
          message="Article Not Found"
          description="The news article you are looking for could not be found or is no longer available."
          type="error"
          showIcon
          action={
            <Link href={`/${schoolCode}/news`}>
              <Button type="primary">Back to News</Button>
            </Link>
          }
        />
      </div>
    );
  }
  
  const authorName = article.authorId && typeof article.authorId === 'object' 
    // @ts-ignore
    ? `${article.authorId.firstName || ''} ${article.authorId.lastName || ''}`.trim() || 'School Admin' 
    : 'School Admin';


  return (
    <div className="container mx-auto px-4 py-8">
      <Breadcrumb className="mb-6">
        <Breadcrumb.Item><Link href={`/${schoolCode}`}>Home</Link></Breadcrumb.Item>
        <Breadcrumb.Item><Link href={`/${schoolCode}/news`}>News</Link></Breadcrumb.Item>
        <Breadcrumb.Item>{article.title}</Breadcrumb.Item>
      </Breadcrumb>

      <article className="bg-white p-6 sm:p-8 rounded-lg shadow-lg">
        <Typography.Title level={1} className="mb-4">{article.title}</Typography.Title>
        
        <div className="mb-6 text-sm text-gray-600 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="flex items-center">
            <CalendarOutlined className="mr-2" />
            Published: {new Date(article.publishedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
          {authorName && (
            <span className="flex items-center">
              <UserOutlined className="mr-2" />
              By: {authorName}
            </span>
          )}
          {article.category && (
            <Tag color="blue">{article.category}</Tag>
          )}
        </div>

        {article.featuredImageUrl && (
          <div className="mb-8 rounded-md overflow-hidden">
            <Image
              src={article.featuredImageUrl}
              alt={article.title}
              width={800}
              height={450}
              className="w-full object-cover"
              priority
              data-ai-hint="news article students"
            />
          </div>
        )}

        {/* Render HTML content from Rich Text Editor */}
        {/* Ensure quill.snow.css is imported globally for these styles to apply */}
        <div
          className="prose prose-lg max-w-none ql-editor ql-snow" // Added ql-editor and ql-snow for basic Quill styling
          dangerouslySetInnerHTML={{ __html: article.content }}
        />

        {(article.tags && article.tags.length > 0) && (
          <div className="mt-8 pt-4 border-t border-gray-200">
            <span className="flex items-center text-gray-700 font-semibold mb-2">
              <TagsOutlined className="mr-2" /> Tags:
            </span>
            {article.tags.map(tag => (
              <Tag key={tag} className="mr-2 mb-2">{tag}</Tag>
            ))}
          </div>
        )}
      </article>
    </div>
  );
}
