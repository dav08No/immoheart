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
      anfragen: {
        Row: {
          anforderungen: Json
          bezug: string | null
          budget_pro_m2: number | null
          created_at: string
          firma_id: string | null
          flaeche_max: number | null
          flaeche_min: number | null
          id: string
          letzter_kontakt: string
          nutzung: Database["public"]["Enums"]["nutzung_enum"]
          ort: string | null
          status: Database["public"]["Enums"]["anfrage_status_enum"]
          vertraulich: boolean
        }
        Insert: {
          anforderungen?: Json
          bezug?: string | null
          budget_pro_m2?: number | null
          created_at?: string
          firma_id?: string | null
          flaeche_max?: number | null
          flaeche_min?: number | null
          id?: string
          letzter_kontakt?: string
          nutzung: Database["public"]["Enums"]["nutzung_enum"]
          ort?: string | null
          status?: Database["public"]["Enums"]["anfrage_status_enum"]
          vertraulich?: boolean
        }
        Update: {
          anforderungen?: Json
          bezug?: string | null
          budget_pro_m2?: number | null
          created_at?: string
          firma_id?: string | null
          flaeche_max?: number | null
          flaeche_min?: number | null
          id?: string
          letzter_kontakt?: string
          nutzung?: Database["public"]["Enums"]["nutzung_enum"]
          ort?: string | null
          status?: Database["public"]["Enums"]["anfrage_status_enum"]
          vertraulich?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "anfragen_firma_id_fkey"
            columns: ["firma_id"]
            isOneToOne: false
            referencedRelation: "firmen"
            referencedColumns: ["id"]
          },
        ]
      }
      firmen: {
        Row: {
          branche: string | null
          created_at: string
          id: string
          kontakt_email: string | null
          kontakt_name: string | null
          name: string
          website: string | null
        }
        Insert: {
          branche?: string | null
          created_at?: string
          id?: string
          kontakt_email?: string | null
          kontakt_name?: string | null
          name: string
          website?: string | null
        }
        Update: {
          branche?: string | null
          created_at?: string
          id?: string
          kontakt_email?: string | null
          kontakt_name?: string | null
          name?: string
          website?: string | null
        }
        Relationships: []
      }
      matches: {
        Row: {
          anfrage_id: string
          created_at: string
          hinweis: string
          id: string
          kriterien: Json
          objekt_id: string
          score: number
          status: Database["public"]["Enums"]["match_status_enum"]
        }
        Insert: {
          anfrage_id: string
          created_at?: string
          hinweis: string
          id?: string
          kriterien: Json
          objekt_id: string
          score: number
          status?: Database["public"]["Enums"]["match_status_enum"]
        }
        Update: {
          anfrage_id?: string
          created_at?: string
          hinweis?: string
          id?: string
          kriterien?: Json
          objekt_id?: string
          score?: number
          status?: Database["public"]["Enums"]["match_status_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "matches_anfrage_id_fkey"
            columns: ["anfrage_id"]
            isOneToOne: false
            referencedRelation: "anfragen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_anfrage_id_fkey"
            columns: ["anfrage_id"]
            isOneToOne: false
            referencedRelation: "anfragen_sichtbar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_objekt_id_fkey"
            columns: ["objekt_id"]
            isOneToOne: false
            referencedRelation: "objekte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_objekt_id_fkey"
            columns: ["objekt_id"]
            isOneToOne: false
            referencedRelation: "objekte_oeffentlich"
            referencedColumns: ["id"]
          },
        ]
      }
      nachrichten: {
        Row: {
          an: string
          anfrage_id: string | null
          betreff: string
          body: string
          created_at: string
          erkannte_felder: Json | null
          gesendet_am: string | null
          id: string
          match_id: string | null
          richtung: Database["public"]["Enums"]["nachricht_richtung_enum"]
          typ: Database["public"]["Enums"]["nachricht_typ_enum"]
          von: string
        }
        Insert: {
          an: string
          anfrage_id?: string | null
          betreff: string
          body: string
          created_at?: string
          erkannte_felder?: Json | null
          gesendet_am?: string | null
          id?: string
          match_id?: string | null
          richtung: Database["public"]["Enums"]["nachricht_richtung_enum"]
          typ: Database["public"]["Enums"]["nachricht_typ_enum"]
          von: string
        }
        Update: {
          an?: string
          anfrage_id?: string | null
          betreff?: string
          body?: string
          created_at?: string
          erkannte_felder?: Json | null
          gesendet_am?: string | null
          id?: string
          match_id?: string | null
          richtung?: Database["public"]["Enums"]["nachricht_richtung_enum"]
          typ?: Database["public"]["Enums"]["nachricht_typ_enum"]
          von?: string
        }
        Relationships: [
          {
            foreignKeyName: "nachrichten_anfrage_id_fkey"
            columns: ["anfrage_id"]
            isOneToOne: false
            referencedRelation: "anfragen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nachrichten_anfrage_id_fkey"
            columns: ["anfrage_id"]
            isOneToOne: false
            referencedRelation: "anfragen_sichtbar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nachrichten_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      objekte: {
        Row: {
          adresse: string
          created_at: string
          eigenschaften: Json
          eigentuemer: string
          flaeche: number
          foto_url: string | null
          id: string
          nutzung: Database["public"]["Enums"]["nutzung_enum"]
          ort: string
          preis_pro_m2: number | null
          status: Database["public"]["Enums"]["objekt_status_enum"]
          titel: string
          verfuegbar_ab: string
        }
        Insert: {
          adresse: string
          created_at?: string
          eigenschaften?: Json
          eigentuemer: string
          flaeche: number
          foto_url?: string | null
          id?: string
          nutzung: Database["public"]["Enums"]["nutzung_enum"]
          ort: string
          preis_pro_m2?: number | null
          status?: Database["public"]["Enums"]["objekt_status_enum"]
          titel: string
          verfuegbar_ab: string
        }
        Update: {
          adresse?: string
          created_at?: string
          eigenschaften?: Json
          eigentuemer?: string
          flaeche?: number
          foto_url?: string | null
          id?: string
          nutzung?: Database["public"]["Enums"]["nutzung_enum"]
          ort?: string
          preis_pro_m2?: number | null
          status?: Database["public"]["Enums"]["objekt_status_enum"]
          titel?: string
          verfuegbar_ab?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          aktiv: boolean
          created_at: string
          darf_nutzer_anlegen: boolean
          freigabe_stufe: number
          id: string
          name: string
          rolle: Database["public"]["Enums"]["rolle_enum"]
          user_id: string
        }
        Insert: {
          aktiv?: boolean
          created_at?: string
          darf_nutzer_anlegen?: boolean
          freigabe_stufe?: number
          id?: string
          name: string
          rolle?: Database["public"]["Enums"]["rolle_enum"]
          user_id: string
        }
        Update: {
          aktiv?: boolean
          created_at?: string
          darf_nutzer_anlegen?: boolean
          freigabe_stufe?: number
          id?: string
          name?: string
          rolle?: Database["public"]["Enums"]["rolle_enum"]
          user_id?: string
        }
        Relationships: []
      }
      regeln: {
        Row: {
          aktiv: boolean
          angewendet_count: number
          beschreibung: string
          code: string
          created_at: string
          id: string
        }
        Insert: {
          aktiv?: boolean
          angewendet_count?: number
          beschreibung: string
          code: string
          created_at?: string
          id?: string
        }
        Update: {
          aktiv?: boolean
          angewendet_count?: number
          beschreibung?: string
          code?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
    }
    Views: {
      anfragen_sichtbar: {
        Row: {
          anforderungen: Json | null
          bezug: string | null
          budget_pro_m2: number | null
          created_at: string | null
          firma_id: string | null
          flaeche_max: number | null
          flaeche_min: number | null
          id: string | null
          letzter_kontakt: string | null
          nutzung: Database["public"]["Enums"]["nutzung_enum"] | null
          ort: string | null
          status: Database["public"]["Enums"]["anfrage_status_enum"] | null
          vertraulich: boolean | null
        }
        Insert: {
          anforderungen?: Json | null
          bezug?: string | null
          budget_pro_m2?: never
          created_at?: string | null
          firma_id?: never
          flaeche_max?: number | null
          flaeche_min?: number | null
          id?: string | null
          letzter_kontakt?: string | null
          nutzung?: Database["public"]["Enums"]["nutzung_enum"] | null
          ort?: string | null
          status?: Database["public"]["Enums"]["anfrage_status_enum"] | null
          vertraulich?: boolean | null
        }
        Update: {
          anforderungen?: Json | null
          bezug?: string | null
          budget_pro_m2?: never
          created_at?: string | null
          firma_id?: never
          flaeche_max?: number | null
          flaeche_min?: number | null
          id?: string | null
          letzter_kontakt?: string | null
          nutzung?: Database["public"]["Enums"]["nutzung_enum"] | null
          ort?: string | null
          status?: Database["public"]["Enums"]["anfrage_status_enum"] | null
          vertraulich?: boolean | null
        }
        Relationships: []
      }
      objekte_oeffentlich: {
        Row: {
          created_at: string | null
          eigenschaften: Json | null
          flaeche: number | null
          id: string | null
          nutzung: Database["public"]["Enums"]["nutzung_enum"] | null
          ort: string | null
          preis_pro_m2: number | null
          status: Database["public"]["Enums"]["objekt_status_enum"] | null
          titel: string | null
          verfuegbar_ab: string | null
        }
        Insert: {
          created_at?: string | null
          eigenschaften?: Json | null
          flaeche?: number | null
          id?: string | null
          nutzung?: Database["public"]["Enums"]["nutzung_enum"] | null
          ort?: string | null
          preis_pro_m2?: number | null
          status?: Database["public"]["Enums"]["objekt_status_enum"] | null
          titel?: string | null
          verfuegbar_ab?: string | null
        }
        Update: {
          created_at?: string | null
          eigenschaften?: Json | null
          flaeche?: number | null
          id?: string | null
          nutzung?: Database["public"]["Enums"]["nutzung_enum"] | null
          ort?: string | null
          preis_pro_m2?: number | null
          status?: Database["public"]["Enums"]["objekt_status_enum"] | null
          titel?: string | null
          verfuegbar_ab?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      current_rolle: {
        Args: never
        Returns: Database["public"]["Enums"]["rolle_enum"]
      }
      ist_aktives_konto: { Args: never; Returns: boolean }
    }
    Enums: {
      anfrage_status_enum: "offen" | "vermittelt" | "ruhend"
      match_status_enum: "neu" | "gesendet" | "verworfen"
      nachricht_richtung_enum: "eingang" | "entwurf" | "gesendet"
      nachricht_typ_enum: "anfrage" | "angebot" | "rueckfrage" | "nachfass"
      nutzung_enum:
        | "buero"
        | "gewerbe"
        | "produktion"
        | "lager"
        | "verkauf"
        | "bauland"
      objekt_status_enum: "verfuegbar" | "reserviert" | "vermietet"
      rolle_enum: "admin" | "vermittler" | "leser"
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
      anfrage_status_enum: ["offen", "vermittelt", "ruhend"],
      match_status_enum: ["neu", "gesendet", "verworfen"],
      nachricht_richtung_enum: ["eingang", "entwurf", "gesendet"],
      nachricht_typ_enum: ["anfrage", "angebot", "rueckfrage", "nachfass"],
      nutzung_enum: [
        "buero",
        "gewerbe",
        "produktion",
        "lager",
        "verkauf",
        "bauland",
      ],
      objekt_status_enum: ["verfuegbar", "reserviert", "vermietet"],
      rolle_enum: ["admin", "vermittler", "leser"],
    },
  },
} as const
