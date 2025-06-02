
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Typography, Select, Card, Row, Col, message, Spin, Empty, Descriptions, Collapse, Tag, Alert } from 'antd';
import { SolutionOutlined, CalendarOutlined, ReadOutlined, FileTextOutlined, CheckCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useParams } from 'next/navigation';
import type { IAcademicYear } from '@/models/Tenant/AcademicYear';
import type { ITerm } from '@/models/Tenant/Term';
import type { IMark } from '@/models/Tenant/Mark';
import type { IAssessment } from '@/models/Tenant/Assessment';
import type { ISubject } from '@/models/Tenant/Subject';
import type { IExam } from '@/models/Tenant/Exam';
import mongoose from 'mongoose';

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;
const { Panel } = Collapse;

interface PopulatedMarkAssessmentSubject extends Pick<ISubject, '_id' | 'name' | 'code'> {}
interface PopulatedMarkAssessmentExam extends Pick<IExam, '_id' | 'name'> {}

interface PopulatedMarkAssessment extends Omit<IAssessment, 'subjectId' | 'examId'> {
  subjectId: PopulatedMarkAssessmentSubject;
  examId: PopulatedMarkAssessmentExam;
}

interface PopulatedMark extends Omit<IMark, 'assessmentId' | 'academicYearId' | 'termId'> {
  assessmentId: PopulatedMarkAssessment;
  academicYearId: Pick<IAcademicYear, '_id' | 'name'>;
  termId?: Pick<ITerm, '_id' | 'name'>;
}

interface ResultsByExam {
  examName: string;
  examId: string;
  subjects: {
    subjectName: string;
    subjectId: string;
    assessments: PopulatedMark[];
    totalMarksObtained?: number;
    totalMaxMarks?: number;
  }[];
  overallTotalMarksObtained?: number;
  overallTotalMaxMarks?: number;
}

