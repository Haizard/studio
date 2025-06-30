
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Button, Typography, Select, Card, Form, Input, DatePicker, message, Spin, Tabs, Table, Empty, Descriptions, Modal, Row, Col, Space as AntSpace, Popconfirm, InputNumber } from 'antd';
import { SwapOutlined, SearchOutlined, BookOutlined, UserOutlined, ArrowRightOutlined, ArrowLeftOutlined, InfoCircleOutlined, DollarCircleOutlined } from '@ant-design/icons';
import { useParams, useRouter } from 'next/navigation';
import type { IBook } from '@/models/Tenant/Book';
import type { ITenantUser } from '@/models/Tenant/User';
import type { IBookTransaction, FineStatus } from '@/models/Tenant/BookTransaction';
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

const fineStatusOptions: FineStatus[] = ['Pending', 'Paid', 'Waived'];


export default function CirculationDeskPage() {
  const params = useParams();
  const router = useRouter();
  const schoolCode = params.schoolCode as string;

  const [borrowForm] = Form.useForm();
  const [returnForm] = Form.useForm();
  const [fineForm] = Form.useForm();

  const [members, setMembers] = useState<MemberOption[]>([]);
  const [books, setBooks] = useState<BookOption[]>([]);
  const [selectedMemberForReturn, setSelectedMemberForReturn] = useState<string | undefined>();
  const [memberBorrowedBooks, setMemberBorrowedBooks] = useState<IBookTransaction[]>([]);
  
  const [isFineModalVisible, setIsFineModalVisible] = useState(false);
  const [editingTransactionForFine, setEditingTransactionForFine] = useState<IBookTransaction | null>(null);

  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingBooks, setLoadingBooks] = useState(false);
  const [loadingBorrowedBooks, setLoadingBorrowedBooks] = useState(false);
  const [borrowing, setBorrowing] = useState(false);
  const [returning, setReturning] = useState(false);
  const [savingFine, setSavingFine] = useState(false);


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

  const fetchBorrowedBooks = useCallback(async (memberId: string) => {
     if (!memberId) {
      setMemberBorrowedBooks([]);
      return;
    }
    setLoadingBorrowedBooks(true);
    try {
      const res = await fetch(`${TRANSACTIONS_API}?memberId=${memberId}&status=borrowed`);
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch borrowed books');
      const data: IBookTransaction[] = (await res.json()).map((t: any) => ({...t, key: t._id}));
      setMemberBorrowedBooks(data);
    } catch (err: any) {
      message.error(err.message || 'Could not load borrowed books.');
    } finally {
      setLoadingBorrowedBooks(false);
    }
  }, [TRANSACTIONS_API]);


  useEffect(() => {
    fetchMembers();
    fetchBooks(); // Initial fetch for books
  }, [fetchMembers, fetchBooks]);

  // Fetch Borrowed Books for Selected Member
  useEffect(() => {
    if (selectedMemberForReturn) {
      fetchBorrowedBooks(selectedMemberForReturn);
    } else {
        setMemberBorrowedBooks([]);
    }
  }, [selectedMemberForReturn, fetchBorrowedBooks]);

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
      const returnedData = await res.json();
      message.success('Book returned successfully!');
      if (returnedData.fineStatus === 'Pending') {
        message.warning(`Fine of ${returnedData.fineAmount} TZS has been applied for overdue return.`);
      }
      
      if (selectedMemberForReturn) {
        fetchBorrowedBooks(selectedMemberForReturn);
      }
      fetchBooks();
      returnForm.resetFields(['notes']);
    } catch (err: any) {
      message.error(err.message || 'Could not return book.');
    } finally {
      setReturning(false);
    }
  };
  
    const handleOpenFineModal = (record: IBookTransaction) => {
        setEditingTransactionForFine(record);
        fineForm.setFieldsValue({
            fineAmount: record.fineAmount || 0,
            fineStatus: record.fineStatus || 'Pending',
            finePaidDate: record.finePaidDate ? moment(record.finePaidDate) : null,
            fineNotes: record.fineNotes || '',
        });
        setIsFineModalVisible(true);
    };

    const handleFineModalOk = async () => {
        setSavingFine(true);
        try {
            const values = await fineForm.validateFields();
            if (!editingTransactionForFine) {
                message.error("No transaction selected for fine update.");
                return;
            }
            const payload = {
                action: 'update_fine_status',
                bookTransactionId: editingTransactionForFine._id,
                fineAmount: values.fineAmount,
                fineStatus: values.fineStatus,
                finePaidDate: values.finePaidDate ? values.finePaidDate.toISOString() : undefined,
                fineNotes: values.fineNotes,
            };

            const response = await fetch(`${TRANSACTIONS_API}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error((await response.json()).error || 'Failed to update fine details.');
            
            message.success('Fine details updated successfully!');
            setIsFineModalVisible(false);
            if (selectedMemberForReturn) {
              fetchBorrowedBooks(selectedMemberForReturn);
            }
        } catch (error:any) {
            message.error(error.message || "Could not update fine details.");
        } finally {
            setSavingFine(false);
        }
    };


  const borrowedBooksColumns = [
    { title: 'Book Title', dataIndex: ['bookId', 'title'], key: 'bookTitle' },
    { title: 'Borrow Date', dataIndex: 'borrowDate', key: 'borrowDate', render: (date:string) => moment(date).format('LL') },
    { title: 'Due Date', dataIndex: 'dueDate', key: 'dueDate', render: (date:string) => moment(date).format('LL') },
    { title: 'Notes (Optional)', dataIndex: 'returnNotes', key: 'returnNotes', render: (_:any, record: IBookTransaction) => <Form.Item name={`notes_${record._id}`} noStyle><Input.TextArea rows={1} placeholder="Return notes..." /></Form.Item>},
    { title: 'Action', key: 'action', render: (_:any, record: IBookTransaction) => (
        <AntSpace>
            <Button type="primary" loading={returning} icon={<ArrowLeftOutlined />} onClick={() => handleReturnSubmit(record._id)}>Return Book</Button>
            {record.fineAmount && record.fineAmount > 0 && (
                <Button icon={<DollarCircleOutlined />} onClick={() => handleOpenFineModal(record)} danger={record.fineStatus === 'Pending'}>
                    Manage Fine
                </Button>
            )}
        </AntSpace>
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
                    <Form.Item name="dueDate" label="Due Date" rules={[{ required: true }]} initialValue={moment().add(14, 'days')}>
                        <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" disabledDate={(current) => current && current < moment().endOf('day')} />
                    </Form.Item>
                </Col>
                 <Col xs={24} md={12}>
                    <Form.Item name="notes" label="Notes (Optional)">
                        <Input.TextArea rows={1} placeholder="Any notes regarding this borrowing..." />
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

      {editingTransactionForFine && (
        <Modal
            title="Manage Fine"
            open={isFineModalVisible}
            onOk={handleFineModalOk}
            onCancel={() => setIsFineModalVisible(false)}
            confirmLoading={savingFine}
            destroyOnClose
        >
            <Form form={fineForm} layout="vertical" className="mt-4">
                <Descriptions bordered size="small" column={1} className="mb-4">
                    <Descriptions.Item label="Book Title">{(editingTransactionForFine.bookId as IBook).title}</Descriptions.Item>
                    <Descriptions.Item label="Member">{`${(editingTransactionForFine.memberId as ITenantUser).firstName} ${(editingTransactionForFine.memberId as ITenantUser).lastName}`}</Descriptions.Item>
                    <Descriptions.Item label="Due Date">{moment(editingTransactionForFine.dueDate).format('LL')}</Descriptions.Item>
                </Descriptions>
                <Form.Item name="fineAmount" label="Fine Amount" rules={[{ type: 'number', min: 0, message: "Fine amount must be a non-negative number." }]}>
                    <InputNumber style={{width: '100%'}} placeholder="Enter fine amount" />
                </Form.Item>
                <Form.Item name="fineStatus" label="Fine Status" rules={[{ required: true }]}>
                    <Select placeholder="Select fine status">
                        {fineStatusOptions.map(status => <Option key={status} value={status}>{status}</Option>)}
                    </Select>
                </Form.Item>
                 <Form.Item
                    noStyle
                    shouldUpdate={(prevValues, currentValues) => prevValues.fineStatus !== currentValues.fineStatus}
                >
                    {({ getFieldValue }) =>
                        getFieldValue('fineStatus') === 'Paid' ? (
                            <Form.Item name="finePaidDate" label="Fine Paid Date" rules={[{ required: true, message: "Paid date is required if status is Paid."}]}>
                                <DatePicker style={{width: '100%'}} format="YYYY-MM-DD" />
                            </Form.Item>
                        ) : null
                    }
                </Form.Item>
                <Form.Item name="fineNotes" label="Fine Notes (Optional)">
                    <Input.TextArea rows={3} placeholder="Reason for fine, payment details, etc." />
                </Form.Item>
            </Form>
        </Modal>
      )}

    </div>
  );
}
