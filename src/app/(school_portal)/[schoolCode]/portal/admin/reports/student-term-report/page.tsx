
'use client';
import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { Button, Typography, Select, Card, Row, Col, message, Spin, DatePicker, Table, Empty, Descriptions, Tag, Alert } from 'antd';
import { SolutionOutlined, UserOutlined, CalendarOutlined, ReadOutlined, SearchOutlined, PrinterOutlined, BarChartOutlined } from '@ant-design/icons';
import { useParams, useRouter } from 'next/navigation';
import type { IAcademicYear } from '@/models/Tenant/AcademicYear';
import type { ITerm } from '@/models/Tenant/Term';
import type { IStudent } from '@/models/Tenant/Student';
import type { ITenantUser } from '@/models/Tenant/User';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import moment from 'moment';

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;

// Interface for the data structure returned by the API
interface ReportExamResult {
  examName: string;
  examId: string;
  examWeight?: number;
  assessments: {
    assessmentName: string;
    assessmentType: string;
    subjectName: string;
    marksObtained?: number;
    maxMarks: number;
    percentage?: number;
  }[];
  examTotalMarksObtained: number;
  examTotalMaxMarks: number;
  examPercentage?: number;
  weightedContribution?: number;
}

interface TermReportData {
  student: {
    name: string;
    studentIdNumber?: string;
  };
  classDetails?: {
    name: string;
    level?: string;
  };
  academicYear: { name: string };
  term: { name: string };
  examResults: ReportExamResult[];
  termTotalWeightedScore?: number;
  termOverallPercentage?: number;
  termGrade?: string;
  termRemarks?: string;
  chartData: { name: string; percentage?: number }[];
  gradingScaleUsed?: string;
}