export default function StudentResultsPage() {
  const params = useParams();
  const schoolCode = params.schoolCode as string;

  const [academicYears, setAcademicYears] = useState<IAcademicYear[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string | undefined>();
  
  const [terms, setTerms] = useState<ITerm[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<string | undefined>();

  const [studentMarks, setStudentMarks] = useState<PopulatedMark[]>([]);
  const [groupedResults, setGroupedResults] = useState<ResultsByExam[]>([]);
  
  const [loadingYears, setLoadingYears] = useState(true);
  const [loadingTerms, setLoadingTerms] = useState(false);
  const [loadingResults, setLoadingResults] = useState(false);

  const ACADEMIC_YEARS_API = `/api/${schoolCode}/portal/academics/academic-years`;
  const TERMS_API_BASE = `/api/${schoolCode}/portal/academics/terms`;
  const STUDENT_MARKS_API_BASE = `/api/${schoolCode}/portal/students/me/marks`;

  useEffect(() => {
    const fetchYears = async () => {
      setLoadingYears(true);
      try {
        const res = await fetch(ACADEMIC_YEARS_API);
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch academic years');
        const data: IAcademicYear[] = await res.json();
        setAcademicYears(data.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()));
        const activeYear = data.find(y => y.isActive);
        if (activeYear) setSelectedAcademicYear(activeYear._id);
        else if (data.length > 0) setSelectedAcademicYear(data[0]._id);
      } catch (err: any) {
        message.error(err.message || 'Could not load academic years.');
      } finally {
        setLoadingYears(false);
      }
    };
    fetchYears();
  }, [schoolCode, ACADEMIC_YEARS_API]);

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
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch terms');
        const data: ITerm[] = await res.json();
        setTerms(data.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()));
        setSelectedTerm(undefined);
      } catch (err: any) {
        message.error(err.message || 'Could not load terms for the selected year.');
        setTerms([]);
      } finally {
        setLoadingTerms(false);
      }
    };
    fetchTerms();
  }, [selectedAcademicYear, schoolCode, TERMS_API_BASE]);

  const fetchStudentMarks = useCallback(async () => {
    if (!selectedAcademicYear) {
      setStudentMarks([]);
      setGroupedResults([]);
      return;
    }
    setLoadingResults(true);
    try {
      let url = `${STUDENT_MARKS_API_BASE}?academicYearId=${selectedAcademicYear}`;
      if (selectedTerm) {
        url += `&termId=${selectedTerm}`;
      }
      const res = await fetch(url);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to fetch student results.');
      }
      const data: PopulatedMark[] = await res.json();
      setStudentMarks(data);
    } catch (err: any) {
      message.error(err.message || 'Could not load results.');
      setStudentMarks([]);
    } finally {
      setLoadingResults(false);
    }
  }, [selectedAcademicYear, selectedTerm, schoolCode, STUDENT_MARKS_API_BASE]);

  useEffect(() => {
    fetchStudentMarks();
  }, [fetchStudentMarks]);

  useEffect(() => {
    if (studentMarks.length === 0) {
      setGroupedResults([]);
      return;
    }

    const results: { [examId: string]: ResultsByExam } = {};

    studentMarks.forEach(mark => {
      const examId = mark.assessmentId.examId._id;
      const examName = mark.assessmentId.examId.name;
      const subjectId = mark.assessmentId.subjectId._id;
      const subjectName = mark.assessmentId.subjectId.name;

      if (!results[examId]) {
        results[examId] = { examId, examName, subjects: [], overallTotalMarksObtained: 0, overallTotalMaxMarks: 0 };
      }

      let subjectEntry = results[examId].subjects.find(s => s.subjectId === subjectId);
      if (!subjectEntry) {
        subjectEntry = { subjectId, subjectName, assessments: [], totalMarksObtained: 0, totalMaxMarks: 0 };
        results[examId].subjects.push(subjectEntry);
      }

      subjectEntry.assessments.push(mark);
      if (typeof mark.marksObtained === 'number' && !isNaN(mark.marksObtained)) {
        subjectEntry.totalMarksObtained = (subjectEntry.totalMarksObtained || 0) + mark.marksObtained;
        results[examId].overallTotalMarksObtained = (results[examId].overallTotalMarksObtained || 0) + mark.marksObtained;
      }
      if (typeof mark.assessmentId.maxMarks === 'number' && !isNaN(mark.assessmentId.maxMarks)) {
        subjectEntry.totalMaxMarks = (subjectEntry.totalMaxMarks || 0) + mark.assessmentId.maxMarks;
         results[examId].overallTotalMaxMarks = (results[examId].overallTotalMaxMarks || 0) + mark.assessmentId.maxMarks;
      }
    });
    
    setGroupedResults(Object.values(results));
  }, [studentMarks]);
  
  const calculateGradeAndRemarks = (percentage?: number) => {
    if (percentage === undefined || isNaN(percentage)) return { grade: 'N/A', remarks: 'Not Graded' };
    if (percentage >= 80) return { grade: 'A', remarks: 'Excellent' };
    if (percentage >= 70) return { grade: 'B', remarks: 'Very Good' };
    if (percentage >= 60) return { grade: 'C', remarks: 'Good' };
    if (percentage >= 50) return { grade: 'D', remarks: 'Pass' };
    if (percentage >= 40) return { grade: 'E', remarks: 'Fair' };
    return { grade: 'F', remarks: 'Needs Improvement' };
  };

  return (
    <div className="p-4">
      <Title level={2} className="mb-6 flex items-center"><SolutionOutlined className="mr-2" />My Academic Results</Title>
      <Paragraph>Select an academic year and optionally a term to view your published results.</Paragraph>

      <Row gutter={[16, 16]} className="mb-8">
        <Col xs={24} sm={12}>
          <Select
            style={{ width: '100%' }}
            placeholder="Select Academic Year"
            value={selectedAcademicYear}
            onChange={setSelectedAcademicYear}
            loading={loadingYears}
            suffixIcon={<CalendarOutlined />}
          >
            {academicYears.map(year => <Option key={year._id} value={year._id}>{year.name}</Option>)}
          </Select>
        </Col>
        <Col xs={24} sm={12}>
          <Select
            style={{ width: '100%' }}
            placeholder="Select Term (Optional)"
            value={selectedTerm}
            onChange={setSelectedTerm}
            loading={loadingTerms}
            disabled={!selectedAcademicYear || loadingTerms}
            allowClear
            suffixIcon={<ReadOutlined />}
          >
            {terms.map(term => <Option key={term._id} value={term._id}>{term.name}</Option>)}
          </Select>
        </Col>
      </Row>

      {loadingResults && <div className="text-center py-8"><Spin size="large" tip="Loading results..." /></div>}

      {!loadingResults && groupedResults.length === 0 && selectedAcademicYear && (
        <Empty description="No published results found for the selected period. Please check back later or select a different period." />
      )}
      {!loadingResults && !selectedAcademicYear && (
         <Alert message="Please select an Academic Year to view results." type="info" showIcon />
      )}

      {!loadingResults && groupedResults.length > 0 && (
        <Collapse accordion defaultActiveKey={groupedResults[0]?.examId}>
          {groupedResults.map(examResult => (
            <Panel 
                header={
                    <Title level={4} className="!mb-0 flex justify-between items-center">
                        <span><FileTextOutlined className="mr-2" /> {examResult.examName}</span>
                        {examResult.overallTotalMaxMarks && examResult.overallTotalMaxMarks > 0 ? 
                            <Tag color="blue" className="ml-2 text-base">
                                Overall: {examResult.overallTotalMarksObtained?.toFixed(1) || '0'} / {examResult.overallTotalMaxMarks?.toFixed(1)} 
                                ({((examResult.overallTotalMarksObtained || 0) / (examResult.overallTotalMaxMarks || 1) * 100).toFixed(1)}%)
                            </Tag> 
                            : <Tag className="ml-2">No Marks Yet</Tag>
                        }
                    </Title>
                } 
                key={examResult.examId}
            >
              <div className="space-y-4">
                {examResult.subjects.map(subjectResult => {
                  const subjectPercentage = (subjectResult.totalMarksObtained && subjectResult.totalMaxMarks && subjectResult.totalMaxMarks > 0) 
                    ? (subjectResult.totalMarksObtained / subjectResult.totalMaxMarks * 100) 
                    : undefined;
                  const { grade, remarks } = calculateGradeAndRemarks(subjectPercentage);

                  return (
                    <Card 
                        key={subjectResult.subjectId} 
                        type="inner" 
                        title={
                             <div className="flex justify-between items-center">
                                <span><ReadOutlined className="mr-2" />{subjectResult.subjectName}</span>
                                {subjectResult.totalMaxMarks && subjectResult.totalMaxMarks > 0 ?
                                    <Space size="small">
                                        <Tag color="geekblue">
                                            Total: {subjectResult.totalMarksObtained?.toFixed(1) || '0'} / {subjectResult.totalMaxMarks?.toFixed(1)}
                                        </Tag>
                                        <Tag color={grade === 'F' || grade === 'N/A' ? 'volcano' : 'success'}>
                                            {grade} ({subjectPercentage?.toFixed(1) || 'N/A'}%)
                                        </Tag>
                                    </Space>
                                    : <Tag>No Marks Yet</Tag>
                                }
                            </div>
                        }
                    >
                      <Descriptions bordered size="small" column={1}>
                        {subjectResult.assessments.map(mark => (
                          <Descriptions.Item 
                            key={mark._id} 
                            label={
                              <Text>
                                {`${mark.assessmentId.assessmentName} (${mark.assessmentId.assessmentType}) - `}
                                <Text type="secondary">{new Date(mark.assessmentId.assessmentDate).toLocaleDateString()}</Text>
                              </Text>
                            }
                          >
                            <Text strong>{mark.marksObtained === null || mark.marksObtained === undefined ? 'N/A' : mark.marksObtained.toFixed(1)}</Text> / {mark.assessmentId.maxMarks.toFixed(1)}
                            {mark.comments && <Paragraph italic type="secondary" className="text-xs !mb-0 ml-2">({mark.comments})</Paragraph>}
                          </Descriptions.Item>
                        ))}
                      </Descriptions>
                       {subjectPercentage !== undefined && (
                            <Paragraph className="mt-2 text-right">
                                Subject Remarks: <Text strong>{remarks}</Text>
                            </Paragraph>
                        )}
                    </Card>
                  );
                })}
              </div>
            </Panel>
          ))}
        </Collapse>
      )}
       <Alert
          className="mt-8"
          message="Understanding Your Results"
          description={
            <ul className="list-disc list-inside text-sm">
              <li>Results are shown for exams that have been officially published by the school.</li>
              <li>'N/A' means marks have not been entered or the assessment was not applicable.</li>
              <li>Grades and remarks are based on a general scale and may vary by school policy.</li>
              <li>If you have any questions about your results, please contact your subject teacher or the academic office.</li>
            </ul>
          }
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
        />
    </div>
  );
}
