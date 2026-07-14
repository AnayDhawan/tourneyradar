import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'public',
  },
  auth: {
    persistSession: false,
  },
  global: {
    headers: {
      'x-connection-timeout': '5000',
    },
  },
})

export interface PrizeDistribution {
  category: string
  amount: string
}

export interface ScheduleItem {
  date: string
  time?: string
  round?: number
  description?: string
}

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
  prize_distribution?: PrizeDistribution[] | null
  schedule?: ScheduleItem[] | null
  status: string
  created_at?: string
  scraped_at?: string
}