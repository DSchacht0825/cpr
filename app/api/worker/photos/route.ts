import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const visitId = formData.get('visitId') as string;
    const caption = formData.get('caption') as string;
    const photoType = formData.get('photo_type') as string;
    const latitude = formData.get('latitude') as string;
    const longitude = formData.get('longitude') as string;

    if (!file || !visitId) {
      return NextResponse.json(
        { error: 'File and visit ID required' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const extension = file.name.split('.').pop() || 'jpg';
    const fileName = `${visitId}/${timestamp}.${extension}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('visit-photos')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload photo', details: uploadError.message },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('visit-photos')
      .getPublicUrl(fileName);

    // Save photo record to database
    const { data: photoData, error: dbError } = await supabaseAdmin
      .from('visit_photos')
      .insert([{
        field_visit_id: visitId,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_size: file.size,
        mime_type: file.type,
        caption: caption || null,
        photo_type: photoType || 'other',
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
      }])
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to save photo record', details: dbError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: photoData,
    }, { status: 201 });
  } catch (error) {
    console.error('Photo upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const visitId = searchParams.get('visitId');

    if (!visitId) {
      return NextResponse.json(
        { error: 'Visit ID required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('visit_photos')
      .select('*')
      .eq('field_visit_id', visitId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch photos', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error('Error fetching photos:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
