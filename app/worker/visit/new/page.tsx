"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

interface WorkerSession {
  user: { id: string; email: string };
  profile: { full_name: string };
  session: { access_token: string };
}

interface PhotoPreview {
  id: string;
  file: File;
  preview: string;
  caption: string;
  photo_type: string;
}

interface AssignedCase {
  id: string;
  full_name: string;
  property_address: string;
}

interface SearchResult {
  id: string;
  full_name: string;
  phone_number: string;
  email: string;
  property_address: string;
  property_city: string;
  property_county: string;
  property_zip: string;
  status: string;
}

export default function NewFieldVisitPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [session, setSession] = useState<WorkerSession | null>(null);
  const [assignedCases, setAssignedCases] = useState<AssignedCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [photos, setPhotos] = useState<PhotoPreview[]>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState("");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedApplicant, setSelectedApplicant] = useState<SearchResult | null>(null);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Browse all state
  const [showBrowseAll, setShowBrowseAll] = useState(false);
  const [allApplications, setAllApplications] = useState<SearchResult[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);

  const [formData, setFormData] = useState({
    applicant_id: "",
    visit_type: "initial-contact",
    visit_outcome: "attempt", // attempt or engagement
    location_address: "",
    contact_name: "",
    contact_phone: "",
    contact_email: "",
    property_condition_notes: "",
    occupant_situation: "",
    immediate_needs: "",
    general_notes: "",
    requires_follow_up: false,
    follow_up_date: "",
    follow_up_notes: "",
    interest_level: "", // not_interested, interested_online, applied_with_worker
  });

  useEffect(() => {
    const storedSession = localStorage.getItem("worker_session");
    if (!storedSession) {
      router.push("/worker");
      return;
    }

    try {
      const parsed = JSON.parse(storedSession);
      setSession(parsed);
      fetchAssignedCases(parsed.user.id);
      getLocation();
    } catch {
      router.push("/worker");
    }
  }, [router]);

  const fetchAssignedCases = async (userId: string) => {
    try {
      const response = await fetch(`/api/worker/cases?userId=${userId}`);
      const result = await response.json();
      if (response.ok) {
        setAssignedCases(result.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch cases:", err);
    } finally {
      setLoading(false);
    }
  };

  const getLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          setLocationError("Could not get location: " + error.message);
        },
        { enableHighAccuracy: true }
      );
    }
  };

  // Search for applicants/properties
  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    // Debounce search
    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(`/api/applicants/search?q=${encodeURIComponent(query)}`);
        const result = await response.json();
        if (response.ok) {
          setSearchResults(result.data || []);
          setShowSearchResults(true);
        }
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setSearching(false);
      }
    }, 300);
  };

  const selectApplicant = (applicant: SearchResult) => {
    setSelectedApplicant(applicant);
    setFormData((prev) => ({
      ...prev,
      applicant_id: applicant.id,
      location_address: applicant.property_address,
      contact_name: applicant.full_name,
      contact_phone: applicant.phone_number,
      contact_email: applicant.email,
    }));
    setSearchQuery("");
    setShowSearchResults(false);
  };

  const clearSelectedApplicant = () => {
    setSelectedApplicant(null);
    setFormData((prev) => ({
      ...prev,
      applicant_id: "",
      location_address: "",
      contact_name: "",
      contact_phone: "",
      contact_email: "",
    }));
  };

  // Fetch all applications for browsing
  const fetchAllApplications = async () => {
    if (allApplications.length > 0) {
      setShowBrowseAll(true);
      return;
    }

    setLoadingAll(true);
    try {
      const response = await fetch("/api/applications");
      const result = await response.json();
      if (response.ok && result.data) {
        const mapped = result.data.map((app: any) => ({
          id: app.id,
          full_name: app.full_name,
          phone_number: app.phone_number,
          email: app.email,
          property_address: app.property_address,
          property_city: app.property_city || "",
          property_county: app.property_county,
          property_zip: app.property_zip,
          status: app.status,
        }));
        setAllApplications(mapped);
        setShowBrowseAll(true);
      }
    } catch (err) {
      console.error("Failed to fetch applications:", err);
    } finally {
      setLoadingAll(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    // Auto-fill address when case is selected
    if (name === "applicant_id" && value) {
      const selectedCase = assignedCases.find((c) => c.id === value);
      if (selectedCase) {
        setFormData((prev) => ({
          ...prev,
          applicant_id: value,
          location_address: selectedCase.property_address,
          contact_name: selectedCase.full_name,
        }));
      }
    }
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newPhoto: PhotoPreview = {
          id: Math.random().toString(36).substring(7),
          file,
          preview: reader.result as string,
          caption: "",
          photo_type: "exterior",
        };
        setPhotos((prev) => [...prev, newPhoto]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const updatePhotoMeta = (id: string, field: string, value: string) => {
    setPhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const uploadPhoto = async (photo: PhotoPreview, visitId: string) => {
    const formData = new FormData();
    formData.append("file", photo.file);
    formData.append("visitId", visitId);
    formData.append("caption", photo.caption);
    formData.append("photo_type", photo.photo_type);
    if (location) {
      formData.append("latitude", location.lat.toString());
      formData.append("longitude", location.lng.toString());
    }

    const response = await fetch("/api/worker/photos", {
      method: "POST",
      body: formData,
    });

    return response.ok;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    // Validate: Interest level is required
    if (!formData.interest_level) {
      alert("Please select the client's interest level before saving.");
      return;
    }

    // Validate: Attempts require at least one photo
    if (formData.visit_outcome === "attempt" && photos.length === 0) {
      alert("Photo required for visit attempts. Please take a photo to verify you were at the location.");
      return;
    }

    setSubmitting(true);

    try {
      // Auto-set follow-up for attempts
      const requiresFollowUp = formData.visit_outcome === "attempt" ? true : formData.requires_follow_up;

      // Set follow-up date to 3 days from now for attempts if not already set
      let followUpDate = formData.follow_up_date;
      if (formData.visit_outcome === "attempt" && !followUpDate) {
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
        followUpDate = threeDaysFromNow.toISOString().split("T")[0];
      }

      // Create field visit
      const visitData = {
        ...formData,
        applicant_id: formData.applicant_id || null,
        staff_member: session.user.id,
        visit_date: new Date().toISOString(),
        latitude: location?.lat || null,
        longitude: location?.lng || null,
        is_synced: true,
        requires_follow_up: requiresFollowUp,
        follow_up_date: followUpDate || null,
        follow_up_notes: formData.visit_outcome === "attempt" && !formData.follow_up_notes
          ? "Auto-scheduled: Return visit needed - no one was home"
          : formData.follow_up_notes,
      };

      const response = await fetch("/api/worker/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(visitData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create visit");
      }

      // Upload photos
      if (photos.length > 0 && result.data?.id) {
        await Promise.all(photos.map((photo) => uploadPhoto(photo, result.data.id)));
      }

      // Redirect to dashboard
      router.push("/worker/dashboard");
    } catch (err) {
      console.error("Submit error:", err);
      alert(err instanceof Error ? err.message : "Failed to submit visit");
    } finally {
      setSubmitting(false);
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
      {/* Browse All Applications Modal */}
      {showBrowseAll && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full max-w-lg max-h-[85vh] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <h3 className="font-semibold text-gray-900">All Applications ({allApplications.length})</h3>
              <button
                type="button"
                onClick={() => setShowBrowseAll(false)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              {allApplications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p>No applications found</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {allApplications.map((app) => (
                    <button
                      key={app.id}
                      type="button"
                      onClick={() => {
                        selectApplicant(app);
                        setShowBrowseAll(false);
                      }}
                      className="w-full text-left px-4 py-4 hover:bg-cyan-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{app.full_name}</p>
                          <p className="text-sm text-gray-700 truncate">{app.property_address}</p>
                          <p className="text-xs text-gray-500">
                            {app.property_city}{app.property_city && app.property_county ? ", " : ""}{app.property_county} {app.property_zip}
                          </p>
                          {app.phone_number && (
                            <p className="text-xs text-gray-500 mt-1">{app.phone_number}</p>
                          )}
                        </div>
                        <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium shrink-0 ${
                          app.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                          app.status === "in-progress" ? "bg-blue-100 text-blue-800" :
                          app.status === "approved" ? "bg-green-100 text-green-800" :
                          "bg-gray-100 text-gray-800"
                        }`}>
                          {app.status}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link href="/worker/dashboard" className="text-gray-500 hover:text-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-lg font-bold text-gray-900">New Field Visit</h1>
            </div>
            {location && (
              <span className="text-green-600 text-sm flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                GPS Active
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Property/Customer Search */}
          <section className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-4">Find Property / Customer</h2>

            <div className="space-y-4">
              {/* Search Box */}
              {!selectedApplicant ? (
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Search by name, address, phone, or email
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      placeholder="Start typing to search..."
                      className="w-full px-3 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-gray-900 placeholder-gray-400"
                    />
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    {searching && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-cyan-600"></div>
                      </div>
                    )}
                  </div>

                  {/* Search Results Dropdown */}
                  {showSearchResults && searchResults.length > 0 && (
                    <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                      {searchResults.map((result) => (
                        <button
                          key={result.id}
                          type="button"
                          onClick={() => selectApplicant(result)}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                        >
                          <p className="font-medium text-gray-900">{result.full_name}</p>
                          <p className="text-sm text-gray-600">{result.property_address}</p>
                          <p className="text-xs text-gray-500">
                            {result.property_city}, {result.property_county} {result.property_zip}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}

                  {showSearchResults && searchResults.length === 0 && searchQuery.length >= 2 && !searching && (
                    <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-gray-500">
                      No properties found matching "{searchQuery}"
                    </div>
                  )}

                  <div className="flex gap-2 mt-3">
                    <button
                      type="button"
                      onClick={fetchAllApplications}
                      disabled={loadingAll}
                      className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                      {loadingAll ? "Loading..." : "Browse All Applications"}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Or leave empty for a new/untracked property visit
                  </p>
                </div>
              ) : (
                /* Selected Property Card */
                <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-cyan-900">{selectedApplicant.full_name}</p>
                      <p className="text-sm text-cyan-700">{selectedApplicant.property_address}</p>
                      <p className="text-xs text-cyan-600">
                        {selectedApplicant.property_city}, {selectedApplicant.property_county} {selectedApplicant.property_zip}
                      </p>
                      <p className="text-xs text-cyan-600 mt-1">
                        {selectedApplicant.phone_number} • {selectedApplicant.email}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={clearSelectedApplicant}
                      className="text-cyan-600 hover:text-cyan-800 p-1"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {/* Quick select from assigned cases */}
              {!selectedApplicant && assignedCases.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Or select from your assigned cases:</p>
                  <div className="space-y-2">
                    {assignedCases.slice(0, 3).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            applicant_id: c.id,
                            location_address: c.property_address,
                            contact_name: c.full_name,
                          }));
                          setSelectedApplicant({
                            id: c.id,
                            full_name: c.full_name,
                            property_address: c.property_address,
                            phone_number: "",
                            email: "",
                            property_city: "",
                            property_county: "",
                            property_zip: "",
                            status: "",
                          });
                        }}
                        className="w-full text-left px-3 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <p className="font-medium text-gray-900 text-sm">{c.full_name}</p>
                        <p className="text-xs text-gray-600">{c.property_address}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Visit Outcome - Attempt vs Engagement */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Visit Outcome *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, visit_outcome: "attempt" }))}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${
                      formData.visit_outcome === "attempt"
                        ? "border-amber-500 bg-amber-50 text-amber-700"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    <span className="font-semibold block">Attempt</span>
                    <span className="text-xs">No one home</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, visit_outcome: "engagement" }))}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${
                      formData.visit_outcome === "engagement"
                        ? "border-green-500 bg-green-50 text-green-700"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span className="font-semibold block">Engagement</span>
                    <span className="text-xs">Met with client</span>
                  </button>
                </div>
                {formData.visit_outcome === "attempt" && (
                  <p className="mt-2 text-sm text-amber-600 bg-amber-50 p-2 rounded-lg">
                    Photo required to verify visit attempt. A follow-up reminder will be scheduled.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Visit Type *
                </label>
                <select
                  name="visit_type"
                  value={formData.visit_type}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-gray-900 placeholder-gray-400"
                >
                  <option value="initial-contact">Initial Contact</option>
                  <option value="follow-up">Follow Up</option>
                  <option value="property-inspection">Property Inspection</option>
                  <option value="document-collection">Document Collection</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address *
                </label>
                <input
                  type="text"
                  name="location_address"
                  value={formData.location_address}
                  onChange={handleInputChange}
                  required
                  placeholder="Property address"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-gray-900 placeholder-gray-400"
                />
              </div>
            </div>
          </section>

          {/* Contact Info */}
          <section className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-4">Contact Information</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Name
                </label>
                <input
                  type="text"
                  name="contact_name"
                  value={formData.contact_name}
                  onChange={handleInputChange}
                  placeholder="Name of person contacted"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-gray-900 placeholder-gray-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    name="contact_phone"
                    value={formData.contact_phone}
                    onChange={handleInputChange}
                    placeholder="Phone number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-gray-900 placeholder-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="contact_email"
                    value={formData.contact_email}
                    onChange={handleInputChange}
                    placeholder="Email address"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-gray-900 placeholder-gray-400"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Visit Notes */}
          <section className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-4">Visit Details</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Property Condition
                </label>
                <textarea
                  name="property_condition_notes"
                  value={formData.property_condition_notes}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Describe the condition of the property..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-gray-900 placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Occupant Situation
                </label>
                <textarea
                  name="occupant_situation"
                  value={formData.occupant_situation}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Describe the occupant's current situation..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-gray-900 placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Immediate Needs
                </label>
                <textarea
                  name="immediate_needs"
                  value={formData.immediate_needs}
                  onChange={handleInputChange}
                  rows={2}
                  placeholder="Any urgent needs identified..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-gray-900 placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  General Notes
                </label>
                <textarea
                  name="general_notes"
                  value={formData.general_notes}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Any additional notes..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-gray-900 placeholder-gray-400"
                />
              </div>
            </div>
          </section>

          {/* Photos */}
          <section className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-4">Photos</h2>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              capture="environment"
              multiple
              onChange={handlePhotoCapture}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-cyan-400 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-gray-600">Tap to take or select photos</p>
            </button>

            {photos.length > 0 && (
              <div className="mt-4 space-y-4">
                {photos.map((photo) => (
                  <div key={photo.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex gap-3">
                      <img
                        src={photo.preview}
                        alt="Preview"
                        className="w-24 h-24 object-cover rounded-lg"
                      />
                      <div className="flex-1 space-y-2">
                        <select
                          value={photo.photo_type}
                          onChange={(e) => updatePhotoMeta(photo.id, "photo_type", e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded text-gray-900"
                        >
                          <option value="exterior">Exterior</option>
                          <option value="interior">Interior</option>
                          <option value="damage">Damage</option>
                          <option value="document">Document</option>
                          <option value="other">Other</option>
                        </select>
                        <input
                          type="text"
                          value={photo.caption}
                          onChange={(e) => updatePhotoMeta(photo.id, "caption", e.target.value)}
                          placeholder="Add caption..."
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded text-gray-900"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(photo.id)}
                          className="text-red-600 text-sm hover:text-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Follow Up & Interest Level */}
          <section className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-4">Follow Up & Interest Level</h2>

            <div className="space-y-4">
              {/* Interest Level - Required */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client Interest Level *
                </label>
                <select
                  name="interest_level"
                  value={formData.interest_level}
                  onChange={handleInputChange}
                  required
                  className={`w-full px-3 py-3 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-gray-900 ${
                    !formData.interest_level ? "border-red-300 bg-red-50" : "border-gray-300"
                  }`}
                >
                  <option value="">-- Select Interest Level --</option>
                  <option value="not_interested">Not Interested</option>
                  <option value="interested_online">Interested - Online Application</option>
                  <option value="applied_with_worker">Applied with Worker</option>
                </select>
                {!formData.interest_level && (
                  <p className="mt-1 text-sm text-red-600">Required: Please select the client's interest level</p>
                )}
              </div>

              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  name="requires_follow_up"
                  checked={formData.requires_follow_up}
                  onChange={handleInputChange}
                  className="h-5 w-5 text-cyan-600 rounded focus:ring-cyan-500"
                />
                <span className="text-gray-700">Requires follow-up visit</span>
              </label>

              {formData.requires_follow_up && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Follow-up Date
                    </label>
                    <input
                      type="date"
                      name="follow_up_date"
                      value={formData.follow_up_date}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-gray-900 placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Follow-up Notes
                    </label>
                    <textarea
                      name="follow_up_notes"
                      value={formData.follow_up_notes}
                      onChange={handleInputChange}
                      rows={2}
                      placeholder="What needs to be done on follow-up..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-gray-900 placeholder-gray-400"
                    />
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Location Error */}
          {locationError && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg text-sm">
              {locationError}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-cyan-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:bg-cyan-700 focus:ring-4 focus:ring-cyan-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Saving Visit..." : "Save Field Visit"}
          </button>
        </form>
      </main>
    </div>
  );
}
