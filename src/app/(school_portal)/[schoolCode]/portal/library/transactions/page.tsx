
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Button, Typography, Select, Card, Table, message, Spin, Empty, Tag, Input, DatePicker, Row, Col, Space as AntSpace } from 'antd';
import { HistoryOutlined, UserOutlined, BookOutlined, FilterOutlined, SearchOutlined } from '@ant-design/icons';
import { useParams } from 'next/navigation';
import type { IBookTransaction } from '@/models/Tenant/BookTransaction';
import type { IBook } from '@/models/Tenant/Book';
import type { ITenantUser } from '@/models/Tenant/User';
import type { IStudent } from '@/models/Tenant/Student';
import type { ITeacher } from '@/models/Tenant/Teacher';
import moment from 'moment';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface PopulatedBookTransaction extends Omit<IBookTransaction, 'bookId' | 'memberId'> {
  key: string;
  bookId: Pick<IBook, '_id' | 'title' | 'isbn'>;
  memberId: Pick<ITenantUser, '_id' | 'firstName' | 'lastName' | 'username'>;
}

interface MemberOption {
  value: string;
  label: string;
}

interface BookOption {
  value: string;
  label: string;
}

interface TransactionStatus {
  value: 'all' | 'borrowed' | 'returned' | 'overdue';
  label: string;
}

const transactionStatuses: TransactionStatus[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'borrowed', label: 'Borrowed (Active)' },
  { value: 'returned', label: 'Returned' },
  { value: 'overdue', label: 'Overdue' },
];

