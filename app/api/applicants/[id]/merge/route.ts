import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: masterId } = await params;
    const body = await request.json();
    const { duplicateId } = body;

    if (!duplicateId) {
      return NextResponse.json(
        { error: 'duplicateId is required' },
        { status: 400 }
      );
    }

    if (masterId === duplicateId) {
      return NextResponse.json(
        { error: 'Cannot merge an application with itself' },
        { status: 400 }
      );
    }

    // Get both records to verify they exist
    const { data: master, error: masterError } = await supabaseAdmin
      .from('applicants')
      .select('*')
      .eq('id', masterId)
      .single();

    if (masterError || !master) {
      return NextResponse.json(
        { error: 'Master application not found' },
        { status: 404 }
      );
    }

    const { data: duplicate, error: dupError } = await supabaseAdmin
      .from('applicants')
      .select('*')
      .eq('id', duplicateId)
      .single();

    if (dupError || !duplicate) {
      return NextResponse.json(
        { error: 'Duplicate application not found' },
        { status: 404 }
      );
    }

    // 1. Update field_visits to point to master
    const { error: visitsError } = await supabaseAdmin
      .from('field_visits')
      .update({ applicant_id: masterId })
      .eq('applicant_id', duplicateId);

    if (visitsError) {
      console.error('Error updating field_visits:', visitsError);
      return NextResponse.json(
        { error: 'Failed to merge field visits' },
        { status: 500 }
      );
    }

    // 2. Update case_events to point to master
    const { error: eventsError } = await supabaseAdmin
      .from('case_events')
      .update({ applicant_id: masterId })
      .eq('applicant_id', duplicateId);

    if (eventsError) {
      console.error('Error updating case_events:', eventsError);
      return NextResponse.json(
        { error: 'Failed to merge case events' },
        { status: 500 }
      );
    }

    // 3. Update application_documents to point to master
    const { error: docsError } = await supabaseAdmin
      .from('application_documents')
      .update({ application_id: masterId })
      .eq('application_id', duplicateId);

    if (docsError) {
      console.error('Error updating documents:', docsError);
      return NextResponse.json(
        { error: 'Failed to merge documents' },
        { status: 500 }
      );
    }

    // 4. Merge comments - append duplicate's comments to master's
    let mergedComments = master.comments || '';
    if (duplicate.comments) {
      if (mergedComments) {
        mergedComments += '\n\n--- Merged from duplicate record ---\n' + duplicate.comments;
      } else {
        mergedComments = duplicate.comments;
      }
    }

    // 5. Check if we need to migrate client record
    const { data: masterClient } = await supabaseAdmin
      .from('clients')
      .select('id')
      .eq('applicant_id', masterId)
      .single();

    const { data: dupClient } = await supabaseAdmin
      .from('clients')
      .select('id')
      .eq('applicant_id', duplicateId)
      .single();

    // If duplicate has client and master doesn't, migrate it
    if (dupClient && !masterClient) {
      const { error: clientError } = await supabaseAdmin
        .from('clients')
        .update({ applicant_id: masterId })
        .eq('applicant_id', duplicateId);

      if (clientError) {
        console.error('Error migrating client:', clientError);
        // Non-fatal, continue with merge
      }
    }

    // 6. Update master with merged comments
    if (mergedComments !== master.comments) {
      const { error: updateError } = await supabaseAdmin
        .from('applicants')
        .update({ comments: mergedComments })
        .eq('id', masterId);

      if (updateError) {
        console.error('Error updating master comments:', updateError);
        // Non-fatal, continue with merge
      }
    }

    // 7. Delete the duplicate record
    const { error: deleteError } = await supabaseAdmin
      .from('applicants')
      .delete()
      .eq('id', duplicateId);

    if (deleteError) {
      console.error('Error deleting duplicate:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete duplicate record' },
        { status: 500 }
      );
    }

    // Get updated master record
    const { data: updatedMaster } = await supabaseAdmin
      .from('applicants')
      .select('*')
      .eq('id', masterId)
      .single();

    return NextResponse.json({
      success: true,
      message: 'Applications merged successfully',
      data: updatedMaster,
    });
  } catch (error) {
    console.error('Error in merge API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
