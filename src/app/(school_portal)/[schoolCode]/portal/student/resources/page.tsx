
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Typography, Card, Row, Col, Spin, Empty, Tag, Button, Select, Space as AntSpace } from 'antd';
import { FolderOpenOutlined, LinkOutlined, FileTextOutlined, VideoOutlined, PictureOutlined, PaperClipOutlined, DownloadOutlined } from '@ant-design/icons';
import { useParams } from 'next/navigation';
import type { ITeacherResource, ResourceFileType } from '@/models/Tenant/TeacherResource';
import type { IAcademicYear } from '@/models/Tenant/AcademicYear';
import type { ISubject } from '@/models/Tenant/Subject';
import type { ITenantUser } from '@/models/Tenant/User';

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;

interface PopulatedResource extends Omit<ITeacherResource, 'teacherId' | 'subjectId' | 'academicYearId'> {
  teacherId: Pick<ITenantUser, 'firstName' | 'lastName'>;
  subjectId?: Pick<ISubject, '_id' | 'name' | 'code'>;
  academicYearId: Pick<IAcademicYear, '_id' | 'name'>;
}

const getFileTypeIcon = (fileType?: ResourceFileType) => {
    switch(fileType) {
      case 'PDF': return <FileTextOutlined className="text-red-500 text-2xl" />;
      case 'Document': return <FileTextOutlined className="text-blue-500 text-2xl" />;
      case 'Spreadsheet': return <FileTextOutlined className="text-green-500 text-2xl" />;
      case 'Presentation': return <VideoOutlined className="text-orange-500 text-2xl" />; // Using Video for Presentation as an example
      case 'Image': return <PictureOutlined className="text-purple-500 text-2xl" />;
      case 'Video': return <VideoOutlined className="text-red-700 text-2xl" />;
      case 'Audio': return <PaperClipOutlined className="text-indigo-500 text-2xl" />; // Using Paperclip as a generic audio icon
      case 'Link': return <LinkOutlined className="text-sky-500 text-2xl" />;
      default: return <FolderOpenOutlined className="text-gray-500 text-2xl"/>;
    }
};

export default function StudentResourcesPage() {
  const params = useParams();
  const schoolCode = params.schoolCode as string;

  const [resources, setResources] = useState<PopulatedResource[]>([]);
  const [allSubjects, setAllSubjects] = useState<ISubject[]>([]); // For filter dropdown
  const [selectedSubject, setSelectedSubject] = useState<string | undefined>();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_URL_BASE = `/api/${schoolCode}/portal/student/resources`;
  const SUBJECTS_API = `/api/${schoolCode}/portal/academics/subjects`; // To populate subject filter

  const fetchResources = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let url = API_URL_BASE;
      if (selectedSubject) {
        url += `?subjectId=${selectedSubject}`;
      }
      const res = await fetch(url);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to fetch resources');
      }
      const data: PopulatedResource[] = await res.json();
      setResources(data);
    } catch (err: any) {
      setError(err.message || 'Could not load resources.');
      setResources([]);
    } finally {
      setLoading(false);
    }
  }, [schoolCode, selectedSubject, API_URL_BASE]);

  useEffect(() => {
    const fetchSubjectsForFilter = async () => {
        try {
            const res = await fetch(SUBJECTS_API);
            if (!res.ok) throw new Error('Failed to fetch subjects for filter');
            const data: ISubject[] = await res.json();
            setAllSubjects(data.sort((a,b) => a.name.localeCompare(b.name)));
        } catch (err: any) {
            console.error("Failed to load subjects for filter:", err.message);
            // Not critical for resource listing, just filter won't populate
        }
    };
    fetchSubjectsForFilter();
  }, [schoolCode, SUBJECTS_API]);
  
  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  return (
    <div className="p-4">
      <Title level={2} className="mb-6 flex items-center"><FolderOpenOutlined className="mr-2" />Learning Resources</Title>
      <Paragraph>Here you can find learning materials shared by your teachers relevant to your current academic year and class level.</Paragraph>

      <div className="mb-6">
        <AntSpace>
            <Text>Filter by Subject:</Text>
            <Select
                style={{ width: 250 }}
                placeholder="All Subjects"
                value={selectedSubject}
                onChange={value => setSelectedSubject(value)}
                allowClear
                loading={allSubjects.length === 0 && loading} // Show loading if subjects still fetching with main data
            >
                {allSubjects.map(subject => <Option key={subject._id} value={subject._id}>{subject.name} {subject.code ? `(${subject.code})` : ''}</Option>)}
            </Select>
        </AntSpace>
      </div>

      {loading && <div className="text-center py-8"><Spin size="large" tip="Loading resources..." /></div>}
      {error && <div className="text-center py-8"><Text type="danger">{error}</Text></div>}

      {!loading && !error && resources.length === 0 && (
        <Empty description="No resources found matching your criteria or shared for your current context." />
      )}

      {!loading && !error && resources.length > 0 && (
        <Row gutter={[16, 24]}>
          {resources.map(resource => (
            <Col xs={24} sm={12} md={8} lg={6} key={resource._id as string}>
              <Card 
                hoverable 
                className="h-full flex flex-col shadow-md"
                title={<AntSpace>{getFileTypeIcon(resource.fileType)} <span className="truncate">{resource.title}</span></AntSpace>}
                actions={[
                    <Button 
                        type="primary" 
                        icon={<DownloadOutlined />} 
                        href={resource.fileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        key="download"
                    >
                        Open Resource
                    </Button>
                ]}
              >
                <Paragraph ellipsis={{ rows: 3, expandable: true, symbol: 'more' }} className="text-sm mb-2 min-h-[4.5em]">
                  {resource.description || "No description provided."}
                </Paragraph>
                <div className="text-xs text-gray-600 space-y-1">
                    {resource.subjectId && (
                        <div><Text strong>Subject:</Text> <Tag color="blue">{resource.subjectId.name}</Tag></div>
                    )}
                    {resource.classLevel && (
                        <div><Text strong>Level:</Text> {resource.classLevel}</div>
                    )}
                    <div><Text strong>Shared by:</Text> {resource.teacherId.firstName} {resource.teacherId.lastName}</div>
                    <div><Text strong>Academic Year:</Text> {resource.academicYearId.name}</div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
}

