import React from 'react';

interface Props {
  content: string;
  role?: 'agent' | 'user';
}

const TextBubble: React.FC<Props> = ({ content, role = 'agent' }) => {
  const isUser = role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="min-w-0 max-w-[85%] rounded-2xl bg-gray-100 px-4 py-2.5 text-[15px] leading-relaxed text-gray-800 whitespace-pre-wrap">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="text-left">
      <p className="min-w-0 max-w-[92%] text-[15px] leading-relaxed text-gray-900 whitespace-pre-wrap">
        {content}
      </p>
    </div>
  );
};

export default TextBubble;
