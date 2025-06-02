
"use client";

import type React from 'react';

interface MetricsDisplayProps {
  text: string;
}

const MetricsDisplay: React.FC<MetricsDisplayProps> = ({ text }) => {
  const [charCount, setCharCount] = React.useState(0);
  const [wordCount, setWordCount] = React.useState(0);

  React.useEffect(() => {
    setCharCount(text.length);
    setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0);
  }, [text]);

  return (
    <div className="text-xs md:text-sm text-muted-foreground space-x-2 md:space-x-3">
      <span>Chars: {charCount}</span>
      <span>Words: {wordCount}</span>
    </div>
  );
};

export default MetricsDisplay;
