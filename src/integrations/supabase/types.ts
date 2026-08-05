export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      benefit_payments: {
        Row: {
          amount: number
          benefit_type_id: string
          branch_id: string | null
          company_id: string
          created_at: string
          employee_benefit_id: string | null
          employee_id: string
          financial_transaction_id: string | null
          id: string
          notes: string | null
          payment_date: string
          reference_month: number
          reference_year: number
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          benefit_type_id: string
          branch_id?: string | null
          company_id: string
          created_at?: string
          employee_benefit_id?: string | null
          employee_id: string
          financial_transaction_id?: string | null
          id?: string
          notes?: string | null
          payment_date?: string
          reference_month: number
          reference_year: number
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          benefit_type_id?: string
          branch_id?: string | null
          company_id?: string
          created_at?: string
          employee_benefit_id?: string | null
          employee_id?: string
          financial_transaction_id?: string | null
          id?: string
          notes?: string | null
          payment_date?: string
          reference_month?: number
          reference_year?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "benefit_payments_benefit_type_id_fkey"
            columns: ["benefit_type_id"]
            isOneToOne: false
            referencedRelation: "benefit_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "benefit_payments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "benefit_payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "benefit_payments_employee_benefit_id_fkey"
            columns: ["employee_benefit_id"]
            isOneToOne: false
            referencedRelation: "employee_benefits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "benefit_payments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "benefit_payments_financial_transaction_id_fkey"
            columns: ["financial_transaction_id"]
            isOneToOne: false
            referencedRelation: "financial_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      benefit_types: {
        Row: {
          active: boolean
          company_id: string
          created_at: string
          default_value: number
          id: string
          name: string
          notes: string | null
          payment_day: number
          payment_type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          company_id: string
          created_at?: string
          default_value?: number
          id?: string
          name: string
          notes?: string | null
          payment_day?: number
          payment_type?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          company_id?: string
          created_at?: string
          default_value?: number
          id?: string
          name?: string
          notes?: string | null
          payment_day?: number
          payment_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "benefit_types_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          city: string | null
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          manager_name: string | null
          name: string
          state: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          manager_name?: string | null
          name: string
          state?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          manager_name?: string | null
          name?: string
          state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_movements: {
        Row: {
          amount: number
          branch_id: string | null
          company_id: string
          created_at: string
          id: string
          reason: string | null
          session_id: string
          type: Database["public"]["Enums"]["cash_movement_type"]
        }
        Insert: {
          amount: number
          branch_id?: string | null
          company_id: string
          created_at?: string
          id?: string
          reason?: string | null
          session_id: string
          type: Database["public"]["Enums"]["cash_movement_type"]
        }
        Update: {
          amount?: number
          branch_id?: string | null
          company_id?: string
          created_at?: string
          id?: string
          reason?: string | null
          session_id?: string
          type?: Database["public"]["Enums"]["cash_movement_type"]
        }
        Relationships: [
          {
            foreignKeyName: "cash_movements_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_movements_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "cash_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_sessions: {
        Row: {
          branch_id: string | null
          closed_at: string | null
          closing_balance_calculated: number | null
          closing_balance_informed: number | null
          company_id: string
          created_at: string
          id: string
          notes: string | null
          opened_at: string
          opening_balance: number
          operator_id: string
          operator_name: string | null
          status: Database["public"]["Enums"]["cash_session_status"]
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          closed_at?: string | null
          closing_balance_calculated?: number | null
          closing_balance_informed?: number | null
          company_id: string
          created_at?: string
          id?: string
          notes?: string | null
          opened_at?: string
          opening_balance?: number
          operator_id: string
          operator_name?: string | null
          status?: Database["public"]["Enums"]["cash_session_status"]
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          closed_at?: string | null
          closing_balance_calculated?: number | null
          closing_balance_informed?: number | null
          company_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          opened_at?: string
          opening_balance?: number
          operator_id?: string
          operator_name?: string | null
          status?: Database["public"]["Enums"]["cash_session_status"]
          updated_at?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          city: string | null
          cmv_target: number | null
          cnpj: string | null
          created_at: string
          email: string | null
          id: string
          logo_url: string | null
          meals_per_day: number | null
          name: string
          owner_id: string
          phone: string | null
          profit_target: number | null
          state: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          cmv_target?: number | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          meals_per_day?: number | null
          name: string
          owner_id: string
          phone?: string | null
          profit_target?: number | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          cmv_target?: number | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          meals_per_day?: number | null
          name?: string
          owner_id?: string
          phone?: string | null
          profit_target?: number | null
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      employee_benefits: {
        Row: {
          active: boolean
          benefit_type_id: string
          branch_id: string | null
          company_id: string
          created_at: string
          employee_id: string
          end_date: string | null
          id: string
          monthly_value: number
          notes: string | null
          start_date: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          benefit_type_id: string
          branch_id?: string | null
          company_id: string
          created_at?: string
          employee_id: string
          end_date?: string | null
          id?: string
          monthly_value?: number
          notes?: string | null
          start_date?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          benefit_type_id?: string
          branch_id?: string | null
          company_id?: string
          created_at?: string
          employee_id?: string
          end_date?: string | null
          id?: string
          monthly_value?: number
          notes?: string | null
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_benefits_benefit_type_id_fkey"
            columns: ["benefit_type_id"]
            isOneToOne: false
            referencedRelation: "benefit_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_benefits_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_benefits_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_benefits_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_roles: {
        Row: {
          base_salary: number
          company_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          weekly_hours: number
        }
        Insert: {
          base_salary?: number
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          weekly_hours?: number
        }
        Update: {
          base_salary?: number
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          weekly_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "employee_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          branch_id: string | null
          company_id: string
          cpf: string | null
          created_at: string
          email: string | null
          full_name: string
          hire_date: string
          hour_rate: number
          id: string
          notes: string | null
          phone: string | null
          registration: string | null
          role_id: string | null
          salary: number
          schedule_type: Database["public"]["Enums"]["schedule_type"]
          status: Database["public"]["Enums"]["employee_status"]
          termination_date: string | null
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          cpf?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          hire_date?: string
          hour_rate?: number
          id?: string
          notes?: string | null
          phone?: string | null
          registration?: string | null
          role_id?: string | null
          salary?: number
          schedule_type?: Database["public"]["Enums"]["schedule_type"]
          status?: Database["public"]["Enums"]["employee_status"]
          termination_date?: string | null
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          cpf?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          hire_date?: string
          hour_rate?: number
          id?: string
          notes?: string | null
          phone?: string | null
          registration?: string | null
          role_id?: string | null
          salary?: number
          schedule_type?: Database["public"]["Enums"]["schedule_type"]
          status?: Database["public"]["Enums"]["employee_status"]
          termination_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "employee_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_categories: {
        Row: {
          color: string | null
          company_id: string
          created_at: string
          id: string
          name: string
          type: Database["public"]["Enums"]["financial_type"]
          updated_at: string
        }
        Insert: {
          color?: string | null
          company_id: string
          created_at?: string
          id?: string
          name: string
          type: Database["public"]["Enums"]["financial_type"]
          updated_at?: string
        }
        Update: {
          color?: string | null
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          type?: Database["public"]["Enums"]["financial_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transactions: {
        Row: {
          amount: number
          branch_id: string | null
          category_id: string | null
          company_id: string
          created_at: string
          description: string
          due_date: string
          id: string
          notes: string | null
          payment_date: string | null
          status: Database["public"]["Enums"]["financial_status"]
          type: Database["public"]["Enums"]["financial_type"]
          updated_at: string
        }
        Insert: {
          amount: number
          branch_id?: string | null
          category_id?: string | null
          company_id: string
          created_at?: string
          description: string
          due_date: string
          id?: string
          notes?: string | null
          payment_date?: string | null
          status?: Database["public"]["Enums"]["financial_status"]
          type: Database["public"]["Enums"]["financial_type"]
          updated_at?: string
        }
        Update: {
          amount?: number
          branch_id?: string | null
          category_id?: string | null
          company_id?: string
          created_at?: string
          description?: string
          due_date?: string
          id?: string
          notes?: string | null
          payment_date?: string | null
          status?: Database["public"]["Enums"]["financial_status"]
          type?: Database["public"]["Enums"]["financial_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          company_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      order_counters: {
        Row: {
          company_id: string
          last_number: number
        }
        Insert: {
          company_id: string
          last_number?: number
        }
        Update: {
          company_id?: string
          last_number?: number
        }
        Relationships: []
      }
      order_items: {
        Row: {
          company_id: string
          created_at: string
          id: string
          notes: string | null
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          total: number
          unit_price: number
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          notes?: string | null
          order_id: string
          product_id?: string | null
          product_name: string
          quantity?: number
          total?: number
          unit_price?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_payments: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          order_id: string
          session_id: string | null
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          order_id: string
          session_id?: string | null
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          order_id?: string
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_payments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "cash_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          branch_id: string | null
          closed_at: string | null
          company_id: string
          created_at: string
          customer_name: string | null
          discount: number
          id: string
          notes: string | null
          number: number
          opened_at: string
          service_fee: number
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          table_id: string | null
          total: number
          type: Database["public"]["Enums"]["order_type"]
          updated_at: string
          waiter_name: string | null
        }
        Insert: {
          branch_id?: string | null
          closed_at?: string | null
          company_id: string
          created_at?: string
          customer_name?: string | null
          discount?: number
          id?: string
          notes?: string | null
          number: number
          opened_at?: string
          service_fee?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          table_id?: string | null
          total?: number
          type?: Database["public"]["Enums"]["order_type"]
          updated_at?: string
          waiter_name?: string | null
        }
        Update: {
          branch_id?: string | null
          closed_at?: string | null
          company_id?: string
          created_at?: string
          customer_name?: string | null
          discount?: number
          id?: string
          notes?: string | null
          number?: number
          opened_at?: string
          service_fee?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          table_id?: string | null
          total?: number
          type?: Database["public"]["Enums"]["order_type"]
          updated_at?: string
          waiter_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          branch_id: string | null
          category: Database["public"]["Enums"]["product_category"]
          company_id: string
          cost: number
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          min_stock: number
          name: string
          price: number
          sku: string | null
          stock: number
          unit: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          category?: Database["public"]["Enums"]["product_category"]
          company_id: string
          cost?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          min_stock?: number
          name: string
          price?: number
          sku?: string | null
          stock?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          category?: Database["public"]["Enums"]["product_category"]
          company_id?: string
          cost?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          min_stock?: number
          name?: string
          price?: number
          sku?: string | null
          stock?: number
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      recipe_ingredients: {
        Row: {
          created_at: string
          id: string
          item_id: string | null
          name: string
          notes: string | null
          quantity: number
          recipe_id: string
          total_cost: number
          unit: string
          unit_cost: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id?: string | null
          name: string
          notes?: string | null
          quantity?: number
          recipe_id: string
          total_cost?: number
          unit?: string
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string | null
          name?: string
          notes?: string | null
          quantity?: number
          recipe_id?: string
          total_cost?: number
          unit?: string
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          branch_id: string | null
          cmv_pct: number
          company_id: string
          cost_per_portion: number
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          margin_pct: number
          name: string
          notes: string | null
          product_id: string | null
          sale_price: number
          suggested_price: number
          target_margin_pct: number
          total_cost: number
          updated_at: string
          yield_qty: number
          yield_unit: string
        }
        Insert: {
          branch_id?: string | null
          cmv_pct?: number
          company_id: string
          cost_per_portion?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          margin_pct?: number
          name: string
          notes?: string | null
          product_id?: string | null
          sale_price?: number
          suggested_price?: number
          target_margin_pct?: number
          total_cost?: number
          updated_at?: string
          yield_qty?: number
          yield_unit?: string
        }
        Update: {
          branch_id?: string | null
          cmv_pct?: number
          company_id?: string
          cost_per_portion?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          margin_pct?: number
          name?: string
          notes?: string | null
          product_id?: string | null
          sale_price?: number
          suggested_price?: number
          target_margin_pct?: number
          total_cost?: number
          updated_at?: string
          yield_qty?: number
          yield_unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipes_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_tables: {
        Row: {
          branch_id: string | null
          capacity: number
          company_id: string
          created_at: string
          id: string
          name: string | null
          number: number
          status: Database["public"]["Enums"]["table_status"]
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          capacity?: number
          company_id: string
          created_at?: string
          id?: string
          name?: string | null
          number: number
          status?: Database["public"]["Enums"]["table_status"]
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          capacity?: number
          company_id?: string
          created_at?: string
          id?: string
          name?: string | null
          number?: number
          status?: Database["public"]["Enums"]["table_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_tables_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_tables_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_assignments: {
        Row: {
          company_id: string
          created_at: string
          employee_id: string
          ends_on: string | null
          id: string
          schedule_id: string
          starts_on: string
        }
        Insert: {
          company_id: string
          created_at?: string
          employee_id: string
          ends_on?: string | null
          id?: string
          schedule_id: string
          starts_on?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          employee_id?: string
          ends_on?: string | null
          id?: string
          schedule_id?: string
          starts_on?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_assignments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_assignments_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "work_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_categories: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_items: {
        Row: {
          branch_id: string | null
          category_id: string | null
          company_id: string
          created_at: string
          expiry_date: string | null
          id: string
          is_active: boolean
          min_stock: number
          name: string
          notes: string | null
          quantity: number
          sku: string | null
          supplier_id: string | null
          unit: string
          unit_value: number
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          category_id?: string | null
          company_id: string
          created_at?: string
          expiry_date?: string | null
          id?: string
          is_active?: boolean
          min_stock?: number
          name: string
          notes?: string | null
          quantity?: number
          sku?: string | null
          supplier_id?: string | null
          unit?: string
          unit_value?: number
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          category_id?: string | null
          company_id?: string
          created_at?: string
          expiry_date?: string | null
          id?: string
          is_active?: boolean
          min_stock?: number
          name?: string
          notes?: string | null
          quantity?: number
          sku?: string | null
          supplier_id?: string | null
          unit?: string
          unit_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_items_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "stock_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          branch_id: string | null
          company_id: string
          created_at: string
          id: string
          item_id: string
          movement_date: string
          quantity: number
          reason: string | null
          reference: string | null
          supplier_id: string | null
          total_value: number
          type: Database["public"]["Enums"]["stock_movement_type"]
          unit_value: number
          user_id: string | null
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          created_at?: string
          id?: string
          item_id: string
          movement_date?: string
          quantity: number
          reason?: string | null
          reference?: string | null
          supplier_id?: string | null
          total_value?: number
          type: Database["public"]["Enums"]["stock_movement_type"]
          unit_value?: number
          user_id?: string | null
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          created_at?: string
          id?: string
          item_id?: string
          movement_date?: string
          quantity?: number
          reason?: string | null
          reference?: string | null
          supplier_id?: string | null
          total_value?: number
          type?: Database["public"]["Enums"]["stock_movement_type"]
          unit_value?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          cnpj: string | null
          company_id: string
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          cnpj?: string | null
          company_id: string
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          cnpj?: string | null
          company_id?: string
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          bank_balance_hours: number
          branch_id: string | null
          break_minutes: number
          check_in: string | null
          check_out: string | null
          company_id: string
          created_at: string
          employee_id: string
          expected_hours: number
          id: string
          night_hours: number
          notes: string | null
          overtime_hours: number
          updated_at: string
          work_date: string
          worked_hours: number
        }
        Insert: {
          bank_balance_hours?: number
          branch_id?: string | null
          break_minutes?: number
          check_in?: string | null
          check_out?: string | null
          company_id: string
          created_at?: string
          employee_id: string
          expected_hours?: number
          id?: string
          night_hours?: number
          notes?: string | null
          overtime_hours?: number
          updated_at?: string
          work_date: string
          worked_hours?: number
        }
        Update: {
          bank_balance_hours?: number
          branch_id?: string | null
          break_minutes?: number
          check_in?: string | null
          check_out?: string | null
          company_id?: string
          created_at?: string
          employee_id?: string
          expected_hours?: number
          id?: string
          night_hours?: number
          notes?: string | null
          overtime_hours?: number
          updated_at?: string
          work_date?: string
          worked_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      work_schedules: {
        Row: {
          break_minutes: number
          company_id: string
          created_at: string
          end_time: string
          id: string
          name: string
          notes: string | null
          start_time: string
          type: Database["public"]["Enums"]["schedule_type"]
          updated_at: string
          weekdays: number[]
        }
        Insert: {
          break_minutes?: number
          company_id: string
          created_at?: string
          end_time?: string
          id?: string
          name: string
          notes?: string | null
          start_time?: string
          type?: Database["public"]["Enums"]["schedule_type"]
          updated_at?: string
          weekdays?: number[]
        }
        Update: {
          break_minutes?: number
          company_id?: string
          created_at?: string
          end_time?: string
          id?: string
          name?: string
          notes?: string | null
          start_time?: string
          type?: Database["public"]["Enums"]["schedule_type"]
          updated_at?: string
          weekdays?: number[]
        }
        Relationships: [
          {
            foreignKeyName: "work_schedules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_company_role: {
        Args: {
          _company_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_company_member: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      next_order_number: { Args: { _company_id: string }; Returns: number }
    }
    Enums: {
      app_role: "owner" | "admin" | "manager" | "operator" | "finance"
      cash_movement_type: "sangria" | "suprimento" | "retirada" | "ajuste"
      cash_session_status: "aberto" | "fechado"
      employee_status: "ativo" | "ferias" | "afastado" | "desligado"
      financial_status: "pendente" | "pago" | "recebido" | "cancelado"
      financial_type: "receita" | "despesa"
      order_status: "aberta" | "fechada" | "cancelada"
      order_type: "mesa" | "balcao" | "delivery" | "retirada"
      payment_method:
        | "dinheiro"
        | "pix"
        | "debito"
        | "credito"
        | "ifood_online"
        | "keeta_online"
        | "aiqfome_online"
      product_category:
        | "refeicao"
        | "marmita"
        | "bebida"
        | "sobremesa"
        | "lanche"
        | "porcao"
        | "adicional"
      schedule_type: "12x36" | "6x1" | "5x2" | "4x2" | "custom"
      stock_movement_type: "entrada" | "saida" | "ajuste"
      table_status: "livre" | "ocupada" | "reservada" | "fechamento_pendente"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["owner", "admin", "manager", "operator", "finance"],
      cash_movement_type: ["sangria", "suprimento", "retirada", "ajuste"],
      cash_session_status: ["aberto", "fechado"],
      employee_status: ["ativo", "ferias", "afastado", "desligado"],
      financial_status: ["pendente", "pago", "recebido", "cancelado"],
      financial_type: ["receita", "despesa"],
      order_status: ["aberta", "fechada", "cancelada"],
      order_type: ["mesa", "balcao", "delivery", "retirada"],
      payment_method: [
        "dinheiro",
        "pix",
        "debito",
        "credito",
        "ifood_online",
        "keeta_online",
        "aiqfome_online",
      ],
      product_category: [
        "refeicao",
        "marmita",
        "bebida",
        "sobremesa",
        "lanche",
        "porcao",
        "adicional",
      ],
      schedule_type: ["12x36", "6x1", "5x2", "4x2", "custom"],
      stock_movement_type: ["entrada", "saida", "ajuste"],
      table_status: ["livre", "ocupada", "reservada", "fechamento_pendente"],
    },
  },
} as const
