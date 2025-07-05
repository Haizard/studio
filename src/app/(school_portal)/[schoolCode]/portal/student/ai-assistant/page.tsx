'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Button, Input, List, Spin, Typography, Avatar, Card, Alert } from 'antd';
import { SendOutlined, UserOutlined, RobotOutlined } from '@ant-design/icons';
import { askStudentAssistant, type StudentAssistantInput } from '@/ai/flows/student-assistant-flow';

const { Title, Paragraph } = Typography;

interface Message {
  text: string;
  isUser: boolean;
}

export default function AiAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    { text: "Hello! I'm your AI Student Assistant. How can I help you with your studies today? You can ask me to explain a concept, help you create notes, or solve a question.", isUser: false }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const listEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = { text: inputValue, isUser: true };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);

    try {
      const input: StudentAssistantInput = { prompt: inputValue };
      const result = await askStudentAssistant(input);
      const aiMessage: Message = { text: result.response, isUser: false };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error asking student assistant:", error);
      const errorMessage: Message = { text: "Sorry, I encountered an error. Please try again.", isUser: false };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !loading) {
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      <Title level={2} className="text-center mb-4">AI Student Assistant</Title>
      <Paragraph type="secondary" className="text-center mb-6">Your personal AI-powered tutor for academic help.</Paragraph>
      
      <Card className="flex-grow flex flex-col shadow-lg">
        <div className="flex-grow overflow-y-auto pr-4 h-[55vh]">
          <List
            dataSource={messages}
            renderItem={(item) => (
              <List.Item
                className={`flex ${item.isUser ? 'justify-end' : 'justify-start'}`}
                style={{ borderBottom: 'none' }}
              >
                <div className={`flex items-start gap-2.5 max-w-md ${item.isUser ? 'flex-row-reverse' : ''}`}>
                  <Avatar icon={item.isUser ? <UserOutlined /> : <RobotOutlined />} className={item.isUser ? 'bg-blue-500' : 'bg-green-500'}/>
                  <div className={`flex flex-col w-full leading-1.5 p-4 border-gray-200 rounded-xl ${item.isUser ? 'bg-blue-100' : 'bg-gray-100'}`}>
                    <p className="text-sm font-normal text-gray-900 whitespace-pre-wrap">{item.text}</p>
                  </div>
                </div>
              </List.Item>
            )}
          />
           {loading && (
            <div className="flex justify-center items-center p-4">
              <Spin tip="AI is thinking..." />
            </div>
          )}
          <div ref={listEndRef} />
        </div>
        
        <div className="flex items-center pt-4 border-t">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask to explain photosynthesis..."
            size="large"
            disabled={loading}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSendMessage}
            loading={loading}
            size="large"
            className="ml-2"
          >
            Send
          </Button>
        </div>
      </Card>
      <Alert
        className="mt-6"
        message="Disclaimer"
        description="This AI assistant is a tool to help you learn. Always verify critical information with your teachers and course materials."
        type="info"
        showIcon
      />
    </div>
  );
}
