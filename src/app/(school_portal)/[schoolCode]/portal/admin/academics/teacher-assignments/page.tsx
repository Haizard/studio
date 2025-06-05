
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Button, Typography, Table, Modal, Form, Select, message, Tag, Space, Spin, Popconfirm, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SolutionOutlined, UserOutlined, CalendarOutlined, BookOutlined } from '@ant-design/icons';
import type { ITeacher, IAssignedClassSubject } from '@/models/Tenant/Teacher';
import type { ITenantUser } from '@/models/Tenant/User';
import type { IAcademicYear } from '@/models/Tenant/AcademicYear';
import type { IClass } from '@/models/Tenant/Class';
import type { ISubject } from '@/models/Tenant/Subject';
import mongoose from 'mongoose';

const { Title, Paragraph } = Typography;
const { Option } = Select;

interface TeacherAssignmentPageProps {
  params: { schoolCode: string };
}

interface PopulatedAssignment extends IAssignedClassSubject {
    _id?: mongoose.Types.ObjectId | string; // Ensure _id is optional as it's generated
    classId: IClass; // Populated
    subjectId: ISubject; // Populated
    academicYearId: IAcademicYear; // Populated
}

export default function TeacherAssignmentsPage({ params }: TeacherAssignmentPageProps) {
  const { schoolCode } = params;

  const [teachers, setTeachers] = useState<ITeacher[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<ITeacher | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | undefined>();
  
  const [academicYears, setAcademicYears] = useState<IAcademicYear[]>([]);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<string | undefined>();

  const [teacherAssignments, setTeacherAssignments] = useState<PopulatedAssignment[]>([]);
  
  const [allClasses, setAllClasses] = useState<IClass[]>([]); // All classes for the school
  const [filteredClassesForModal, setFilteredClassesForModal] = useState<IClass[]>([]); // Classes for selected AY in modal
  const [allSubjects, setAllSubjects] = useState<ISubject[]>([]); // All subjects for the school

  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [loadingAcademicYears, setLoadingAcademicYears] = useState(false);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [loadingAllClasses, setLoadingAllClasses] = useState(false);
  const [loadingAllSubjects, setLoadingAllSubjects] = useState(false);
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  const API_TEACHERS_BASE = `/api/${schoolCode}/portal/teachers`;
  const API_ACADEMIC_YEARS = `/api/${schoolCode}/portal/academics/academic-years`;
  const API_CLASSES_BASE = `/api/${schoolCode}/portal/academics/classes`;
  const API_SUBJECTS = `/api/${schoolCode}/portal/academics/subjects`;

  const fetchTeachers = useCallback(async () => {
    setLoadingTeachers(true);
    try {
      const res = await fetch(API_TEACHERS_BASE);
      if (!res.ok) throw new Error('Failed to fetch teachers');
      const data: ITeacher[] = await res.json();
      setTeachers(data.sort((a,b) => `${(a.userId as ITenantUser).firstName} ${(a.userId as ITenantUser).lastName}`.localeCompare(`${(b.userId as ITenantUser).firstName} ${(b.userId as ITenantUser).lastName}`)));
    } catch (err: any) { message.error(err.message || 'Could not load teachers.'); }
    finally { setLoadingTeachers(false); }
  }, [schoolCode, API_TEACHERS_BASE]);

  const fetchAcademicYears = useCallback(async () => {
    setLoadingAcademicYears(true);
    try {
      const res = await fetch(API_ACADEMIC_YEARS);
      if (!res.ok) throw new Error('Failed to fetch academic years');
      const data: IAcademicYear[] = await res.json();
      setAcademicYears(data.sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()));
      const activeYear = data.find(y => y.isActive);
      if (activeYear && !selectedAcademicYearId) setSelectedAcademicYearId(activeYear._id.toString());
    } catch (err: any) { message.error(err.message || 'Could not load academic years.'); }
    finally { setLoadingAcademicYears(false); }
  }, [schoolCode, API_ACADEMIC_YEARS, selectedAcademicYearId]);
  
  const fetchAllClasses = useCallback(async () => {
    setLoadingAllClasses(true);
    try {
      const res = await fetch(API_CLASSES_BASE); // Fetch all classes
      if (!res.ok) throw new Error('Failed to fetch all classes');
      setAllClasses(await res.json());
    } catch (err: any) { message.error(err.message || 'Could not load classes.'); }
    finally { setLoadingAllClasses(false); }
  }, [schoolCode, API_CLASSES_BASE]);

  const fetchAllSubjects = useCallback(async () => {
    setLoadingAllSubjects(true);
    try {
      const res = await fetch(API_SUBJECTS);
      if (!res.ok) throw new Error('Failed to fetch all subjects');
      setAllSubjects(await res.json());
    } catch (err: any) { message.error(err.message || 'Could not load subjects.'); }
    finally { setLoadingAllSubjects(false); }
  }, [schoolCode, API_SUBJECTS]);


  useEffect(() => {
    fetchTeachers();
    fetchAcademicYears();
    fetchAllClasses();
    fetchAllSubjects();
  }, [fetchTeachers, fetchAcademicYears, fetchAllClasses, fetchAllSubjects]);

  useEffect(() => {
    if (selectedTeacherId) {
      const teacher = teachers.find(t => t._id === selectedTeacherId);
      setSelectedTeacher(teacher || null);
    } else {
      setSelectedTeacher(null);
    }
  }, [selectedTeacherId, teachers]);
  
  useEffect(() => {
    if (selectedTeacher && selectedAcademicYearId) {
        setLoadingAssignments(true);
        const assignments = (selectedTeacher.assignedClassesAndSubjects || [])
            .filter(assign => (assign.academicYearId as IAcademicYear)._id.toString() === selectedAcademicYearId)
            .map(assign => assign as PopulatedAssignment); // Assume it's populated for now
        setTeacherAssignments(assignments);
        setLoadingAssignments(false);
    } else {
        setTeacherAssignments([]);
    }
  }, [selectedTeacher, selectedAcademicYearId]);

   useEffect(() => {
    if (selectedAcademicYearId) {
      setFilteredClassesForModal(allClasses.filter(cls => (cls.academicYearId as IAcademicYear)._id.toString() === selectedAcademicYearId));
    } else {
      setFilteredClassesForModal([]);
    }
  }, [selectedAcademicYearId, allClasses]);


  const handleAddAssignment = () => {
    if (!selectedTeacher || !selectedAcademicYearId) {
        message.error("Please select a teacher and academic year first.");
        return;
    }
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleRemoveAssignment = async (assignmentToRemove: PopulatedAssignment) => {
    if (!selectedTeacher || !selectedAcademicYearId) return;

    const updatedAssignments = (selectedTeacher.assignedClassesAndSubjects || [])
      .filter(assign => 
        !(
          (assign.classId as IClass)._id.toString() === (assignmentToRemove.classId as IClass)._id.toString() &&
          (assign.subjectId as ISubject)._id.toString() === (assignmentToRemove.subjectId as ISubject)._id.toString() &&
          (assign.academicYearId as IAcademicYear)._id.toString() === selectedAcademicYearId
        )
      );
    
    try {
      setLoadingAssignments(true);
      const payload = { ...selectedTeacher, assignedClassesAndSubjects: updatedAssignments };
      const res = await fetch(`${API_TEACHERS_BASE}/${selectedTeacher._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to remove assignment');
      message.success('Assignment removed successfully');
      fetchTeachers(); // Re-fetch all teachers to get the updated one
    } catch (err: any) {
      message.error(err.message || 'Could not remove assignment.');
    } finally {
      setLoadingAssignments(false);
    }
  };

  const handleModalOk = async () => {
    if (!selectedTeacher || !selectedAcademicYearId) return;
    try {
      const values = await form.validateFields();
      const newAssignment = {
        classId: values.classId,
        subjectId: values.subjectId,
        academicYearId: selectedAcademicYearId
      };

      const currentAssignments = selectedTeacher.assignedClassesAndSubjects || [];
      // Check if assignment already exists
      const alreadyExists = currentAssignments.some(assign => 
        (assign.classId as IClass)._id.toString() === newAssignment.classId &&
        (assign.subjectId as ISubject)._id.toString() === newAssignment.subjectId &&
        (assign.academicYearId as IAcademicYear)._id.toString() === newAssignment.academicYearId
      );
      if (alreadyExists) {
        message.warning('This assignment already exists for the teacher in this academic year.');
        return;
      }

      const updatedAssignments = [...currentAssignments, newAssignment];
      const payload = { ...selectedTeacher, assignedClassesAndSubjects: updatedAssignments };
      
      setLoadingAssignments(true);
      const res = await fetch(`${API_TEACHERS_BASE}/${selectedTeacher._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to add assignment');
      
      message.success('Assignment added successfully');
      setIsModalVisible(false);
      fetchTeachers(); // Re-fetch to update the selectedTeacher object
    } catch (err: any) {
      message.error(err.message || 'Could not add assignment.');
    } finally {
      setLoadingAssignments(false);
    }
  };

  const columns = [
    { title: 'Class', dataIndex: ['classId', 'name'], key: 'className', render: (name: string, record: PopulatedAssignment) => `${name} (${(record.classId as IClass).level || ''})` },
    { title: 'Subject', dataIndex: ['subjectId', 'name'], key: 'subjectName', render: (name: string, record: PopulatedAssignment) => `${name} (${(record.subjectId as ISubject).code || ''})`},
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: PopulatedAssignment) => (
        <Popconfirm title="Remove this assignment?" onConfirm={() => handleRemoveAssignment(record)} okText="Yes" cancelText="No">
          <Button icon={<DeleteOutlined />} danger size="small">Remove</Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <Title level={2} className="mb-6"><SolutionOutlined className="mr-2"/>Teacher Class & Subject Assignments</Title>
      <Paragraph>Manage which classes and subjects teachers are assigned to for specific academic years.</Paragraph>

      <Card className="mb-6">
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Space direction="vertical" style={{width: '100%'}}>
                <Text>Select Teacher:</Text>
                <Select
                showSearch
                style={{ width: '100%' }}
                placeholder="Search and select teacher"
                value={selectedTeacherId}
                onChange={setSelectedTeacherId}
                loading={loadingTeachers}
                filterOption={(input, option) => (option?.children?.toString() ?? '').toLowerCase().includes(input.toLowerCase())}
                suffixIcon={<UserOutlined />}
                >
                {teachers.map(t => <Option key={t._id.toString()} value={t._id.toString()}>{`${(t.userId as ITenantUser).firstName} ${(t.userId as ITenantUser).lastName} (${(t.userId as ITenantUser).username})`}</Option>)}
                </Select>
            </Space>
          </Col>
          <Col xs={24} md={12}>
            <Space direction="vertical" style={{width: '100%'}}>
                <Text>Select Academic Year:</Text>
                <Select
                    style={{ width: '100%' }}
                    placeholder="Select academic year"
                    value={selectedAcademicYearId}
                    onChange={setSelectedAcademicYearId}
                    loading={loadingAcademicYears}
                    suffixIcon={<CalendarOutlined />}
                >
                    {academicYears.map(ay => <Option key={ay._id.toString()} value={ay._id.toString()}>{ay.name}</Option>)}
                </Select>
            </Space>
          </Col>
        </Row>
      </Card>

      {selectedTeacher && selectedAcademicYearId && (
        <Spin spinning={loadingAssignments}>
          <div className="flex justify-between items-center mb-4">
            <Title level={4}>Assignments for {(selectedTeacher.userId as ITenantUser).firstName} {(selectedTeacher.userId as ITenantUser).lastName} ({academicYears.find(ay=>ay._id === selectedAcademicYearId)?.name})</Title>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddAssignment}>
              Add New Assignment
            </Button>
          </div>
          <Table
            columns={columns}
            dataSource={teacherAssignments}
            rowKey={(record) => `${(record.classId as IClass)._id}-${(record.subjectId as ISubject)._id}`}
            bordered
            size="middle"
            locale={{emptyText: "No assignments found for this teacher in the selected academic year."}}
          />
        </Spin>
      )}
      {!selectedTeacher && !selectedAcademicYearId && (
        <Paragraph>Please select a teacher and an academic year to view or manage assignments.</Paragraph>
      )}


      <Modal
        title="Add New Assignment"
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={loadingAssignments}
        destroyOnClose
      >
        <Form form={form} layout="vertical" name="assignmentForm" className="mt-4">
          <Form.Item
            name="classId"
            label="Class"
            rules={[{ required: true, message: 'Please select a class!' }]}
          >
            <Select placeholder="Select class (filtered by selected AY)" loading={loadingAllClasses}>
              {filteredClassesForModal.map(cls => <Option key={cls._id.toString()} value={cls._id.toString()}>{cls.name} ({cls.level})</Option>)}
            </Select>
          </Form.Item>
          <Form.Item
            name="subjectId"
            label="Subject"
            rules={[{ required: true, message: 'Please select a subject!' }]}
          >
            <Select placeholder="Select subject" loading={loadingAllSubjects}>
              {allSubjects.map(sub => <Option key={sub._id.toString()} value={sub._id.toString()}>{sub.name} {sub.code ? `(${sub.code})` : ''}</Option>)}
            </Select>
          </Form.Item>
          {/* Academic Year is taken from the page filter */}
        </Form>
      </Modal>
    </div>
  );
}

    