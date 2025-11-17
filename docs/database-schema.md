# Community Property Rescue - Database Schema

## Tables Overview

### 1. `applicants` (Initial Application Data)
Primary table for storing homeowner/applicant information from the initial application.

```sql
CREATE TABLE applicants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Personal Information
  full_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  email TEXT NOT NULL,
  primary_language TEXT NOT NULL,
  preferred_contact_method TEXT, -- phone, email, text

  -- Property Information
  property_address TEXT NOT NULL,
  property_city TEXT,
  property_county TEXT NOT NULL,
  property_zip TEXT NOT NULL,
  property_type TEXT NOT NULL, -- single-family, multi-family, condo, other
  property_type_other TEXT,

  -- Title & Ownership
  name_on_title TEXT NOT NULL,
  occupant_type TEXT NOT NULL, -- homeowner, renter, other
  is_hoa BOOLEAN,

  -- Crisis Indicators (multiple can be true)
  has_notice_of_default BOOLEAN DEFAULT false,
  has_notice_of_trustee_sale BOOLEAN DEFAULT false,
  cannot_afford_mortgage BOOLEAN DEFAULT false,
  facing_eviction BOOLEAN DEFAULT false,
  poor_property_condition BOOLEAN DEFAULT false,
  wants_to_remain BOOLEAN DEFAULT false,
  needs_relocation_funds BOOLEAN DEFAULT false,
  title_holder_deceased BOOLEAN DEFAULT false,
  tenant_owner_deceased BOOLEAN DEFAULT false,
  needs_probate_info BOOLEAN DEFAULT false,
  needs_legal_assistance BOOLEAN DEFAULT false,
  has_auction_date BOOLEAN DEFAULT false,
  other_issues TEXT,

  -- Urgency & Scheduling
  auction_date DATE,
  trustee_name TEXT,
  appointment_type TEXT,
  availability TEXT[], -- array: morning, afternoon, evening, anytime

  -- Additional Context
  comments TEXT,

  -- Application Status
  status TEXT DEFAULT 'pending', -- pending, contacted, qualified, in-progress, closed
  assigned_to UUID REFERENCES auth.users(id),

  -- Metadata
  source TEXT DEFAULT 'web_application', -- web_application, field_intake, referral
  ip_address TEXT,
  user_agent TEXT
);

-- Indexes
CREATE INDEX idx_applicants_status ON applicants(status);
CREATE INDEX idx_applicants_created_at ON applicants(created_at);
CREATE INDEX idx_applicants_assigned_to ON applicants(assigned_to);
CREATE INDEX idx_applicants_auction_date ON applicants(auction_date) WHERE auction_date IS NOT NULL;
```

### 2. `clients` (Post-Qualification Extended Data)
When an applicant is qualified and becomes a client, additional detailed information is captured.

```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id UUID UNIQUE REFERENCES applicants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Extended Personal Information
  date_of_birth DATE,
  marital_status TEXT, -- single, married, divorced, widowed
  number_of_dependents INTEGER,
  is_senior BOOLEAN DEFAULT false, -- age 62+, qualifies for legal assistance
  is_veteran BOOLEAN DEFAULT false,
  is_disabled BOOLEAN DEFAULT false,

  -- Financial Information (NO SSN)
  estimated_annual_income DECIMAL(12,2),
  income_source TEXT, -- employment, retirement, disability, other
  current_mortgage_balance DECIMAL(12,2),
  monthly_mortgage_payment DECIMAL(12,2),
  property_value_estimate DECIMAL(12,2),
  has_other_debts BOOLEAN,
  total_debt_amount DECIMAL(12,2),

  -- Property Details
  year_purchased INTEGER,
  purchase_price DECIMAL(12,2),
  years_in_property INTEGER,
  property_bedrooms INTEGER,
  property_bathrooms DECIMAL(3,1),
  property_sqft INTEGER,
  property_condition TEXT, -- excellent, good, fair, poor
  needed_repairs TEXT,
  estimated_repair_cost DECIMAL(12,2),

  -- Mortgage Details
  original_lender TEXT,
  current_servicer TEXT,
  loan_type TEXT, -- conventional, fha, va, usda, other
  interest_rate DECIMAL(5,3),
  months_behind INTEGER,
  last_payment_date DATE,

  -- Additional Context
  how_they_heard TEXT, -- referral, google, social, community-org, other
  referral_source TEXT,
  special_circumstances TEXT,

  -- Legal Qualification
  qualifies_for_free_legal BOOLEAN DEFAULT false,
  legal_assistance_reason TEXT,
  attorney_assigned TEXT,

  -- Status
  client_status TEXT DEFAULT 'active', -- active, inactive, closed
  case_priority TEXT DEFAULT 'medium', -- low, medium, high, urgent

  UNIQUE(applicant_id)
);

-- Indexes
CREATE INDEX idx_clients_applicant_id ON clients(applicant_id);
CREATE INDEX idx_clients_status ON clients(client_status);
CREATE INDEX idx_clients_priority ON clients(case_priority);
```

