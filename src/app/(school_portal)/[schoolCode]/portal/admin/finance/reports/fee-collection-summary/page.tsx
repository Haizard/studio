
'use client';
import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { Button, Typography, Select, Card, Row, Col, message, Spin, DatePicker, Table, Empty, Statistic, Descriptions } from 'antd';
import { BarChartOutlined, DollarCircleOutlined, FilterOutlined, SearchOutlined, CalendarOutlined, TagOutlined, CreditCardOutlined } from '@ant-design/icons';
import { useParams, useRouter } from 'next/navigation';
import type { IAcademicYear } from '@/models/Tenant/AcademicYear';
import type { ITerm } from '@/models/Tenant/Term';
import type { IFeeItem } from '@/models/Tenant/FeeItem';
import type { PaymentMethod } from '@/models/Tenant/FeePayment';
import moment from 'moment';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const paymentMethodsList: PaymentMethod[] = ['Cash', 'Bank Transfer', 'Mobile Money', 'Cheque', 'Online Payment', 'Other'];

interface FeeCollectionSummaryData {
  totalCollected: number;
  totalTransactions: number;
  breakdownByFeeItem: { feeItemName: string; totalAmount: number; count: number }[];
  breakdownByPaymentMethod: { paymentMethod: string; totalAmount: number; count: number }[];
}

