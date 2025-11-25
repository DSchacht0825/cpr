import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    if (query.length < 2) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    // Search by name, address, phone, or email
    const { data, error } = await supabaseAdmin
      .from('applicants')
      .select('id, full_name, phone_number, email, property_address, property_city, property_county, property_zip, status, created_at')
      .or(`full_name.ilike.%${query}%,property_address.ilike.%${query}%,phone_number.ilike.%${query}%,email.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to search applicants', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error('Error searching applicants:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
