import React, { useState } from 'react';
import { X, Tag, ShoppingBag, BarChart3, Star, AlertTriangle, Lightbulb, Sparkles, Loader2 } from 'lucide-react';
import { Product } from '../types';

interface ProductSidebarProps {
  product: Product | null;
  onClose: () => void;
  onAskAIAboutProduct: (product: Product, promptType: 'promo' | 'audit' | 'bundle') => void;
  aiLoading: boolean;
}

export const ProductSidebar: React.FC<ProductSidebarProps> = ({
  product,
  onClose,
  onAskAIAboutProduct,
  aiLoading,
}) => {
  if (!product) return null;

  // Stock status
  const getStockStatus = (stock: number) => {
    if (stock === 0) return { label: 'Out of Stock', color: 'text-rose-600 bg-rose-50 border-rose-100', icon: AlertTriangle };
    if (stock < 50) return { label: 'Low Stock Risk', color: 'text-amber-600 bg-amber-50 border-amber-100', icon: AlertTriangle };
    return { label: 'Healthy Stock', color: 'text-emerald-600 bg-emerald-50 border-emerald-100', icon: ShoppingBag };
  };

  const stockStatus = getStockStatus(product.stock);
  const StatusIcon = stockStatus.icon;

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 border-l border-slate-100 flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
        <div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-200/60 text-slate-700 tracking-wider font-mono">
            {product.sku}
          </span>
          <h3 className="text-lg font-bold text-slate-800 mt-2 line-clamp-1">{product.name}</h3>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Category & Rating */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
            <span className="text-xs text-slate-400 block font-medium">Category</span>
            <span className="text-sm font-semibold text-slate-700 mt-0.5 block">{product.category}</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
            <span className="text-xs text-slate-400 block font-medium">Rating</span>
            <div className="flex items-center mt-0.5">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400 mr-1" />
              <span className="text-sm font-bold text-slate-700">{product.rating}</span>
              <span className="text-xs text-slate-400 ml-1">({product.reviewsCount} reviews)</span>
            </div>
          </div>
        </div>

        {/* Financial metrics */}
        <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-slate-50/50 px-4 py-3 border-b border-slate-100">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Financial Overview</h4>
          </div>
          <div className="p-4 grid grid-cols-3 gap-2 text-center divide-x divide-slate-100">
            <div>
              <span className="text-[10px] text-slate-400 font-medium block">Price</span>
              <span className="text-sm font-bold text-slate-800 mt-1 block">${product.price.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-medium block">Units Sold</span>
              <span className="text-sm font-bold text-slate-800 mt-1 block">{product.unitsSold.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-medium block">Total Revenue</span>
              <span className="text-sm font-bold text-emerald-600 mt-1 block">${product.revenue.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Stock status indicator */}
        <div className={`p-4 rounded-xl border flex items-start space-x-3 ${stockStatus.color}`}>
          <StatusIcon className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider">Inventory Status</h4>
            <p className="text-sm font-semibold mt-1">
              {product.stock} units currently in stock ({stockStatus.label})
            </p>
            {product.stock < 50 && product.unitsSold > 1000 && (
              <p className="text-xs mt-1 opacity-80">
                Warning: High velocity item with low stock level. Reorder recommended immediately.
              </p>
            )}
            {product.stock > 150 && product.unitsSold < 300 && (
              <p className="text-xs mt-1 opacity-80">
                Warning: High carrying costs. Recommend launching stock clearing campaigns.
              </p>
            )}
          </div>
        </div>

        {/* Performance insights */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Performance Audit</h4>
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3 text-xs text-slate-600">
            <div className="flex items-start space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
              <p>
                Represents <span className="font-semibold text-slate-800">
                  {((product.revenue / 2441000) * 100).toFixed(2)}%
                </span> of total catalog revenue.
              </p>
            </div>
            <div className="flex items-start space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
              <p>
                Listed on <span className="font-semibold text-slate-800">{product.dateAdded}</span> (Product Age: {Math.round((Date.now() - new Date(product.dateAdded).getTime()) / (1000 * 60 * 60 * 24 * 30))} months).
              </p>
            </div>
            {product.rating >= 4.5 ? (
              <div className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <p className="text-emerald-800 font-medium">
                  High customer rating of {product.rating} indicates strong brand sentiment and excellent product-market fit.
                </p>
              </div>
            ) : product.rating <= 3.5 ? (
              <div className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                <p className="text-rose-800 font-medium">
                  Sub-par rating of {product.rating} is negatively impacting transaction velocity. Needs review of quality assurance or marketing materials.
                </p>
              </div>
            ) : (
              <div className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                <p className="text-amber-800 font-medium">
                  Moderate customer sentiment. Pricing and copy revisions could push sales velocity higher.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* AI Action Hub */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div className="flex items-center space-x-2 mb-2">
            <Sparkles className="w-4 h-4 text-violet-600" />
            <h4 className="text-xs font-bold text-violet-700 uppercase tracking-wider">AI Analyst Action Hub</h4>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Instruct the server-side Gemini Analyst to generate tailored operational assets for this product instantly.
          </p>

          <button
            onClick={() => onAskAIAboutProduct(product, 'promo')}
            disabled={aiLoading}
            className="w-full flex items-center justify-between p-3 rounded-xl border border-violet-100 bg-violet-50/30 text-violet-700 hover:bg-violet-50 hover:border-violet-200 transition-all font-medium text-xs disabled:opacity-50 text-left cursor-pointer"
          >
            <div className="flex items-center space-x-2">
              <Tag className="w-4 h-4 shrink-0" />
              <span>Generate Promotion Strategy</span>
            </div>
            {aiLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-violet-500" />
            ) : (
              <span className="bg-violet-100 text-violet-800 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">AI</span>
            )}
          </button>

          <button
            onClick={() => onAskAIAboutProduct(product, 'audit')}
            disabled={aiLoading}
            className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-200 transition-all font-medium text-xs disabled:opacity-50 text-left cursor-pointer"
          >
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 shrink-0 text-slate-500" />
              <span>Perform Pricing & Margin Audit</span>
            </div>
            <span className="text-slate-400">→</span>
          </button>

          <button
            onClick={() => onAskAIAboutProduct(product, 'bundle')}
            disabled={aiLoading}
            className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-200 transition-all font-medium text-xs disabled:opacity-50 text-left cursor-pointer"
          >
            <div className="flex items-center space-x-2">
              <Lightbulb className="w-4 h-4 shrink-0 text-slate-500" />
              <span>Suggest Complementary Bundles</span>
            </div>
            <span className="text-slate-400">→</span>
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
        >
          Dismiss Details
        </button>
      </div>
    </div>
  );
};
