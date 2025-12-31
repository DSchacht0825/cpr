import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

interface ApplicantWithCounts {
  id: string;
  full_name: string;
  property_address: string;
  property_city?: string;
  property_county: string;
  property_zip: string;
  phone_number: string;
  email?: string;
  status: string;
  created_at: string;
  assigned_to?: string;
  comments?: string;
  visit_count: number;
  event_count: number;
  document_count: number;
}

interface DuplicateGroup {
  matchType: 'name' | 'address';
  matchValue: string;
  applications: ApplicantWithCounts[];
}

export async function GET(request: NextRequest) {
  try {
    // Get all non-closed applications
    const { data: applicants, error: appError } = await supabaseAdmin
      .from('applicants')
      .select('id, full_name, property_address, property_city, property_county, property_zip, phone_number, email, status, created_at, assigned_to, comments')
      .neq('status', 'closed')
      .order('created_at', { ascending: false });

    if (appError) {
      console.error('Error fetching applicants:', appError);
      return NextResponse.json({ error: 'Failed to fetch applicants' }, { status: 500 });
    }

    if (!applicants || applicants.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Get counts for each applicant
    const applicantIds = applicants.map(a => a.id);

    // Get visit counts
    const { data: visitCounts } = await supabaseAdmin
      .from('field_visits')
      .select('applicant_id')
      .in('applicant_id', applicantIds);

    // Get event counts
    const { data: eventCounts } = await supabaseAdmin
      .from('case_events')
      .select('applicant_id')
      .in('applicant_id', applicantIds);

    // Get document counts
    const { data: docCounts } = await supabaseAdmin
      .from('application_documents')
      .select('application_id')
      .in('application_id', applicantIds);

    // Build count maps
    const visitCountMap: Record<string, number> = {};
    const eventCountMap: Record<string, number> = {};
    const docCountMap: Record<string, number> = {};

    visitCounts?.forEach(v => {
      if (v.applicant_id) {
        visitCountMap[v.applicant_id] = (visitCountMap[v.applicant_id] || 0) + 1;
      }
    });

    eventCounts?.forEach(e => {
      if (e.applicant_id) {
        eventCountMap[e.applicant_id] = (eventCountMap[e.applicant_id] || 0) + 1;
      }
    });

    docCounts?.forEach(d => {
      if (d.application_id) {
        docCountMap[d.application_id] = (docCountMap[d.application_id] || 0) + 1;
      }
    });

    // Build applicants with counts
    const applicantsWithCounts: ApplicantWithCounts[] = applicants.map(a => ({
      ...a,
      visit_count: visitCountMap[a.id] || 0,
      event_count: eventCountMap[a.id] || 0,
      document_count: docCountMap[a.id] || 0,
    }));

    // Find duplicates by name (case-insensitive)
    const nameGroups: Record<string, ApplicantWithCounts[]> = {};
    applicantsWithCounts.forEach(app => {
      const normalizedName = app.full_name.trim().toLowerCase();
      if (!nameGroups[normalizedName]) {
        nameGroups[normalizedName] = [];
      }
      nameGroups[normalizedName].push(app);
    });

    // Find duplicates by address (case-insensitive, normalized)
    const addressGroups: Record<string, ApplicantWithCounts[]> = {};
    applicantsWithCounts.forEach(app => {
      const normalizedAddress = app.property_address.trim().toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/\./g, '')
        .replace(/,/g, '');
      if (!addressGroups[normalizedAddress]) {
        addressGroups[normalizedAddress] = [];
      }
      addressGroups[normalizedAddress].push(app);
    });

    // Build duplicate groups (only where there's more than 1)
    const duplicateGroups: DuplicateGroup[] = [];

    // Track which IDs we've already grouped to avoid showing same pair twice
    const groupedIds = new Set<string>();

    // Add name duplicates
    Object.entries(nameGroups).forEach(([name, apps]) => {
      if (apps.length > 1) {
        const groupKey = apps.map(a => a.id).sort().join('-');
        if (!groupedIds.has(groupKey)) {
          duplicateGroups.push({
            matchType: 'name',
            matchValue: apps[0].full_name,
            applications: apps.sort((a, b) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            ),
          });
          apps.forEach(a => groupedIds.add(groupKey));
        }
      }
    });

    // Add address duplicates (but not if already grouped by name with same members)
    Object.entries(addressGroups).forEach(([addr, apps]) => {
      if (apps.length > 1) {
        const groupKey = apps.map(a => a.id).sort().join('-');
        // Check if this exact group already exists as a name duplicate
        const alreadyGrouped = duplicateGroups.some(g =>
          g.applications.map(a => a.id).sort().join('-') === groupKey
        );
        if (!alreadyGrouped) {
          duplicateGroups.push({
            matchType: 'address',
            matchValue: apps[0].property_address,
            applications: apps.sort((a, b) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            ),
          });
        }
      }
    });

    return NextResponse.json({ data: duplicateGroups });
  } catch (error) {
    console.error('Error in duplicates API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
