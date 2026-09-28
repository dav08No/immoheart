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
          objekt_id: string | null
          ort: string | null
          quelle: string
          status: Database["public"]["Enums"]["anfrage_status_enum"]
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
          objekt_id?: string | null
          ort?: string | null
          quelle?: string
          status?: Database["public"]["Enums"]["anfrage_status_enum"]
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
          objekt_id?: string | null
          ort?: string | null
          quelle?: string
          status?: Database["public"]["Enums"]["anfrage_status_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "anfragen_firma_id_fkey"
            columns: ["firma_id"]
            isOneToOne: false
            referencedRelation: "firmen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anfragen_objekt_id_fkey"
            columns: ["objekt_id"]
            isOneToOne: false
            referencedRelation: "objekte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anfragen_objekt_id_fkey"
            columns: ["objekt_id"]
            isOneToOne: false
            referencedRelation: "objekte_oeffentlich"
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
      formular_limits: {
        Row: {
          fenster_start: string
          ip_hash: string
          zaehler: number
        }
        Insert: {
          fenster_start: string
          ip_hash: string
          zaehler?: number
        }
        Update: {
          fenster_start?: string
          ip_hash?: string
          zaehler?: number
        }
        Relationships: []
      }
      mail_abruf: {
        Row: {
          id: number
          letzter_erfolg: string | null
          letzter_fehler: string | null
          letzter_fehler_am: string | null
          letzter_start: string | null
        }
        Insert: {
          id?: number
          letzter_erfolg?: string | null
          letzter_fehler?: string | null
          letzter_fehler_am?: string | null
          letzter_start?: string | null
        }
        Update: {
          id?: number
          letzter_erfolg?: string | null
          letzter_fehler?: string | null
          letzter_fehler_am?: string | null
          letzter_start?: string | null
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
      nachricht_anhaenge: {
        Row: {
          created_at: string
          dateiname: string
          groesse: number
          id: string
          mime_type: string
          nachricht_id: string
          pfad: string
        }
        Insert: {
          created_at?: string
          dateiname: string
          groesse: number
          id?: string
          mime_type: string
          nachricht_id: string
          pfad: string
        }
        Update: {
          created_at?: string
          dateiname?: string
          groesse?: number
          id?: string
          mime_type?: string
          nachricht_id?: string
          pfad?: string
        }
        Relationships: [
          {
            foreignKeyName: "nachricht_anhaenge_nachricht_id_fkey"
            columns: ["nachricht_id"]
            isOneToOne: false
            referencedRelation: "nachrichten"
            referencedColumns: ["id"]
          },
        ]
      }
      nachrichten: {
        Row: {
          an: string
          anfrage_id: string | null
          anhaenge: Json
          antwort_auf: string | null
          betreff: string
          body: string
          created_at: string
          empfangen_am: string | null
          erkannte_felder: Json | null
          gelesen: boolean
          geloescht_am: string | null
          gesendet_am: string | null
          id: string
          in_reply_to: string | null
          kategorie:
            | Database["public"]["Enums"]["nachricht_kategorie_enum"]
            | null
          ki_fehler: string | null
          ki_gestartet_am: string | null
          ki_status: string | null
          match_id: string | null
          message_id: string | null
          objekt_id: string | null
          quelle: string
          referenzen: string | null
          richtung: Database["public"]["Enums"]["nachricht_richtung_enum"]
          typ: Database["public"]["Enums"]["nachricht_typ_enum"]
          versand_fehler: string | null
          von: string
        }
        Insert: {
          an: string
          anfrage_id?: string | null
          anhaenge?: Json
          antwort_auf?: string | null
          betreff: string
          body: string
          created_at?: string
          empfangen_am?: string | null
          erkannte_felder?: Json | null
          gelesen?: boolean
          geloescht_am?: string | null
          gesendet_am?: string | null
          id?: string
          in_reply_to?: string | null
          kategorie?:
            | Database["public"]["Enums"]["nachricht_kategorie_enum"]
            | null
          ki_fehler?: string | null
          ki_gestartet_am?: string | null
          ki_status?: string | null
          match_id?: string | null
          message_id?: string | null
          objekt_id?: string | null
          quelle?: string
          referenzen?: string | null
          richtung: Database["public"]["Enums"]["nachricht_richtung_enum"]
          typ: Database["public"]["Enums"]["nachricht_typ_enum"]
          versand_fehler?: string | null
          von: string
        }
        Update: {
          an?: string
          anfrage_id?: string | null
          anhaenge?: Json
          antwort_auf?: string | null
          betreff?: string
          body?: string
          created_at?: string
          empfangen_am?: string | null
          erkannte_felder?: Json | null
          gelesen?: boolean
          geloescht_am?: string | null
          gesendet_am?: string | null
          id?: string
          in_reply_to?: string | null
          kategorie?:
            | Database["public"]["Enums"]["nachricht_kategorie_enum"]
            | null
          ki_fehler?: string | null
          ki_gestartet_am?: string | null
          ki_status?: string | null
          match_id?: string | null
          message_id?: string | null
          objekt_id?: string | null
          quelle?: string
          referenzen?: string | null
          richtung?: Database["public"]["Enums"]["nachricht_richtung_enum"]
          typ?: Database["public"]["Enums"]["nachricht_typ_enum"]
          versand_fehler?: string | null
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
            foreignKeyName: "nachrichten_antwort_auf_fkey"
            columns: ["antwort_auf"]
            isOneToOne: false
            referencedRelation: "nachrichten"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nachrichten_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nachrichten_objekt_id_fkey"
            columns: ["objekt_id"]
            isOneToOne: false
            referencedRelation: "objekte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nachrichten_objekt_id_fkey"
            columns: ["objekt_id"]
            isOneToOne: false
            referencedRelation: "objekte_oeffentlich"
            referencedColumns: ["id"]
          },
        ]
      }
      objekt_fotos: {
        Row: {
          created_at: string
          id: string
          objekt_id: string
          pfad: string
          reihenfolge: number
        }
        Insert: {
          created_at?: string
          id?: string
          objekt_id: string
          pfad: string
          reihenfolge?: number
        }
        Update: {
          created_at?: string
          id?: string
          objekt_id?: string
          pfad?: string
          reihenfolge?: number
        }
        Relationships: [
          {
            foreignKeyName: "objekt_fotos_objekt_id_fkey"
            columns: ["objekt_id"]
            isOneToOne: false
            referencedRelation: "objekte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objekt_fotos_objekt_id_fkey"
            columns: ["objekt_id"]
            isOneToOne: false
            referencedRelation: "objekte_oeffentlich"
            referencedColumns: ["id"]
          },
        ]
      }
      objekte: {
        Row: {
          adresse: string
          beschreibung: string | null
          created_at: string
          eigenschaften: Json
          eigentuemer: string
          flaeche: number
          foto_url: string | null
          id: string
          nutzung: Database["public"]["Enums"]["nutzung_enum"]
          oeffentlich: boolean
          ort: string
          preis_pro_m2: number | null
          status: Database["public"]["Enums"]["objekt_status_enum"]
          titel: string
          verfuegbar_ab: string
        }
        Insert: {
          adresse: string
          beschreibung?: string | null
          created_at?: string
          eigenschaften?: Json
          eigentuemer: string
          flaeche: number
          foto_url?: string | null
          id?: string
          nutzung: Database["public"]["Enums"]["nutzung_enum"]
          oeffentlich?: boolean
          ort: string
          preis_pro_m2?: number | null
          status?: Database["public"]["Enums"]["objekt_status_enum"]
          titel: string
          verfuegbar_ab: string
        }
        Update: {
          adresse?: string
          beschreibung?: string | null
          created_at?: string
          eigenschaften?: Json
          eigentuemer?: string
          flaeche?: number
          foto_url?: string | null
          id?: string
          nutzung?: Database["public"]["Enums"]["nutzung_enum"]
          oeffentlich?: boolean
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
          id: string
          name: string
          user_id: string
        }
        Insert: {
          aktiv?: boolean
          created_at?: string
          darf_nutzer_anlegen?: boolean
          id?: string
          name: string
          user_id: string
        }
        Update: {
          aktiv?: boolean
          created_at?: string
          darf_nutzer_anlegen?: boolean
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      objekte_oeffentlich: {
        Row: {
          beschreibung: string | null
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
          beschreibung?: string | null
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
          beschreibung?: string | null
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
      formular_zaehlen: {
        Args: { p_fenster: string; p_ip_hash: string }
        Returns: number
      }
      ist_aktives_konto: { Args: never; Returns: boolean }
      speicher_belegt: {
        Args: never
        Returns: {
          bucket: string
          bytes: number
        }[]
      }
    }
    Enums: {
      anfrage_status_enum: "offen" | "vermittelt" | "ruhend"
      match_status_enum: "neu" | "gesendet" | "verworfen"
      nachricht_kategorie_enum:
        | "suchanfrage"
        | "antwort"
        | "objektangebot"
        | "objektanfrage"
        | "sonstiges"
      nachricht_richtung_enum: "eingang" | "entwurf" | "gesendet"
      nachricht_typ_enum:
        | "anfrage"
        | "angebot"
        | "rueckfrage"
        | "nachfass"
        | "antwort"
        | "frei"
      nutzung_enum:
        | "buero"
        | "gewerbe"
        | "produktion"
        | "lager"
        | "verkauf"
        | "bauland"
      objekt_status_enum: "verfuegbar" | "reserviert" | "vermietet"
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
      nachricht_kategorie_enum: [
        "suchanfrage",
        "antwort",
        "objektangebot",
        "objektanfrage",
        "sonstiges",
      ],
      nachricht_richtung_enum: ["eingang", "entwurf", "gesendet"],
      nachricht_typ_enum: [
        "anfrage",
        "angebot",
        "rueckfrage",
        "nachfass",
        "antwort",
        "frei",
      ],
      nutzung_enum: [
        "buero",
        "gewerbe",
        "produktion",
        "lager",
        "verkauf",
        "bauland",
      ],
      objekt_status_enum: ["verfuegbar", "reserviert", "vermietet"],
    },
  },
} as const
