import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Only allow updating specific fields
    const allowedFields = [
      'contact_name',
      'contact_phone',
      'contact_email',
      'property_condition_notes',
      'occupant_situation',
      'immediate_needs',
      'general_notes',
      'requires_follow_up',
      'follow_up_date',
      'follow_up_notes',
      'interest_level',
      'visit_outcome',
      'admin_notes',
      'edit_latitude',
      'edit_longitude',
    ];

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('field_visits')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error updating visit:', error);
      return NextResponse.json(
        { error: 'Failed to update visit', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    console.error('Error updating visit:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data, error } = await supabaseAdmin
      .from('field_visits')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Supabase error fetching visit:', error);
      return NextResponse.json(
        { error: 'Failed to fetch visit', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error('Error fetching visit:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Delete associated photos first
    await supabaseAdmin
      .from('field_visit_photos')
      .delete()
      .eq('field_visit_id', id);

    // Delete the visit
    const { error } = await supabaseAdmin
      .from('field_visits')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase error deleting visit:', error);
      return NextResponse.json(
        { error: 'Failed to delete visit', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting visit:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