export default function LibraryTransactionsPage() {
  const params = useParams();
  const schoolCode = params.schoolCode as string;

  const [transactions, setTransactions] = useState<PopulatedBookTransaction[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [books, setBooks] = useState<BookOption[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingBooks, setLoadingBooks] = useState(false);

  const [filterMemberId, setFilterMemberId] = useState<string | undefined>();
  const [filterBookId, setFilterBookId] = useState<string | undefined>();
  const [filterStatus, setFilterStatus] = useState<TransactionStatus['value']>('all');
  const [filterDateRange, setFilterDateRange] = useState<[moment.Moment, moment.Moment] | null>(null);

  const API_BASE_URL = `/api/${schoolCode}/portal/library`;
  const STUDENTS_API = `/api/${schoolCode}/portal/students`;
  const TEACHERS_API = `/api/${schoolCode}/portal/teachers`;

  const fetchMembers = useCallback(async () => {
    setLoadingMembers(true);
    try {
      const [studentsRes, teachersRes] = await Promise.all([
        fetch(STUDENTS_API),
        fetch(TEACHERS_API),
      ]);
      if (!studentsRes.ok) throw new Error('Failed to fetch students');
      if (!teachersRes.ok) throw new Error('Failed to fetch teachers');
      
      const studentsData: (IStudent & { userId: ITenantUser })[] = await studentsRes.json();
      const teachersData: (ITeacher & { userId: ITenantUser })[] = await teachersRes.json();

      const memberOptions: MemberOption[] = [
        ...studentsData.map(s => ({ value: s.userId._id.toString(), label: `${s.userId.firstName} ${s.userId.lastName} (Student - ${s.studentIdNumber || s.userId.username})` })),
        ...teachersData.map(t => ({ value: t.userId._id.toString(), label: `${t.userId.firstName} ${t.userId.lastName} (Teacher - ${t.teacherIdNumber || t.userId.username})` })),
      ].sort((a, b) => a.label.localeCompare(b.label));
      setMembers(memberOptions);
    } catch (err: any) {
      message.error(err.message || 'Could not load members.');
    } finally {
      setLoadingMembers(false);
    }
  }, [schoolCode, STUDENTS_API, TEACHERS_API]);

  const fetchBooks = useCallback(async (searchTerm: string = '') => {
    setLoadingBooks(true);
    try {
      const res = await fetch(`${API_BASE_URL}/books?search=${encodeURIComponent(searchTerm)}`);
      if (!res.ok) throw new Error('Failed to fetch books');
      const booksData: IBook[] = await res.json();
      setBooks(booksData.map(b => ({ value: b._id, label: `${b.title} (ISBN: ${b.isbn || 'N/A'})` })));
    } catch (err: any) {
      message.error(err.message || 'Could not load books.');
    } finally {
      setLoadingBooks(false);
    }
  }, [schoolCode, API_BASE_URL]);

  useEffect(() => {
    fetchMembers();
    fetchBooks(); 
  }, [fetchMembers, fetchBooks]);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (filterMemberId) queryParams.append('memberId', filterMemberId);
      if (filterBookId) queryParams.append('bookId', filterBookId);
      // Status filtering needs to be handled carefully:
      // 'borrowed' means isReturned=false, 'returned' means isReturned=true
      // 'overdue' is client-side or needs API logic, for now, fetch all relevant and filter client-side if status is 'overdue'
      // 'all' fetches everything (or based on other filters)
      if (filterStatus === 'borrowed') queryParams.append('isReturned', 'false');
      if (filterStatus === 'returned') queryParams.append('isReturned', 'true');
      
      const response = await fetch(`${API_BASE_URL}/transactions?${queryParams.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch transactions');
      let data: PopulatedBookTransaction[] = (await response.json()).map((t: any) => ({ ...t, key: t._id }));

      // Client-side filtering for date range and overdue status (if 'overdue' is selected)
      if (filterDateRange) {
        data = data.filter(t => 
            moment(t.borrowDate).isSameOrAfter(filterDateRange[0], 'day') &&
            moment(t.borrowDate).isSameOrBefore(filterDateRange[1], 'day')
        );
      }

      if (filterStatus === 'overdue') {
        data = data.filter(t => !t.isReturned && moment().isAfter(moment(t.dueDate), 'day'));
      }

      setTransactions(data);
    } catch (error: any) {
      message.error(error.message || 'Could not load transactions.');
    } finally {
      setLoading(false);
    }
  }, [schoolCode, API_BASE_URL, filterMemberId, filterBookId, filterStatus, filterDateRange]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const getStatusTag = (record: PopulatedBookTransaction) => {
    if (record.isReturned) {
      return <Tag color="success">Returned</Tag>;
    }
    if (moment().isAfter(moment(record.dueDate), 'day')) {
      return <Tag color="error">Overdue</Tag>;
    }
    return <Tag color="processing">Borrowed</Tag>;
  };

  const columns = [
    { 
      title: 'Member Name', 
      dataIndex: ['memberId', 'firstName'], 
      key: 'memberName',
      render: (firstName: string, record: PopulatedBookTransaction) => `${firstName} ${record.memberId.lastName || ''} (${record.memberId.username})`
    },
    { title: 'Book Title', dataIndex: ['bookId', 'title'], key: 'bookTitle' },
    { title: 'ISBN', dataIndex: ['bookId', 'isbn'], key: 'isbn', render: (isbn?:string) => isbn || 'N/A'},
    { title: 'Borrow Date', dataIndex: 'borrowDate', key: 'borrowDate', render: (date:string) => moment(date).format('LL'), sorter: (a: PopulatedBookTransaction, b:PopulatedBookTransaction) => moment(a.borrowDate).unix() - moment(b.borrowDate).unix() },
    { title: 'Due Date', dataIndex: 'dueDate', key: 'dueDate', render: (date:string) => moment(date).format('LL'), sorter: (a: PopulatedBookTransaction, b:PopulatedBookTransaction) => moment(a.dueDate).unix() - moment(b.dueDate).unix() },
    { title: 'Return Date', dataIndex: 'returnDate', key: 'returnDate', render: (date?:string) => date ? moment(date).format('LL') : '-', sorter: (a: PopulatedBookTransaction, b:PopulatedBookTransaction) => moment(a.returnDate).unix() - moment(b.returnDate).unix() },
    { title: 'Status', key: 'status', render: (_:any, record: PopulatedBookTransaction) => getStatusTag(record) },
    { title: 'Notes', dataIndex: 'notes', key: 'notes', render: (notes?:string) => notes || '-', ellipsis: true },
  ];

  return (
    <div>
      <Title level={2} className="mb-6"><HistoryOutlined className="mr-2" />Book Transaction History</Title>
      
      <Card title={<><FilterOutlined className="mr-2"/>Filter Transactions</>} className="mb-6">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Text>Member:</Text>
            <Select
              showSearch
              style={{ width: '100%' }}
              placeholder="Search Member"
              value={filterMemberId}
              onChange={setFilterMemberId}
              loading={loadingMembers}
              filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              options={members}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Text>Book:</Text>
            <Select
              showSearch
              style={{ width: '100%' }}
              placeholder="Search Book (Title or ISBN)"
              value={filterBookId}
              onChange={setFilterBookId}
              onSearch={fetchBooks}
              loading={loadingBooks}
              filterOption={false}
              options={books}
              allowClear
              notFoundContent={loadingBooks ? <Spin size="small" /> : <Empty description="No books found" />}
            />
          </Col>
           <Col xs={24} sm={12} md={6}>
            <Text>Status:</Text>
            <Select
              style={{ width: '100%' }}
              placeholder="Select Status"
              value={filterStatus}
              onChange={setFilterStatus}
              options={transactionStatuses}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Text>Borrow Date Range:</Text>
            <RangePicker 
                style={{ width: '100%' }} 
                value={filterDateRange}
                onChange={(dates) => setFilterDateRange(dates as [moment.Moment, moment.Moment] | null)}
                disabledDate={current => current && current > moment().endOf('day')}
            />
          </Col>
        </Row>
        <Row justify="end" className="mt-4">
            <Col>
                <Button 
                    type="primary" 
                    icon={<SearchOutlined />} 
                    onClick={fetchTransactions}
                    loading={loading}
                >
                    Apply Filters
                </Button>
                 <Button 
                    onClick={() => {
                        setFilterMemberId(undefined);
                        setFilterBookId(undefined);
                        setFilterStatus('all');
                        setFilterDateRange(null);
                        // fetchTransactions(); // Will trigger due to state change
                    }}
                    style={{marginLeft: 8}}
                >
                    Clear Filters
                </Button>
            </Col>
        </Row>
      </Card>

      <Spin spinning={loading}>
        <Table 
          columns={columns} 
          dataSource={transactions} 
          rowKey="key"
          bordered
          size="middle"
          scroll={{ x: 1200 }}
          locale={{ emptyText: <Empty description="No transactions found matching your criteria." /> }}
        />
      </Spin>
    </div>
  );
}


    