### 3. `documents` (File Storage References)
Track uploaded documents (NOD, NTS, mortgage statements, etc.)

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  applicant_id UUID REFERENCES applicants(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,

  -- Document Info
  document_type TEXT NOT NULL, -- nod, nts, mortgage-statement, title, other
  file_name TEXT NOT NULL,
  file_size INTEGER,
  file_url TEXT NOT NULL, -- Supabase Storage URL
  mime_type TEXT,

  -- Metadata
  uploaded_by UUID REFERENCES auth.users(id),
  notes TEXT
);

-- Indexes
CREATE INDEX idx_documents_applicant_id ON documents(applicant_id);
CREATE INDEX idx_documents_client_id ON documents(client_id);
CREATE INDEX idx_documents_type ON documents(document_type);
```

### 4. `case_events` (Activity Log)
Track all interactions, milestones, and changes for each case.

```sql
CREATE TABLE case_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  applicant_id UUID REFERENCES applicants(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,

  -- Event Details
  event_type TEXT NOT NULL, -- contact, meeting, document-received, status-change, note, milestone
  event_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  title TEXT NOT NULL,
  description TEXT,

  -- Event Specifics
  contact_method TEXT, -- phone, email, in-person, text
  outcome TEXT,
  next_steps TEXT,

  -- User Tracking
  created_by UUID REFERENCES auth.users(id),

  -- Metadata
  is_milestone BOOLEAN DEFAULT false,
  is_urgent BOOLEAN DEFAULT false
);

-- Indexes
CREATE INDEX idx_case_events_applicant_id ON case_events(applicant_id);
CREATE INDEX idx_case_events_client_id ON case_events(client_id);
CREATE INDEX idx_case_events_created_at ON case_events(created_at);
CREATE INDEX idx_case_events_type ON case_events(event_type);
```

### 5. `field_visits` (Outreach/Field Intake)
Captured by staff during field visits, can work offline and sync later.

```sql
CREATE TABLE field_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  synced_at TIMESTAMP WITH TIME ZONE,

  applicant_id UUID REFERENCES applicants(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,

  -- Visit Details
  visit_date TIMESTAMP WITH TIME ZONE NOT NULL,
  visit_type TEXT, -- initial-contact, follow-up, property-inspection, document-collection
  location_address TEXT,

  -- Contact Information (if new lead)
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,

  -- Visit Notes
  property_condition_notes TEXT,
  occupant_situation TEXT,
  immediate_needs TEXT,
  photos_taken INTEGER DEFAULT 0,

  -- Follow-up
  requires_follow_up BOOLEAN DEFAULT false,
  follow_up_date DATE,
  follow_up_notes TEXT,

  -- Staff
  staff_member UUID REFERENCES auth.users(id),

  -- Sync Status (for offline PWA)
  is_synced BOOLEAN DEFAULT false,
  local_id TEXT, -- UUID generated on device before sync

  -- Geolocation (optional)
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8)
);

-- Indexes
CREATE INDEX idx_field_visits_applicant_id ON field_visits(applicant_id);
CREATE INDEX idx_field_visits_client_id ON field_visits(client_id);
CREATE INDEX idx_field_visits_synced ON field_visits(is_synced);
CREATE INDEX idx_field_visits_date ON field_visits(visit_date);
```

### 6. `users` (Staff & Admin - using Supabase Auth)
Extends Supabase auth.users with additional profile information.

```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Profile Info
  full_name TEXT NOT NULL,
  role TEXT NOT NULL, -- admin, staff, volunteer
  phone TEXT,

  -- Permissions
  can_access_dashboard BOOLEAN DEFAULT false,
  can_assign_cases BOOLEAN DEFAULT false,
  can_field_intake BOOLEAN DEFAULT false,
  can_export_reports BOOLEAN DEFAULT false,

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_user_profiles_active ON user_profiles(is_active);
```

## Row Level Security (RLS) Policies

```sql
-- Enable RLS
ALTER TABLE applicants ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Applicants: Staff can see all, public can insert only
CREATE POLICY "Staff can view all applicants" ON applicants
  FOR SELECT USING (
    auth.jwt() ->> 'role' IN ('admin', 'staff')
  );

CREATE POLICY "Anyone can submit application" ON applicants
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Staff can update applicants" ON applicants
  FOR UPDATE USING (
    auth.jwt() ->> 'role' IN ('admin', 'staff')
  );

-- Clients: Staff only
CREATE POLICY "Staff can manage clients" ON clients
  FOR ALL USING (
    auth.jwt() ->> 'role' IN ('admin', 'staff')
  );

-- Similar policies for other tables...
```

## Views for Reporting

```sql
-- Dashboard Overview
CREATE VIEW dashboard_overview AS
SELECT
  COUNT(*) FILTER (WHERE status = 'pending') as pending_applications,
  COUNT(*) FILTER (WHERE status = 'in-progress') as active_cases,
  COUNT(*) FILTER (WHERE has_auction_date AND auction_date <= CURRENT_DATE + INTERVAL '7 days') as urgent_auctions,
  COUNT(DISTINCT assigned_to) as active_staff
FROM applicants
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';

-- Applications by Status
CREATE VIEW applications_by_status AS
SELECT
  status,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (NOW() - created_at))/86400)::integer as avg_days_in_status
FROM applicants
GROUP BY status;
```
