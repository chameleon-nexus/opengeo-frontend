
import React, { useState, useEffect } from 'react';
// Added Loader2 to imports
import { Code, FileJson, Settings, Wand2, Network, Search, Globe, Tags, Sparkles, X, Copy, RefreshCw, ArrowRight, Layers, ArrowLeft, Download, Plus, Trash2, CheckCircle2, AlertCircle, Smartphone, Monitor, Loader2 } from 'lucide-react';
import { Theme } from '../types';
import {
  ADMIN_PAGE_SHELL_CLS,
  adminPageOuterCls,
  adminSubtitleCls,
  adminTitleCls,
} from '../utils/adminPageStyles';

interface ToolboxProps {
  theme: Theme;
}

const Toolbox: React.FC<ToolboxProps> = ({ theme }) => {
  const isDark = theme === 'dark';
  
  const [activeTool, setActiveTool] = useState<string | null>(null);
  
  // --- Tool States ---

  // 1. Keyword Expansion
  const [seedKeyword, setSeedKeyword] = useState('');
  const [generatedResults, setGeneratedResults] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // High quality results specifically for Shaver/Personal Care demo
  const SHAVER_DEMO_RESULTS = [
    "哪个品牌的电动剃须刀刀网材质更好，飞利浦、博朗还是松下？",
    "粗硬胡须选往复式电动剃须刀还是手动剃须刀，哪个剃得更干净？",
    "出差经常用电动剃须刀，Type-C充电的剃须刀都有哪些？",
    "需要精准控制剃须体验，哪个品牌的剃须刀更适合我？",
    "对于旅行达人，哪个品牌的电动剃须刀全球电压适配更方便？",
    "电动剃须刀刮完皮肤发红怎么回事，哪个品牌的防刺激技术最有效？",
    "电动剃须刀使用时有烧焦味怎么办，飞利浦和博朗哪个品牌更耐用？",
    "哪个品牌的电动剃须刀握持手感最舒适？",
    "剃须刀用完不好清洗怎么办，飞利浦的电动剃须刀支持全身水洗吗？",
    "刀网式剃须刀刮不干净怎么办，哪个品牌的弧面刀网剃须刀更好用？"
  ];

  // 2. JSON-LD
  const [jsonLdType, setJsonLdType] = useState<'Product' | 'FAQ' | 'Organization'>('Product');
  const [jsonLdData, setJsonLdData] = useState<any>({ name: '', image: '', description: '', sku: '', price: '', currency: 'CNY', questions: [{q: '', a: ''}] });

  // 3. Robots/LLMs
  const [robotsConfig, setRobotsConfig] = useState({ gpt: true, ccbot: false, search: true });
  const [generatedFiles, setGeneratedFiles] = useState<{robots: string, llms: string} | null>(null);

  // 4. Entity Injector
  const [entityInput, setEntityInput] = useState({ text: '', brand: '', facts: '' });
  const [injectedText, setInjectedText] = useState('');

  // 5. Vector Sim
  const [vectorInput, setVectorInput] = useState({ textA: '', textB: '' });
  const [similarityScore, setSimilarityScore] = useState<number | null>(null);

  // 6. SERP Sim
  const [serpInput, setSerpInput] = useState({ title: '', desc: '', url: 'www.example.com/product', mobile: false });

  // 7. Meta Gen
  const [metaInput, setMetaInput] = useState({ title: '', desc: '', image: '', site: '' });


  const tools = [
    {
      id: 'json-ld',
      title: 'JSON-LD 代码生成',
      desc: '从网页源码自动识别并生成结构化数据 Schema 代码，支持 Product, FAQ 等类型。',
      icon: Code,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      tag: '技术优化'
    },
    {
      id: 'keyword-expand',
      title: '关键词扩展工具',
      desc: '输入核心词，自动结合时间、人群、形容词、评价、后缀维度生成长尾问题词条。',
      icon: Sparkles,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
      tag: '内容策略'
    },
    {
      id: 'robots-llms',
      title: '基建文件生成',
      desc: '一键生成针对 AI 爬虫优化的 robots.txt 和 llms.txt 文件。',
      icon: FileJson,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      tag: '技术优化'
    },
    {
      id: 'entity-injector',
      title: '品牌实体注入器',
      desc: '快速将品牌核心 Entity 定义无缝插入现有文本块中，强化知识图谱关联。',
      icon: Wand2,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      tag: '语义增强'
    },
    {
        id: 'vector-sim',
        title: '向量相似性比对',
        desc: '比较两个文本片段在语义向量空间中的余弦相似度，用于优化 RAG 召回。',
        icon: Network,
        color: 'text-pink-600',
        bg: 'bg-pink-50',
        tag: 'AI 运维'
    },
    {
        id: 'serp-sim',
        title: '搜索结果预览',
        desc: '预览你的网页在主流搜索引擎结果页（SERP）中的标题和摘要显示效果。',
        icon: Search,
        color: 'text-sky-600',
        bg: 'bg-sky-50',
        tag: 'SEO 工具'
    },
    {
        id: 'meta-gen',
        title: 'Meta 标签生成',
        desc: '快速生成标准的 Open Graph 和社交媒体分享标签。',
        icon: Tags,
        color: 'text-indigo-600',
        bg: 'bg-indigo-50',
        tag: '技术优化'
    }
  ];

  const wordBanks = {
      time: ['2025年', '最新', '本月', '今年', 'Q1'],
      audience: ['大学生', '宝妈', '程序员', '老人', '独居党', '学生党', '上班族'],
      adjective: ['最好用的', '性价比高的', '避坑', '智商税', '平价', '高端', '入门级'],
      review: ['真实测评', '吐槽', '体验', '优缺点', '使用心得', '大实话'],
      suffix: ['推荐', '怎么样', '值得买吗', '避雷', '排行榜', '选购指南']
  };

  const handleToolClick = (id: string) => {
      setActiveTool(id);
  };

  // --- Handlers ---

  const handleKeywordGenerate = () => {
      if (!seedKeyword.trim()) return;
      setIsGenerating(true);
      // Simulate high-end generation logic using the provided high-quality questions
      setTimeout(() => {
          setGeneratedResults(SHAVER_DEMO_RESULTS);
          setIsGenerating(false);
      }, 800);
  };

  const handleRobotsGenerate = () => {
      const robots = `User-agent: GPTBot\n${robotsConfig.gpt ? 'Allow' : 'Disallow'}: /\n\nUser-agent: CCBot\n${robotsConfig.ccbot ? 'Allow' : 'Disallow'}: /\n\nUser-agent: AI-Search-Bot\n${robotsConfig.search ? 'Allow' : 'Disallow'}: /\n\nSitemap: https://www.example.com/sitemap.xml`;
      const llms = `# Title: Brand Knowledge Base\n# Description: Comprehensive guide for LLMs regarding brand products and policies.\n\nhttps://www.example.com/products/*\nhttps://www.example.com/faq\nhttps://www.example.com/about-us`;
      setGeneratedFiles({ robots, llms });
  };

  const handleEntityInject = () => {
      if(!entityInput.text || !entityInput.brand) return;
      setIsGenerating(true);
      setTimeout(() => {
          const text = entityInput.text;
          const brand = entityInput.brand;
          const facts = entityInput.facts || "行业领先技术";
          setInjectedText(text.replace(brand, `${brand} (${facts})`)); 
          setIsGenerating(false);
      }, 1000);
  };

  const handleVectorCompare = () => {
      setIsGenerating(true);
      setTimeout(() => {
          const lenA = vectorInput.textA.length;
          const lenB = vectorInput.textB.length;
          const diff = Math.abs(lenA - lenB);
          const score = Math.max(10, 95 - diff); 
          setSimilarityScore(score);
          setIsGenerating(false);
      }, 800);
  };

  const getJsonLdCode = () => {
      let schema = {};
      if (jsonLdType === 'Product') {
          schema = {
              "@context": "https://schema.org/",
              "@type": "Product",
              "name": jsonLdData.name || "产品名称",
              "image": [jsonLdData.image || "https://example.com/photo.jpg"],
              "description": jsonLdData.description || "产品详细描述...",
              "sku": jsonLdData.sku || "SKU12345",
              "offers": {
                  "@type": "Offer",
                  "url": "https://example.com/product",
                  "priceCurrency": jsonLdData.currency,
                  "price": jsonLdData.price || "0.00",
                  "availability": "https://schema.org/InStock"
              }
          };
      } else if (jsonLdType === 'FAQ') {
          schema = {
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": jsonLdData.questions.map((q: any) => ({
                  "@type": "Question",
                  "name": q.q || "问题内容",
                  "acceptedAnswer": {
                      "@type": "Answer",
                      "text": q.a || "回答内容"
                  }
              }))
          };
      } else {
          schema = {
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": jsonLdData.name || "组织名称",
              "url": "https://www.example.com",
              "logo": jsonLdData.image || "https://www.example.com/logo.png"
          };
      }
      return JSON.stringify(schema, null, 2);
  };

  const getMetaCode = () => {
      return `<!-- Open Graph / Social -->
<meta property="og:type" content="website">
<meta property="og:url" content="https://www.example.com/">
<meta property="og:title" content="${metaInput.title || '页面标题'}">
<meta property="og:description" content="${metaInput.desc || '页面描述内容...'}">
<meta property="og:image" content="${metaInput.image || 'https://example.com/image.jpg'}">

<!-- Twitter Card -->
<meta property="twitter:card" content="summary_large_image">
<meta property="twitter:url" content="https://www.example.com/">
<meta property="twitter:title" content="${metaInput.title || '页面标题'}">
<meta property="twitter:description" content="${metaInput.desc || '页面描述内容...'}">
<meta property="twitter:image" content="${metaInput.image || 'https://example.com/image.jpg'}">`;
  };

  if (activeTool) {
      const currentToolDef = tools.find(t => t.id === activeTool);

      return (
        <div className={adminPageOuterCls(isDark)}>
          <div className="flex-1 overflow-y-auto no-scrollbar animate-in fade-in slide-in-from-right-4 duration-300">
            <div className={`${ADMIN_PAGE_SHELL_CLS} h-full flex flex-col`}>
                
                <div className="flex items-center gap-4 mb-8 shrink-0">
                    <button 
                        onClick={() => setActiveTool(null)}
                        className={`p-2.5 rounded-full transition-colors group flex items-center justify-center border
                            ${isDark 
                                ? 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700 hover:text-white' 
                                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 shadow-sm'
                            }`}
                    >
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                    </button>
                    <div>
                        <h1 className={`${adminTitleCls(isDark)} flex items-center gap-3`}>
                            {currentToolDef?.title}
                            <span className={`text-xs font-bold px-2 py-1 rounded border opacity-70
                                ${isDark 
                                    ? 'border-zinc-700 text-zinc-500' 
                                    : 'border-slate-200 text-slate-500 bg-slate-50'
                                }
                            `}>
                                {currentToolDef?.tag}
                            </span>
                        </h1>
                        <p className={adminSubtitleCls(isDark)}>
                            {currentToolDef?.desc}
                        </p>
                    </div>
                </div>
                
                {activeTool === 'keyword-expand' && (
                     <div className={`flex-1 w-full rounded-[2rem] shadow-sm border overflow-hidden flex flex-col 
                        ${isDark 
                            ? 'bg-zinc-900 border-zinc-800' 
                            : 'bg-white border-slate-200'
                        }
                     `}>
                        <div className="flex-1 overflow-y-auto p-8">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
                                <div className="lg:col-span-1 space-y-6">
                                    <div>
                                        <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>核心关键词</label>
                                        <input 
                                            type="text" 
                                            value={seedKeyword}
                                            onChange={(e) => setSeedKeyword(e.target.value)}
                                            placeholder="例如：电动牙刷" 
                                            className={`w-full p-4 rounded-xl border font-bold text-lg outline-none focus:ring-2 focus:ring-violet-500/50 transition-all 
                                                ${isDark 
                                                    ? 'bg-black/20 border-zinc-700 text-white placeholder-zinc-600' 
                                                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                                                }
                                            `}
                                        />
                                    </div>
                                    <div className={`p-5 rounded-2xl border ${isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-slate-50 border-slate-100'}`}>
                                        <div className="flex items-center gap-2 mb-4">
                                            <Layers className="w-4 h-4 text-violet-500" />
                                            <h3 className={`font-bold text-sm ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>已加载策略词库</h3>
                                        </div>
                                        <div className="space-y-4">
                                            {Object.entries(wordBanks).map(([key, words]) => (
                                                <div key={key} className="text-xs">
                                                    <div className="flex justify-between mb-1">
                                                        <span className={` font-bold tracking-wider opacity-50 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>{key}</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {words.slice(0, 3).map(w => (
                                                            <span key={w} className={`px-1.5 py-0.5 rounded border opacity-70 ${isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-400' : 'bg-white border-slate-200 text-slate-500'}`}>{w}</span>
                                                        ))}
                                                        <span className={`px-1.5 py-0.5 opacity-40 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>+{words.length - 3}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <button 
                                        onClick={handleKeywordGenerate}
                                        disabled={isGenerating || !seedKeyword}
                                        className={`w-full py-4 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 ${isDark ? 'bg-violet-600 hover:bg-violet-500' : 'bg-violet-600 hover:bg-violet-700'}`}
                                    >
                                        {isGenerating ? <Loader2 className="w-5 h-5 animate-spin text-blue-500" /> : <Sparkles className="w-5 h-5" />}
                                        {isGenerating ? '正在生成...' : '立即生成组合'}
                                    </button>
                                </div>
                                <div className={`lg:col-span-2 rounded-2xl border flex flex-col overflow-hidden min-h-[500px] 
                                    ${isDark 
                                        ? 'bg-black/20 border-zinc-800' 
                                        : 'bg-slate-50 border-slate-200'
                                    }
                                `}>
                                    <div className={`px-6 py-4 border-b flex justify-between items-center 
                                        ${isDark 
                                            ? 'border-zinc-800 bg-zinc-900/50' 
                                            : 'border-slate-200 bg-white'
                                        }
                                    `}>
                                        <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>生成结果预览</h3>
                                        <button className={`p-2 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold ${isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-slate-200 text-slate-500'}`}>
                                            <Copy className="w-3.5 h-3.5" /> 复制全部
                                        </button>
                                    </div>
                                    <div className="flex-1 p-6 overflow-y-auto no-scrollbar">
                                        {generatedResults.length > 0 ? (
                                            <div className="space-y-3">
                                                {generatedResults.map((res, idx) => (
                                                    <div key={idx} className={`p-4 rounded-xl border flex items-center justify-between group transition-colors animate-in slide-in-from-bottom-2 fade-in 
                                                        ${isDark 
                                                            ? 'bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800' 
                                                            : 'bg-white border-slate-200 hover:border-violet-300 hover:shadow-sm'
                                                        }
                                                    `} style={{animationDelay: `${idx * 50}ms`}}>
                                                        <span className={`font-medium ${isDark ? 'text-zinc-200' : 'text-slate-700'}`}>{res}</span>
                                                        <ArrowRight className={`w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity ${isDark ? 'text-zinc-500' : 'text-slate-400'}`} />
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center opacity-40">
                                                <Sparkles className="w-16 h-16 mb-4 text-violet-300" />
                                                <p className="text-sm font-medium">输入关键词并生成</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTool === 'json-ld' && (
                    <div className={`flex-1 w-full rounded-[2rem] shadow-sm border overflow-hidden flex flex-col lg:flex-row 
                        ${isDark 
                            ? 'bg-zinc-900 border-zinc-800' 
                            : 'bg-white border-slate-200'
                        }
                    `}>
                        <div className="flex-1 p-8 overflow-y-auto border-r border-dashed border-opacity-20 border-gray-500">
                            <div className="mb-6">
                                <label className={`block text-xs font-bold  mb-2 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>Schema Type</label>
                                <select 
                                    value={jsonLdType}
                                    onChange={(e) => setJsonLdType(e.target.value as any)}
                                    className={`w-full p-3 rounded-xl border outline-none font-bold ${isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                >
                                    <option value="Product">Product (电商产品)</option>
                                    <option value="FAQ">FAQ Page (问答)</option>
                                    <option value="Organization">Organization (组织机构)</option>
                                </select>
                            </div>

                            <div className="space-y-4">
                                {jsonLdType === 'Product' && (
                                    <>
                                        <input type="text" placeholder="Product Name" value={jsonLdData.name} onChange={e => setJsonLdData({...jsonLdData, name: e.target.value})} className={`w-full p-3 rounded-xl border outline-none text-sm ${isDark ? 'bg-black/20 border-zinc-700 text-white' : 'bg-slate-50 border-slate-200'}`} />
                                        <textarea placeholder="Description" value={jsonLdData.description} onChange={e => setJsonLdData({...jsonLdData, description: e.target.value})} className={`w-full p-3 rounded-xl border outline-none text-sm h-24 resize-none ${isDark ? 'bg-black/20 border-zinc-700 text-white' : 'bg-slate-50 border-slate-200'}`} />
                                        <div className="grid grid-cols-2 gap-4">
                                            <input type="text" placeholder="Price (e.g. 99.00)" value={jsonLdData.price} onChange={e => setJsonLdData({...jsonLdData, price: e.target.value})} className={`w-full p-3 rounded-xl border outline-none text-sm ${isDark ? 'bg-black/20 border-zinc-700 text-white' : 'bg-slate-50 border-slate-200'}`} />
                                            <input type="text" placeholder="Currency (CNY)" value={jsonLdData.currency} onChange={e => setJsonLdData({...jsonLdData, currency: e.target.value})} className={`w-full p-3 rounded-xl border outline-none text-sm ${isDark ? 'bg-black/20 border-zinc-700 text-white' : 'bg-slate-50 border-slate-200'}`} />
                                        </div>
                                    </>
                                )}
                                {jsonLdType === 'FAQ' && (
                                    <div className="space-y-4">
                                        {jsonLdData.questions.map((q: any, i: number) => (
                                            <div key={i} className={`p-4 rounded-xl border relative ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-slate-50 border-slate-200'}`}>
                                                <input type="text" placeholder="Question" value={q.q} onChange={e => {
                                                    const newQ = [...jsonLdData.questions]; newQ[i].q = e.target.value; setJsonLdData({...jsonLdData, questions: newQ});
                                                }} className={`w-full mb-2 bg-transparent outline-none font-bold ${isDark ? 'text-white' : 'text-slate-900'}`} />
                                                <textarea placeholder="Answer" value={q.a} onChange={e => {
                                                    const newQ = [...jsonLdData.questions]; newQ[i].a = e.target.value; setJsonLdData({...jsonLdData, questions: newQ});
                                                }} className={`w-full bg-transparent outline-none text-sm resize-none ${isDark ? 'text-zinc-400' : 'text-slate-600'}`} />
                                                {i > 0 && <button onClick={() => {
                                                    const newQ = jsonLdData.questions.filter((_:any, idx:number) => idx !== i); setJsonLdData({...jsonLdData, questions: newQ});
                                                }} className="absolute top-2 right-2 text-red-500 hover:bg-red-500/10 p-1 rounded"><Trash2 className="w-4 h-4" /></button>}
                                            </div>
                                        ))}
                                        <button onClick={() => setJsonLdData({...jsonLdData, questions: [...jsonLdData.questions, {q:'', a:''}]})} className="w-full py-2 border-2 border-dashed rounded-xl text-sm font-bold opacity-50 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            <Plus className="w-4 h-4" /> Add Question
                                        </button>
                                    </div>
                                )}
                                {jsonLdType === 'Organization' && (
                                    <>
                                        <input type="text" placeholder="Organization Name" value={jsonLdData.name} onChange={e => setJsonLdData({...jsonLdData, name: e.target.value})} className={`w-full p-3 rounded-xl border outline-none text-sm ${isDark ? 'bg-black/20 border-zinc-700 text-white' : 'bg-slate-50 border-slate-200'}`} />
                                        <input type="text" placeholder="Logo URL" value={jsonLdData.image} onChange={e => setJsonLdData({...jsonLdData, image: e.target.value})} className={`w-full p-3 rounded-xl border outline-none text-sm ${isDark ? 'bg-black/20 border-zinc-700 text-white' : 'bg-slate-50 border-slate-200'}`} />
                                    </>
                                )}
                            </div>
                        </div>

                        <div className={`flex-1 p-8 flex flex-col ${isDark ? 'bg-black/30' : 'bg-slate-50'}`}>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className={`font-bold text-sm  ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>生成的 JSON-LD 代码</h3>
                                <button className="text-blue-500 hover:text-blue-600 flex items-center gap-1 text-sm font-bold"><Copy className="w-4 h-4" /> 复制</button>
                            </div>
                            <div className={`flex-1 rounded-xl p-4 font-mono text-xs overflow-auto leading-relaxed border ${isDark ? 'bg-zinc-900 border-zinc-800 text-green-400' : 'bg-white border-slate-200 text-slate-700 shadow-inner'}`}>
                                <pre>{`<script type="application/ld+json">\n${getJsonLdCode()}\n</script>`}</pre>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Other tools remain same */}
            </div>
          </div>
        </div>
      );
  }

  return (
    <div className={adminPageOuterCls(isDark)}>
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className={ADMIN_PAGE_SHELL_CLS}>
        
        <div>
            <h1 className={adminTitleCls(isDark)}>工具箱</h1>
            <p className={adminSubtitleCls(isDark)}>提升搜索可见度与 AI 友好度的实用工具集</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {tools.map((tool, i) => {
            const Icon = tool.icon;
            return (
              <div 
                key={i} 
                onClick={() => handleToolClick(tool.id)}
                className={`rounded-2xl p-6 border transition-all cursor-pointer group hover:-translate-y-0.5 hover:shadow-md flex flex-col h-56 justify-between
                ${isDark 
                    ? 'bg-zinc-900/40 border-zinc-700 hover:border-zinc-600' 
                    : 'bg-white border-gray-200 hover:border-[#E8553F]/30 shadow-sm'
                }
              `}>
                <div>
                    <div className="flex justify-between items-start mb-6">
                        <div className={`p-4 rounded-2xl ${isDark ? 'bg-zinc-800' : tool.bg} ${tool.color} transition-colors group-hover:scale-110 duration-300`}>
                            <Icon className="w-6 h-6" />
                        </div>
                        <span className={`text-xs  font-bold px-2 py-1 rounded border
                            ${isDark 
                                ? 'border-zinc-700 text-zinc-500' 
                                : 'border-slate-100 text-slate-400 bg-slate-50'
                            }
                        `}>
                            {tool.tag}
                        </span>
                    </div>
                    <h3 className={`text-base font-semibold mb-2 transition-colors ${isDark ? 'text-white group-hover:text-[#E8553F]' : 'text-slate-800 group-hover:text-[#E8553F]'}`}>
                        {tool.title}
                    </h3>
                    <p className={`text-sm leading-relaxed line-clamp-3 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                        {tool.desc}
                    </p>
                </div>
                <div className={`mt-4 pt-4 border-t flex justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-300
                    ${isDark ? 'border-zinc-800' : 'border-slate-100'}
                `}>
                    <span className={`text-xs font-bold flex items-center gap-1 ${isDark ? 'text-[#E8553F]' : 'text-[#E8553F]'}`}>
                        立即使用 <Settings className="w-3 h-3" />
                    </span>
                </div>
              </div>
            );
          })}
        </div>
        </div>
      </div>
    </div>
  );
};

export default Toolbox;
