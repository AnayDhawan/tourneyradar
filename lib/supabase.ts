import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://htohprkfygyzvgzijvnd.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0b2hwcmtmeWd5enZnemlqdm5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2NDY3MDMsImV4cCI6MjA4MjIyMjcwM30.4TYIhteDvauPVtWbWp_Dql3VgJcYsdhgYq65Z6kGDfA"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Tournament = {
  id: string
  name: string
  location: string
  city?: string
  state: string
  country?: string
  country_code?: string
  lat: number
  lng: number
  category: string
  date: string
  end_date?: string
  pdf: string
  entry_fee: string
  prize_pool: string
  fide_rated: boolean
  description: string
  venue_name: string
  venue_address: string
  time_control: string
  rounds: number
  format: string
  organizer_name: string
  organizer_phone: string | null
  organizer_email: string | null
  whatsapp_group: string | null
  registration_link: string | null
  source?: string
  source_id?: string
  source_url?: string
  external_link?: string
  rules: string[]
  amenities: string[]
  prize_distribution: any
  schedule: any[]
  status: string
  created_at?: string
  scraped_at?: string
}