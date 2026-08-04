
import React, { useState, useEffect } from 'react';

interface TypewriterHTMLProps {
  html: string;
  speed?: number;
  delay?: number;
  className?: string;
  onComplete?: () => void;
}

export const TypewriterHTML: React.FC<TypewriterHTMLProps> = ({
  html,
  speed = 100,
  delay = 0,
  className = "",
  onComplete,
}) => {
  const [displayedHTML, setDisplayedHTML] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  // 提取纯文本内容用于打字机效果
  const textContent = html.replace(/<[^>]*>/g, '');
  
  useEffect(() => {
    if (currentIndex < textContent.length) {
      const timeout = setTimeout(() => {
        const newIndex = currentIndex + 1;
        const partialText = textContent.substring(0, newIndex);
        
        // 重建HTML，保持原有的标签结构
        let rebuiltHTML = "";
        let textIndex = 0;
        
        for (let i = 0; i < html.length; i++) {
          if (html[i] === '<') {
            // 找到标签结束位置
            const tagEnd = html.indexOf('>', i);
            if (tagEnd !== -1) {
              rebuiltHTML += html.substring(i, tagEnd + 1);
              i = tagEnd;
            }
          } else {
            if (textIndex < partialText.length) {
              rebuiltHTML += partialText[textIndex];
              textIndex++;
            }
          }
        }
        
        setDisplayedHTML(rebuiltHTML);
        setCurrentIndex(newIndex);
      }, currentIndex === 0 ? delay : speed);

      return () => clearTimeout(timeout);
    } else if (!isComplete) {
      setIsComplete(true);
      onComplete?.();
    }
  }, [currentIndex, textContent, speed, delay, isComplete, onComplete, html]);

  return (
    <span 
      className={className}
      dangerouslySetInnerHTML={{ 
        __html: displayedHTML + '<span class="animate-pulse">|</span>' 
      }}
    />
  );
};
