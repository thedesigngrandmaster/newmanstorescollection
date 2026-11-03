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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          sort: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          sort?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          sort?: number
        }
        Relationships: []
      }
      orders: {
        Row: {
          created_at: string
          customer: Json
          id: string
          items: Json
          order_id: string
          receipt_url: string | null
          status: string
          total_cents: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer: Json
          id?: string
          items: Json
          order_id: string
          receipt_url?: string | null
          status?: string
          total_cents: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer?: Json
          id?: string
          items?: Json
          order_id?: string
          receipt_url?: string | null
          status?: string
          total_cents?: number
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          brand: string | null
          category_id: string | null
          cc: string | null
          colors: string[]
          created_at: string
          description: string | null
          featured: boolean
          has_other_colors: boolean
          id: string
          images: string[]
          low_stock_threshold: number
          name: string
          price_cents: number
          purchases: number
          sizes: string[]
          slug: string
          sold_out: boolean
          stock: number
          subcategory_id: string | null
          updated_at: string
        }
        Insert: {
          brand?: string | null
          category_id?: string | null
          cc?: string | null
          colors?: string[]
          created_at?: string
          description?: string | null
          featured?: boolean
          has_other_colors?: boolean
          id?: string
          images?: string[]
          low_stock_threshold?: number
          name: string
          price_cents?: number
          purchases?: number
          sizes?: string[]
          slug: string
          sold_out?: boolean
          stock?: number
          subcategory_id?: string | null
          updated_at?: string
        }
        Update: {
          brand?: string | null
          category_id?: string | null
          cc?: string | null
          colors?: string[]
          created_at?: string
          description?: string | null
          featured?: boolean
          has_other_colors?: boolean
          id?: string
          images?: string[]
          low_stock_threshold?: number
          name?: string
          price_cents?: number
          purchases?: number
          sizes?: string[]
          slug?: string
          sold_out?: boolean
          stock?: number
          subcategory_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          name: string
          product_id: string
          rating: number
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          name: string
          product_id: string
          rating: number
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          name?: string
          product_id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          brand: string
          cta: Json
          currency: Json
          footer: Json
          hero: Json
          id: number
          logo_url: string | null
          nav_layout: Json
          payment: Json
          tagline: string | null
          theme: Json
          updated_at: string
        }
        Insert: {
          brand?: string
          cta?: Json
          currency?: Json
          footer?: Json
          hero?: Json
          id?: number
          logo_url?: string | null
          nav_layout?: Json
          payment?: Json
          tagline?: string | null
          theme?: Json
          updated_at?: string
        }
        Update: {
          brand?: string
          cta?: Json
          currency?: Json
          footer?: Json
          hero?: Json
          id?: number
          logo_url?: string | null
          nav_layout?: Json
          payment?: Json
          tagline?: string | null
          theme?: Json
          updated_at?: string
        }
        Relationships: []
      }
      subcategories: {
        Row: {
          category_id: string
          created_at: string
          id: string
          kind: string
          name: string
          slug: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          kind?: string
          name: string
          slug: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          kind?: string
          name?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          permissions: string[]
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          permissions?: string[]
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          permissions?: string[]
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_order_public: {
        Args: {
          _customer: Json
          _items: Json
          _order_id: string
          _total_cents: number
        }
        Returns: boolean
      }
      decrement_stock: {
        Args: { _product_id: string; _qty: number }
        Returns: undefined
      }
      has_permission: {
        Args: { _permission: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff_or_admin: { Args: { _user_id: string }; Returns: boolean }
      track_order_public: {
        Args: { _order_id: string }
        Returns: {
          created_at: string
          items: Json
          order_id: string
          status: string
          total_cents: number
        }[]
      }
      upload_receipt_public: {
        Args: { _order_id: string; _receipt_url: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "staff"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "staff"],
    },
  },
} as const
