
'use client';
import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { Button, Typography, Select, Card, Row, Col, message, Spin, DatePicker, Empty, Statistic } from 'antd';
import { AreaChartOutlined, FolderOpenOutlined, FilterOutlined, SearchOutlined } from '@ant-design/icons';
import { useParams } from 'next/navigation';
import moment from 'moment';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface ExpenseSummaryData {
  totalExpenses: number;
  totalTransactions: number;
  breakdownByCategory: { category: string; totalAmount: number; count: number }[];
}

function ExpenseSummaryReportCore() {
  const params = useParams();
  const schoolCode = params.schoolCode as string;

  // Filter Data States
  const [allCategories, setAllCategories] = useState<string[]>([]);

  // Filter Selection States
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [selectedDateRange, setSelectedDateRange] = useState<[moment.Moment, moment.Moment] | null>(null);

  // Report Data & Loading States
  const [reportData, setReportData] = useState<ExpenseSummaryData | null>(null);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);

  // API URLs
  const EXPENSES_API = `/api/${schoolCode}/portal/admin/finance/expenses`;
  const REPORT_API = `/api/${schoolCode}/portal/admin/finance/reports/expense-summary`;
  
  // Fetch Categories for filter
  useEffect(() => {
    const fetchCategories = async () => {
        setLoadingCategories(true);
        try {
            const res = await fetch(EXPENSES_API); // Fetch all expenses to derive categories
            if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch expense categories');
            const expenses: any[] = await res.json();
            const uniqueCategories = Array.from(new Set(expenses.map(e => e.category))).sort();
            setAllCategories(uniqueCategories);
        } catch (err: any) { message.error(err.message || 'Could not load expense categories.'); }
        finally { setLoadingCategories(false); }
    };
    fetchCategories();
  }, [schoolCode, EXPENSES_API]);

  const handleFetchReport = useCallback(async () => {
    setLoadingReport(true);
    setReportData(null);
    try {
      const queryParams = new URLSearchParams();
      if (selectedCategory) queryParams.append('category', selectedCategory);
      if (selectedDateRange) {
        queryParams.append('startDate', selectedDateRange[0].format('YYYY-MM-DD'));
        queryParams.append('endDate', selectedDateRange[1].format('YYYY-MM-DD'));
      }
      
      const res = await fetch(`${REPORT_API}?${queryParams.toString()}`);
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch expense summary report');
      const data: ExpenseSummaryData = await res.json();
      setReportData(data);
    } catch (err: any) {
      message.error(err.message || 'Could not load report data.');
      setReportData(null);
    } finally {
      setLoadingReport(false);
    }
  }, [selectedCategory, selectedDateRange, schoolCode, REPORT_API]);
  
  const categoryChartData = reportData?.breakdownByCategory.map(item => ({
    name: item.category,
    TotalAmount: item.totalAmount,
    Transactions: item.count,
  })) || [];

  return (
    <div>
      <Title level={2} className="mb-6"><AreaChartOutlined className="mr-2" />Expense Summary Report</Title>
      <Paragraph>Filter and view summarized expense data by category and date.</Paragraph>

      <Card title={<><FilterOutlined className="mr-2" />Report Filters</>} className="mb-6">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12}>
            <Text>Category (Optional)</Text>
            <Select style={{ width: '100%' }} placeholder="Filter by Category" value={selectedCategory} onChange={setSelectedCategory} loading={loadingCategories} allowClear suffixIcon={<FolderOpenOutlined />}>
              {allCategories.map(cat => <Option key={cat} value={cat}>{cat}</Option>)}
            </Select>
          </Col>
          <Col xs={24} sm={12}>
            <Text>Date Range (Optional)</Text>
            <RangePicker style={{ width: '100%' }} value={selectedDateRange} onChange={(dates) => setSelectedDateRange(dates as [moment.Moment, moment.Moment] | null)} />
          </Col>
        </Row>
        <Row justify="end" className="mt-4">
            <Col><Button type="primary" icon={<SearchOutlined />} onClick={handleFetchReport} loading={loadingReport}>Generate Report</Button></Col>
        </Row>
      </Card>

      {loadingReport && <div className="text-center p-8"><Spin tip="Generating report..." /></div>}
      
      {!loadingReport && reportData && (
        <Card title="Report Results" className="mt-6">
          <Row gutter={16} className="mb-8">
            <Col xs={24} md={12}><Statistic title="Total Expenses" value={reportData.totalExpenses} prefix="TZS" precision={2} /></Col>
            <Col xs={24} md={12}><Statistic title="Total Transactions" value={reportData.totalTransactions} /></Col>
          </Row>
          
          <Title level={4} className="mb-4">Breakdown by Category</Title>
          {reportData.breakdownByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={categoryChartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={150} />
                <Tooltip formatter={(value: number, name: string) => [value.toLocaleString(), name === 'TotalAmount' ? 'Amount' : 'Transactions']}/>
                <Legend />
                <Bar dataKey="TotalAmount" fill="#ff7875" name="Total Amount" />
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty description="No data for category breakdown."/>}
        </Card>
      )}
      {!loadingReport && !reportData && <Empty description="No report data generated. Select filters and click 'Generate Report'." className="mt-8"/>}
    </div>
  );
}

export default function ExpenseSummaryReportPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-screen"><Spin size="large" tip="Loading page..." /></div>}>
            <ExpenseSummaryReportCore />
        </Suspense>
    );
}
