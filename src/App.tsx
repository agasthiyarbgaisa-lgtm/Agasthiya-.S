import React, { useState, useMemo, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  Star,
  Package,
  Sparkles,
  Layers,
  Filter,
  Search,
  ChevronDown,
  RefreshCw,
  TrendingDown,
  Megaphone,
  BookOpen,
  PieChart as PieChartIcon,
  HelpCircle,
  FileText,
  MessageSquare,
  ChevronRight,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  X,
  Plus,
  Loader2
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis
} from 'recharts';
import { mockProducts } from './data/mockProducts';
import { Product, KPIStats, CategorySummary, ChatMessage, ExecutiveReport } from './types';
import { MetricCard } from './components/MetricCard';
import { ProductSidebar } from './components/ProductSidebar';
import { AnalystChat } from './components/AnalystChat';

// Global styling constants
const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6'];

export default function App() {
  // Tabs: 'dashboard' | 'categories' | 'correlation' | 'underperforming' | 'report'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'categories' | 'correlation' | 'underperforming' | 'report'>('dashboard');
  
  // Explorer filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [stockFilter, setStockFilter] = useState<string>('All');
  const [sortField, setSortField] = useState<'unitsSold' | 'revenue' | 'rating' | 'price' | 'stock'>('unitsSold');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Interactive selected product state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [aiSidebarLoading, setAiSidebarLoading] = useState(false);

  // Chatbot states
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hello! I'm your server-side AI E-Commerce Analyst. I've analyzed your 100-product dataset.\n\nI can help you:\n1. Find top-selling products and categories.\n2. Diagnose ratings and stockout risks.\n3. Recommend targeted promotional bundles and pricing strategies.\n\nAsk me anything, or select a product in the catalog to generate customized strategic recommendations!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [isChatOpen, setIsChatOpen] = useState(true);

  // Report Generator states
  const [reportFocus, setReportFocus] = useState('General Q2 Strategy & Performance');
  const [reportLoading, setReportLoading] = useState(false);
  const [reportData, setReportData] = useState<ExecutiveReport | null>(null);

  // --- Calculations and Aggregations ---
  
  // 1. KPI Stats
  const stats = useMemo<KPIStats>(() => {
    const totalRevenue = mockProducts.reduce((sum, p) => sum + p.revenue, 0);
    const totalUnitsSold = mockProducts.reduce((sum, p) => sum + p.unitsSold, 0);
    const averageRating = mockProducts.reduce((sum, p) => sum + p.rating, 0) / mockProducts.length;
    
    // Underperforming: rating < 3.8 or unitsSold < 200 (excluding very high items)
    const underperformingCount = mockProducts.filter(p => p.rating < 3.8 || (p.unitsSold < 200 && p.price < 150)).length;
    
    // Promo candidates: rating >= 4.6 and unitsSold is moderate (between 500 and 2000)
    const promotionCandidatesCount = mockProducts.filter(p => p.rating >= 4.6 && p.unitsSold > 500 && p.unitsSold < 2000).length;

    return {
      totalRevenue,
      totalUnitsSold,
      averageRating,
      underperformingCount,
      promotionCandidatesCount,
      totalProducts: mockProducts.length
    };
  }, []);

  // 2. Category Aggregation
  const categorySummaries = useMemo<CategorySummary[]>(() => {
    const summaryMap: Record<string, { revenue: number; unitsSold: number; ratingSum: number; count: number }> = {};
    
    mockProducts.forEach(p => {
      if (!summaryMap[p.category]) {
        summaryMap[p.category] = { revenue: 0, unitsSold: 0, ratingSum: 0, count: 0 };
      }
      summaryMap[p.category].revenue += p.revenue;
      summaryMap[p.category].unitsSold += p.unitsSold;
      summaryMap[p.category].ratingSum += p.rating;
      summaryMap[p.category].count += 1;
    });

    return Object.entries(summaryMap).map(([category, s]) => ({
      category,
      revenue: Number(s.revenue.toFixed(2)),
      unitsSold: s.unitsSold,
      averageRating: Number((s.ratingSum / s.count).toFixed(2)),
      productCount: s.count
    }));
  }, []);

  // List of unique categories for filters
  const categoriesList = useMemo(() => {
    return ['All', ...categorySummaries.map(c => c.category)];
  }, [categorySummaries]);

  // 3. Top Selling Products (Sorted by Units Sold)
  const topSellersList = useMemo(() => {
    return [...mockProducts]
      .sort((a, b) => b.unitsSold - a.unitsSold)
      .slice(0, 10);
  }, []);

  // 4. Underperforming Products Filtered List
  const underperformingList = useMemo(() => {
    return mockProducts
      .filter(p => p.rating < 3.8 || (p.unitsSold < 200 && p.price < 150))
      .sort((a, b) => a.rating - b.rating);
  }, []);

  // 5. Promo Candidates Filtered List
  const promoCandidatesList = useMemo(() => {
    return mockProducts
      .filter(p => p.rating >= 4.6 && p.unitsSold > 500 && p.unitsSold < 2000)
      .sort((a, b) => b.rating - a.rating);
  }, []);

  // 6. Filtered and Sorted catalog for exploration
  const filteredProducts = useMemo(() => {
    return mockProducts
      .filter(p => {
        // Name or SKU search
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              p.sku.toLowerCase().includes(searchQuery.toLowerCase());
        
        // Category filter
        const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
        
        // Stock status filter
        let matchesStock = true;
        if (stockFilter === 'Low') matchesStock = p.stock > 0 && p.stock < 50;
        else if (stockFilter === 'Out') matchesStock = p.stock === 0;
        else if (stockFilter === 'Overstock') matchesStock = p.stock > 150 && p.unitsSold < 500;
        else if (stockFilter === 'Healthy') matchesStock = p.stock >= 50;

        return matchesSearch && matchesCategory && matchesStock;
      })
      .sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];
        
        if (typeof valA === 'string') {
          valA = (valA as string).toLowerCase();
          valB = (valB as string).toLowerCase();
        }

        if (sortOrder === 'asc') {
          return valA > valB ? 1 : -1;
        } else {
          return valA < valB ? 1 : -1;
        }
      });
  }, [searchQuery, selectedCategory, stockFilter, sortField, sortOrder]);

  // Handle API chat calls
  const handleSendMessage = async (text: string): Promise<string> => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...chatMessages, { role: 'user', content: text }],
          selectedProductSku: selectedProduct?.sku || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze message');
      }

      const data = await response.json();
      return data.reply;
    } catch (err: any) {
      console.error("Error sending message to chatbot API:", err);
      throw err;
    }
  };

  // One-click action hub prompt handler
  const handleAskAIAboutProduct = async (product: Product, promptType: 'promo' | 'audit' | 'bundle') => {
    let customPrompt = '';
    if (promptType === 'promo') {
      customPrompt = `Analyze Product "${product.name}" (SKU: ${product.sku}). It is priced at $${product.price} with a rating of ${product.rating} and has sold ${product.unitsSold} units. Provide a highly detailed 3-step promotion campaign copy and discounting plan to boost sales velocity.`;
    } else if (promptType === 'audit') {
      customPrompt = `Perform a high-precision pricing and margin audit for Product "${product.name}" (SKU: ${product.sku}). It has ${product.stock} units in stock and has sold ${product.unitsSold} units in total. Suggest if we should adjust price to optimize gross profit.`;
    } else if (promptType === 'bundle') {
      customPrompt = `What are the best product pairing recommendations or cross-sell bundles for "${product.name}"? Recommend 2 other specific products from our 100-product database that would bundle nicely with this item, and explain why.`;
    }

    setAiSidebarLoading(true);
    setIsChatOpen(true);
    
    // Clear other suggestions by adding user prompt to chat
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: customPrompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages(prev => [...prev, userMsg]);

    try {
      const reply = await handleSendMessage(customPrompt);
      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now()}-bot`,
        role: 'assistant',
        content: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now()}-err`,
        role: 'assistant',
        content: `❌ Error compiling product strategy: ${err.message || 'Verification of GEMINI_API_KEY required.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages(prev => [...prev, errorMsg]);
    } finally {
      setAiSidebarLoading(false);
    }
  };

  // Generate or regenerate the executive report
  const handleGenerateReport = async (focus: string = reportFocus) => {
    setReportLoading(true);
    try {
      const response = await fetch('/api/generate-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ focusArea: focus }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate customized executive report');
      }

      const data = await response.json();
      setReportData(data);
    } catch (err) {
      console.error(err);
      // Fallback statically if server fails
      setReportData({
        title: "E-Commerce Performance & Product Catalog Report",
        generatedAt: new Date().toISOString().split('T')[0],
        focusArea: focus,
        summary: "This report provides a detailed breakdown of the 100-product catalog, detailing high-growth categories, top sellers, low-moving inventory, and target promotional candidate packages.",
        tasks: {
          topSellers: "Electronics leads unit sales and revenue. Our top-selling item is SpeedCast HDMI 2.1 Cable (5,100 units, $76.4k revenue) followed by HydroFlow Water Bottle (4,890 units, $136.8k revenue). In terms of revenue, BrewMaster Pro Espresso Machine has generated $281,990.60 from just 940 units, highlighting high premium price elastic capability.",
          categoriesRevenue: "Electronics dominates catalog revenue at $923,431.10 (37.5%), followed by Home & Kitchen at $658,111.40. Beauty & Personal Care has high volume but lower average pricing, yielding $559k. Apparel & Fashion represents $441k, while Books & Stationery generates $212k.",
          ratingsVsSales: "A scatterplot correlation check shows that high product ratings (4.5 to 4.9) are associated with larger transaction volumes (1,500+ units sold) for items priced under $50. However, premium items (over $150) maintain low unit volumes regardless of perfect 4.8+ ratings, representing a classic premium pricing inelasticity.",
          underperforming: "Underperforming products include the SilkSmooth Electric Epilator (Rating: 2.8, Units Sold: 140), FormFormal Silk Necktie (Rating: 3.1, Units Sold: 280), and EconoBuds Wireless Earphones (Rating: 3.4, Units Sold: 3900 - high volume but severe customer satisfaction issues). Additionally, SwiftScan Document Scanner has stagnant inventory with only 180 units sold at $159.99.",
          promotions: "We recommend a dynamic promotional bundling strategy: Pair AuraGlow Vitamin C Serum (6,500 units) with DermPure Sunscreen (7,100 units) at a 15% discount to capture high-density cross-selling. Offer a 20% discount on slow-moving TitanShield external SSDs for tech consumers purchasing keyboards.",
          kpiSuggestions: "1. Gross Margin Return on Investment (GMROI): Prioritize Apparel & Fashion to evaluate carrying costs.\n2. Inventory Turnover Ratio: Focus on Books & Stationery (high volume, low footprint).\n3. Customer Retention Rate (CRR): Monitor Beauty products to capitalize on high repurchase loops."
        }
      });
    } finally {
      setReportLoading(false);
    }
  };

  // Load initial report on start
  useEffect(() => {
    handleGenerateReport();
  }, []);

  const handleClearChat = () => {
    setChatMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: "I've reset our conversation context. Ask me anything about the catalog or selected products!",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
    ]);
  };

  // Double check sorting column clicks
  const requestSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-violet-100 selection:text-violet-800">
      {/* Top Banner Header */}
      <header className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shadow-sm shrink-0">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-tr from-violet-600 to-indigo-500 p-2 rounded-xl shadow-md">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight">E-Commerce Data Analyst</h1>
            <p className="text-[10px] text-slate-400 font-mono">WORKSPACE ID: e1d10d7d-5955-4bbc-a777</p>
          </div>
        </div>
        
        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center space-x-1.5">
          {[
            { id: 'dashboard', label: 'Dashboard Overview', icon: Layers },
            { id: 'categories', label: 'Category & Revenue', icon: PieChartIcon },
            { id: 'correlation', label: 'Ratings vs Sales', icon: Star },
            { id: 'underperforming', label: 'Inventory Risk', icon: AlertTriangle },
            { id: 'report', label: 'Executive Report', icon: FileText },
          ].map((tab) => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <TabIcon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* AI Chat Drawer Toggle */}
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
            isChatOpen
              ? 'bg-violet-50 text-violet-700 border-violet-200'
              : 'border-slate-700 hover:border-slate-500 text-slate-300'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>{isChatOpen ? 'Hide AI Analyst' : 'Show AI Analyst'}</span>
        </button>
      </header>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        
        {/* Left/Middle Column: Interactive Dashboard Panels */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Mobile navigation picker */}
          <div className="md:hidden flex items-center justify-between bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
            <span className="text-xs font-bold text-slate-500 uppercase">View Panel</span>
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 text-xs font-semibold px-2 py-1 rounded-md text-slate-700"
            >
              <option value="dashboard">Dashboard Overview</option>
              <option value="categories">Category & Revenue</option>
              <option value="correlation">Ratings vs Sales</option>
              <option value="underperforming">Inventory Risk</option>
              <option value="report">Executive Report</option>
            </select>
          </div>

          {/* KPI Dashboard Blocks (Always visible except report) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              id="kpi-rev"
              title="Quarterly Catalog Revenue"
              value={`$${stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              icon={DollarSign}
              change="+14.2%"
              isPositive={true}
              color="text-indigo-600"
              bgColor="bg-indigo-50"
              description="Sum total of price * units sold across 100 items."
            />
            <MetricCard
              id="kpi-units"
              title="Transaction Volume (Units)"
              value={stats.totalUnitsSold.toLocaleString()}
              icon={Package}
              change="+8.9%"
              isPositive={true}
              color="text-emerald-600"
              bgColor="bg-emerald-50"
              description="Aggregate sales volume of current inventory."
            />
            <MetricCard
              id="kpi-rating"
              title="Average Product Rating"
              value={`${stats.averageRating.toFixed(2)} / 5.0`}
              icon={Star}
              change="+0.12"
              isPositive={true}
              color="text-amber-600"
              bgColor="bg-amber-50"
              description="Unweighted catalog satisfaction rating index."
            />
            <MetricCard
              id="kpi-risk"
              title="High Inventory Risk SKU Count"
              value={stats.underperformingCount}
              icon={AlertTriangle}
              change="-3 SKUs"
              isPositive={true} // positive because decrease in risk is good!
              color="text-rose-600"
              bgColor="bg-rose-50"
              description="SKUs flagged with low ratings (<3.8) or low sales."
            />
          </div>

          {/* Active Tab Views */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden min-h-[420px] flex flex-col">
            
            {/* Tab: Dashboard Overview */}
            {activeTab === 'dashboard' && (
              <div className="p-6 space-y-6 flex-1 flex flex-col">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">Identify Top-Selling Products</h2>
                    <p className="text-xs text-slate-400">Review units sold and revenue across the best-performing items.</p>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-slate-500 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-violet-600"></span>
                    <span>Units Sold Metrics</span>
                  </div>
                </div>

                {/* Top Sellers Chart */}
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topSellersList}
                      margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: '#64748b', fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        angle={-20}
                        textAnchor="end"
                        interval={0}
                        height={60}
                      />
                      <YAxis
                        tick={{ fill: '#64748b', fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        label={{ value: 'Units Sold', angle: -90, position: 'insideLeft', style: { fill: '#64748b', fontSize: 11, fontWeight: 500 } }}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', border: 'none' }}
                        itemStyle={{ color: '#f8fafc', fontSize: '11px' }}
                        labelStyle={{ color: '#94a3b8', fontSize: '11px', fontWeight: 'bold' }}
                        formatter={(value) => [`${Number(value).toLocaleString()} Units`, 'Units Sold']}
                      />
                      <Bar dataKey="unitsSold" radius={[4, 4, 0, 0]} name="Units Sold">
                        {topSellersList.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#6366f1' : '#818cf8'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Quick insights from calculations */}
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-700 flex items-center">
                      <TrendingUp className="w-4 h-4 text-emerald-500 mr-1.5" />
                      Top Sales Volume Leader
                    </h4>
                    <p>
                      <span className="font-semibold text-slate-800">SpeedCast HDMI 2.1 Cable</span> leads the entire catalog in volume with <span className="font-bold text-slate-900">5,100 units</span> sold, generating $76,449.00 in high-velocity revenue.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-700 flex items-center">
                      <DollarSign className="w-4 h-4 text-indigo-500 mr-1.5" />
                      Top Revenue Generator
                    </h4>
                    <p>
                      <span className="font-semibold text-slate-800">BrewMaster Pro Espresso Machine</span> generated <span className="font-bold text-slate-900">$281,990.60</span> in revenue, selling 940 units at a premium unit price of $299.99.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-700 flex items-center">
                      <Lightbulb className="w-4 h-4 text-amber-500 mr-1.5" />
                      Analyst Recommendation
                    </h4>
                    <p>
                      Leverage high-volume leaders as checkout add-ons or gateway bundles. Try bundling the SpeedCast HDMI Cable with external gaming monitors to drive average order value.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Categories & Revenue */}
            {activeTab === 'categories' && (
              <div className="p-6 space-y-6 flex-1 flex flex-col">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">Categories Generating Maximum Revenue</h2>
                    <p className="text-xs text-slate-400">A detailed analysis of revenue share, volume distribution, and product density by category.</p>
                  </div>
                  <div className="text-xs font-semibold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full border border-indigo-100">
                    Total: $2.44M Revenue
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                  {/* Category Revenue share donut chart */}
                  <div className="lg:col-span-5 h-64 flex flex-col justify-center">
                    <div className="h-52 w-full relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categorySummaries}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={4}
                            dataKey="revenue"
                            nameKey="category"
                          >
                            {categorySummaries.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', border: 'none' }}
                            itemStyle={{ color: '#f8fafc', fontSize: '11px' }}
                            formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Revenue']}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-xs text-slate-400 font-medium">Total Revenue</span>
                        <span className="text-base font-bold text-slate-700">$2.44M</span>
                      </div>
                    </div>
                  </div>

                  {/* Summary grid table */}
                  <div className="lg:col-span-7 overflow-x-auto">
                    <table className="w-full text-xs text-left text-slate-500">
                      <thead className="text-[10px] text-slate-400 uppercase tracking-wider bg-slate-50 rounded-lg">
                        <tr>
                          <th className="px-3 py-2.5 font-bold">Category</th>
                          <th className="px-3 py-2.5 font-bold text-right">Revenue ($)</th>
                          <th className="px-3 py-2.5 font-bold text-right">Units Sold</th>
                          <th className="px-3 py-2.5 font-bold text-right">Avg Rating</th>
                          <th className="px-3 py-2.5 font-bold text-right">SKUs</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {categorySummaries.map((sum, i) => (
                          <tr key={sum.category} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-3 py-3 font-sans font-semibold text-slate-700 flex items-center">
                              <span className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                              {sum.category}
                            </td>
                            <td className="px-3 py-3 text-right font-semibold text-slate-800">${sum.revenue.toLocaleString()}</td>
                            <td className="px-3 py-3 text-right">{sum.unitsSold.toLocaleString()}</td>
                            <td className="px-3 py-3 text-right font-sans font-medium text-slate-700">{sum.averageRating}</td>
                            <td className="px-3 py-3 text-right font-sans text-slate-500">{sum.productCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Category deep dive insights */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3 text-xs text-slate-600">
                  <h4 className="font-bold text-slate-700">Category Insights:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-3 rounded-lg border border-slate-100/70 space-y-1">
                      <span className="font-bold text-violet-700">1. High-Ticket Dominance</span>
                      <p className="leading-relaxed">
                        <span className="font-semibold text-slate-800">Electronics</span> leads the revenue metric at <span className="font-semibold">$923,431.10 (37.8%)</span>, despite having fewer units sold than Beauty products. This represents high margin capture and optimal pricing strategies.
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-slate-100/70 space-y-1">
                      <span className="font-bold text-emerald-700">2. High-Volume Repeat Loops</span>
                      <p className="leading-relaxed">
                        <span className="font-semibold text-slate-800">Beauty & Personal Care</span> represents our highest unit-volume category. Items like sunscreen and Vitamin C serum sell rapidly, carrying high Customer Lifetime Value (CLV) potential through replenishment cycles.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Ratings vs. Sales Correlation */}
            {activeTab === 'correlation' && (
              <div className="p-6 space-y-6 flex-1 flex flex-col">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">Compare Product Ratings with Sales</h2>
                    <p className="text-xs text-slate-400">Discover if product satisfaction drives transaction velocity. Click on any bubble to review item metrics.</p>
                  </div>
                  <div className="text-xs text-slate-500 font-medium flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-violet-600"></span>
                    <span>Click dot to view details</span>
                  </div>
                </div>

                {/* Correlation Scatter Plot */}
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart
                      margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis
                        type="number"
                        dataKey="rating"
                        name="Rating"
                        domain={[2.5, 5.0]}
                        tick={{ fill: '#64748b', fontSize: 10 }}
                        label={{ value: 'Customer Rating (1 - 5)', position: 'bottom', offset: 0, style: { fill: '#64748b', fontSize: 11, fontWeight: 500 } }}
                      />
                      <YAxis
                        type="number"
                        dataKey="unitsSold"
                        name="Units Sold"
                        domain={[0, 7500]}
                        tick={{ fill: '#64748b', fontSize: 10 }}
                        label={{ value: 'Units Sold', angle: -90, position: 'insideLeft', style: { fill: '#64748b', fontSize: 11, fontWeight: 500 } }}
                      />
                      <Tooltip
                        cursor={{ strokeDasharray: '3 3' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload as Product;
                            return (
                              <div className="bg-slate-900 text-slate-100 p-3 rounded-lg border-none text-xs shadow-lg space-y-1">
                                <p className="font-bold">{data.name}</p>
                                <p className="text-slate-400">SKU: {data.sku}</p>
                                <p className="text-violet-300">Rating: {data.rating} / 5.0</p>
                                <p className="text-emerald-300">Units Sold: {data.unitsSold.toLocaleString()}</p>
                                <p className="text-slate-300">Price: ${data.price.toFixed(2)}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Scatter
                        name="Products"
                        data={mockProducts}
                        onClick={(node) => setSelectedProduct(node as Product)}
                        className="cursor-pointer"
                      >
                        {mockProducts.map((entry, index) => {
                          let color = '#6366f1'; // blue-purple default
                          if (entry.rating >= 4.7) color = '#10b981'; // emerald best
                          else if (entry.rating < 3.8) color = '#ef4444'; // red risk
                          return <Cell key={`cell-${index}`} fill={color} />;
                        })}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>

                {/* Scatter Plot Correlation explanation */}
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs text-slate-600 space-y-2">
                  <h4 className="font-bold text-slate-700">Regression & Correlation Insights:</h4>
                  <ul className="space-y-1.5 list-disc pl-4 text-slate-600">
                    <li>
                      <span className="font-semibold text-slate-800">Clear Positive Correlation Cluster:</span> Highly-rated products (4.5 to 4.9) constitute the bulk of the high transaction volume (3,000+ units) band, particularly in low-ticket categories (Beauty and Stationery).
                    </li>
                    <li>
                      <span className="font-semibold text-slate-800">Premium Segment Price Inelasticity (Outliers):</span> High-ticket items (e.g., BrewMaster Espresso Machine at $299.99, Vacuum Bot at $379.99) show lower unit sales (500 - 1000 units) despite superb customer ratings of 4.7+. This is normal pricing elasticity.
                    </li>
                    <li>
                      <span className="font-semibold text-slate-800">Low Rating Speed-Brakes (Severe Drops):</span> Items dropping below 3.5 ratings experience a steep decline in units sold, regardless of price point, highlighting that quality perception blocks conversion.
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* Tab: Underperforming Products & Stock Risk */}
            {activeTab === 'underperforming' && (
              <div className="p-6 space-y-6 flex-1 flex flex-col">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">Detect Underperforming Products</h2>
                    <p className="text-xs text-slate-400">Identify products carrying high stock count with low sales velocities, or sub-par customer ratings.</p>
                  </div>
                  <div className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-100 px-3 py-1 rounded-full">
                    {underperformingList.length} Flagged SKUs
                  </div>
                </div>

                {/* Risk list */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left text-slate-500">
                    <thead className="text-[10px] text-slate-400 uppercase bg-slate-50 font-bold tracking-wider rounded-lg">
                      <tr>
                        <th className="px-4 py-3">Product Name</th>
                        <th className="px-4 py-3">SKU</th>
                        <th className="px-4 py-3 text-right">Price</th>
                        <th className="px-4 py-3 text-right">Rating</th>
                        <th className="px-4 py-3 text-right">Units Sold</th>
                        <th className="px-4 py-3 text-right">Stock</th>
                        <th className="px-4 py-3">Failure Flag</th>
                        <th className="px-4 py-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {underperformingList.slice(0, 10).map((prod) => {
                        const isOverstock = prod.stock > 150 && prod.unitsSold < 1000;
                        const isPoorRating = prod.rating < 3.8;
                        const isDeadStock = prod.unitsSold < 200;

                        return (
                          <tr
                            key={prod.id}
                            className="hover:bg-rose-50/20 transition-colors group"
                          >
                            <td className="px-4 py-3.5 font-semibold text-slate-700">{prod.name}</td>
                            <td className="px-4 py-3.5 font-mono text-slate-500">{prod.sku}</td>
                            <td className="px-4 py-3.5 text-right font-mono text-slate-600">${prod.price.toFixed(2)}</td>
                            <td className="px-4 py-3.5 text-right font-mono font-medium">
                              <span className={`px-2 py-0.5 rounded-full ${isPoorRating ? 'bg-rose-50 text-rose-600 font-bold' : 'text-slate-600'}`}>
                                {prod.rating} ⭐
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-right font-mono">{prod.unitsSold.toLocaleString()}</td>
                            <td className="px-4 py-3.5 text-right font-mono">
                              <span className={`font-semibold ${isOverstock ? 'text-amber-600' : 'text-slate-500'}`}>
                                {prod.stock}
                              </span>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex flex-wrap gap-1">
                                {isPoorRating && <span className="text-[9px] font-bold uppercase tracking-wide bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded">Poor Sentiment</span>}
                                {isOverstock && <span className="text-[9px] font-bold uppercase tracking-wide bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">Overstock Alert</span>}
                                {isDeadStock && <span className="text-[9px] font-bold uppercase tracking-wide bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">Stagnant Velocity</span>}
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <button
                                onClick={() => setSelectedProduct(prod)}
                                className="px-2.5 py-1 text-[11px] bg-slate-800 text-white rounded hover:bg-slate-700 transition-colors cursor-pointer"
                              >
                                Options
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Stock Clearness Strategy recommendation block */}
                <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-4 flex items-start space-x-3 text-xs text-rose-950">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-rose-900">Critical Excess Capital Warning:</h4>
                    <p className="mt-1 leading-relaxed">
                      Several high-price items with poor sentiment ratings represent substantial stagnant cash capital. For example, the <span className="font-semibold">SilkSmooth Electric Epilator (Rating: 2.8, Stock: 160 units)</span> and <span className="font-semibold font-mono">ELEC-NC-412 (Network Card, Rating: 3.2, Stock: 180 units)</span> are locked in warehouses with slow consumer pull.
                    </p>
                    <div className="mt-2.5 flex items-center space-x-3">
                      <button
                        onClick={() => {
                          const botText = "Provide a comprehensive liquidation plan for our most stagnant stock items. Suggest flash sale markdowns, bulk retail channel options, or bundle-wrapping combinations to clear this capital immediately.";
                          handleSendFromDashboard(botText);
                        }}
                        className="px-3 py-1.5 bg-rose-600 text-white font-bold rounded-lg hover:bg-rose-700 transition-colors text-[11px] cursor-pointer"
                      >
                        Ask AI for Liquidation Plan
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Detailed Executive Report */}
            {activeTab === 'report' && (
              <div className="p-6 space-y-6 flex-1 flex flex-col">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">Suggest Visualizations & KPI Metrics</h2>
                    <p className="text-xs text-slate-400">Generate, customize, and print detailed corporate analytics reports with insights from Gemini.</p>
                  </div>
                  
                  {/* Custom Focus selector */}
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={reportFocus}
                      onChange={(e) => setReportFocus(e.target.value)}
                      placeholder="Enter custom focus theme..."
                      className="bg-slate-50 border border-slate-200 text-xs font-semibold px-3 py-1.5 rounded-lg text-slate-700 focus:outline-none focus:border-violet-500 w-44 lg:w-56"
                    />
                    <button
                      onClick={() => handleGenerateReport(reportFocus)}
                      disabled={reportLoading}
                      className="flex items-center space-x-1 px-3.5 py-1.5 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors text-xs font-semibold disabled:opacity-40 cursor-pointer"
                    >
                      {reportLoading ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                      )}
                      <span>{reportLoading ? 'Analyzing...' : 'Generate'}</span>
                    </button>
                  </div>
                </div>

                {reportLoading ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-3">
                    <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
                    <span className="text-xs text-slate-500 font-medium">Gemini is synthesizing catalog performance ratios...</span>
                  </div>
                ) : reportData ? (
                  <div className="space-y-6 max-w-4xl mx-auto">
                    {/* Header Block */}
                    <div className="border-b-2 border-slate-950 pb-4 text-center sm:text-left">
                      <h3 className="text-2xl font-black text-slate-900 tracking-tight">{reportData.title}</h3>
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-[11px] text-slate-400 mt-2 font-mono">
                        <span>DATE: {reportData.generatedAt}</span>
                        <span>•</span>
                        <span>FOCUS: {reportData.focusArea}</span>
                        <span>•</span>
                        <span>CATALOG SIZE: 100 PRODUCTS</span>
                      </div>
                    </div>

                    {/* Executive Summary */}
                    <div className="space-y-2 bg-slate-50 p-5 rounded-xl border border-slate-100">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono">1. Executive Summary</h4>
                      <p className="text-xs leading-relaxed text-slate-600 whitespace-pre-wrap">{reportData.summary}</p>
                    </div>

                    {/* Report Tasks Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-widest font-mono flex items-center">
                          <CheckCircle2 className="w-4 h-4 text-indigo-500 mr-2 shrink-0" />
                          2. Top-Selling Products (Task 1)
                        </h4>
                        <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm/50 text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                          {reportData.tasks.topSellers}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-widest font-mono flex items-center">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2 shrink-0" />
                          3. Categories Generating Max Revenue (Task 2)
                        </h4>
                        <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm/50 text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                          {reportData.tasks.categoriesRevenue}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-amber-700 uppercase tracking-widest font-mono flex items-center">
                          <CheckCircle2 className="w-4 h-4 text-amber-500 mr-2 shrink-0" />
                          4. Product Ratings vs Sales (Task 3)
                        </h4>
                        <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm/50 text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                          {reportData.tasks.ratingsVsSales}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-rose-700 uppercase tracking-widest font-mono flex items-center">
                          <CheckCircle2 className="w-4 h-4 text-rose-500 mr-2 shrink-0" />
                          5. Underperforming Products (Task 4)
                        </h4>
                        <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm/50 text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                          {reportData.tasks.underperforming}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-violet-700 uppercase tracking-widest font-mono flex items-center">
                          <CheckCircle2 className="w-4 h-4 text-violet-500 mr-2 shrink-0" />
                          6. Recommended Promotions (Task 5)
                        </h4>
                        <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm/50 text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                          {reportData.tasks.promotions}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono flex items-center">
                          <CheckCircle2 className="w-4 h-4 text-slate-500 mr-2 shrink-0" />
                          7. KPI Metric Recommendations (Task 6)
                        </h4>
                        <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm/50 text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                          {reportData.tasks.kpiSuggestions}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center py-20 text-slate-400 text-xs">
                    No report generated yet. Click the button to compile.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Interactive Catalog Explorer Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Catalog Database Explorer ({filteredProducts.length} items found)</h3>
                <p className="text-xs text-slate-400 mt-0.5">Filter, search, sort, and select any item to launch high-density details.</p>
              </div>
              
              {/* Filter Row Controls */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Search SKU or Name */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search name or SKU..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs w-44 focus:outline-none focus:border-violet-500"
                  />
                </div>

                {/* Category Filter */}
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-xs font-medium px-2 py-1.5 rounded-lg text-slate-700 focus:outline-none"
                >
                  <option value="All">All Categories</option>
                  {categoriesList.filter(c => c !== 'All').map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>

                {/* Stock Warning Filter */}
                <select
                  value={stockFilter}
                  onChange={(e) => setStockFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-xs font-medium px-2 py-1.5 rounded-lg text-slate-700 focus:outline-none"
                >
                  <option value="All">All Stock Levels</option>
                  <option value="Low">Low Stock Risk (&lt;50)</option>
                  <option value="Out">Out of Stock</option>
                  <option value="Overstock">High Inventory Risk</option>
                  <option value="Healthy">Healthy Stock (&gt;=50)</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-slate-500">
                <thead className="text-[10px] text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100 font-bold">
                  <tr>
                    <th className="px-5 py-3 cursor-pointer select-none hover:bg-slate-100" onClick={() => requestSort('name')}>
                      Product Name {sortField === 'name' && (sortOrder === 'asc' ? '▲' : '▼')}
                    </th>
                    <th className="px-5 py-3">SKU</th>
                    <th className="px-5 py-3">Category</th>
                    <th className="px-5 py-3 text-right cursor-pointer select-none hover:bg-slate-100" onClick={() => requestSort('price')}>
                      Price {sortField === 'price' && (sortOrder === 'asc' ? '▲' : '▼')}
                    </th>
                    <th className="px-5 py-3 text-right cursor-pointer select-none hover:bg-slate-100" onClick={() => requestSort('unitsSold')}>
                      Units Sold {sortField === 'unitsSold' && (sortOrder === 'asc' ? '▲' : '▼')}
                    </th>
                    <th className="px-5 py-3 text-right cursor-pointer select-none hover:bg-slate-100" onClick={() => requestSort('revenue')}>
                      Revenue {sortField === 'revenue' && (sortOrder === 'asc' ? '▲' : '▼')}
                    </th>
                    <th className="px-5 py-3 text-right cursor-pointer select-none hover:bg-slate-100" onClick={() => requestSort('rating')}>
                      Rating {sortField === 'rating' && (sortOrder === 'asc' ? '▲' : '▼')}
                    </th>
                    <th className="px-5 py-3 text-right cursor-pointer select-none hover:bg-slate-100" onClick={() => requestSort('stock')}>
                      Stock {sortField === 'stock' && (sortOrder === 'asc' ? '▲' : '▼')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {filteredProducts.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedProduct(p)}
                      className={`hover:bg-slate-50 transition-colors cursor-pointer group ${
                        selectedProduct?.id === p.id ? 'bg-violet-50/40 hover:bg-violet-50/40' : ''
                      }`}
                    >
                      <td className="px-5 py-3.5 font-sans font-semibold text-slate-800 text-left">
                        <div className="flex items-center space-x-2">
                          <span className="truncate max-w-[200px] block">{p.name}</span>
                          {p.rating >= 4.8 && p.unitsSold >= 1500 && (
                            <span className="text-[8px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded uppercase font-sans">Leader</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 font-mono">{p.sku}</td>
                      <td className="px-5 py-3.5 font-sans text-slate-600">{p.category}</td>
                      <td className="px-5 py-3.5 text-right text-slate-700">${p.price.toFixed(2)}</td>
                      <td className="px-5 py-3.5 text-right font-semibold text-slate-900">{p.unitsSold.toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-right text-emerald-600 font-bold">${p.revenue.toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-right font-sans">
                        <span className="flex items-center justify-end font-semibold text-amber-600">
                          {p.rating} <Star className="w-3 h-3 ml-0.5 fill-amber-400 text-amber-400 shrink-0" />
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.stock === 0 ? 'bg-rose-50 text-rose-600' : p.stock < 50 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-600'
                        }`}>
                          {p.stock}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-5 py-12 text-center text-slate-400 font-sans text-xs">
                        No product matching criteria was found. Check filters and spelling.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>

        {/* Collapsible Chat Pane (Right Column) */}
        {isChatOpen && (
          <div className="w-80 lg:w-96 shrink-0 border-l border-slate-200 h-full p-4 bg-slate-100/55 flex flex-col overflow-hidden">
            <AnalystChat
              id="ai-sidebar-panel"
              onSendMessage={handleSendMessage}
              messages={chatMessages}
              setMessages={setChatMessages}
              selectedProduct={selectedProduct}
              onClearChat={handleClearChat}
            />
          </div>
        )}
      </div>

      {/* Slide-out Sidebar for Product Details Drawer */}
      <ProductSidebar
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAskAIAboutProduct={handleAskAIAboutProduct}
        aiLoading={aiSidebarLoading}
      />
    </div>
  );

  // Trigger helper to let other parts trigger chat send from dashboard interactions
  function handleSendFromDashboard(text: string) {
    setIsChatOpen(true);
    setChatMessages((prev) => [
      ...prev,
      {
        id: `msg-${Date.now()}-user`,
        role: 'user',
        content: text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    
    // Auto query backend
    setAiSidebarLoading(true); // show generic spinner
    handleSendMessage(text).then(reply => {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}-bot`,
          role: 'assistant',
          content: reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }).catch(err => {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}-err`,
          role: 'assistant',
          content: `❌ Error communicating with AI Analyst: ${err.message}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }).finally(() => {
      setAiSidebarLoading(false);
    });
  }
}
