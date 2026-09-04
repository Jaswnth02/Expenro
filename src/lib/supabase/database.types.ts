export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          email: string;
          currency: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          email: string;
          currency?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          email?: string;
          currency?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          type: 'expense' | 'income';
          color: string | null;
          icon: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          type: 'expense' | 'income';
          color?: string | null;
          icon?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          name?: string;
          type?: 'expense' | 'income';
          color?: string | null;
          icon?: string | null;
          created_at?: string;
        };
      };
      expenses: {
        Row: {
          id: string;
          user_id: string;
          category_id: string | null;
          amount: number;
          description: string;
          payment_method: string;
          expense_date: string;
          notes: string | null;
          receipt_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category_id?: string | null;
          amount: number;
          description: string;
          payment_method?: string;
          expense_date?: string;
          notes?: string | null;
          receipt_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          category_id?: string | null;
          amount?: number;
          description?: string;
          payment_method?: string;
          expense_date?: string;
          notes?: string | null;
          receipt_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      income: {
        Row: {
          id: string;
          user_id: string;
          source: string;
          amount: number;
          description: string | null;
          income_date: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          source: string;
          amount: number;
          description?: string | null;
          income_date?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          source?: string;
          amount?: number;
          description?: string | null;
          income_date?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      savings_goals: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          target_amount: number;
          target_date: string | null;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          target_amount: number;
          target_date?: string | null;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          target_amount?: number;
          target_date?: string | null;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      savings_transactions: {
        Row: {
          id: string;
          user_id: string;
          goal_id: string;
          amount: number;
          transaction_date: string;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          goal_id: string;
          amount: number;
          transaction_date?: string;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          goal_id?: string;
          amount?: number;
          transaction_date?: string;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      budgets: {
        Row: {
          id: string;
          user_id: string;
          category_id: string;
          amount: number;
          month: number;
          year: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category_id: string;
          amount: number;
          month: number;
          year: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          category_id?: string;
          amount?: number;
          month?: number;
          year?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      recurring_expenses: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          amount: number;
          category_id: string | null;
          frequency: string;
          start_date: string;
          end_date: string | null;
          next_date: string;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          amount: number;
          category_id?: string | null;
          frequency: string;
          start_date: string;
          end_date?: string | null;
          next_date: string;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          amount?: number;
          category_id?: string | null;
          frequency?: string;
          start_date?: string;
          end_date?: string | null;
          next_date?: string;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}
