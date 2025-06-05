
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Typography, Card, Row, Col, Spin, Statistic, Empty, Alert } from 'antd';
import { BookOutlined, SwapOutlined, ExclamationCircleOutlined, PieChartOutlined, TeamOutlined } from '@ant-design/icons';
import { useParams } from 'next/navigation';
import type { IBook } from '@/models/Tenant/Book';
import type { IBookTransaction } from '@/models/Tenant/BookTransaction';
import moment from 'moment';

const { Title, Paragraph } = Typography;

interface LibraryInventoryPageProps {
  params: { schoolCode: string };
}

export default function LibraryInventoryPage({ params }: LibraryInventoryPageProps) {
  const { schoolCode } = params;

  const [totalBooksCount, setTotalBooksCount] = useState<number>(0);
  const [uniqueTitlesCount, setUniqueTitlesCount] = useState<number>(0);
  const [borrowedBooksCount, setBorrowedBooksCount] = useState<number>(0);
  const [overdueBooksCount, setOverdueBooksCount] = useState<number>(0);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const BOOKS_API = `/api/${schoolCode}/portal/library/books`;
  const TRANSACTIONS_API = `/api/${schoolCode}/portal/library/transactions`;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [booksRes, transactionsRes] = await Promise.all([
        fetch(BOOKS_API),
        fetch(TRANSACTIONS_API),
      ]);

      if (!booksRes.ok) throw new Error((await booksRes.json()).error || 'Failed to fetch books data');
      if (!transactionsRes.ok) throw new Error((await transactionsRes.json()).error || 'Failed to fetch transactions data');
      
      const booksData: IBook[] = await booksRes.json();
      const transactionsData: IBookTransaction[] = await transactionsRes.json();

      // Calculate stats
      const totalCopies = booksData.reduce((sum, book) => sum + (book.totalCopies || 0), 0);
      setTotalBooksCount(totalCopies);
      setUniqueTitlesCount(booksData.length);

      const activeBorrows = transactionsData.filter(t => !t.isReturned);
      setBorrowedBooksCount(activeBorrows.length);

      const overdue = activeBorrows.filter(t => moment(t.dueDate).isBefore(moment(), 'day')).length;
      setOverdueBooksCount(overdue);

    } catch (err: any) {
      setError(err.message || 'Could not load library inventory data.');
    } finally {
      setLoading(false);
    }
  }, [schoolCode, BOOKS_API, TRANSACTIONS_API]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Spin size="large" tip="Loading inventory data..." /></div>;
  }

  if (error) {
    return <Alert message="Error Loading Data" description={error} type="error" showIcon className="my-4" />;
  }

  return (
    <div>
      <Title level={2} className="mb-6 flex items-center">
        <PieChartOutlined className="mr-2" /> Library Inventory &amp; Reports
      </Title>
      <Paragraph className="mb-8">
        An overview of your library's collection and circulation status.
      </Paragraph>

      <Row gutter={[16, 24]}>
        <Col xs={24} sm={12} md={6}>
          <Card hoverable>
            <Statistic
              title="Total Book Copies"
              value={totalBooksCount}
              prefix={<BookOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card hoverable>
            <Statistic
              title="Unique Titles"
              value={uniqueTitlesCount}
              prefix={<BookOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card hoverable>
            <Statistic
              title="Books Currently Borrowed"
              value={borrowedBooksCount}
              prefix={<SwapOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card hoverable>
            <Statistic
              title="Books Overdue"
              value={overdueBooksCount}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={overdueBooksCount > 0 ? { color: '#cf1322' } : {}}
            />
          </Card>
        </Col>
      </Row>
      
      <div className="mt-10">
        <Title level={4} className="mb-4">Further Reporting</Title>
        <Empty description="More detailed reports (e.g., by genre, most popular books, member borrowing patterns) will be available in future updates." />
        {/* Placeholder for future charts or detailed tables */}
      </div>
    </div>
  );
}
