
'use client';
import React, { useState, useEffect } from 'react';
import { Button, Typography, Table, Modal, Form, Input, DatePicker, Switch, message, Tag, Space, Spin, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, AimOutlined, BulbOutlined } from '@ant-design/icons';
import type { INewsArticle } from '@/models/Tenant/NewsArticle'; 
import moment from 'moment'; 
import { summarizeText, type SummarizeTextInput } from '@/ai/flows/summarize-text-flow';
import { generateArticleContent, type GenerateArticleInput } from '@/ai/flows/generate-article-flow';
import RichTextEditor from '@/components/RichTextEditor'; // Import the new RichTextEditor
import { Controller, useForm } from 'react-hook-form'; // Import Controller for RTE

const { Title, Paragraph } = Typography;
const { TextArea } = Input; // TextArea will still be used for summary

interface NewsArticleDataType extends INewsArticle {
  key: string;
}

interface NewsManagementPageProps {
  params: { schoolCode: string };
}

// For react-hook-form
type FormValues = {
  title: string;
  slug: string;
  content: string;
  summary?: string;
  category?: string;
  tags?: string;
  featuredImageUrl?: string;
  publishedDate: moment.Moment;
  isActive: boolean;
  aiKeywords?: string;
};


export default function NewsManagementPage({ params }: NewsManagementPageProps) {
  const { schoolCode } = params;
  const [articles, setArticles] = useState<NewsArticleDataType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingArticle, setEditingArticle] = useState<NewsArticleDataType | null>(null);
  
  // Use react-hook-form for modal form
  const { control, handleSubmit, reset, setValue, getValues, watch, formState: {isSubmitting} } = useForm<FormValues>({
     defaultValues: {
        title: '',
        slug: '',
        content: '',
        summary: '',
        category: '',
        tags: '',
        featuredImageUrl: '',
        publishedDate: moment(),
        isActive: true,
        aiKeywords: ''
    }
  });

  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/${schoolCode}/website/news?adminView=true`); 
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch news articles');
      }
      const data: INewsArticle[] = await response.json();
      setArticles(data.map(article => ({ 
        ...article, 
        key: article._id,
        // publishedDate: article.publishedDate ? moment(article.publishedDate) as any : undefined 
      })));
    } catch (error: any) {
      message.error(error.message || 'Could not load news articles.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, [schoolCode]);

  const handleAddArticle = () => {
    setEditingArticle(null);
    reset({ 
        title: '', slug: '', content: '', summary: '', category: '', tags: '', 
        featuredImageUrl: '', publishedDate: moment(), isActive: true, aiKeywords: ''
    });
    setIsModalVisible(true);
  };

  const handleEditArticle = (article: NewsArticleDataType) => {
    setEditingArticle(article);
    reset({
      title: article.title,
      slug: article.slug,
      content: article.content,
      summary: article.summary || '',
      category: article.category || '',
      tags: Array.isArray(article.tags) ? article.tags.join(', ') : (article.tags || ''),
      featuredImageUrl: article.featuredImageUrl || '',
      publishedDate: article.publishedDate ? moment(article.publishedDate) : moment(),
      isActive: article.isActive,
      aiKeywords: '' // Keywords are for generation, not stored typically
    });
    setIsModalVisible(true);
  };

  const onSubmit = async (values: FormValues) => {
    try {
      const payload = { 
        ...values,
        publishedDate: values.publishedDate ? values.publishedDate.toISOString() : new Date().toISOString(),
        tags: values.tags ? (values.tags as string).split(',').map(tag => tag.trim()).filter(Boolean) : [],
      };
      
      if (!payload.slug && payload.title) {
        payload.slug = payload.title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
      }


      const url = editingArticle ? `/api/${schoolCode}/website/news/${editingArticle._id}` : `/api/${schoolCode}/website/news`;
      const method = editingArticle ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${editingArticle ? 'update' : 'add'} article`);
      }

      message.success(`Article ${editingArticle ? 'updated' : 'added'} successfully`);
      setIsModalVisible(false);
      fetchArticles();
    } catch (error: any) {
      message.error(error.message || `Could not ${editingArticle ? 'update' : 'add'} article.`);
      console.error('Modal submission error:', error);
    }
  };

  const handleGenerateSummary = async () => {
    const content = getValues('content');
    if (!content || content.trim() === '' || content.trim() === '<p><br></p>') { // Check for empty Quill content
      message.warning('Please enter some content for the article before generating a summary.');
      return;
    }
    setIsGeneratingSummary(true);
    try {
      const input: SummarizeTextInput = { textToSummarize: content };
      const result = await summarizeText(input);
      if (result && result.summary) {
        setValue('summary', result.summary);
        message.success('Summary generated successfully!');
      } else {
        message.error('Failed to generate summary.');
      }
    } catch (error: any) {
      console.error('Error generating summary:', error);
      message.error(error.message || 'An error occurred while generating the summary.');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleGenerateFullContent = async () => {
    const title = getValues('title');
    const keywords = getValues('aiKeywords'); 
    if (!title || title.trim() === '') {
      message.warning('Please enter a title for the article before generating content.');
      return;
    }
    setIsGeneratingContent(true);
    try {
      const input: GenerateArticleInput = { title, keywords };
      const result = await generateArticleContent(input);
      if (result && result.articleContent) {
        // For Quill, it's better to set the value as HTML
        // Simple text to basic HTML paragraph:
        const htmlContent = result.articleContent.split(/\n\s*\n/).map(p => `<p>${p}</p>`).join('');
        setValue('content', htmlContent);
        message.success('Article content generated successfully!');
      } else {
        message.error('Failed to generate article content.');
      }
    } catch (error: any) {
      console.error('Error generating article content:', error);
      message.error(error.message || 'An error occurred while generating the article content.');
    } finally {
      setIsGeneratingContent(false);
    }
  };


  const columns = [
    { title: 'Title', dataIndex: 'title', key: 'title', sorter: (a:NewsArticleDataType, b:NewsArticleDataType) => a.title.localeCompare(b.title) },
    { title: 'Slug', dataIndex: 'slug', key: 'slug' },
    { title: 'Published Date', dataIndex: 'publishedDate', key: 'publishedDate', render: (dateStr: string) => dateStr ? moment(dateStr).format('YYYY-MM-DD HH:mm') : '-', sorter: (a: NewsArticleDataType, b: NewsArticleDataType) => moment(a.publishedDate).unix() - moment(b.publishedDate).unix()},
    { title: 'Category', dataIndex: 'category', key: 'category', render: (cat?: string) => cat || '-' },
    { title: 'Status', dataIndex: 'isActive', key: 'isActive', render: (isActive: boolean) => <Tag color={isActive ? 'green' : 'red'}>{isActive ? 'Published' : 'Draft'}</Tag> },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: NewsArticleDataType) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => handleEditArticle(record)}>Edit</Button>
        </Space>
      ),
    },
  ];
  
  if (loading) {
    return <div className="flex justify-center items-center h-full"><Spin size="large" /></div>;
  }
  
  const watchedContent = watch('content'); // For AI Summary

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <Title level={2}>Manage News Articles</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddArticle}>
          Add New Article
        </Button>
      </div>
      <Table columns={columns} dataSource={articles} rowKey="_id" />

      <Modal
        title={editingArticle ? 'Edit News Article' : 'Add New News Article'}
        open={isModalVisible}
        onOk={handleSubmit(onSubmit)}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={isSubmitting || isGeneratingSummary || isGeneratingContent}
        destroyOnClose
        width={900} // Increased width for RTE
        maskClosable={false}
      >
        <Form layout="vertical" name="newsArticleForm" className="mt-4" onFinish={handleSubmit(onSubmit)}>
          <Form.Item label="Title" required>
            <Controller
                name="title"
                control={control}
                rules={{ required: "Title is required" }}
                render={({ field, fieldState }) => (
                    <>
                        <Input {...field} />
                        {fieldState.error && <p className="text-red-500 text-xs mt-1">{fieldState.error.message}</p>}
                    </>
                )}
            />
          </Form.Item>
          <Form.Item label="Slug (URL Path)" required help="Auto-generated from title if left blank. E.g., 'my-article-title'">
             <Controller
                name="slug"
                control={control}
                rules={{ required: "Slug is required" }}
                render={({ field, fieldState }) => (
                    <>
                        <Input {...field} disabled={!!editingArticle && !!editingArticle.slug} />
                        {fieldState.error && <p className="text-red-500 text-xs mt-1">{fieldState.error.message}</p>}
                    </>
                )}
            />
          </Form.Item>
          
          <Form.Item label="Content" required>
             <Row gutter={8} align="middle" className="mb-2">
              <Col flex="auto">
                 <Controller
                    name="aiKeywords"
                    control={control}
                    render={({ field }) => (
                       <Input {...field} placeholder="Optional: Keywords for AI (e.g., sports day, annual results)" />
                    )}
                 />
                 <p className="text-xs text-gray-500 mt-1">Optional: Keywords to guide AI content generation (comma-separated).</p>
              </Col>
              <Col flex="none">
                <Button 
                  icon={<BulbOutlined />} 
                  onClick={handleGenerateFullContent} 
                  loading={isGeneratingContent}
                  title="Generate Article Content with AI"
                >
                 {isGeneratingContent ? 'Generating...' : 'AI Generate Content'}
                </Button>
              </Col>
            </Row>
            <Controller
              name="content"
              control={control}
              rules={{ 
                required: "Content is required",
                validate: value => (value && value !== '<p><br></p>') || 'Content cannot be empty'
              }}
              render={({ field, fieldState }) => (
                <>
                  <RichTextEditor
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Write your article content here, or generate with AI using the button above."
                    className="bg-white" // Ensure proper background for toolbar contrast
                  />
                  {fieldState.error && <p className="text-red-500 text-xs mt-1">{fieldState.error.message}</p>}
                </>
              )}
            />
          </Form.Item>

          <Form.Item label="Summary (Optional)">
            <Row gutter={8}>
              <Col flex="auto">
                <Controller
                    name="summary"
                    control={control}
                    render={({ field }) => (
                         <TextArea {...field} rows={3} placeholder="A short summary for article listings." />
                    )}
                />
              </Col>
              <Col flex="none">
                <Button 
                  icon={<AimOutlined />} 
                  onClick={handleGenerateSummary} 
                  loading={isGeneratingSummary}
                  title="Generate Summary with AI"
                  disabled={!watchedContent || watchedContent === '<p><br></p>'}
                >
                 {isGeneratingSummary ? 'Generating...' : 'AI Summary'}
                </Button>
              </Col>
            </Row>
          </Form.Item>
          <Form.Item label="Category (Optional)">
             <Controller name="category" control={control} render={({ field }) => <Input {...field} />} />
          </Form.Item>
          <Form.Item label="Tags (Optional, comma-separated)">
             <Controller name="tags" control={control} render={({ field }) => <Input {...field} placeholder="e.g., sports, academics, event" />} />
          </Form.Item>
           <Form.Item label="Featured Image URL (Optional)">
            <Controller name="featuredImageUrl" control={control} render={({ field }) => <Input {...field} placeholder="https://example.com/image.jpg" />} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Published Date" required>
                <Controller
                    name="publishedDate"
                    control={control}
                    rules={{ required: "Published date is required"}}
                    render={({ field, fieldState }) => (
                        <>
                            <DatePicker {...field} showTime format="YYYY-MM-DD HH:mm:ss" style={{width: "100%"}}/>
                            {fieldState.error && <p className="text-red-500 text-xs mt-1">{fieldState.error.message}</p>}
                        </>
                    )}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Status" valuePropName="checked">
                <Controller
                    name="isActive"
                    control={control}
                    render={({ field }) => (
                        <Switch {...field} checked={field.value} checkedChildren="Published" unCheckedChildren="Draft" />
                    )}
                />
              </Form.Item>
            </Col>
          </Row>
          {/* Submit button is handled by Modal's onOk */}
        </Form>
      </Modal>
    </div>
  );
}
