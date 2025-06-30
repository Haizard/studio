
import React from 'react';
import { Typography, Card, Row, Col, Divider, List } from 'antd';
import { BookOutlined, ExperimentOutlined, UsergroupAddOutlined, GlobalOutlined, CalculatorOutlined, CodeOutlined } from '@ant-design/icons';
import Image from 'next/image';

interface AcademicsPageProps {
  params: { schoolCode: string };
}

const departments = [
  { name: "Sciences", icon: <ExperimentOutlined />, description: "Exploring the natural world through physics, chemistry, and biology. Fostering curiosity and a spirit of inquiry.", hint: "science laboratory" },
  { name: "Mathematics", icon: <CalculatorOutlined />, description: "Developing logical reasoning and problem-solving skills through a comprehensive mathematics curriculum.", hint: "mathematics classroom" },
  { name: "Humanities", icon: <UsergroupAddOutlined />, description: "Understanding human culture, history, and society through subjects like history, geography, and social studies.", hint: "library books" },
  { name: "Languages", icon: <GlobalOutlined />, description: "Mastering communication skills in English, Kiswahili, and other foreign languages.", hint: "language learning" },
  { name: "Information Technology", icon: <CodeOutlined />, description: "Equipping students with modern digital literacy and programming skills for the future.", hint: "computer lab" },
  { name: "Arts & Culture", icon: <BookOutlined />, description: "Nurturing creativity and expression through fine arts, music, and cultural studies.", hint: "art class" },
];

export default async function AcademicsPage({ params }: AcademicsPageProps) {
  const { schoolCode } = params;

  return (
    <div className="container mx-auto px-4 py-8">
      <Typography.Title level={2} className="mb-8 text-center">
        <BookOutlined className="mr-2" /> Academics at {schoolCode.toUpperCase()} School
      </Typography.Title>

      <Card className="shadow-lg mb-12">
        <Row gutter={[24, 24]} align="middle">
          <Col xs={24} md={10}>
             <Image
              src="https://placehold.co/600x400.png"
              alt="Students in a library"
              width={600}
              height={400}
              className="w-full h-auto object-cover rounded-md"
              data-ai-hint="students library"
            />
          </Col>
          <Col xs={24} md={14}>
            <Typography.Title level={3} className="text-primary">Our Educational Philosophy</Typography.Title>
            <Typography.Paragraph className="text-lg">
              We are committed to providing a stimulating and nurturing academic environment that encourages students to reach their full potential. Our curriculum is designed to be both rigorous and flexible, fostering critical thinking, creativity, and a lifelong love of learning.
            </Typography.Paragraph>
            <Typography.Paragraph>
              From a strong foundation in core subjects to a wide array of elective and advanced placement courses, we prepare our students not just for examinations, but for the challenges and opportunities of the 21st century.
            </Typography.Paragraph>
          </Col>
        </Row>
      </Card>
      
      <Divider><Typography.Title level={3}>Academic Departments</Typography.Title></Divider>
      
      <Row gutter={[16, 16]} className="mb-12">
        {departments.map(dept => (
           <Col xs={24} sm={12} md={8} key={dept.name}>
            <Card hoverable className="h-full text-center shadow-md">
                <div className="text-5xl mb-4 text-primary">{dept.icon}</div>
                <Typography.Title level={4}>{dept.name}</Typography.Title>
                <Typography.Paragraph type="secondary">{dept.description}</Typography.Paragraph>
            </Card>
           </Col>
        ))}
      </Row>

      <Divider><Typography.Title level={3}>Curriculum Highlights</Typography.Title></Divider>

       <Row gutter={[24, 24]}>
          <Col xs={24} md={12}>
              <Card title="O-Level Programme" className="h-full shadow-md">
                 <Typography.Paragraph>
                   Our Ordinary Level (O-Level) programme provides a broad and balanced education, covering a wide range of subjects in sciences, humanities, and arts. This ensures a strong foundation for all students.
                 </Typography.Paragraph>
                 <List size="small">
                    <List.Item>Core subjects: Mathematics, Physics, Chemistry, Biology, English, Kiswahili, History, Geography.</List.Item>
                    <List.Item>Elective subjects include Commerce, Book-keeping, and Fine Arts.</List.Item>
                    <List.Item>Emphasis on practical skills and laboratory work.</List.Item>
                 </List>
              </Card>
          </Col>
           <Col xs={24} md={12}>
              <Card title="A-Level Programme" className="h-full shadow-md">
                 <Typography.Paragraph>
                   The Advanced Level (A-Level) programme allows students to specialize in subjects of their interest, preparing them for university education and future careers. We offer a variety of subject combinations.
                 </Typography.Paragraph>
                 <List size="small">
                    <List.Item>Science Combinations: PCM (Physics, Chemistry, Maths), PCB (Physics, Chemistry, Biology), etc.</List.Item>
                    <List.Item>Arts & Humanities Combinations: HGL (History, Geography, Language), HKL (History, Kiswahili, Language), etc.</List.Item>
                     <List.Item>Business Combinations: EGM (Economics, Geography, Maths), ECA (Economics, Commerce, Accountancy), etc.</List.Item>
                 </List>
              </Card>
          </Col>
       </Row>

    </div>
  );
}
