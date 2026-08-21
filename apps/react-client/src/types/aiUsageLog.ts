export interface AIUsageLog {
  id: number;
  user_id: string;
  title: string;
  model: string;
  using_date: Date;
  input_token_count: number;
  output_token_count: number;
}
