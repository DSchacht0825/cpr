"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

interface Applicant {
  id: string;
  full_name: string;
  phone_number: string;
  email: string;
  primary_language?: string;
  preferred_contact_method?: string;
  property_address: string;
  property_city: string;
  property_county: string;
  property_zip: string;
  property_type?: string;
  property_type_other?: string;
  name_on_title?: string;
  occupant_type?: string;
  is_hoa?: boolean | null;
  status: string;
  created_at: string;
  has_auction_date: boolean;
  auction_date?: string;
  has_notice_of_default: boolean;
  has_notice_of_trustee_sale: boolean;
  cannot_afford_mortgage?: boolean;
  facing_eviction?: boolean;
  poor_property_condition?: boolean;
  wants_to_remain?: boolean;
  needs_relocation_funds?: boolean;
  title_holder_deceased?: boolean;
  tenant_owner_deceased?: boolean;
  needs_probate_info?: boolean;
  needs_legal_assistance?: boolean;
  other_issues?: string;
  trustee_name?: string;
  appointment_type?: string;
  availability?: string[];
  comments?: string;
  assigned_to?: string;
  source?: string;
  submitted_by_worker?: string;
  intake_latitude?: number;
  intake_longitude?: number;
}

interface Worker {
  id: string;
  full_name: string;
  email: string;
}

interface Visit {
  id: string;
  visit_date: string;
  visit_type: string;
  visit_outcome?: string;
  location_address: string;
  contact_name?: string;
  property_condition_notes?: string;
  occupant_situation?: string;
  immediate_needs?: string;
  general_notes?: string;
  requires_follow_up: boolean;
  follow_up_date?: string;
  follow_up_notes?: string;
  latitude?: number;
  longitude?: number;
  staff_member: string;
  worker?: Worker;
}

interface PropertyData {
  applicant: Applicant;
  visits: Visit[];
  visitCount: number;
  attemptCount: number;
  engagementCount: number;
}