function FeeCollectionSummaryReportCore() {
  const params = useParams();
  const router = useRouter();
  const schoolCode = params.schoolCode as string;

  const [academicYears, setAcademicYears] = useState<IAcademicYear[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string | undefined>();
  
  const [allTerms, setAllTerms] = useState<ITerm[]>([]); // All terms for all years
  const [filteredTerms, setFilteredTerms] = useState<ITerm[]>([]); // Terms for selected AY
  const [selectedTerm, setSelectedTerm] = useState<string | undefined>();

  const [allFeeItems, setAllFeeItems] = useState<IFeeItem[]>([]); // All fee items
  const [filteredFeeItems, setFilteredFeeItems] = useState<IFeeItem[]>([]); // Fee items for selected AY/Term
  const [selectedFeeItem, setSelectedFeeItem] = useState<string | undefined>();
  
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | undefined>();
  const [selectedDateRange, setSelectedDateRange] = useState<[moment.Moment, moment.Moment] | null>(null);
  
  const [reportData, setReportData] = useState<FeeCollectionSummaryData | null>(null);
  
  const [loadingYears, setLoadingYears] = useState(true);
  const [loadingTerms, setLoadingTerms] = useState(false);
  const [loadingFeeItems, setLoadingFeeItems] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);

  const ACADEMIC_YEARS_API = `/api/${schoolCode}/portal/academics/academic-years`;
  const TERMS_API_BASE = `/api/${schoolCode}/portal/academics/terms`;
  const FEE_ITEMS_API_BASE = `/api/${schoolCode}/portal/admin/finance/fee-items`;
  const REPORT_API = `/api/${schoolCode}/portal/admin/finance/reports/fee-collection-summary`;

  // Fetch Academic Years
  useEffect(() => {
    const fetchYears = async () => {
      setLoadingYears(true);
      try {
        const res = await fetch(ACADEMIC_YEARS_API);
        if (!res.ok) throw new Error((await res.json()).error ||'Failed to fetch academic years');
        const data: IAcademicYear[] = await res.json();
        setAcademicYears(data.sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()));
        const activeYear = data.find(y => y.isActive);
        if (activeYear) setSelectedAcademicYear(activeYear._id);
        else if (data.length > 0) setSelectedAcademicYear(data[0]._id);
      } catch (err: any) { message.error(err.message || 'Could not load academic years.'); }
      finally { setLoadingYears(false); }
    };
    fetchYears();
  }, [schoolCode, ACADEMIC_YEARS_API]);

  // Fetch All Terms
  useEffect(() => {
    const fetchAllTerms = async () => {
        setLoadingTerms(true);
        try {
            const res = await fetch(TERMS_API_BASE); // Get all terms
            if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch all terms');
            setAllTerms(await res.json());
        } catch (err:any) { message.error(err.message || 'Could not load all terms.'); }
        finally { setLoadingTerms(false); }
    };
    fetchAllTerms();
  }, [schoolCode, TERMS_API_BASE]);

  // Filter Terms when Academic Year changes
  useEffect(() => {
    if (selectedAcademicYear && allTerms.length > 0) {
        setFilteredTerms(allTerms.filter(term => (typeof term.academicYearId === 'object' ? term.academicYearId._id : term.academicYearId) === selectedAcademicYear));
        setSelectedTerm(undefined);
    } else {
        setFilteredTerms([]);
        setSelectedTerm(undefined);
    }
  }, [selectedAcademicYear, allTerms]);

  // Fetch All Fee Items
  useEffect(() => {
    const fetchAllFeeItems = async () => {
        setLoadingFeeItems(true);
        try {
            const res = await fetch(FEE_ITEMS_API_BASE); // Get all fee items
            if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch all fee items');
            setAllFeeItems(await res.json());
        } catch (err:any) { message.error(err.message || 'Could not load all fee items.'); }
        finally { setLoadingFeeItems(false); }
    };
    fetchAllFeeItems();
  }, [schoolCode, FEE_ITEMS_API_BASE]);

  // Filter Fee Items when Academic Year or Term changes
  useEffect(() => {
    let items = allFeeItems;
    if (selectedAcademicYear) {
      items = items.filter(fi => (typeof fi.academicYearId === 'object' ? fi.academicYearId._id : fi.academicYearId) === selectedAcademicYear);
    }
    // Further filter by term if a term is selected and fee items have termId
    // For simplicity, this example assumes fee items might not always be term-specific at the API level,
    // or that filtering by academic year is primary.
    setFilteredFeeItems(items);
    setSelectedFeeItem(undefined);
  }, [selectedAcademicYear, selectedTerm, allFeeItems]);

  const handleFetchReport = useCallback(async () => {
    setLoadingReport(true);
    setReportData(null);
    try {
      const queryParams = new URLSearchParams();
      if (selectedAcademicYear) queryParams.append('academicYearId', selectedAcademicYear);
      if (selectedTerm) queryParams.append('termId', selectedTerm);
      if (selectedFeeItem) queryParams.append('feeItemId', selectedFeeItem);
      if (selectedPaymentMethod) queryParams.append('paymentMethod', selectedPaymentMethod);
      if (selectedDateRange) {
        queryParams.append('startDate', selectedDateRange[0].format('YYYY-MM-DD'));
        queryParams.append('endDate', selectedDateRange[1].format('YYYY-MM-DD'));
      }
      
      const res = await fetch(`${REPORT_API}?${queryParams.toString()}`);
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch fee collection summary');
      const data: FeeCollectionSummaryData = await res.json();
      setReportData(data);
    } catch (err: any) {
      message.error(err.message || 'Could not load report data.');
      setReportData(null);
    } finally {
      setLoadingReport(false);
    }
  }, [selectedAcademicYear, selectedTerm, selectedFeeItem, selectedPaymentMethod, selectedDateRange, schoolCode, REPORT_API]);

  const feeItemChartData = reportData?.breakdownByFeeItem.map(item => ({
    name: item.feeItemName,
    TotalAmount: item.totalAmount,
    Transactions: item.count,
  })) || [];

  const paymentMethodChartData = reportData?.breakdownByPaymentMethod.map(item => ({
    name: item.paymentMethod,
    TotalAmount: item.totalAmount,
    Transactions: item.count,
  })) || [];


  return (
    <div>
      <Title level={2} className="mb-6"><BarChartOutlined className="mr-2" />Fee Collection Summary Report</Title>
      <Paragraph>Filter and view summarized fee collection data.</Paragraph>

      <Card title={<><FilterOutlined className="mr-2" />Report Filters</>} className="mb-6">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Text>Academic Year</Text>
            <Select style={{ width: '100%' }} placeholder="Select Academic Year" value={selectedAcademicYear} onChange={setSelectedAcademicYear} loading={loadingYears} allowClear suffixIcon={<CalendarOutlined />}>
              {academicYears.map(year => <Option key={year._id} value={year._id}>{year.name}</Option>)}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Text>Term (Optional)</Text>
            <Select style={{ width: '100%' }} placeholder="Select Term" value={selectedTerm} onChange={setSelectedTerm} loading={loadingTerms && !!selectedAcademicYear} disabled={!selectedAcademicYear} allowClear suffixIcon={<CalendarOutlined />}>
              {filteredTerms.map(term => <Option key={term._id} value={term._id}>{term.name}</Option>)}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Text>Fee Item (Optional)</Text>
            <Select style={{ width: '100%' }} placeholder="Select Fee Item" value={selectedFeeItem} onChange={setSelectedFeeItem} loading={loadingFeeItems && !!selectedAcademicYear} disabled={!selectedAcademicYear} allowClear suffixIcon={<TagOutlined />}>
              {filteredFeeItems.map(item => <Option key={item._id} value={item._id}>{item.name}</Option>)}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Text>Payment Method (Optional)</Text>
            <Select style={{ width: '100%' }} placeholder="Select Payment Method" value={selectedPaymentMethod} onChange={setSelectedPaymentMethod} allowClear suffixIcon={<CreditCardOutlined />}>
              {paymentMethodsList.map(method => <Option key={method} value={method}>{method}</Option>)}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={12}>
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
            <Col xs={24} md={12}><Statistic title="Total Amount Collected" value={reportData.totalCollected} prefix="TZS" precision={2} /></Col>
            <Col xs={24} md={12}><Statistic title="Total Transactions" value={reportData.totalTransactions} /></Col>
          </Row>
          
          <Row gutter={[32, 32]}>
            <Col xs={24} md={12}>
              <Title level={4} className="mb-4">Breakdown by Fee Item</Title>
              {reportData.breakdownByFeeItem.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={feeItemChartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-15} textAnchor="end" height={50} interval={0} fontSize={10}/>
                    <YAxis />
                    <Tooltip formatter={(value: number, name: string) => [value.toLocaleString(), name === 'TotalAmount' ? 'Amount' : 'Transactions']}/>
                    <Legend />
                    <Bar dataKey="TotalAmount" fill="#8884d8" name="Total Amount" />
                    <Bar dataKey="Transactions" fill="#82ca9d" name="No. of Transactions" />
                  </BarChart>
                </ResponsiveContainer>
              ) : <Empty description="No data for fee item breakdown."/>}
            </Col>
            <Col xs={24} md={12}>
              <Title level={4} className="mb-4">Breakdown by Payment Method</Title>
               {reportData.breakdownByPaymentMethod.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={paymentMethodChartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value: number, name: string) => [value.toLocaleString(), name === 'TotalAmount' ? 'Amount' : 'Transactions']}/>
                    <Legend />
                    <Bar dataKey="TotalAmount" fill="#8884d8" name="Total Amount" />
                    <Bar dataKey="Transactions" fill="#82ca9d" name="No. of Transactions" />
                  </BarChart>
                </ResponsiveContainer>
               ) : <Empty description="No data for payment method breakdown."/>}
            </Col>
          </Row>
        </Card>
      )}
      {!loadingReport && !reportData && <Empty description="No report data generated. Please select filters and click 'Generate Report'." className="mt-8"/>}
    </div>
  );
}

export default function FeeCollectionSummaryReportPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-screen"><Spin size="large" tip="Loading page..." /></div>}>
            <FeeCollectionSummaryReportCore />
        </Suspense>
    );
}
