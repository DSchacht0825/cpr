import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const eventData = {
      applicant_id: body.applicant_id,
      client_id: body.client_id || null,
      event_type: body.event_type,
      event_date: body.event_date || new Date().toISOString(),
      title: body.title,
      description: body.description || null,
      contact_method: body.contact_method || null,
      outcome: body.outcome || null,
      next_steps: body.next_steps || null,
      is_milestone: body.is_milestone || false,
      is_urgent: body.is_urgent || false,
      latitude: body.latitude || null,
      longitude: body.longitude || null,
      location_accuracy: body.location_accuracy || null,
    };

    const { data, error } = await supabase
      .from('case_events')
      .insert([eventData])
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to create case event', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Case event created successfully',
        data: data,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Case event creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const applicantId = searchParams.get('applicant_id');
    const clientId = searchParams.get('client_id');

    let query = supabase
      .from('case_events')
      .select('*')
      .order('event_date', { ascending: false });

    if (applicantId) {
      query = query.eq('applicant_id', applicantId);
    }

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch case events', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error('Error fetching case events:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
