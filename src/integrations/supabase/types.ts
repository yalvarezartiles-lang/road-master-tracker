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
      agenda_diaria: {
        Row: {
          autoescuela_id: string
          created_at: string
          created_by: string | null
          estado: string
          fecha: string
          hora_fin: string
          hora_inicio: string
          id: string
          notas: string
          profesor_id: string
          student_id: string | null
        }
        Insert: {
          autoescuela_id?: string
          created_at?: string
          created_by?: string | null
          estado?: string
          fecha: string
          hora_fin: string
          hora_inicio: string
          id?: string
          notas?: string
          profesor_id: string
          student_id?: string | null
        }
        Update: {
          autoescuela_id?: string
          created_at?: string
          created_by?: string | null
          estado?: string
          fecha?: string
          hora_fin?: string
          hora_inicio?: string
          id?: string
          notas?: string
          profesor_id?: string
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agenda_diaria_autoescuela_id_fkey"
            columns: ["autoescuela_id"]
            isOneToOne: false
            referencedRelation: "autoescuelas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_diaria_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      autoescuelas: {
        Row: {
          created_at: string
          id: string
          nombre_comercial: string
        }
        Insert: {
          created_at?: string
          id?: string
          nombre_comercial: string
        }
        Update: {
          created_at?: string
          id?: string
          nombre_comercial?: string
        }
        Relationships: []
      }
      lesson_whiteboards: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          image: string
          lesson_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          image: string
          lesson_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          image?: string
          lesson_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_whiteboards_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: true
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          created_at: string
          created_by: string | null
          date: string
          firma_alumno: string | null
          firma_profesor: string | null
          hora_fin: string | null
          hora_inicio: string | null
          id: string
          matricula: string
          notas_profesor: string
          notes: string
          number: number
          student_id: string
          topics: string[]
          zone: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date?: string
          firma_alumno?: string | null
          firma_profesor?: string | null
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: string
          matricula?: string
          notas_profesor?: string
          notes?: string
          number: number
          student_id: string
          topics?: string[]
          zone?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date?: string
          firma_alumno?: string | null
          firma_profesor?: string | null
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: string
          matricula?: string
          notas_profesor?: string
          notes?: string
          number?: number
          student_id?: string
          topics?: string[]
          zone?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          apellidos: string
          autoescuela_id: string | null
          created_at: string
          dni: string
          email: string
          full_name: string
          id: string
          matricula_vehiculo: string
        }
        Insert: {
          apellidos?: string
          autoescuela_id?: string | null
          created_at?: string
          dni?: string
          email?: string
          full_name?: string
          id: string
          matricula_vehiculo?: string
        }
        Update: {
          apellidos?: string
          autoescuela_id?: string | null
          created_at?: string
          dni?: string
          email?: string
          full_name?: string
          id?: string
          matricula_vehiculo?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_autoescuela_id_fkey"
            columns: ["autoescuela_id"]
            isOneToOne: false
            referencedRelation: "autoescuelas"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          block: number
          created_at: string
          id: string
          name: string
          profesor_id: string | null
        }
        Insert: {
          block?: number
          created_at?: string
          id?: string
          name: string
          profesor_id?: string | null
        }
        Update: {
          block?: number
          created_at?: string
          id?: string
          name?: string
          profesor_id?: string | null
        }
        Relationships: []
      }
      students: {
        Row: {
          apellidos: string
          autoescuela_id: string | null
          avatar_color: string
          created_at: string
          created_by: string | null
          dni: string
          id: string
          name: string
          phone: string
          skills: Json
          start_date: string
        }
        Insert: {
          apellidos?: string
          autoescuela_id?: string | null
          avatar_color?: string
          created_at?: string
          created_by?: string | null
          dni?: string
          id?: string
          name: string
          phone?: string
          skills?: Json
          start_date?: string
        }
        Update: {
          apellidos?: string
          autoescuela_id?: string | null
          avatar_color?: string
          created_at?: string
          created_by?: string | null
          dni?: string
          id?: string
          name?: string
          phone?: string
          skills?: Json
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_autoescuela_id_fkey"
            columns: ["autoescuela_id"]
            isOneToOne: false
            referencedRelation: "autoescuelas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      zonas_profesor: {
        Row: {
          creado_el: string
          id: string
          nombre_zona: string
          profesor_id: string
        }
        Insert: {
          creado_el?: string
          id?: string
          nombre_zona: string
          profesor_id?: string
        }
        Update: {
          creado_el?: string
          id?: string
          nombre_zona?: string
          profesor_id?: string
        }
        Relationships: []
      }
      zones: {
        Row: {
          created_at: string
          id: string
          name: string
          profesor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          profesor_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          profesor_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_lesson: { Args: { _lesson_id: string }; Returns: boolean }
      can_manage_agenda: {
        Args: { _autoescuela: string; _profesor: string; _student: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      my_autoescuela: { Args: never; Returns: string }
      student_in_my_school: { Args: { _student_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "profesor" | "admin_oficina"
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
      app_role: ["admin", "profesor", "admin_oficina"],
    },
  },
} as const
