import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('Fetching visits for applicant:', id);

    // First get the applicant to get their address
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

    // Fetch visits by applicant_id OR by matching address
    const { data: visits, error: visitsError } = await supabaseAdmin
      .from('field_visits')
      .select('*')
      .or(`applicant_id.eq.${id},location_address.ilike.%${applicant.property_address}%`)
      .order('visit_date', { ascending: false });

    // Fetch worker info separately if there are visits
    let visitsWithWorker = visits || [];
    if (visits && visits.length > 0) {
      const staffIds = [...new Set(visits.map(v => v.staff_member).filter(Boolean))];
      if (staffIds.length > 0) {
        const { data: workers } = await supabaseAdmin
          .from('user_profiles')
          .select('id, full_name, email')
          .in('id', staffIds);

        const workerMap = new Map(workers?.map(w => [w.id, w]) || []);
        visitsWithWorker = visits.map(v => ({
          ...v,
          worker: v.staff_member ? workerMap.get(v.staff_member) || null : null
        }));
      }
    }

    if (visitsError) {
      console.error('Supabase error fetching visits:', visitsError);
      return NextResponse.json(
        { error: 'Failed to fetch visits', details: visitsError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      applicant,
      visits: visitsWithWorker,
      visitCount: visitsWithWorker.length,
      attemptCount: visitsWithWorker.filter(v => v.visit_outcome === 'attempt').length,
      engagementCount: visitsWithWorker.filter(v => v.visit_outcome === 'engagement').length,
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching applicant visits:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
