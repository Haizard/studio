
'use client';

import React, { useMemo } from 'react';
import type { ReactQuillProps } from 'react-quill'; // Import ReactQuillProps for type safety
import 'react-quill/dist/quill.snow.css'; // Import Quill styles

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = typeof window === 'object' ? require('react-quill') : () => false;

interface RichTextEditorProps extends ReactQuillProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder, className, ...rest }) => {
  
  const modules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline', 'strike'],        // toggled buttons
      ['blockquote', 'code-block'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'script': 'sub'}, { 'script': 'super' }],      // superscript/subscript
      [{ 'indent': '-1'}, { 'indent': '+1' }],          // outdent/indent
      [{ 'direction': 'rtl' }],                         // text direction
      [{ 'color': [] }, { 'background': [] }],          // dropdown with defaults from theme
      [{ 'font': [] }],
      [{ 'align': [] }],
      ['link', 'image', 'video'],                       // link, image, video
      ['clean']                                         // remove formatting button
    ],
    // clipboard: {
    //   matchVisual: false, // Important for pasting from Word, etc.
    // },
  }), []);

  const formats = [
    'header', 'font', 'color', 'background',
    'bold', 'italic', 'underline', 'strike', 'blockquote', 'code-block',
    'list', 'bullet', 'indent', 'script',
    'link', 'image', 'video', 'align', 'direction'
  ];

  if (!ReactQuill) {
    return <div className="p-4 border rounded-md bg-gray-100 text-gray-500">Loading editor...</div>;
  }

  return (
    <div className={className}>
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder || 'Start writing your amazing content...'}
        style={{ backgroundColor: 'white' }} // Ensures editor background is white
        {...rest}
      />
    </div>
  );
};

export default RichTextEditor;
