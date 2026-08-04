
import React, { useState } from 'react';
import { Theme } from '../../types';

interface SunoInputProps {
  placeholder?: string;
  buttonText?: string;
  onSubmit?: (value: string) => void;
  theme: Theme;
  className?: string;
}

const SunoInput: React.FC<SunoInputProps> = ({
  placeholder = "输入您的关键词...",
  buttonText = "开始优化",
  onSubmit,
  theme,
  className = ""
}) => {
  const isDark = theme === 'dark';
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = () => {
    if (onSubmit && inputValue.trim()) {
      onSubmit(inputValue.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className={`suno-input-container flex rounded-[100px] border-2 p-2 sm:p-[10px] backdrop-blur-[18px] ${
      isDark 
        ? 'border-zinc-600/60 bg-zinc-900/40' 
        : 'border-slate-300/80 bg-white/60'
    } ${className}`}>
      <div className="relative flex min-w-0 flex-1 flex-row">
        <div className="absolute top-1/2 left-3 sm:left-4 md:left-[16px] -translate-y-1/2 transform cursor-pointer">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="1em" 
            height="1em" 
            viewBox="0 0 24 24" 
            fill="currentColor" 
            className={`h-5 w-5 sm:h-6 sm:w-6 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}
          >
            <g>
              <path d="M10.139 10.577c.316-.77 1.406-.77 1.722 0l.89 2.165c.095.23.277.412.507.507l2.165.89c.77.316.77 1.406 0 1.722l-2.165.89a.93.93 0 0 0-.507.507l-.89 2.165c-.316.77-1.406.77-1.722 0l-.89-2.165a.93.93 0 0 0-.507-.507l-2.165-.89c-.77-.316-.77-1.406 0-1.722l2.165-.89a.93.93 0 0 0 .507-.507zm6.422-6.14a.705.705 0 0 1 1.304 0l.673 1.637c.072.174.21.312.384.384l1.638.674a.704.704 0 0 1 0 1.303l-1.638.673a.7.7 0 0 0-.384.384l-.673 1.638a.705.705 0 0 1-1.303 0l-.673-1.638a.7.7 0 0 0-.384-.384l-1.639-.673a.704.704 0 0 1 0-1.303l1.639-.674a.7.7 0 0 0 .384-.384zM4.861 7.26a.42.42 0 0 1 .776 0l.4.973a.42.42 0 0 0 .228.229l.973.4a.42.42 0 0 1 0 .775l-.973.4a.42.42 0 0 0-.228.228l-.4.973a.42.42 0 0 1-.776 0l-.4-.973a.42.42 0 0 0-.228-.228l-.973-.4a.42.42 0 0 1 0-.776l.973-.4a.42.42 0 0 0 .228-.228z"></path>
            </g>
          </svg>
        </div>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          className={`w-full min-h-[44px] sm:min-h-[48px] bg-transparent pl-12 sm:pl-14 pr-3 sm:pr-[10px] text-base shadow-none outline-none border-none focus:bg-transparent focus:outline-none ${
            isDark ? 'text-white placeholder:text-zinc-400' : 'text-slate-900 placeholder:text-slate-500'
          }`}
          style={{ backgroundColor: 'transparent' }}
        />
      </div>
      <button 
        onClick={handleSubmit}
        className={`flex flex-shrink-0 items-center justify-center rounded-[100px] min-h-[44px] min-w-[44px] sm:min-h-[48px] px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base font-medium transition duration-300 ease-in-out active:scale-95 hover:opacity-90 shadow-lg ${
          isDark 
            ? 'bg-gradient-coral text-white shadow-coral hover:opacity-95' 
            : 'bg-gradient-coral text-white shadow-coral hover:opacity-95'
        }`}
      >
        <div className="flex h-full w-full items-center justify-center gap-1 sm:gap-2">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="1em" 
            height="1em" 
            viewBox="0 0 24 24" 
            fill="currentColor" 
            className="h-5 w-5 sm:h-6 sm:w-6"
          >
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
          </svg>
          <span className="hidden sm:block">{buttonText}</span>
        </div>
      </button>
    </div>
  );
};

export default SunoInput;
