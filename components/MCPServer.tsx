import React from 'react';
import { Terminal, CheckCircle2, Monitor, Code2 } from 'lucide-react';

const MCPServer: React.FC = () => {
  return (
    <div className="flex-1 bg-slate-50 p-8 overflow-hidden flex flex-col font-mono">
      <div className="max-w-6xl mx-auto w-full h-full flex flex-col">
        <header className="flex justify-between items-center mb-6 border-b border-slate-200 pb-4">
            <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-slate-700" /> MCP 服务器实例
                </h2>
                <p className="text-slate-500 text-xs mt-1">协议: Model Context Protocol v1.2</p>
            </div>
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded text-xs text-slate-600 shadow-sm">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    监听端口 3000
                </div>
            </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="bg-white border border-slate-200 p-4 rounded-xl flex items-center gap-4 shadow-sm">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                    <Code2 className="w-6 h-6" />
                </div>
                <div>
                    <div className="text-slate-800 font-bold">VS Code / Cursor</div>
                    <div className="text-xs text-green-600 flex items-center gap-1 font-medium">
                        <CheckCircle2 className="w-3 h-3" /> 已连接
                    </div>
                </div>
            </div>
            <div className="bg-white border border-slate-200 p-4 rounded-xl flex items-center gap-4 shadow-sm">
                <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                    <Monitor className="w-6 h-6" />
                </div>
                <div>
                    <div className="text-slate-800 font-bold">Adobe Premiere</div>
                    <div className="text-xs text-slate-400 italic">等待握手...</div>
                </div>
            </div>
        </div>

        {/* The terminal window itself remains dark for contrast and realism */}
        <div className="flex-1 bg-slate-900 rounded-xl border border-slate-800 p-6 overflow-y-auto text-xs space-y-3 shadow-xl">
            <div className="text-slate-500 border-b border-slate-800 pb-2 mb-2 font-bold  text-xs">系统日志</div>
            <p className="text-slate-400 font-mono"><span className="text-blue-400">[14:02:22]</span> MCP Server started.</p>
            <p className="text-slate-400 font-mono"><span className="text-blue-400">[14:02:23]</span> Loaded Tool: <span className="text-yellow-400">json_ld_generator</span></p>
            <p className="text-slate-400 font-mono"><span className="text-blue-400">[14:02:23]</span> Loaded Tool: <span className="text-yellow-400">brand_knowledge_query</span></p>
            <p className="text-slate-400 font-mono"><span className="text-blue-400">[14:05:10]</span> Client connected: VS Code Extension (ID: geoos-vscode)</p>
            <p className="text-slate-400 font-mono"><span className="text-blue-400">[14:05:12]</span> <span className="text-purple-400">INCOMING REQUEST</span> {'->'} query_knowledge_base(query=&quot;side effects&quot;)</p>
            <p className="text-slate-400 font-mono"><span className="text-blue-400">[14:05:13]</span> <span className="text-green-400">RESPONSE SENT</span> {'->'} 200 OK (Payload: 24kb)</p>
            <p className="text-slate-400 font-mono"><span className="text-blue-400">[14:10:00]</span> Heartbeat check...</p>
            <div className="h-4 w-2 bg-slate-500 animate-pulse mt-2"></div>
        </div>
      </div>
    </div>
  );
};

export default MCPServer;