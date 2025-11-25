import { createClient } from '@supabase/supabase-js';

// Client-side Supabase client (uses anon key)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// Server-side Supabase client (uses service role key for admin operations)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Database types (will be auto-generated from Supabase later)
export interface Applicant {
  id?: string;
  created_at?: string;
  updated_at?: string;

  // Personal Information
  full_name: string;
  phone_number: string;
  email: string;
  primary_language: string;
  preferred_contact_method?: string;

  // Property Information
  property_address: string;
  property_city?: string;
  property_county: string;
  property_zip: string;
  property_type: string;
  property_type_other?: string;

  // Title & Ownership
  name_on_title: string;
  occupant_type: string;
  is_hoa?: boolean | null;

  // Crisis Indicators
  has_notice_of_default?: boolean;
  has_notice_of_trustee_sale?: boolean;
  cannot_afford_mortgage?: boolean;
  facing_eviction?: boolean;
  poor_property_condition?: boolean;
  wants_to_remain?: boolean;
  needs_relocation_funds?: boolean;
  title_holder_deceased?: boolean;
  tenant_owner_deceased?: boolean;
  needs_probate_info?: boolean;
  needs_legal_assistance?: boolean;
  has_auction_date?: boolean;
  other_issues?: string;

  // Urgency & Scheduling
  auction_date?: string | null;
  trustee_name?: string;
  appointment_type?: string;
  availability?: string[];

  // Additional Context
  comments?: string;

  // Application Status
  status?: string;
  assigned_to?: string | null;

  // Metadata
  source?: string;
  ip_address?: string;
  user_agent?: string;

  // Field Intake metadata (if submitted by worker on-site)
  submitted_by_worker?: string | null;
  intake_latitude?: number | null;
  intake_longitude?: number | null;
}