function StudentTermReportPageCore() {
  const params = useParams();
  const router = useRouter();
  const schoolCode = params.schoolCode as string;

  const [students, setStudents] = useState<(Pick<IStudent, '_id' | 'studentIdNumber'> & { userId: Pick<ITenantUser, 'firstName' | 'lastName' | 'username'> })[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string | undefined>();

  const [academicYears, setAcademicYears] = useState<IAcademicYear[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string | undefined>();
  
  const [terms, setTerms] = useState<ITerm[]>([]); // Terms for the selected AY
  const [selectedTerm, setSelectedTerm] = useState<string | undefined>();
  
  const [reportData, setReportData] = useState<TermReportData | null>(null);
  
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingYears, setLoadingYears] = useState(false);
  const [loadingTerms, setLoadingTerms] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);

  const STUDENTS_API = `/api/${schoolCode}/portal/students`; // API to fetch all students
  const ACADEMIC_YEARS_API = `/api/${schoolCode}/portal/academics/academic-years`;
  const TERMS_API_BASE = `/api/${schoolCode}/portal/academics/terms`;
  const REPORT_API_BASE = `/api/${schoolCode}/portal/reports/term-report/student/`;


  // Fetch Students
  useEffect(() => {
    const fetchStudents = async () => {
      setLoadingStudents(true);
      try {
        const res = await fetch(STUDENTS_API);
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch students');
        const data: (IStudent & { userId: ITenantUser })[] = await res.json();
        setStudents(data.map(s => ({ _id: s._id, studentIdNumber: s.studentIdNumber, userId: { firstName: s.userId.firstName, lastName: s.userId.lastName, username: s.userId.username } })));
      } catch (err: any) { message.error(err.message || 'Could not load students.'); }
      finally { setLoadingStudents(false); }
    };
    fetchStudents();
  }, [schoolCode, STUDENTS_API]);

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
        if (activeYear && !selectedAcademicYear) setSelectedAcademicYear(activeYear._id);
        else if (data.length > 0 && !selectedAcademicYear) setSelectedAcademicYear(data[0]._id);
      } catch (err: any) { message.error(err.message || 'Could not load academic years.'); }
      finally { setLoadingYears(false); }
    };
    fetchYears();
  }, [schoolCode, ACADEMIC_YEARS_API, selectedAcademicYear]);

  // Fetch Terms when Academic Year changes
  useEffect(() => {
    if (!selectedAcademicYear) {
      setTerms([]);
      setSelectedTerm(undefined);
      return;
    }
    const fetchTerms = async () => {
      setLoadingTerms(true);
      try {
        const res = await fetch(`${TERMS_API_BASE}?academicYearId=${selectedAcademicYear}`);
        if (!res.ok) throw new Error((await res.json()).error ||'Failed to fetch terms');
        const data: ITerm[] = await res.json();
        setTerms(data.sort((a,b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()));
        setSelectedTerm(undefined); 
      } catch (err: any) { message.error(err.message || 'Could not load terms.'); setTerms([]); }
      finally { setLoadingTerms(false); }
    };
    fetchTerms();
  }, [selectedAcademicYear, schoolCode, TERMS_API_BASE]);

  const handleFetchReport = useCallback(async () => {
    if (!selectedStudent || !selectedAcademicYear || !selectedTerm) {
      message.info('Please select Student, Academic Year, and Term to generate the report.');
      setReportData(null);
      return;
    }
    setLoadingReport(true);
    setReportData(null);
    try {
      const res = await fetch(`${REPORT_API_BASE}${selectedStudent}?academicYearId=${selectedAcademicYear}&termId=${selectedTerm}`);
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to generate report data');
      const data: TermReportData = await res.json();
      setReportData(data);
    } catch (err: any) {
      message.error(err.message || 'Could not load report data.');
      setReportData(null);
    } finally {
      setLoadingReport(false);
    }
  }, [selectedStudent, selectedAcademicYear, selectedTerm, schoolCode, REPORT_API_BASE]);

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="student-term-report-page">
      <Title level={2} className="mb-6"><SolutionOutlined className="mr-2" />Student Term Report</Title>
      <Paragraph>Select a student, academic year, and term to generate their performance report.</Paragraph>

      <Card title="Report Filters" className="mb-6 report-filters">
        <Row gutter={[16, 16]} align="bottom">
          <Col xs={24} sm={12} md={6}>
            <Text>Student</Text>
            <Select
              style={{ width: '100%' }}
              placeholder="Select Student"
              value={selectedStudent}
              onChange={setSelectedStudent}
              loading={loadingStudents}
              showSearch
              filterOption={(input, option) => 
                String(option?.children ?? '').toLowerCase().includes(input.toLowerCase()) ||
                String(option?.value ?? '').toLowerCase().includes(input.toLowerCase())
              }
              suffixIcon={<UserOutlined />}
            >
              {students.map(s => <Option key={s._id} value={s._id.toString()}>{`${s.userId.firstName} ${s.userId.lastName} (${s.userId.username}) - ${s.studentIdNumber || 'N/A'}`}</Option>)}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Text>Academic Year</Text>
            <Select
              style={{ width: '100%' }}
              placeholder="Select Academic Year"
              value={selectedAcademicYear}
              onChange={val => { setSelectedAcademicYear(val); setSelectedTerm(undefined); setReportData(null);}}
              loading={loadingYears}
              suffixIcon={<CalendarOutlined />}
            >
              {academicYears.map(year => <Option key={year._id} value={year._id}>{year.name}</Option>)}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Text>Term</Text>
            <Select
              style={{ width: '100%' }}
              placeholder="Select Term"
              value={selectedTerm}
              onChange={val => {setSelectedTerm(val); setReportData(null);}}
              loading={loadingTerms}
              disabled={!selectedAcademicYear || loadingTerms}
              suffixIcon={<ReadOutlined />}
            >
              {terms.map(term => <Option key={term._id} value={term._id}>{term.name}</Option>)}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Button 
              type="primary" 
              icon={<SearchOutlined />} 
              onClick={handleFetchReport}
              disabled={!selectedStudent || !selectedAcademicYear || !selectedTerm || loadingReport}
              loading={loadingReport}
              block
            >
              Generate Report
            </Button>
          </Col>
        </Row>
      </Card>

      {loadingReport && <div className="text-center p-8"><Spin tip="Generating report..." /></div>}
      
      {!loadingReport && reportData && (
        <Card 
          title="Student Term Performance Report" 
          className="printable-report-content"
          extra={<Button icon={<PrinterOutlined />} onClick={handlePrintReport}>Print Report</Button>}
        >
          <Descriptions bordered column={2} size="small" className="mb-6">
            <Descriptions.Item label="Student Name">{reportData.student.name}</Descriptions.Item>
            <Descriptions.Item label="Student ID">{reportData.student.studentIdNumber || 'N/A'}</Descriptions.Item>
            <Descriptions.Item label="Class">{reportData.classDetails ? `${reportData.classDetails.name} (${reportData.classDetails.level || ''})` : 'N/A'}</Descriptions.Item>
            <Descriptions.Item label="Academic Year">{reportData.academicYear.name}</Descriptions.Item>
            <Descriptions.Item label="Term">{reportData.term.name}</Descriptions.Item>
            <Descriptions.Item label="Grading Scale Used">{reportData.gradingScaleUsed || 'N/A'}</Descriptions.Item>
          </Descriptions>

          <Title level={4} className="mt-8 mb-4">Exam Performances</Title>
          {reportData.examResults.length === 0 ? <Empty description="No published exams with marks found for this student in the selected term." /> : reportData.examResults.map(exam => (
            <Card key={exam.examId} type="inner" title={exam.examName} className="mb-4">
              <Descriptions bordered column={1} size="small">
                {exam.assessments.map(asm => (
                  <Descriptions.Item key={asm.assessmentName} label={`${asm.subjectName} - ${asm.assessmentName} (${asm.assessmentType})`}>
                    {asm.marksObtained?.toFixed(1) ?? 'N/A'} / {asm.maxMarks.toFixed(1)} 
                    {asm.percentage !== undefined && <Text type="secondary"> ({asm.percentage.toFixed(1)}%)</Text>}
                  </Descriptions.Item>
                ))}
                <Descriptions.Item label={<Text strong>Exam Total</Text>}>
                  <Text strong>{exam.examTotalMarksObtained.toFixed(1)} / {exam.examTotalMaxMarks.toFixed(1)}</Text>
                  {exam.examPercentage !== undefined && <Text strong type="secondary"> ({exam.examPercentage.toFixed(1)}%)</Text>}
                </Descriptions.Item>
                {exam.examWeight !== undefined && (
                  <Descriptions.Item label={<Text strong>Weighted Contribution</Text>}>
                    <Text strong>{exam.weightedContribution?.toFixed(2) ?? 'N/A'}</Text> (Weight: {exam.examWeight}%)
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>
          ))}
          
          {reportData.examResults.length > 0 && (
            <Card title="Overall Term Summary" className="mt-6">
                <Row gutter={16}>
                    <Col span={12}>
                        <Descriptions bordered column={1} size="small">
                        {reportData.termTotalWeightedScore !== undefined && (
                            <Descriptions.Item label="Total Weighted Score">
                                <Text strong className="text-lg">{reportData.termTotalWeightedScore.toFixed(2)}</Text>
                            </Descriptions.Item>
                        )}
                        <Descriptions.Item label="Overall Term Percentage">
                            <Text strong className="text-lg">{reportData.termOverallPercentage?.toFixed(2) ?? 'N/A'} %</Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Term Grade">
                            <Tag color={reportData.termGrade === 'F' || reportData.termGrade === 'N/A' ? 'error' : 'success'} className="text-lg px-2 py-1">{reportData.termGrade || 'N/A'}</Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Term Remarks">{reportData.termRemarks || 'N/A'}</Descriptions.Item>
                        </Descriptions>
                    </Col>
                    <Col span={12}>
                        {reportData.chartData && reportData.chartData.length > 0 && (
                            <>
                                <Title level={5} className="text-center mb-2">Exam Performance Chart</Title>
                                <ResponsiveContainer width="100%" height={250}>
                                    <BarChart data={reportData.chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" angle={-15} textAnchor="end" height={50} interval={0} fontSize={10} />
                                    <YAxis domain={[0, 100]} allowDataOverflow={true} tickFormatter={(value) => `${value}%`} />
                                    <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, "Percentage"]} />
                                    <Legend wrapperStyle={{fontSize: '12px'}}/>
                                    <Bar dataKey="percentage" fill="#1677ff" barSize={30} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </>
                        )}
                    </Col>
                </Row>
            </Card>
          )}
        </Card>
      )}
      {!loadingReport && !reportData && selectedStudent && selectedAcademicYear && selectedTerm && (
          <Empty description="No report data found for the selected criteria. Ensure exams are published and marks entered." className="mt-8"/>
      )}
       <style jsx global>{`
        @media print {
          .report-filters, .ant-layout-sider, .ant-layout-header, .student-term-report-page > .ant-typography:first-child, .student-term-report-page > .ant-typography:nth-child(2), .ant-card-extra {
            display: none !important;
          }
          .printable-report-content, .printable-report-content .ant-card-body {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .ant-card { page-break-inside: avoid; }
          .ant-table { font-size: 10px; }
          .ant-descriptions-item-label, .ant-descriptions-item-content { font-size: 10px; padding: 4px 8px !important; }
          body {
            -webkit-print-color-adjust: exact; /* Chrome, Safari */
            color-adjust: exact; /* Firefox */
          }
        }
      `}</style>
    </div>
  );
}

export default function StudentTermReportPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-screen"><Spin size="large" tip="Loading page..." /></div>}>
            <StudentTermReportPageCore />
        </Suspense>
    );
}
