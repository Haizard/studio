
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Button, Typography, Select, Card, Form, Input, DatePicker, message, Spin, Tabs, Table, Empty, Descriptions, Modal, Row, Col, Space as AntSpace, Popconfirm } from 'antd';
import { SwapOutlined, SearchOutlined, BookOutlined, UserOutlined, ArrowRightOutlined, ArrowLeftOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useParams, useRouter } from 'next/navigation';
import type { IBook } from '@/models/Tenant/Book';
import type { ITenantUser } from '@/models/Tenant/User';
import type { IBookTransaction } from '@/models/Tenant/BookTransaction';
import moment from 'moment';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

interface MemberOption {
  value: string;
  label: string;
  role: 'student' | 'teacher';
  isActive: boolean;
}

interface BookOption {
  value: string;
  label: string;
  availableCopies: number;
  totalCopies: number;
}

export default function CirculationDeskPage() {
  const params = useParams();
  const router = useRouter();
  const schoolCode = params.schoolCode as string;

  const [borrowForm] = Form.useForm();
  const [returnForm] = Form.useForm();

  const [members, setMembers] = useState<MemberOption[]>([]);
  const [books, setBooks] = useState<BookOption[]>([]);
  const [selectedMemberForReturn, setSelectedMemberForReturn] = useState<string | undefined>();
  const [memberBorrowedBooks, setMemberBorrowedBooks] = useState<IBookTransaction[]>([]);

  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingBooks, setLoadingBooks] = useState(false);
  const [loadingBorrowedBooks, setLoadingBorrowedBooks] = useState(false);
  const [borrowing, setBorrowing] = useState(false);
  const [returning, setReturning] = useState(false);

  const STUDENTS_API = `/api/${schoolCode}/portal/students`;
  const TEACHERS_API = `/api/${schoolCode}/portal/teachers`;
  const BOOKS_API = `/api/${schoolCode}/portal/library/books`;
  const TRANSACTIONS_API = `/api/${schoolCode}/portal/library/transactions`;

  // Fetch Members (Students and Teachers)
  const fetchMembers = useCallback(async () => {
    setLoadingMembers(true);
    try {
      const [studentsRes, teachersRes] = await Promise.all([
        fetch(STUDENTS_API),
        fetch(TEACHERS_API),
      ]);
      if (!studentsRes.ok) throw new Error((await studentsRes.json()).error || 'Failed to fetch students');
      if (!teachersRes.ok) throw new Error((await teachersRes.json()).error || 'Failed to fetch teachers');
      
      const studentsData: any[] = await studentsRes.json();
      const teachersData: any[] = await teachersRes.json();

      const memberOptions: MemberOption[] = [
        ...studentsData.map(s => ({ value: s.userId._id, label: `${s.userId.firstName} ${s.userId.lastName} (Student - ${s.studentIdNumber || s.userId.username})`, role: 'student' as 'student', isActive: s.userId.isActive })),
        ...teachersData.map(t => ({ value: t.userId._id, label: `${t.userId.firstName} ${t.userId.lastName} (Teacher - ${t.teacherIdNumber || t.userId.username})`, role: 'teacher' as 'teacher', isActive: t.userId.isActive })),
      ].filter(m => m.isActive).sort((a, b) => a.label.localeCompare(b.label));
      setMembers(memberOptions);
    } catch (err: any) {
      message.error(err.message || 'Could not load members.');
    } finally {
      setLoadingMembers(false);
    }
  }, [schoolCode, STUDENTS_API, TEACHERS_API]);

  // Fetch Books
  const fetchBooks = useCallback(async (searchTerm: string = '') => {
    setLoadingBooks(true);
    try {
      const res = await fetch(`${BOOKS_API}?search=${encodeURIComponent(searchTerm)}`);
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch books');
      const booksData: IBook[] = await res.json();
      setBooks(booksData.map(b => ({ value: b._id, label: `${b.title} by ${b.author} (ISBN: ${b.isbn || 'N/A'}) - ${b.availableCopies}/${b.totalCopies} available`, availableCopies: b.availableCopies, totalCopies: b.totalCopies })));
    } catch (err: any) {
      message.error(err.message || 'Could not load books.');
    } finally {
      setLoadingBooks(false);
    }
  }, [schoolCode, BOOKS_API]);

  useEffect(() => {
    fetchMembers();
    fetchBooks(); // Initial fetch for books
  }, [fetchMembers, fetchBooks]);

  // Fetch Borrowed Books for Selected Member
  useEffect(() => {
    if (!selectedMemberForReturn) {
      setMemberBorrowedBooks([]);
      return;
    }
    const fetchBorrowed = async () => {
      setLoadingBorrowedBooks(true);
      try {
        const res = await fetch(`${TRANSACTIONS_API}?memberId=${selectedMemberForReturn}&isReturned=false`);
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch borrowed books');
        const data: IBookTransaction[] = (await res.json()).map((t: any) => ({...t, key: t._id}));
        setMemberBorrowedBooks(data);
      } catch (err: any) {
        message.error(err.message || 'Could not load borrowed books.');
      } finally {
        setLoadingBorrowedBooks(false);
      }
    };
    fetchBorrowed();
  }, [selectedMemberForReturn, TRANSACTIONS_API]);

  const handleBorrowSubmit = async (values: any) => {
    setBorrowing(true);
    try {
      const payload = {
        action: 'borrow',
        bookId: values.bookId,
        memberId: values.memberId,
        dueDate: values.dueDate.toISOString(),
        notes: values.notes,
      };
      const res = await fetch(TRANSACTIONS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to borrow book');
      message.success('Book borrowed successfully!');
      borrowForm.resetFields();
      fetchBooks(); // Refresh book list for availability
    } catch (err: any) {
      message.error(err.message || 'Could not borrow book.');
    } finally {
      setBorrowing(false);
    }
  };

  const handleReturnSubmit = async (transactionId: string) => {
    setReturning(true);
    try {
      const payload = {
        action: 'return',
        bookTransactionId: transactionId,
        notes: returnForm.getFieldValue(`notes_${transactionId}`), // Or handle notes differently
      };
      const res = await fetch(TRANSACTIONS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to return book');
      message.success('Book returned successfully!');
      // Re-fetch borrowed books for the member and all books for availability
      if (selectedMemberForReturn) {
        const event = new Event('fetchBorrowedBooks'); // Custom event for useEffect
        (event as any).detail = selectedMemberForReturn;
        document.dispatchEvent(event); // This might not be the best way to trigger useEffect reload, direct call to fetchBorrowed is better
         const fetchBorrowed = async () => {
            setLoadingBorrowedBooks(true);
            try {
                const resBorrowed = await fetch(`${TRANSACTIONS_API}?memberId=${selectedMemberForReturn}&isReturned=false`);
                if (!resBorrowed.ok) throw new Error((await resBorrowed.json()).error || 'Failed to fetch borrowed books');
                setMemberBorrowedBooks((await resBorrowed.json()).map((t:any) => ({...t, key:t._id})));
            } catch (err: any) {
                message.error(err.message || 'Could not load borrowed books.');
            } finally {
                setLoadingBorrowedBooks(false);
            }
        };
        fetchBorrowed();
      }
      fetchBooks();
      returnForm.resetFields(['notes']);
    } catch (err: any) {
      message.error(err.message || 'Could not return book.');
    } finally {
      setReturning(false);
    }
  };
  
  const borrowedBooksColumns = [
    { title: 'Book Title', dataIndex: ['bookId', 'title'], key: 'bookTitle' },
    { title: 'Borrow Date', dataIndex: 'borrowDate', key: 'borrowDate', render: (date:string) => moment(date).format('LL') },
    { title: 'Due Date', dataIndex: 'dueDate', key: 'dueDate', render: (date:string) => moment(date).format('LL') },
    { title: 'Notes (Optional)', dataIndex: 'returnNotes', key: 'returnNotes', render: (_:any, record: IBookTransaction) => <Form.Item name={`notes_${record._id}`} noStyle><Input.TextArea rows={1} placeholder="Return notes..." /></Form.Item>},
    { title: 'Action', key: 'action', render: (_:any, record: IBookTransaction) => (
        <Popconfirm
          title="Confirm book return?"
          onConfirm={() => handleReturnSubmit(record._id)}
          okText="Yes, Return"
          cancelText="No"
          disabled={returning}
        >
          <Button type="primary" loading={returning} icon={<ArrowLeftOutlined />}>Return Book</Button>
        </Popconfirm>
      )
    },
  ];


  return (
    <div>
      <Title level={2} className="mb-6"><SwapOutlined className="mr-2" />Library Circulation Desk</Title>
      <Tabs defaultActiveKey="1">
        <TabPane tab={<span><ArrowRightOutlined /> Borrow Books</span>} key="1">
          <Card title="Issue a Book to a Member">
            <Form form={borrowForm} layout="vertical" onFinish={handleBorrowSubmit}>
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item name="memberId" label="Select Member" rules={[{ required: true }]}>
                    <Select
                      showSearch
                      placeholder="Search and select member (Student or Teacher)"
                      loading={loadingMembers}
                      filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                      options={members}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="bookId" label="Select Book" rules={[{ required: true }]}>
                     <Select
                      showSearch
                      placeholder="Search and select book (Title, Author, ISBN)"
                      loading={loadingBooks}
                      onSearch={(value) => fetchBooks(value)} // Fetch books on search
                      filterOption={false} // Server-side search
                      options={books.filter(b => b.availableCopies > 0)} // Only show available books
                      notFoundContent={loadingBooks ? <Spin size="small" /> : <Empty description="No books found or all copies borrowed." />}
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col xs={24} md={12}>
                    <Form.Item name="dueDate" label="Due Date" rules={[{ required: true }]}>
                        <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" disabledDate={(current) => current && current < moment().endOf('day')} />
                    </Form.Item>
                </Col>
                 <Col xs={24} md={12}>
                    <Form.Item name="notes" label="Notes (Optional)">
                        <Input.TextArea rows={2} placeholder="Any notes regarding this borrowing..." />
                    </Form.Item>
                </Col>
              </Row>
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={borrowing} icon={<ArrowRightOutlined />}>
                  Issue Book
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </TabPane>
        <TabPane tab={<span><ArrowLeftOutlined /> Return Books</span>} key="2">
          <Card title="Receive Returned Books">
            <Form form={returnForm} layout="vertical">
              <Form.Item label="Select Member" rules={[{ required: true }]}>
                <Select
                  showSearch
                  placeholder="Search and select member"
                  loading={loadingMembers}
                  filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                  options={members}
                  onChange={(value) => setSelectedMemberForReturn(value)}
                  value={selectedMemberForReturn}
                />
              </Form.Item>
              {selectedMemberForReturn && (
                loadingBorrowedBooks ? <Spin tip="Loading borrowed books..." /> :
                memberBorrowedBooks.length === 0 ? <Empty description="This member has no outstanding borrowed books." /> :
                <Table 
                    columns={borrowedBooksColumns} 
                    dataSource={memberBorrowedBooks} 
                    rowKey="_id"
                    pagination={false}
                    size="small"
                />
              )}
            </Form>
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
}

