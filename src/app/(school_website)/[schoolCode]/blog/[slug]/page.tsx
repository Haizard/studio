
import React from 'react';
import { Typography, Tag, Breadcrumb, Alert, Button } from 'antd';
import Link from 'next/link';
import Image from 'next/image';
import type { IBlogArticle } from '@/models/Tenant/BlogArticle'; 
import { CalendarOutlined, UserOutlined, TagsOutlined, EditOutlined } from '@ant-design/icons';
import { getTenantConnection } from '@/lib/db';
import BlogArticleModel from '@/models/Tenant/BlogArticle';
import { TenantUserSchemaDefinition } from '@/models/Tenant/User';
import mongoose from 'mongoose';

interface SingleBlogPageProps {
  params: { schoolCode: string; slug: string };
}

async function getArticleBySlug(schoolCode: string, slug: string): Promise<IBlogArticle | null> {
  try {
    const tenantDb = await getTenantConnection(schoolCode);
    if (!tenantDb.models.BlogArticle) {
      tenantDb.model<IBlogArticle>('BlogArticle', BlogArticleModel.schema);
    }
     if (!tenantDb.models.User) {
      tenantDb.model('User', TenantUserSchemaDefinition);
    }
    const BlogArticle = tenantDb.models.BlogArticle as mongoose.Model<IBlogArticle>;

    const article = await BlogArticle.findOne({ slug: slug.toLowerCase(), isActive: true })
      .populate('authorId', 'firstName lastName')
      .lean();

    return article as IBlogArticle | null;
  } catch (error) {
    console.error(`Error fetching blog article by slug ${slug} for ${schoolCode}:`, error);
    return null;
  }
}

export default async function SingleBlogArticlePage({ params }: SingleBlogPageProps) {
  const { schoolCode, slug } = params;
  const article = await getArticleBySlug(schoolCode, slug);

  if (!article) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Alert
          message="Article Not Found"
          description="The blog article you are looking for could not be found or is no longer available."
          type="error"
          showIcon
          action={
            <Link href={`/${schoolCode}/blog`}>
              <Button type="primary">Back to Blog</Button>
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
        <Breadcrumb.Item><Link href={`/${schoolCode}/blog`}>Blog</Link></Breadcrumb.Item>
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
            <Tag color="cyan">{article.category}</Tag>
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
              data-ai-hint="blog article students"
            />
          </div>
        )}

        <div
          className="prose prose-lg max-w-none ql-editor ql-snow"
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
