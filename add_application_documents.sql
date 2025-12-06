-- Create application_documents table
CREATE TABLE IF NOT EXISTS application_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  document_type TEXT DEFAULT 'other',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_application_documents_application_id ON application_documents(application_id);

-- Enable RLS
ALTER TABLE application_documents ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to view documents
CREATE POLICY "Allow authenticated users to view documents" ON application_documents
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policy for authenticated users to insert documents
CREATE POLICY "Allow authenticated users to insert documents" ON application_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create storage bucket for application documents (run in Supabase dashboard or via API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('application-documents', 'application-documents', true);
