'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Button, Input, List, Spin, Typography, Avatar, Card, Alert, Upload } from 'antd';
import { SendOutlined, UserOutlined, RobotOutlined, PaperClipOutlined, CloseCircleOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import { askStudentAssistant, type StudentAssistantInput } from '@/ai/flows/student-assistant-flow';
import Image from 'next/image';

const { Title, Paragraph } = Typography;

interface Message {
  text: string;
  isUser: boolean;
  imageDataUri?: string | null;
}

export default function AiAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    { text: "Hello! I'm your AI Student Assistant. How can I help you with your studies today? You can ask me to explain a concept, help you create notes, or even ask a question about an image you upload.", isUser: false }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const listEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() && !imageFile) return;

    const userMessage: Message = { text: inputValue, isUser: true, imageDataUri: imagePreview };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    removeImage();
    setLoading(true);

    try {
      const input: StudentAssistantInput = { 
        prompt: inputValue,
        photoDataUri: imagePreview || undefined, // Send data URI if it exists
      };
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
  
  const uploadButton = (
    <Button icon={<PaperClipOutlined />} size="large" title="Attach an image">
    </Button>
  );

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      <Title level={2} className="text-center mb-4">AI Student Assistant</Title>
      <Paragraph type="secondary" className="text-center mb-6">Your personal AI-powered tutor. Ask a question or upload an image to get started.</Paragraph>
      
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
                    {item.imageDataUri && (
                      <div className="mb-2 rounded-lg overflow-hidden">
                        <Image src={item.imageDataUri} alt="User upload" width={300} height={200} style={{objectFit: 'cover'}}/>
                      </div>
                    )}
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
        
        <div className="pt-4 border-t">
          {imagePreview && (
            <div className="relative w-24 h-24 mb-2 p-1 border rounded-md">
              <Image src={imagePreview} alt="Preview" layout="fill" objectFit="cover" className="rounded-md" />
              <Button 
                icon={<CloseCircleOutlined />} 
                size="small" 
                shape="circle" 
                danger 
                className="absolute -top-2 -right-2"
                onClick={removeImage}
              />
            </div>
          )}
          <div className="flex items-center">
            <label htmlFor="image-upload" className="cursor-pointer">
              {uploadButton}
              <input id="image-upload" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            </label>
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask a question about the image or text..."
              size="large"
              disabled={loading}
              className="ml-2"
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
