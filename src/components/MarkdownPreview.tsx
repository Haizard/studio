
// This file was part of the "Just Jot" application and is no longer needed
// for the "Unified School Management System". It can be safely removed.
// If you need Markdown preview capabilities in the new system,
// consider using a library like 'react-markdown' or a similar solution.

// "use client";

// import type React from 'react';

// interface MarkdownPreviewProps {
//   markdownText: string;
// }

// const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ markdownText }) => {
//   const paragraphs = markdownText.split(/\n\s*\n/); 

//   const renderProcessedLine = (line: string) => {
//     let html = line;
//     html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
//     html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
//     html = html.replace(/`(.*?)`/g, '<code>$1</code>');
//     html = html.replace(/\n/g, '<br />');
//     return html;
//   };

//   return (
//     <div className="flex-1 w-full p-4 bg-card rounded-md shadow-sm overflow-y-auto font-body text-lg prose-custom leading-relaxed">
//       {paragraphs.map((p, index) => (
//         p.trim() || p.includes('\n') ? <p key={index} dangerouslySetInnerHTML={{ __html: renderProcessedLine(p) }} /> : null
//       ))}
//     </div>
//   );
// };

// export default MarkdownPreview;
