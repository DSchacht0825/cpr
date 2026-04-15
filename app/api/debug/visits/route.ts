import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Debug endpoint to see visits data - REMOVE IN PRODUCTION
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // Get all unique staff_member IDs and their visit counts
    const { data: staffData, error: staffError } = await supabaseAdmin
      .from('field_visits')
      .select('staff_member')
      .limit(100);

    if (staffError) {
      return NextResponse.json({ error: staffError.message }, { status: 500 });
    }

    // Count visits per staff_member
    const staffCounts: Record<string, number> = {};
    staffData?.forEach(v => {
      const key = v.staff_member || 'null';
      staffCounts[key] = (staffCounts[key] || 0) + 1;
    });

    // Get total visit count
    const { count: totalCount } = await supabaseAdmin
      .from('field_visits')
      .select('*', { count: 'exact', head: true });

    // If userId provided, get visits for that user
    let userVisits = null;
    if (userId) {
      const { data, error } = await supabaseAdmin
        .from('field_visits')
        .select('id, staff_member, visit_date, location_address')
        .eq('staff_member', userId)
        .limit(10);

      if (!error) {
        userVisits = data;
      }
    }

    // Get user profiles to match IDs
    const { data: profiles } = await supabaseAdmin
      .from('user_profiles')
      .select('id, full_name, email')
      .limit(20);

    return NextResponse.json({
      total_visits: totalCount,
      staff_member_counts: staffCounts,
      queried_userId: userId,
      visits_for_user: userVisits,
      user_profiles: profiles,
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ error: 'Debug failed' }, { status: 500 });
  }
}
