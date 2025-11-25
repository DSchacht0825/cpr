import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch all visits for this applicant with worker info
    const { data: visits, error: visitsError } = await supabaseAdmin
      .from('field_visits')
      .select(`
        *,
        worker:user_profiles!field_visits_staff_member_fkey(id, full_name, email)
      `)
      .eq('applicant_id', id)
      .order('visit_date', { ascending: false });

    if (visitsError) {
      console.error('Supabase error fetching visits:', visitsError);
      return NextResponse.json(
        { error: 'Failed to fetch visits', details: visitsError.message },
        { status: 500 }
      );
    }

    // Also fetch the applicant details
    const { data: applicant, error: applicantError } = await supabaseAdmin
      .from('applicants')
      .select('*')
      .eq('id', id)
      .single();

    if (applicantError) {
      console.error('Supabase error fetching applicant:', applicantError);
      return NextResponse.json(
        { error: 'Failed to fetch applicant', details: applicantError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      applicant,
      visits: visits || [],
      visitCount: visits?.length || 0,
      attemptCount: visits?.filter(v => v.visit_outcome === 'attempt').length || 0,
      engagementCount: visits?.filter(v => v.visit_outcome === 'engagement').length || 0,
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching applicant visits:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
