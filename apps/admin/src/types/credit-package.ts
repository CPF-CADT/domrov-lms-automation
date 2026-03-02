export interface CreditPackage {
  id: number;
  name: string;
  description: string;
  credits: number;
  bonusCredits: number;
  price: number;
  currency: string;
  discountInPercent: number;
  isActive: boolean;
  sortOrder: number;
  created_at: string;
  updated_at: string;
}