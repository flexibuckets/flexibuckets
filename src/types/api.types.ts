export interface Data {
  payload_type: string;
  subscription_id: string;
  recurring_pre_tax_amount?: number;
  currency: string;
  status: string;
  created_at: string;
  product_id?: string;
  quantity?: number;
  trial_period_days?: number;
  subscription_period_interval?: string;
  payment_frequency_interval?: string;
  subscription_period_count?: number;
  payment_frequency_count?: number;
  next_billing_date?: string;
  customer: Customer;
  payment_id?: string;
  business_id?: string;
  total_amount?: number;
  payment_method?: string;
  payment_method_type: any;
  updated_at: any;
  disputes?: any[];
  refunds?: any[];
  product_cart: any;
  payment_link?: string;
  tax: any;
}

export interface Customer {
  customer_id: string;
  name: string;
  email: string;
}