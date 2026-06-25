export interface Product {
  id: string;
  name: string;
  category: string;
  sku: string;
  price: number;
  unitsSold: number;
  revenue: number;
  rating: number;
  reviewsCount: number;
  stock: number;
  dateAdded: string;
}

export interface KPIStats {
  totalRevenue: number;
  totalUnitsSold: number;
  averageRating: number;
  underperformingCount: number;
  promotionCandidatesCount: number;
  totalProducts: number;
}

export interface CategorySummary {
  category: string;
  revenue: number;
  unitsSold: number;
  averageRating: number;
  productCount: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ExecutiveReport {
  title: string;
  generatedAt: string;
  focusArea: string;
  summary: string;
  tasks: {
    topSellers: string;
    categoriesRevenue: string;
    ratingsVsSales: string;
    underperforming: string;
    promotions: string;
    kpiSuggestions: string;
  };
}
