"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Pacific timezone formatting
const formatDatePacific = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    timeZone: "America/Los_Angeles",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatDateTimePacific = (dateString: string) => {
  return new Date(dateString).toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

interface WorkerSession {
  user: { id: string; email: string };
  profile: { full_name: string };
  session: { access_token: string };
}

interface Visit {
  id: string;
  visit_date: string;
  visit_type: string;
  visit_outcome?: string;
  location_address: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  property_condition_notes?: string;
  occupant_situation?: string;
  immediate_needs?: string;
  requires_follow_up: boolean;
  follow_up_date?: string;
  follow_up_notes?: string;
  applicant_id?: string;
  interest_level?: string;
  latitude?: number;
  longitude?: number;
  admin_notes?: string;
}

// Helper to extract time from follow_up_notes
const extractFollowUpTime = (notes?: string): string | null => {
  if (!notes) return null;
  const match = notes.match(/\[Preferred time: ([^\]]+)\]/);
  return match ? match[1] : null;
};

const INTEREST_LEVEL_LABELS: Record<string, { label: string; color: string }> = {
  not_interested: { label: "Not Interested", color: "bg-gray-100 text-gray-700" },
  interested_online: { label: "Interested - Online App", color: "bg-blue-100 text-blue-700" },
  applied_with_worker: { label: "Applied with Worker", color: "bg-green-100 text-green-700" },
};

