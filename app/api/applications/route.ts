import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import type { Applicant } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Transform form data to match database schema
    const applicantData: Applicant = {
      // Personal Information
      full_name: body.fullName,
      phone_number: body.phoneNumber,
      email: body.email,
      primary_language: body.primaryLanguage,
      preferred_contact_method: body.preferredContactMethod,

      // Property Information
      property_address: body.propertyAddress,
      property_city: body.propertyCity,
      property_county: body.propertyCounty,
      property_zip: body.propertyZip,
      property_type: body.propertyType,
      property_type_other: body.propertyTypeOther,

      // Title & Ownership
      name_on_title: body.nameOnTitle,
      occupant_type: body.occupantType,
      is_hoa: body.isHOA === 'yes' ? true : body.isHOA === 'no' ? false : null,

      // Crisis Indicators
      has_notice_of_default: body.hasNoticeOfDefault,
      has_notice_of_trustee_sale: body.hasNoticeOfTrusteeSale,
      cannot_afford_mortgage: body.cannotAffordMortgage,
      facing_eviction: body.facingEviction,
      poor_property_condition: body.poorPropertyCondition,
      wants_to_remain: body.wantsToRemain,
      needs_relocation_funds: body.needsRelocationFunds,
      title_holder_deceased: body.titleHolderDeceased,
      tenant_owner_deceased: body.tenantOwnerDeceased,
      needs_probate_info: body.needsProbateInfo,
      needs_legal_assistance: body.needsLegalAssistance,
      has_auction_date: body.hasAuctionDate,
      other_issues: body.otherIssues,

      // Urgency & Scheduling
      auction_date: body.auctionDate || null,
      trustee_name: body.trusteeName,
      appointment_type: body.appointmentType,
      availability: body.availability,

      // Additional Context
      comments: body.comments,

      // Application Status
      status: 'pending',
      source: body.intake_type === 'field' ? 'field_intake' : 'web_application',

      // Field Intake metadata (if submitted by worker)
      submitted_by_worker: body.submitted_by_worker || null,
      intake_latitude: body.intake_latitude || null,
      intake_longitude: body.intake_longitude || null,

      // Metadata
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
    };

    // Insert into Supabase
    const { data, error } = await supabaseAdmin
      .from('applicants')
      .insert([applicantData])
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to submit application', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Application submitted successfully',
        data: data,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Application submission error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = supabaseAdmin
      .from('applicants')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(1000);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;

    console.log('Applications fetch - count:', count, 'data length:', data?.length);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch applications', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data, count }, { status: 200 });
  } catch (error) {
    console.error('Error fetching applications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