export default function PropertyDetailPage() {
  const params = useParams();
  const [data, setData] = useState<PropertyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showFullApplication, setShowFullApplication] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchPropertyData(params.id as string);
    }
  }, [params.id]);

  const fetchPropertyData = async (id: string) => {
    try {
      const response = await fetch(`/api/applicants/${id}/visits`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch property data");
      }

      setData(result);
    } catch (err) {
      console.error("Error fetching property data:", err);
      setError(err instanceof Error ? err.message : "Failed to load property");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      timeZone: "America/Los_Angeles",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      timeZone: "America/Los_Angeles",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const visitTypeLabels: Record<string, string> = {
    "initial-contact": "Initial Contact",
    "follow-up": "Follow Up",
    "property-inspection": "Property Inspection",
    "document-collection": "Document Collection",
  };

  const downloadApplication = () => {
    if (!data) return;
    const { applicant } = data;

    const content = `
COMMUNITY PROPERTY RESCUE
APPLICATION FOR ASSISTANCE
Generated: ${formatDateTime(new Date().toISOString())}

================================================================================
PERSONAL INFORMATION
================================================================================
Full Name:                  ${applicant.full_name}
Phone Number:               ${applicant.phone_number}
Email:                      ${applicant.email}
Primary Language:           ${applicant.primary_language || 'Not specified'}
Preferred Contact Method:   ${applicant.preferred_contact_method || 'Not specified'}

================================================================================
PROPERTY INFORMATION
================================================================================
Property Address:           ${applicant.property_address}
City:                       ${applicant.property_city || 'Not specified'}
County:                     ${applicant.property_county}
ZIP Code:                   ${applicant.property_zip}
Property Type:              ${applicant.property_type || 'Not specified'}${applicant.property_type_other ? ` (${applicant.property_type_other})` : ''}

================================================================================
TITLE & OWNERSHIP
================================================================================
Name on Title:              ${applicant.name_on_title || 'Not specified'}
Occupant Type:              ${applicant.occupant_type || 'Not specified'}
Part of HOA:                ${applicant.is_hoa === true ? 'Yes' : applicant.is_hoa === false ? 'No' : 'Not specified'}

================================================================================
CRISIS INDICATORS
================================================================================
Notice of Default:          ${applicant.has_notice_of_default ? 'YES' : 'No'}
Notice of Trustee Sale:     ${applicant.has_notice_of_trustee_sale ? 'YES' : 'No'}
Cannot Afford Mortgage:     ${applicant.cannot_afford_mortgage ? 'YES' : 'No'}
Facing Eviction:            ${applicant.facing_eviction ? 'YES' : 'No'}
Poor Property Condition:    ${applicant.poor_property_condition ? 'YES' : 'No'}
Wants to Remain:            ${applicant.wants_to_remain ? 'YES' : 'No'}
Needs Relocation Funds:     ${applicant.needs_relocation_funds ? 'YES' : 'No'}
Title Holder Deceased:      ${applicant.title_holder_deceased ? 'YES' : 'No'}
Tenant Owner Deceased:      ${applicant.tenant_owner_deceased ? 'YES' : 'No'}
Needs Probate Info:         ${applicant.needs_probate_info ? 'YES' : 'No'}
Needs Legal Assistance:     ${applicant.needs_legal_assistance ? 'YES' : 'No'}
Has Auction Date:           ${applicant.has_auction_date ? 'YES' : 'No'}

Other Issues:
${applicant.other_issues || 'None specified'}

================================================================================
URGENCY & SCHEDULING
================================================================================
Auction Date:               ${applicant.auction_date ? formatDate(applicant.auction_date) : 'Not scheduled'}
Trustee Name:               ${applicant.trustee_name || 'Not specified'}
Appointment Type:           ${applicant.appointment_type || 'Not specified'}
Availability:               ${applicant.availability?.join(', ') || 'Not specified'}

================================================================================
ADDITIONAL COMMENTS
================================================================================
${applicant.comments || 'No additional comments'}

================================================================================
APPLICATION METADATA
================================================================================
Application ID:             ${applicant.id}
Submitted:                  ${formatDateTime(applicant.created_at)}
Source:                     ${applicant.source === 'field_intake' ? 'Field Intake' : 'Online Application'}
Status:                     ${applicant.status}
${applicant.source === 'field_intake' && applicant.intake_latitude ? `GPS Coordinates:            ${applicant.intake_latitude}, ${applicant.intake_longitude}` : ''}

================================================================================
                    Community Property Rescue
              Restoring Hope & Dignity in Your Housing Crisis
================================================================================
`.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CPR_Application_${applicant.full_name.replace(/\s+/g, '_')}_${formatDate(applicant.created_at).replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    "in-progress": "bg-blue-100 text-blue-800",
    closed: "bg-gray-100 text-gray-800",
    approved: "bg-green-100 text-green-800",
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading property details...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || "Property not found"}</p>
          <Link href="/dashboard" className="text-cyan-600 hover:text-cyan-700">
            &larr; Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const { applicant, visits, visitCount, attemptCount, engagementCount } = data;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Image
                src="/cpr.png"
                alt="Community Property Rescue Logo"
                width={50}
                height={50}
                className="rounded-full"
              />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Property Details</h1>
                <p className="text-sm text-gray-600">Community Property Rescue</p>
              </div>
            </div>
            <Link
              href="/dashboard"
              className="text-cyan-600 hover:text-cyan-700 font-medium"
            >
              &larr; Back to Dashboard
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Download Button */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-gray-900">{applicant.full_name}</h2>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[applicant.status] || 'bg-gray-100 text-gray-800'}`}>
                  {applicant.status}
                </span>
                {applicant.source === 'field_intake' && (
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">
                    Field Intake
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500">
                Application submitted: {formatDateTime(applicant.created_at)}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowFullApplication(!showFullApplication)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                {showFullApplication ? 'Hide Details' : 'Show Full Application'}
              </button>
              <button
                onClick={downloadApplication}
                className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 rounded-lg hover:bg-cyan-700 transition-colors flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Application
              </button>
            </div>
          </div>

          {/* Visit Stats */}
          <div className="flex gap-4 mt-4 pt-4 border-t border-gray-200">
            <div className="text-center px-4 py-3 bg-gray-50 rounded-lg">
              <p className="text-3xl font-bold text-gray-900">{visitCount}</p>
              <p className="text-sm text-gray-600">Total Visits</p>
            </div>
            <div className="text-center px-4 py-3 bg-amber-50 rounded-lg">
              <p className="text-3xl font-bold text-amber-600">{attemptCount}</p>
              <p className="text-sm text-amber-700">Attempts</p>
            </div>
            <div className="text-center px-4 py-3 bg-green-50 rounded-lg">
              <p className="text-3xl font-bold text-green-600">{engagementCount}</p>
              <p className="text-sm text-green-700">Engagements</p>
            </div>
          </div>
        </div>

        {/* Full Application Details */}
        {showFullApplication && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Complete Application</h3>

            {/* Personal Information */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-200">Personal Information</h4>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Full Name</p>
                  <p className="text-gray-900 font-medium">{applicant.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone Number</p>
                  <a href={`tel:${applicant.phone_number}`} className="text-cyan-600 hover:text-cyan-700 font-medium">{applicant.phone_number}</a>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <a href={`mailto:${applicant.email}`} className="text-cyan-600 hover:text-cyan-700 font-medium">{applicant.email}</a>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Primary Language</p>
                  <p className="text-gray-900">{applicant.primary_language || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Preferred Contact Method</p>
                  <p className="text-gray-900">{applicant.preferred_contact_method || 'Not specified'}</p>
                </div>
              </div>
            </div>

            {/* Property Information */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-200">Property Information</h4>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-500">Property Address</p>
                  <p className="text-gray-900 font-medium">{applicant.property_address}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">City</p>
                  <p className="text-gray-900">{applicant.property_city || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">County</p>
                  <p className="text-gray-900">{applicant.property_county}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">ZIP Code</p>
                  <p className="text-gray-900">{applicant.property_zip}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Property Type</p>
                  <p className="text-gray-900">{applicant.property_type || 'Not specified'}{applicant.property_type_other && ` (${applicant.property_type_other})`}</p>
                </div>
              </div>
            </div>

            {/* Title & Ownership */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-200">Title & Ownership</h4>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Name on Title</p>
                  <p className="text-gray-900">{applicant.name_on_title || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Occupant Type</p>
                  <p className="text-gray-900">{applicant.occupant_type || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Part of HOA</p>
                  <p className="text-gray-900">{applicant.is_hoa === true ? 'Yes' : applicant.is_hoa === false ? 'No' : 'Not specified'}</p>
                </div>
              </div>
            </div>

            {/* Crisis Indicators */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-200">Crisis Indicators</h4>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className={`p-3 rounded-lg ${applicant.has_notice_of_default ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
                  <p className={`text-sm font-medium ${applicant.has_notice_of_default ? 'text-red-700' : 'text-gray-600'}`}>
                    {applicant.has_notice_of_default ? '✓' : '○'} Notice of Default
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${applicant.has_notice_of_trustee_sale ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
                  <p className={`text-sm font-medium ${applicant.has_notice_of_trustee_sale ? 'text-red-700' : 'text-gray-600'}`}>
                    {applicant.has_notice_of_trustee_sale ? '✓' : '○'} Notice of Trustee Sale
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${applicant.cannot_afford_mortgage ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
                  <p className={`text-sm font-medium ${applicant.cannot_afford_mortgage ? 'text-red-700' : 'text-gray-600'}`}>
                    {applicant.cannot_afford_mortgage ? '✓' : '○'} Cannot Afford Mortgage
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${applicant.facing_eviction ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
                  <p className={`text-sm font-medium ${applicant.facing_eviction ? 'text-red-700' : 'text-gray-600'}`}>
                    {applicant.facing_eviction ? '✓' : '○'} Facing Eviction
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${applicant.poor_property_condition ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
                  <p className={`text-sm font-medium ${applicant.poor_property_condition ? 'text-red-700' : 'text-gray-600'}`}>
                    {applicant.poor_property_condition ? '✓' : '○'} Poor Property Condition
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${applicant.wants_to_remain ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                  <p className={`text-sm font-medium ${applicant.wants_to_remain ? 'text-green-700' : 'text-gray-600'}`}>
                    {applicant.wants_to_remain ? '✓' : '○'} Wants to Remain in Home
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${applicant.needs_relocation_funds ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50'}`}>
                  <p className={`text-sm font-medium ${applicant.needs_relocation_funds ? 'text-amber-700' : 'text-gray-600'}`}>
                    {applicant.needs_relocation_funds ? '✓' : '○'} Needs Relocation Funds
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${applicant.title_holder_deceased ? 'bg-purple-50 border border-purple-200' : 'bg-gray-50'}`}>
                  <p className={`text-sm font-medium ${applicant.title_holder_deceased ? 'text-purple-700' : 'text-gray-600'}`}>
                    {applicant.title_holder_deceased ? '✓' : '○'} Title Holder Deceased
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${applicant.tenant_owner_deceased ? 'bg-purple-50 border border-purple-200' : 'bg-gray-50'}`}>
                  <p className={`text-sm font-medium ${applicant.tenant_owner_deceased ? 'text-purple-700' : 'text-gray-600'}`}>
                    {applicant.tenant_owner_deceased ? '✓' : '○'} Tenant Owner Deceased
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${applicant.needs_probate_info ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
                  <p className={`text-sm font-medium ${applicant.needs_probate_info ? 'text-blue-700' : 'text-gray-600'}`}>
                    {applicant.needs_probate_info ? '✓' : '○'} Needs Probate Info
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${applicant.needs_legal_assistance ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
                  <p className={`text-sm font-medium ${applicant.needs_legal_assistance ? 'text-blue-700' : 'text-gray-600'}`}>
                    {applicant.needs_legal_assistance ? '✓' : '○'} Needs Legal Assistance
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${applicant.has_auction_date ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
                  <p className={`text-sm font-medium ${applicant.has_auction_date ? 'text-red-700' : 'text-gray-600'}`}>
                    {applicant.has_auction_date ? '✓' : '○'} Has Auction Date
                  </p>
                </div>
              </div>
              {applicant.other_issues && (
                <div className="mt-4">
                  <p className="text-sm text-gray-500">Other Issues</p>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-lg mt-1">{applicant.other_issues}</p>
                </div>
              )}
            </div>

            {/* Urgency & Scheduling */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-200">Urgency & Scheduling</h4>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Auction Date</p>
                  <p className={`font-medium ${applicant.auction_date ? 'text-red-600' : 'text-gray-900'}`}>
                    {applicant.auction_date ? formatDate(applicant.auction_date) : 'Not scheduled'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Trustee Name</p>
                  <p className="text-gray-900">{applicant.trustee_name || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Appointment Type</p>
                  <p className="text-gray-900">{applicant.appointment_type || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Availability</p>
                  <p className="text-gray-900">{applicant.availability?.join(', ') || 'Not specified'}</p>
                </div>
              </div>
            </div>

            {/* Additional Comments */}
            {applicant.comments && (
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-200">Additional Comments</h4>
                <p className="text-gray-900 bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">{applicant.comments}</p>
              </div>
            )}

            {/* Metadata */}
            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-200">Application Metadata</h4>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Application ID</p>
                  <p className="text-gray-700 font-mono">{applicant.id}</p>
                </div>
                <div>
                  <p className="text-gray-500">Source</p>
                  <p className="text-gray-700">{applicant.source === 'field_intake' ? 'Field Intake' : 'Online Application'}</p>
                </div>
                {applicant.source === 'field_intake' && applicant.intake_latitude && (
                  <div>
                    <p className="text-gray-500">GPS Coordinates</p>
                    <p className="text-gray-700">{applicant.intake_latitude}, {applicant.intake_longitude}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Visit History */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Visit History</h3>

          {visits.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p>No visits recorded yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {visits.map((visit) => (
                <div
                  key={visit.id}
                  className={`border rounded-lg p-4 ${
                    visit.visit_outcome === 'attempt'
                      ? 'border-amber-200 bg-amber-50'
                      : visit.visit_outcome === 'engagement'
                      ? 'border-green-200 bg-green-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">
                          {visitTypeLabels[visit.visit_type] || visit.visit_type}
                        </span>
                        {visit.visit_outcome && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            visit.visit_outcome === 'attempt'
                              ? 'bg-amber-200 text-amber-800'
                              : 'bg-green-200 text-green-800'
                          }`}>
                            {visit.visit_outcome === 'attempt' ? 'Attempt' : 'Engagement'}
                          </span>
                        )}
                        {visit.requires_follow_up && (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">
                            Follow-up needed
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {formatDateTime(visit.visit_date)}
                      </p>
                      <p className="text-sm text-gray-700 mt-1">
                        <span className="font-medium">Worker:</span>{" "}
                        {visit.worker?.full_name || "Unknown"}
                      </p>
                    </div>
                    {visit.latitude && visit.longitude && (
                      <div className="text-xs text-gray-500">
                        GPS: {visit.latitude.toFixed(4)}, {visit.longitude.toFixed(4)}
                      </div>
                    )}
                  </div>

                  {/* Visit Details */}
                  <div className="mt-3 pt-3 border-t border-gray-200 space-y-2 text-sm">
                    {visit.contact_name && (
                      <p><span className="font-medium text-gray-700">Contact:</span> {visit.contact_name}</p>
                    )}
                    {visit.property_condition_notes && (
                      <p><span className="font-medium text-gray-700">Property Condition:</span> {visit.property_condition_notes}</p>
                    )}
                    {visit.occupant_situation && (
                      <p><span className="font-medium text-gray-700">Occupant Situation:</span> {visit.occupant_situation}</p>
                    )}
                    {visit.immediate_needs && (
                      <p><span className="font-medium text-gray-700">Immediate Needs:</span> {visit.immediate_needs}</p>
                    )}
                    {visit.general_notes && (
                      <p><span className="font-medium text-gray-700">Notes:</span> {visit.general_notes}</p>
                    )}
                    {visit.follow_up_date && (
                      <p className="text-purple-700">
                        <span className="font-medium">Follow-up scheduled:</span> {formatDate(visit.follow_up_date)}
                        {visit.follow_up_notes && ` - ${visit.follow_up_notes}`}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
