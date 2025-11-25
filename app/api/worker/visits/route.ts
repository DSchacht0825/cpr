import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('field_visits')
      .select('*')
      .eq('staff_member', userId)
      .order('visit_date', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch visits', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error('Error fetching visits:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log('Creating visit with data:', JSON.stringify(body, null, 2));

    // Clean up the data - remove fields that don't exist in the table
    const visitData = {
      applicant_id: body.applicant_id || null,
      staff_member: body.staff_member,
      visit_date: body.visit_date,
      visit_type: body.visit_type,
      visit_outcome: body.visit_outcome || null,
      location_address: body.location_address,
      contact_name: body.contact_name || null,
      property_condition_notes: body.property_condition_notes || null,
      occupant_situation: body.occupant_situation || null,
      immediate_needs: body.immediate_needs || null,
      general_notes: body.general_notes || null,
      requires_follow_up: body.requires_follow_up || false,
      follow_up_date: body.follow_up_date || null,
      follow_up_notes: body.follow_up_notes || null,
      latitude: body.latitude || null,
      longitude: body.longitude || null,
    };

    const { data, error } = await supabaseAdmin
      .from('field_visits')
      .insert([visitData])
      .select()
      .single();

    if (error) {
      console.error('Supabase error creating visit:', error);
      return NextResponse.json(
        { error: 'Failed to create visit', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating visit:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
