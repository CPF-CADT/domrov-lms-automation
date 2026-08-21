export interface Payment {
  id: number;
  user_id: string;
  package_id: number;
  payment_method: string;
  amount: number;
  currency: string;
  transaction_date: Date;
  status: string;
}
