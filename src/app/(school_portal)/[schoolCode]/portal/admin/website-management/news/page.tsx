
'use client';
import React, { useState, useEffect } from 'react';
import { Button, Typography, Table, Modal, Form, Input, DatePicker, Switch, message, Tag, Space, Spin, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, AimOutlined } from '@ant-design/icons';
import type { INewsArticle } from '@/models/Tenant/NewsArticle'; 
import moment from 'moment'; 
import { summarizeText, type SummarizeTextInput } from '@/ai/flows/summarize-text-flow';

const { Title, Paragraph } = Typography;
const { TextArea } = Input;

interface NewsArticleDataType extends INewsArticle {
  key: string;
}

interface NewsManagementPageProps {
  params: { schoolCode: string };
}

export default function NewsManagementPage({ params }: NewsManagementPageProps) {
  const { schoolCode } = params;
  const [articles, setArticles] = useState<NewsArticleDataType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingArticle, setEditingArticle] = useState<NewsArticleDataType | null>(null);
  const [form] = Form.useForm();
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

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
        publishedDate: article.publishedDate ? moment(article.publishedDate) as any : undefined 
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
    form.resetFields();
    form.setFieldsValue({ isActive: true, publishedDate: moment() });
    setIsModalVisible(true);
  };

  const handleEditArticle = (article: NewsArticleDataType) => {
    setEditingArticle(article);
    form.setFieldsValue({
      ...article,
      tags: Array.isArray(article.tags) ? article.tags.join(', ') : article.tags,
      publishedDate: article.publishedDate ? moment(article.publishedDate) : undefined,
    });
    setIsModalVisible(true);
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
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
    const content = form.getFieldValue('content');
    if (!content || content.trim() === '') {
      message.warning('Please enter some content for the article before generating a summary.');
      return;
    }
    setIsGeneratingSummary(true);
    try {
      const input: SummarizeTextInput = { textToSummarize: content };
      const result = await summarizeText(input);
      if (result && result.summary) {
        form.setFieldsValue({ summary: result.summary });
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


  const columns = [
    { title: 'Title', dataIndex: 'title', key: 'title', sorter: (a:NewsArticleDataType, b:NewsArticleDataType) => a.title.localeCompare(b.title) },
    { title: 'Slug', dataIndex: 'slug', key: 'slug' },
    { title: 'Published Date', dataIndex: 'publishedDate', key: 'publishedDate', render: (date: moment.Moment) => date ? date.format('YYYY-MM-DD') : '-', sorter: (a: NewsArticleDataType, b: NewsArticleDataType) => moment(a.publishedDate).unix() - moment(b.publishedDate).unix()},
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
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={form.isSubmitting || isGeneratingSummary}
        destroyOnClose
        width={800}
      >
        <Form form={form} layout="vertical" name="newsArticleForm" className="mt-4">
          <Form.Item name="title" label="Title" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="slug" label="Slug (URL Path)" rules={[{ required: true }]} help="Auto-generated from title if left blank. E.g., 'my-article-title'">
            <Input disabled={!!editingArticle && !!editingArticle.slug}/>
          </Form.Item>
          <Form.Item name="content" label="Content (Markdown or HTML)" rules={[{ required: true }]}>
            <TextArea rows={10} placeholder="Write your article content here..." />
          </Form.Item>
          <Form.Item label="Summary (Optional)">
            <Row gutter={8}>
              <Col flex="auto">
                <Form.Item name="summary" noStyle>
                  <TextArea rows={3} placeholder="A short summary for article listings." />
                </Form.Item>
              </Col>
              <Col flex="none">
                <Button 
                  icon={<AimOutlined />} 
                  onClick={handleGenerateSummary} 
                  loading={isGeneratingSummary}
                  title="Generate Summary with AI"
                >
                 {isGeneratingSummary ? 'Generating...' : 'AI Summary'}
                </Button>
              </Col>
            </Row>
          </Form.Item>
          <Form.Item name="category" label="Category (Optional)">
            <Input />
          </Form.Item>
          <Form.Item name="tags" label="Tags (Optional, comma-separated)">
            <Input placeholder="e.g., sports, academics, event" />
          </Form.Item>
           <Form.Item name="featuredImageUrl" label="Featured Image URL (Optional)">
            <Input placeholder="https://example.com/image.jpg" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="publishedDate" label="Published Date" rules={[{ required: true }]}>
                <DatePicker showTime format="YYYY-MM-DD HH:mm:ss" style={{width: "100%"}}/>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="isActive" label="Status" valuePropName="checked">
                <Switch checkedChildren="Published" unCheckedChildren="Draft" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
