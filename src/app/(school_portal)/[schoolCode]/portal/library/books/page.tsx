
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Button, Typography, Table, Modal, Form, Input, Select, message, Tag, Space, Spin, Popconfirm, InputNumber, Row, Col, Image as AntImage } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, BookOutlined, SearchOutlined } from '@ant-design/icons';
import type { IBook } from '@/models/Tenant/Book'; // Adjust path as necessary
import type { ITenantUser } from '@/models/Tenant/User';

const { Title, Paragraph } = Typography;
const { Option } = Select;

interface BookDataType extends IBook {
  key: string;
  addedByName?: string;
}

interface BookCatalogPageProps {
  params: { schoolCode: string };
}

export default function BookCatalogPage({ params }: BookCatalogPageProps) {
  const { schoolCode } = params;
  const [books, setBooks] = useState<BookDataType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingBook, setEditingBook] = useState<BookDataType | null>(null);
  const [form] = Form.useForm();

  // State for search filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGenre, setFilterGenre] = useState<string | undefined>(undefined);
  const [allGenres, setAllGenres] = useState<string[]>([]);


  const API_URL_BASE = `/api/${schoolCode}/portal/library/books`;

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (searchTerm) queryParams.append('search', searchTerm);
      if (filterGenre) queryParams.append('genre', filterGenre);
      
      const response = await fetch(`${API_URL_BASE}?${queryParams.toString()}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch books');
      }
      const data: IBook[] = await response.json();
      setBooks(data.map(book => ({ 
        ...book, 
        key: book._id,
        addedByName: book.addedById && typeof book.addedById === 'object' ? (book.addedById as ITenantUser).username : 'N/A'
      })));

      // Extract unique genres for filter dropdown if not already filtering by genre
      if (!filterGenre) {
        const uniqueGenres = Array.from(new Set(data.flatMap(book => book.genre || []))).sort();
        setAllGenres(uniqueGenres);
      }

    } catch (error: any) {
      message.error(error.message || 'Could not load books.');
    } finally {
      setLoading(false);
    }
  }, [schoolCode, API_URL_BASE, searchTerm, filterGenre]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  const handleAddBook = () => {
    setEditingBook(null);
    form.resetFields();
    form.setFieldsValue({ 
        totalCopies: 1, 
        availableCopies: 1, 
        language: 'English',
        genre: [],
    });
    setIsModalVisible(true);
  };

  const handleEditBook = (book: BookDataType) => {
    setEditingBook(book);
    form.setFieldsValue({
      ...book,
      genre: Array.isArray(book.genre) ? book.genre : (book.genre ? [book.genre as unknown as string] : []),
    });
    setIsModalVisible(true);
  };

  const handleDeleteBook = async (bookId: string) => {
    try {
      const response = await fetch(`${API_URL_BASE}/${bookId}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete book');
      }
      message.success('Book deleted successfully');
      fetchBooks();
    } catch (error: any) {
      message.error(error.message || 'Could not delete book.');
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      const payload = { ...values };
      if (payload.availableCopies > payload.totalCopies) {
        message.error('Available copies cannot exceed total copies.');
        return;
      }
      
      const url = editingBook ? `${API_URL_BASE}/${editingBook._id}` : API_URL_BASE;
      const method = editingBook ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${editingBook ? 'update' : 'add'} book`);
      }

      message.success(`Book ${editingBook ? 'updated' : 'added'} successfully`);
      setIsModalVisible(false);
      setSearchTerm(''); // Reset search after add/edit to show new item
      setFilterGenre(undefined);
      fetchBooks();
    } catch (error: any) {
      message.error(error.message || `Could not ${editingBook ? 'update' : 'add'} book.`);
    }
  };

  const columns = [
    { 
        title: 'Cover', 
        dataIndex: 'coverImageUrl', 
        key: 'coverImageUrl', 
        render: (url?: string, record?: BookDataType) => url ? <AntImage width={40} height={60} src={url} alt={record?.title} className="object-cover rounded" /> : <BookOutlined style={{fontSize: '24px'}}/>,
        width: 80,
    },
    { title: 'Title', dataIndex: 'title', key: 'title', sorter: (a:BookDataType, b:BookDataType) => a.title.localeCompare(b.title) },
    { title: 'Author', dataIndex: 'author', key: 'author', sorter: (a:BookDataType, b:BookDataType) => a.author.localeCompare(b.author) },
    { title: 'ISBN', dataIndex: 'isbn', key: 'isbn', render: (isbn?:string) => isbn || '-' },
    { title: 'Genre', dataIndex: 'genre', key: 'genre', render: (genres?:string[]) => genres && genres.length > 0 ? genres.map(g => <Tag key={g}>{g}</Tag>) : '-' },
    { title: 'Total Copies', dataIndex: 'totalCopies', key: 'totalCopies' },
    { title: 'Available', dataIndex: 'availableCopies', key: 'availableCopies' },
    { title: 'Location', dataIndex: 'locationInLibrary', key: 'locationInLibrary', render: (loc?: string) => loc || '-' },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: BookDataType) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => handleEditBook(record)}>Edit</Button>
          <Popconfirm
            title="Delete this book?"
            description="This action cannot be undone. Ensure no copies are currently borrowed."
            onConfirm={() => handleDeleteBook(record._id)}
            okText="Yes, Delete"
            cancelText="No"
          >
            <Button icon={<DeleteOutlined />} danger>Delete</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];
  
  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <Title level={2}><BookOutlined className="mr-2"/>Book Catalog Management</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddBook}>
          Add New Book
        </Button>
      </div>
      <Row gutter={16} className="mb-4">
        <Col xs={24} sm={12} md={10}>
            <Input.Search
                placeholder="Search by title, author, ISBN..."
                onSearch={handleSearch}
                onChange={e => setSearchTerm(e.target.value)}
                value={searchTerm}
                allowClear
                enterButton={<Button icon={<SearchOutlined />}>Search</Button>}
            />
        </Col>
        <Col xs={24} sm={12} md={6}>
            <Select
                style={{ width: '100%' }}
                placeholder="Filter by Genre"
                value={filterGenre}
                onChange={value => setFilterGenre(value)}
                allowClear
                loading={loading && allGenres.length === 0}
            >
                {allGenres.map(genre => <Option key={genre} value={genre}>{genre.charAt(0).toUpperCase() + genre.slice(1)}</Option>)}
            </Select>
        </Col>
         <Col xs={24} sm={12} md={4}>
            <Button onClick={() => { setSearchTerm(''); setFilterGenre(undefined);}}>Clear Filters</Button>
        </Col>
      </Row>

      <Spin spinning={loading}>
        <Table columns={columns} dataSource={books} rowKey="_id" scroll={{x: 1200}}/>
      </Spin>

      <Modal
        title={editingBook ? 'Edit Book' : 'Add New Book'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={form.isSubmitting}
        destroyOnClose
        width="80vw"
        style={{maxWidth: 900}}
      >
        <Form form={form} layout="vertical" name="bookForm" className="mt-4">
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="title" label="Title" rules={[{ required: true }]}>
                <Input placeholder="e.g., Things Fall Apart" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="author" label="Author" rules={[{ required: true }]}>
                <Input placeholder="e.g., Chinua Achebe" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item name="isbn" label="ISBN (Optional)" rules={[{ pattern: /^(?=(?:\D*\d){10}(?:(?:\D*\d){3})?$)[\d-]+$/, message: 'Enter a valid ISBN-10 or ISBN-13'}]}>
                <Input placeholder="e.g., 978-0385474542" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="publisher" label="Publisher (Optional)">
                <Input placeholder="e.g., Heinemann" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="publicationYear" label="Publication Year (Optional)">
                <InputNumber style={{width: "100%"}} placeholder="e.g. 1958"/>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="genre" label="Genre/Tags (Optional)">
            <Select mode="tags" style={{ width: '100%' }} placeholder="Type and press enter (e.g., Fiction, African Literature)" />
          </Form.Item>
          <Form.Item name="description" label="Description (Optional)">
            <Input.TextArea rows={3} placeholder="Brief summary or details about the book." />
          </Form.Item>
          <Row gutter={16}>
             <Col xs={24} sm={8}>
                <Form.Item name="language" label="Language" initialValue="English">
                    <Input placeholder="e.g., English, Kiswahili"/>
                </Form.Item>
            </Col>
             <Col xs={24} sm={8}>
                <Form.Item name="numberOfPages" label="Number of Pages (Optional)">
                    <InputNumber style={{width: "100%"}} placeholder="e.g. 209"/>
                </Form.Item>
            </Col>
             <Col xs={24} sm={8}>
                <Form.Item name="locationInLibrary" label="Location in Library (Optional)">
                    <Input placeholder="e.g., Shelf A1, Fiction Section"/>
                </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item name="totalCopies" label="Total Copies" rules={[{ required: true, type: 'number', min: 0}]}>
                <InputNumber min={0} style={{width: "100%"}} placeholder="e.g. 5"/>
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item 
                name="availableCopies" 
                label="Available Copies" 
                rules={[
                    { required: true, type: 'number', min: 0 },
                    ({ getFieldValue }) => ({
                        validator(_, value) {
                        if (!value || getFieldValue('totalCopies') === undefined || value <= getFieldValue('totalCopies')) {
                            return Promise.resolve();
                        }
                        return Promise.reject(new Error('Available copies cannot exceed total copies!'));
                        },
                    }),
                ]}
               >
                <InputNumber min={0} style={{width: "100%"}} placeholder="e.g. 3"/>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="coverImageUrl" label="Cover Image URL (Optional)">
            <Input placeholder="https://example.com/book-cover.jpg" />
             {form.getFieldValue('coverImageUrl') && (
                 <AntImage width={100} src={form.getFieldValue('coverImageUrl')} alt="cover preview" className="mt-2 object-contain" fallback="https://placehold.co/100x150.png?text=Invalid+URL"/>
             )}
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
