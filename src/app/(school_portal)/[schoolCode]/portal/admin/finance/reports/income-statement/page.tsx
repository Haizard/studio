
'use client';
import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { Button, Typography, Select, Card, Row, Col, message, Spin, DatePicker, Empty, Statistic, Divider } from 'antd';
import { LineChartOutlined, FilterOutlined, SearchOutlined, DollarOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { useParams } from 'next/navigation';
import moment from 'moment';

const { Title, Paragraph, Text } = Typography;
const { RangePicker } = DatePicker;

interface IncomeStatementData {
  startDate: string;
  endDate: string;
  totalIncome: number;
  totalExpenses: number;
  netResult: number;
}

function IncomeStatementReportCore() {
  const params = useParams();
  const schoolCode = params.schoolCode as string;

  const [selectedDateRange, setSelectedDateRange] = useState<[moment.Moment, moment.Moment] | null>([moment().startOf('month'), moment().endOf('month')]);
  const [reportData, setReportData] = useState<IncomeStatementData | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  const REPORT_API = `/api/${schoolCode}/portal/admin/finance/reports/income-statement`;

  const handleFetchReport = useCallback(async () => {
    if (!selectedDateRange) {
        message.error("Please select a date range.");
        return;
    }
    setLoadingReport(true);
    setReportData(null);
    try {
      const queryParams = new URLSearchParams({
        startDate: selectedDateRange[0].format('YYYY-MM-DD'),
        endDate: selectedDateRange[1].format('YYYY-MM-DD'),
      });
      
      const res = await fetch(`${REPORT_API}?${queryParams.toString()}`);
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch income statement');
      const data: IncomeStatementData = await res.json();
      setReportData(data);
    } catch (err: any) {
      message.error(err.message || 'Could not load report data.');
      setReportData(null);
    } finally {
      setLoadingReport(false);
    }
  }, [selectedDateRange, schoolCode, REPORT_API]);
  
  // Fetch report on initial load with default date range
  useEffect(() => {
    handleFetchReport();
  }, [handleFetchReport]);


  return (
    <div>
      <Title level={2} className="mb-6"><LineChartOutlined className="mr-2" />Income Statement</Title>
      <Paragraph>View a summary of income and expenses over a selected period to determine net profit or loss.</Paragraph>

      <Card title={<><FilterOutlined className="mr-2" />Report Filters</>} className="mb-6">
        <Row gutter={[16, 16]} align="bottom">
          <Col xs={24} sm={12}>
            <Text>Date Range</Text>
            <RangePicker 
                style={{ width: '100%' }} 
                value={selectedDateRange} 
                onChange={(dates) => setSelectedDateRange(dates as [moment.Moment, moment.Moment] | null)}
                presets={[
                    { label: 'This Month', value: [moment().startOf('month'), moment().endOf('month')] },
                    { label: 'Last Month', value: [moment().subtract(1, 'months').startOf('month'), moment().subtract(1, 'months').endOf('month')] },
                    { label: 'This Quarter', value: [moment().startOf('quarter'), moment().endOf('quarter')] },
                    { label: 'This Year', value: [moment().startOf('year'), moment().endOf('year')] },
                ]}
            />
          </Col>
          <Col xs={24} sm={12}>
            <Button type="primary" icon={<SearchOutlined />} onClick={handleFetchReport} loading={loadingReport}>Generate Report</Button>
          </Col>
        </Row>
      </Card>

      {loadingReport && <div className="text-center p-8"><Spin tip="Generating report..." /></div>}
      
      {!loadingReport && reportData && (
        <Card title={`Income Statement for ${moment(reportData.startDate).format('LL')} to ${moment(reportData.endDate).format('LL')}`} className="mt-6">
          <Row gutter={[16, 32]}>
            <Col xs={24} md={8}>
                <Statistic
                    title="Total Income"
                    value={reportData.totalIncome}
                    precision={2}
                    prefix={<DollarOutlined />}
                    valueStyle={{ color: '#3f8600' }}
                />
            </Col>
             <Col xs={24} md={8}>
                <Statistic
                    title="Total Expenses"
                    value={reportData.totalExpenses}
                    precision={2}
                    prefix={<DollarOutlined />}
                    valueStyle={{ color: '#cf1322' }}
                />
            </Col>
            <Col xs={24} md={8}>
                <Statistic
                    title="Net Income / Loss"
                    value={reportData.netResult}
                    precision={2}
                    prefix={reportData.netResult >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                    valueStyle={{ color: reportData.netResult >= 0 ? '#3f8600' : '#cf1322' }}
                />
            </Col>
          </Row>
          <Divider />
          <Paragraph>
            This is a simplified summary. Detailed breakdowns of income sources and expense categories can be viewed in their respective summary reports.
          </Paragraph>
        </Card>
      )}
      {!loadingReport && !reportData && <Empty description="No report data generated. Select filters and click 'Generate Report'." className="mt-8"/>}
    </div>
  );
}

export default function IncomeStatementPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-screen"><Spin size="large" tip="Loading page..." /></div>}>
            <IncomeStatementReportCore />
        </Suspense>
    );
}
