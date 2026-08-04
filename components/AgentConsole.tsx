import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Share2, Twitter, Zap, Sliders, ShieldCheck, Repeat, FileText, X } from 'lucide-react';
import { Message } from '../types';

const AgentConsole: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'system',
      content: 'GEO 生成助手已就绪。请设定目标并下达生成指令。',
      timestamp: new Date().toLocaleTimeString(),
    }
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Configuration States
  const [selectedPlatform, setSelectedPlatform] = useState('Doubao');
  const [iterationCount, setIterationCount] = useState(3);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsGenerating(true);

    // Simulate AI Processing
    setTimeout(() => {
      const responseMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        content: `已为您生成针对 **${selectedPlatform}** 平台的优化内容。\n\n执行报告：\n• 已完成 ${iterationCount} 轮闭环迭代优化\n• E-E-A-T 权威信号已注入\n• BLUF 结构化重组完成`,
        timestamp: new Date().toLocaleTimeString(),
        metadata: {
            status: 'completed',
            platform: selectedPlatform
        }
      };
      setMessages(prev => [...prev, responseMsg]);
      setIsGenerating(false);
    }, 2000);
  };

  return (
    <div className="flex h-full bg-slate-50 relative overflow-hidden">
      {/* Center: Chat Area */}
      <div className="flex-1 flex flex-col h-full w-full">
        <header className="h-16 border-b border-slate-200 flex items-center justify-between px-4 md:px-6 bg-white/80 backdrop-blur-md sticky top-0 z-10 shrink-0 shadow-sm">
          <h2 className="text-slate-800 font-bold flex items-center gap-2 text-sm md:text-base truncate mr-2">
            <Sparkles className="w-5 h-5 text-blue-600 shrink-0" />
            <span className="truncate">生成助手</span>
          </h2>
          <div className="flex items-center gap-2 shrink-0">
             <span className="hidden md:inline-block px-3 py-1 bg-slate-100 rounded-full text-xs text-slate-600 border border-slate-200 font-medium">模型: GEO-Pro-Max</span>
             <button 
                onClick={() => setIsConfigOpen(!isConfigOpen)}
                className="lg:hidden p-2 bg-white rounded-lg text-slate-500 hover:text-blue-600 border border-slate-200 shadow-sm"
             >
                <Sliders className="w-4 h-4" />
             </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6" ref={scrollRef}>
            {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-3 md:gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role !== 'user' && (
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shrink-0 mt-1 shadow-md shadow-blue-200">
                            <Bot className="w-5 h-5 md:w-6 md:h-6 text-white" />
                        </div>
                    )}
                    <div className={`max-w-[85%] md:max-w-2xl p-3 md:p-5 rounded-2xl shadow-sm ${
                        msg.role === 'user' 
                        ? 'bg-blue-600 text-white rounded-tr-none shadow-blue-200' 
                        : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none'
                    }`}>
                        {msg.role === 'system' ? (
                            <p className="text-xs font-mono text-slate-400 bg-slate-50 p-2 rounded">{msg.content}</p>
                        ) : (
                            <div className="whitespace-pre-wrap leading-relaxed text-sm">
                                {msg.content}
                                {msg.role === 'agent' && (
                                    <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-3">
                                         <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs font-mono text-slate-500">
                                            预览: "结论先行：根据 2024 年最新临床数据 (Ref: Trial #2024)，我们建议..."
                                         </div>
                                         <div className="flex gap-2 flex-wrap">
                                            <button className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs text-white font-medium transition-colors shadow-sm shadow-blue-200">
                                                <Share2 className="w-3 h-3" /> 自动分发
                                            </button>
                                            <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-xs text-slate-600 transition-colors shadow-sm">
                                                <Twitter className="w-3 h-3 text-sky-500" /> 发推
                                            </button>
                                         </div>
                                    </div>
                                )}
                            </div>
                        )}
                        <span className={`text-xs mt-2 block text-right ${msg.role === 'user' ? 'text-blue-200' : 'text-slate-400'}`}>{msg.timestamp}</span>
                    </div>
                    {msg.role === 'user' && (
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center shrink-0 mt-1 shadow-sm">
                            <User className="w-5 h-5 md:w-6 md:h-6 text-slate-600" />
                        </div>
                    )}
                </div>
            ))}
            {isGenerating && (
                 <div className="flex gap-4">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center shrink-0 shadow-sm">
                        <Bot className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 text-sm italic bg-white px-4 py-2 rounded-full border border-slate-100 shadow-sm">
                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></span>
                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-75"></span>
                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-150"></span>
                        正在执行多轮优化迭代...
                    </div>
                 </div>
            )}
        </div>

        <div className="p-4 bg-white border-t border-slate-200 shrink-0 z-20">
            <div className="relative max-w-4xl mx-auto w-full">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="输入指令 (例如：'优化江中在某平台的排名')..."
                    className="w-full bg-slate-50 text-slate-800 placeholder-slate-400 rounded-xl py-4 pl-5 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 border border-slate-200 text-sm md:text-base shadow-inner transition-all"
                />
                <button 
                    onClick={handleSend}
                    disabled={isGenerating || !input}
                    className="absolute right-3 top-3 p-2 bg-blue-600 rounded-lg text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-blue-200"
                >
                    <Send className="w-4 h-4" />
                </button>
            </div>
        </div>
      </div>

      {/* Mobile Config Backdrop */}
      {isConfigOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/20 z-30 lg:hidden backdrop-blur-sm"
          onClick={() => setIsConfigOpen(false)}
        />
      )}

      {/* Right: Strategy Config Panel (Responsive) */}
      <div className={`
        fixed inset-y-0 right-0 w-80 bg-white border-l border-slate-200 p-6 flex flex-col gap-8 overflow-y-auto z-40 transition-transform duration-300 shadow-sm
        lg:static lg:flex lg:translate-x-0 lg:shadow-none lg:z-auto
        ${isConfigOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        <div className="flex items-center justify-between lg:hidden mb-2">
            <h3 className="text-slate-900 font-bold flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600" />
                策略配置
            </h3>
            <button onClick={() => setIsConfigOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
            </button>
        </div>

        <div>
            <h3 className="text-slate-900 font-bold mb-6 flex items-center gap-2 hidden lg:flex">
                <Sliders className="w-4 h-4 text-blue-600" />
                策略配置
            </h3>
            
            <div className="space-y-8">
                {/* Platform Selector */}
                <div className="space-y-3">
                    <label className="text-xs  font-bold text-slate-400 tracking-wider">目标发布平台</label>
                    <select 
                        value={selectedPlatform}
                        onChange={(e) => setSelectedPlatform(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                        <option value="Doubao">Doubao</option>
                        <option value="ChatGPT">ChatGPT</option>
                        <option value="Gemini">Gemini</option>
                        <option value="Xiaohongshu">小红书 (Red)</option>
                    </select>
                </div>

                {/* Optimization Loop Config */}
                 <div className="space-y-3">
                    <label className="text-xs  font-bold text-slate-400 tracking-wider flex items-center gap-2">
                        闭环自动优化 <Zap className="w-3 h-3 text-blue-500" />
                    </label>
                    <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-4 shadow-sm">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-600 font-medium">迭代次数</span>
                            <span className="font-mono text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded">{iterationCount} 次</span>
                        </div>
                        <input 
                            type="range" 
                            min="1" 
                            max="10" 
                            step="1"
                            value={iterationCount}
                            onChange={(e) => setIterationCount(parseInt(e.target.value))}
                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                        <p className="text-xs text-slate-500 leading-tight">
                           生成后系统将自动进行 {iterationCount} 轮 "生成-评测-修改" 循环，直到分数达标。
                        </p>
                    </div>
                </div>

                {/* Mandatory Constraints (Read-only) */}
                <div className="space-y-3">
                     <label className="text-xs  font-bold text-slate-400 tracking-wider">必须遵循标准</label>
                     <div className="space-y-3">
                         <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                            <div className="p-1.5 bg-white rounded-lg text-blue-600 shadow-sm border border-blue-100">
                                <ShieldCheck className="w-4 h-4" />
                            </div>
                            <div>
                                <div className="text-sm font-bold text-slate-700">E-E-A-T 权威增强</div>
                                <div className="text-xs text-slate-500">经验、专业、权威 (Expertise, Authoritativeness)</div>
                            </div>
                         </div>
                         <div className="flex items-center gap-3 p-3 bg-purple-50 border border-purple-100 rounded-xl">
                            <div className="p-1.5 bg-white rounded-lg text-purple-600 shadow-sm border border-purple-100">
                                <FileText className="w-4 h-4" />
                            </div>
                            <div>
                                <div className="text-sm font-bold text-slate-700">BLUF 结构化原则</div>
                                <div className="text-xs text-slate-500">结论先行 (Bottom Line Up Front)</div>
                            </div>
                         </div>
                     </div>
                     <p className="text-xs text-slate-400 text-center mt-2">
                        * 系统默认全局强制开启，不可关闭
                     </p>
                </div>

                <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-200 mt-4 shadow-sm">
                    <h4 className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                        <Repeat className="w-3 h-3 text-blue-500" /> 数据闭环
                    </h4>
                    <p className="text-xs text-slate-500">
                        正在实时同步 <b>模块三 (监测)</b> 的 {selectedPlatform} 历史表现数据用于辅助生成。
                    </p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AgentConsole;