export interface NutriPer100 {
  kcal: number;
  prot: number;
  carbs: number;
  fat: number;
  sugar?: number;
  saturates?: number;
  fiber?: number;
  salt?: number;
}

export interface Ingredient {
  id: string;
  name: string;
  nameEn?: string;   // English name (used when ES ingredients shown in EN)
  nameEs?: string;   // Spanish name (used when US ingredients shown in ES)
  category: string;
  available: boolean;
  needed?: boolean;
  nutri?: NutriPer100;
}

export interface Dish {
  id: string;
  name: string;
  ingredients: string[];
  example?: boolean;
  diet?: string;
  notes?: string;
  photo?: string;       // base64 data URL
  youtubeUrl?: string;
  steps?: string[];     // pasos de preparación escritos por el usuario
}

export interface Recipe {
  id: string;
  name: string;
  cat: string;
  kcal: number;
  prot: number;
  carbs: number;
  fat: number;
  sugar: number;
  diets: string[];
  ings: string[];
}

export interface TicketItem {
  name?: string;
  rawName?: string;
  ingredientName?: string;
  normalizedName?: string;
  price?: number;
  qty?: number;
  category?: string;
  ing?: Ingredient;
  id?: string;
}

export interface Ticket {
  id: string;
  date: string;
  store?: string;
  total?: number;
  items: TicketItem[];
  matched: TicketItem[];
  unmatched: TicketItem[];
  raw?: string;
}

export interface PlanDay {
  breakfast?: string;
  lunch?: string;
  dinner?: string;
}

export type Plan = Record<string, PlanDay>;
export type PriceHistory = Record<string, { price: number; date: string; store?: string }[]>;

export type Section = 'plan' | 'platos' | 'cat' | 'ticket' | 'lista' | 'nutri' | 'gastos';