export default function WorkerVisitsPage() {
  const router = useRouter();
  const [session, setSession] = useState<WorkerSession | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Visit>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const storedSession = localStorage.getItem("worker_session");
    if (!storedSession) {
      router.push("/worker");
      return;
    }

    try {
      const parsed = JSON.parse(storedSession);
      setSession(parsed);
      fetchVisits(parsed.user.id);
    } catch {
      router.push("/worker");
    }
  }, [router]);

  const fetchVisits = async (userId: string) => {
    try {
      const response = await fetch(`/api/worker/visits?userId=${userId}&limit=100`);
      const result = await response.json();
      if (response.ok) {
        setVisits(result.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch visits:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = formatDatePacific;
  const formatDateTime = formatDateTimePacific;

  const visitTypeLabels: Record<string, string> = {
    "initial-contact": "Initial Contact",
    "follow-up": "Follow Up",
    "property-inspection": "Property Inspection",
    "document-collection": "Document Collection",
  };

  // Filter visits based on search
  const filteredVisits = visits.filter((visit) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      visit.location_address?.toLowerCase().includes(query) ||
      visit.contact_name?.toLowerCase().includes(query) ||
      visit.property_condition_notes?.toLowerCase().includes(query) ||
      visit.occupant_situation?.toLowerCase().includes(query) ||
      visit.immediate_needs?.toLowerCase().includes(query)
    );
  });

  const openVisitDetail = (visit: Visit) => {
    setSelectedVisit(visit);
    setEditData({
      contact_name: visit.contact_name || "",
      contact_phone: visit.contact_phone || "",
      contact_email: visit.contact_email || "",
      property_condition_notes: visit.property_condition_notes || "",
      occupant_situation: visit.occupant_situation || "",
      immediate_needs: visit.immediate_needs || "",
      follow_up_notes: visit.follow_up_notes || "",
      follow_up_date: visit.follow_up_date || "",
      requires_follow_up: visit.requires_follow_up,
      interest_level: visit.interest_level || "",
    });
    setIsEditing(false);
  };

  const closeDetail = () => {
    setSelectedVisit(null);
    setIsEditing(false);
  };

  const handleEditChange = (field: string, value: string | boolean) => {
    setEditData((prev) => ({ ...prev, [field]: value }));
  };

  const saveChanges = async () => {
    if (!selectedVisit) return;
    setSaving(true);

    try {
      const response = await fetch(`/api/worker/visits/${selectedVisit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });

      if (response.ok) {
        // Update local state
        setVisits((prev) =>
          prev.map((v) =>
            v.id === selectedVisit.id ? { ...v, ...editData } : v
          )
        );
        setSelectedVisit({ ...selectedVisit, ...editData });
        setIsEditing(false);
      } else {
        alert("Failed to save changes. Please try again.");
      }
    } catch (err) {
      console.error("Error saving:", err);
      alert("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Visit Detail Modal */}
      {selectedVisit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full max-w-lg max-h-[90vh] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50 sticky top-0">
              <div>
                <h3 className="font-semibold text-gray-900">Visit Details</h3>
                <p className="text-xs text-gray-500">{formatDateTime(selectedVisit.visit_date)}</p>
              </div>
              <div className="flex items-center gap-2">
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-3 py-1.5 bg-cyan-600 text-white rounded-lg text-sm font-medium"
                  >
                    Edit
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveChanges}
                      disabled={saving}
                      className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>
                  </>
                )}
                <button
                  onClick={closeDetail}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto flex-1 p-4 space-y-4">
              {/* Visit Type & Outcome */}
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                  {visitTypeLabels[selectedVisit.visit_type] || selectedVisit.visit_type}
                </span>
                {selectedVisit.visit_outcome && (
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    selectedVisit.visit_outcome === "attempt"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-green-100 text-green-700"
                  }`}>
                    {selectedVisit.visit_outcome === "attempt" ? "Attempt" : "Engagement"}
                  </span>
                )}
                {selectedVisit.interest_level && INTEREST_LEVEL_LABELS[selectedVisit.interest_level] && (
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${INTEREST_LEVEL_LABELS[selectedVisit.interest_level].color}`}>
                    {INTEREST_LEVEL_LABELS[selectedVisit.interest_level].label}
                  </span>
                )}
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Address</label>
                <p className="text-gray-900">{selectedVisit.location_address}</p>
                {selectedVisit.latitude && selectedVisit.longitude && (
                  <p className="text-xs text-gray-400 mt-1">
                    GPS: {selectedVisit.latitude.toFixed(5)}, {selectedVisit.longitude.toFixed(5)}
                  </p>
                )}
              </div>

              {/* Contact Info */}
              <div className="bg-gray-50 rounded-lg p-3 space-y-3">
                <h4 className="font-medium text-gray-700 text-sm">Contact Information</h4>

                {isEditing ? (
                  <>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Name</label>
                      <input
                        type="text"
                        value={editData.contact_name || ""}
                        onChange={(e) => handleEditChange("contact_name", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                        placeholder="Contact name"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Phone</label>
                        <input
                          type="tel"
                          value={editData.contact_phone || ""}
                          onChange={(e) => handleEditChange("contact_phone", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                          placeholder="Phone"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Email</label>
                        <input
                          type="email"
                          value={editData.contact_email || ""}
                          onChange={(e) => handleEditChange("contact_email", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                          placeholder="Email"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {selectedVisit.contact_name && (
                      <p className="text-gray-900">{selectedVisit.contact_name}</p>
                    )}
                    <div className="flex gap-4 text-sm">
                      {selectedVisit.contact_phone && (
                        <a href={`tel:${selectedVisit.contact_phone}`} className="text-cyan-600">
                          {selectedVisit.contact_phone}
                        </a>
                      )}
                      {selectedVisit.contact_email && (
                        <a href={`mailto:${selectedVisit.contact_email}`} className="text-cyan-600">
                          {selectedVisit.contact_email}
                        </a>
                      )}
                    </div>
                    {!selectedVisit.contact_name && !selectedVisit.contact_phone && !selectedVisit.contact_email && (
                      <p className="text-gray-400 text-sm italic">No contact info recorded</p>
                    )}
                  </>
                )}
              </div>

              {/* Notes Sections */}
              <div className="space-y-4">
                {/* Property Condition */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Property Condition Notes</label>
                  {isEditing ? (
                    <textarea
                      value={editData.property_condition_notes || ""}
                      onChange={(e) => handleEditChange("property_condition_notes", e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                      placeholder="Describe property condition..."
                    />
                  ) : (
                    <p className="text-gray-900 bg-gray-50 rounded-lg p-3 text-sm">
                      {selectedVisit.property_condition_notes || <span className="text-gray-400 italic">No notes</span>}
                    </p>
                  )}
                </div>

                {/* Occupant Situation */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Occupant Situation</label>
                  {isEditing ? (
                    <textarea
                      value={editData.occupant_situation || ""}
                      onChange={(e) => handleEditChange("occupant_situation", e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                      placeholder="Describe occupant situation..."
                    />
                  ) : (
                    <p className="text-gray-900 bg-gray-50 rounded-lg p-3 text-sm">
                      {selectedVisit.occupant_situation || <span className="text-gray-400 italic">No notes</span>}
                    </p>
                  )}
                </div>

                {/* Immediate Needs */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Immediate Needs</label>
                  {isEditing ? (
                    <textarea
                      value={editData.immediate_needs || ""}
                      onChange={(e) => handleEditChange("immediate_needs", e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                      placeholder="Any urgent needs..."
                    />
                  ) : (
                    <p className="text-gray-900 bg-gray-50 rounded-lg p-3 text-sm">
                      {selectedVisit.immediate_needs || <span className="text-gray-400 italic">No notes</span>}
                    </p>
                  )}
                </div>
              </div>

              {/* Follow-up Section */}
              <div className={`rounded-lg p-3 ${selectedVisit.requires_follow_up ? "bg-red-50 border border-red-200" : "bg-gray-50"}`}>
                <h4 className="font-medium text-gray-700 text-sm mb-3">Follow-up</h4>

                {isEditing ? (
                  <div className="space-y-3">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editData.requires_follow_up || false}
                        onChange={(e) => handleEditChange("requires_follow_up", e.target.checked)}
                        className="h-4 w-4 text-cyan-600 rounded"
                      />
                      <span className="text-sm text-gray-700">Requires follow-up</span>
                    </label>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Follow-up Date</label>
                      <input
                        type="date"
                        value={editData.follow_up_date || ""}
                        onChange={(e) => handleEditChange("follow_up_date", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Follow-up Notes</label>
                      <textarea
                        value={editData.follow_up_notes || ""}
                        onChange={(e) => handleEditChange("follow_up_notes", e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                        placeholder="What needs to be done..."
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    {selectedVisit.requires_follow_up ? (
                      <div className="space-y-2">
                        {selectedVisit.follow_up_date && (
                          <p className="text-red-700 font-medium">
                            Due: {formatDate(selectedVisit.follow_up_date)}
                            {extractFollowUpTime(selectedVisit.follow_up_notes) && (
                              <span> at {extractFollowUpTime(selectedVisit.follow_up_notes)}</span>
                            )}
                          </p>
                        )}
                        {selectedVisit.follow_up_notes && (
                          <p className="text-gray-700 text-sm">{selectedVisit.follow_up_notes}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-400 text-sm italic">No follow-up needed</p>
                    )}
                  </>
                )}
              </div>

              {/* Interest Level (editable) */}
              {isEditing && selectedVisit.visit_outcome === "engagement" && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Interest Level</label>
                  <select
                    value={editData.interest_level || ""}
                    onChange={(e) => handleEditChange("interest_level", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                  >
                    <option value="">-- Select --</option>
                    <option value="not_interested">Not Interested</option>
                    <option value="interested_online">Interested - Online Application</option>
                    <option value="applied_with_worker">Applied with Worker</option>
                  </select>
                </div>
              )}

              {/* Admin Notes - Read Only (displayed in red) */}
              {selectedVisit.admin_notes && (
                <div className="bg-red-50 rounded-lg p-3 border-2 border-red-300">
                  <h4 className="font-semibold text-red-700 text-sm mb-2 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Notes from Admin
                  </h4>
                  <p className="text-red-700 text-sm whitespace-pre-wrap">{selectedVisit.admin_notes}</p>
                </div>
              )}

              {/* Quick Actions */}
              {!isEditing && (
                <div className="flex gap-3 pt-2">
                  <Link
                    href={`/worker/visit/new?followup=${selectedVisit.id}&address=${encodeURIComponent(selectedVisit.location_address)}${selectedVisit.applicant_id ? `&applicant=${selectedVisit.applicant_id}` : ""}`}
                    className="flex-1 bg-cyan-600 text-white py-3 rounded-lg text-center font-medium"
                    onClick={closeDetail}
                  >
                    Log Follow-up Visit
                  </Link>
                  {selectedVisit.applicant_id && (
                    <Link
                      href={`/worker/application?applicant=${selectedVisit.applicant_id}`}
                      className="flex-1 bg-green-600 text-white py-3 rounded-lg text-center font-medium"
                      onClick={closeDetail}
                    >
                      View Application
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <Link href="/worker/dashboard" className="text-gray-500 hover:text-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-lg font-bold text-gray-900">My Visits</h1>
            </div>
            <Link
              href="/worker/visit/new"
              className="bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              + New Visit
            </Link>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search visits by address, name, notes..."
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            />
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {filteredVisits.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-500">
            {searchQuery ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p>No visits match "{searchQuery}"</p>
                <button
                  onClick={() => setSearchQuery("")}
                  className="mt-4 text-cyan-600 font-medium"
                >
                  Clear search
                </button>
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p>No visits logged yet.</p>
                <Link
                  href="/worker/visit/new"
                  className="inline-block mt-4 bg-cyan-600 text-white px-6 py-2 rounded-lg font-medium"
                >
                  Log Your First Visit
                </Link>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 mb-2">
              {filteredVisits.length} visit{filteredVisits.length !== 1 ? "s" : ""}
              {searchQuery && ` matching "${searchQuery}"`}
            </p>
            {filteredVisits.map((visit) => (
              <button
                key={visit.id}
                onClick={() => openVisitDetail(visit)}
                className={`w-full text-left rounded-xl p-4 shadow-sm border transition-all hover:shadow-md ${
                  visit.requires_follow_up
                    ? "bg-red-50 border-red-300"
                    : visit.visit_outcome === "attempt"
                    ? "bg-white border-amber-200"
                    : visit.visit_outcome === "engagement"
                    ? "bg-white border-green-200"
                    : "bg-white border-gray-100"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-medium text-gray-900">
                        {visitTypeLabels[visit.visit_type] || visit.visit_type}
                      </span>
                      {visit.visit_outcome && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            visit.visit_outcome === "attempt"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {visit.visit_outcome === "attempt" ? "Attempt" : "Engagement"}
                        </span>
                      )}
                      {visit.requires_follow_up && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                          Follow-up Needed
                        </span>
                      )}
                      {visit.interest_level && INTEREST_LEVEL_LABELS[visit.interest_level] && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${INTEREST_LEVEL_LABELS[visit.interest_level].color}`}>
                          {INTEREST_LEVEL_LABELS[visit.interest_level].label}
                        </span>
                      )}
                      {visit.admin_notes && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium border border-red-300">
                          Admin Note
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{visit.location_address}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDateTime(visit.visit_date)}
                    </p>
                    {visit.contact_name && (
                      <p className="text-xs text-gray-500">Contact: {visit.contact_name}</p>
                    )}
                    {visit.follow_up_date && (
                      <p className="text-xs text-red-600 font-medium mt-1">
                        Follow-up by: {formatDate(visit.follow_up_date)}
                        {extractFollowUpTime(visit.follow_up_notes) && (
                          <span> at {extractFollowUpTime(visit.follow_up_notes)}</span>
                        )}
                      </p>
                    )}
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                {visit.property_condition_notes && (
                  <p className="mt-2 text-sm text-gray-600 bg-gray-50 rounded p-2 line-clamp-2">
                    {visit.property_condition_notes}
                  </p>
                )}
              </button>
            ))}
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2">
        <div className="max-w-7xl mx-auto flex justify-around">
          <Link href="/worker/dashboard" className="flex flex-col items-center text-gray-500 hover:text-cyan-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs mt-1">Home</span>
          </Link>
          <Link href="/worker/cases" className="flex flex-col items-center text-gray-500 hover:text-cyan-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span className="text-xs mt-1">Cases</span>
          </Link>
          <Link href="/worker/visit/new" className="flex flex-col items-center text-gray-500 hover:text-cyan-600">
            <div className="bg-cyan-600 text-white rounded-full p-2 -mt-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <span className="text-xs mt-1">New Visit</span>
          </Link>
          <Link href="/worker/visits" className="flex flex-col items-center text-cyan-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span className="text-xs mt-1">Visits</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
