"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

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
  general_notes?: string;
  requires_follow_up: boolean;
  follow_up_date?: string;
  follow_up_notes?: string;
  applicant_id?: string;
  interest_level?: string;
  latitude?: number;
  longitude?: number;
  admin_notes?: string;
  staff_member?: string;
}

interface UploadedPhoto {
  id: string;
  file_url: string;
  caption?: string;
  photo_type: string;
}

export default function EditVisitPage() {
  const router = useRouter();
  const params = useParams();
  const visitId = params.id as string;

  const [visit, setVisit] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [existingPhotos, setExistingPhotos] = useState<UploadedPhoto[]>([]);
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [locationCaptured, setLocationCaptured] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Larry's email for delete access
  const DELETE_ACCESS_EMAIL = "larry@communitypropertyrescue.com";

  const [formData, setFormData] = useState({
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
    interest_level: "",
    visit_outcome: "",
  });

  useEffect(() => {
    const storedSession = localStorage.getItem("worker_session");
    if (!storedSession) {
      router.push("/worker");
      return;
    }

    try {
      const session = JSON.parse(storedSession);
      setUserEmail(session.user?.email?.toLowerCase() || "");
    } catch {
      // ignore
    }

    fetchVisit();
    fetchPhotos();
  }, [visitId]);

  const fetchVisit = async () => {
    try {
      const response = await fetch(`/api/worker/visits/${visitId}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setVisit(result.data);
        setFormData({
          contact_name: result.data.contact_name || "",
          contact_phone: result.data.contact_phone || "",
          contact_email: result.data.contact_email || "",
          property_condition_notes: result.data.property_condition_notes || "",
          occupant_situation: result.data.occupant_situation || "",
          immediate_needs: result.data.immediate_needs || "",
          general_notes: result.data.general_notes || "",
          requires_follow_up: result.data.requires_follow_up || false,
          follow_up_date: result.data.follow_up_date ? result.data.follow_up_date.substring(0, 10) : "",
          follow_up_notes: result.data.follow_up_notes || "",
          interest_level: result.data.interest_level || "",
          visit_outcome: result.data.visit_outcome || "",
        });
      }
    } catch (err) {
      console.error("Error fetching visit:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPhotos = async () => {
    try {
      const response = await fetch(`/api/worker/visits/${visitId}/photos`);
      const result = await response.json();
      if (response.ok && result.data) {
        setExistingPhotos(result.data);
      }
    } catch (err) {
      console.error("Error fetching photos:", err);
    }
  };

  const captureLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLocationCaptured(true);
        },
        (error) => {
          console.error("Location error:", error);
          alert("Could not get location. Please enable location services.");
        },
        { enableHighAccuracy: true }
      );
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setNewPhotos((prev) => [...prev, ...files]);
    }
  };

  const removeNewPhoto = (index: number) => {
    setNewPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadPhotos = async () => {
    if (newPhotos.length === 0) return;

    setUploadingPhotos(true);
    const storedSession = localStorage.getItem("worker_session");
    if (!storedSession) return;

    const session = JSON.parse(storedSession);

    for (const photo of newPhotos) {
      const formData = new FormData();
      formData.append("file", photo);
      formData.append("visitId", visitId);
      formData.append("photoType", "general");
      formData.append("userId", session.user.id);

      try {
        await fetch("/api/worker/visits/photos", {
          method: "POST",
          body: formData,
        });
      } catch (err) {
        console.error("Error uploading photo:", err);
      }
    }

    setNewPhotos([]);
    fetchPhotos();
    setUploadingPhotos(false);
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this visit? This cannot be undone.")) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/worker/visits/${visitId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        router.push("/worker/visits");
      } else {
        alert("Failed to delete visit");
      }
    } catch (err) {
      console.error("Error deleting:", err);
      alert("Failed to delete visit");
    } finally {
      setDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Upload any new photos first
      if (newPhotos.length > 0) {
        await uploadPhotos();
      }

      // Prepare update data
      const updateData: Record<string, unknown> = { ...formData };

      // Add location if captured
      if (currentLocation) {
        updateData.edit_latitude = currentLocation.lat;
        updateData.edit_longitude = currentLocation.lng;
      }

      const response = await fetch(`/api/worker/visits/${visitId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        router.push("/worker/visits");
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

  if (!visit) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Visit not found</p>
          <Link href="/worker/visits" className="text-cyan-600">
            Back to Visits
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-lg font-bold text-gray-900">Edit Visit</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Visit Info (read-only) */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-3">Visit Info</h2>
            <p className="text-sm text-gray-600">{visit.location_address}</p>
            <p className="text-sm text-gray-500">
              {new Date(visit.visit_date).toLocaleDateString("en-US", {
                timeZone: "America/Los_Angeles",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            <div className="flex gap-2 mt-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                visit.visit_outcome === "attempt" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"
              }`}>
                {visit.visit_outcome === "attempt" ? "Attempt" : "Engagement"}
              </span>
            </div>
          </div>

          {/* Admin Notes (read-only if exists) */}
          {visit.admin_notes && (
            <div className="bg-red-50 rounded-xl p-4 shadow-sm border-2 border-red-200">
              <h2 className="font-semibold text-red-700 mb-2 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Notes from Admin
              </h2>
              <p className="text-red-700 text-sm">{visit.admin_notes}</p>
            </div>
          )}

          {/* Capture Location */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-3">Location</h2>
            <button
              type="button"
              onClick={captureLocation}
              className={`w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 ${
                locationCaptured
                  ? "bg-green-100 text-green-700 border border-green-300"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {locationCaptured ? "Location Captured" : "Capture Current Location"}
            </button>
            {currentLocation && (
              <p className="text-xs text-gray-500 mt-2 text-center">
                {currentLocation.lat.toFixed(5)}, {currentLocation.lng.toFixed(5)}
              </p>
            )}
          </div>

          {/* Contact Info */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-3">Contact Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                <input
                  type="text"
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Outcome */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-3">Visit Outcome</h2>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="outcome"
                  value="attempt"
                  checked={formData.visit_outcome === "attempt"}
                  onChange={(e) => setFormData({ ...formData, visit_outcome: e.target.value })}
                  className="mr-2"
                />
                Attempt (No Contact)
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="outcome"
                  value="engagement"
                  checked={formData.visit_outcome === "engagement"}
                  onChange={(e) => setFormData({ ...formData, visit_outcome: e.target.value })}
                  className="mr-2"
                />
                Engagement
              </label>
            </div>

            {formData.visit_outcome === "engagement" && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Interest Level</label>
                <select
                  value={formData.interest_level}
                  onChange={(e) => setFormData({ ...formData, interest_level: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                >
                  <option value="">-- Select --</option>
                  <option value="not_interested">Not Interested</option>
                  <option value="interested_online">Interested - Online Application</option>
                  <option value="applied_with_worker">Applied with Worker</option>
                </select>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-3">Notes</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Property Condition</label>
                <textarea
                  value={formData.property_condition_notes}
                  onChange={(e) => setFormData({ ...formData, property_condition_notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Occupant Situation</label>
                <textarea
                  value={formData.occupant_situation}
                  onChange={(e) => setFormData({ ...formData, occupant_situation: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Immediate Needs</label>
                <textarea
                  value={formData.immediate_needs}
                  onChange={(e) => setFormData({ ...formData, immediate_needs: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">General Notes</label>
                <textarea
                  value={formData.general_notes}
                  onChange={(e) => setFormData({ ...formData, general_notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                />
              </div>
            </div>
          </div>

          {/* Follow-up */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-3">Follow-up</h2>
            <label className="flex items-center mb-4">
              <input
                type="checkbox"
                checked={formData.requires_follow_up}
                onChange={(e) => setFormData({ ...formData, requires_follow_up: e.target.checked })}
                className="mr-2 h-4 w-4 text-cyan-600"
              />
              Requires follow-up
            </label>
            {formData.requires_follow_up && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Follow-up Date</label>
                  <input
                    type="date"
                    value={formData.follow_up_date}
                    onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Follow-up Notes</label>
                  <textarea
                    value={formData.follow_up_notes}
                    onChange={(e) => setFormData({ ...formData, follow_up_notes: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Photos */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-3">Photos & Documents</h2>

            {/* Existing Photos */}
            {existingPhotos.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Existing ({existingPhotos.length})</p>
                <div className="grid grid-cols-3 gap-2">
                  {existingPhotos.map((photo) => (
                    <a
                      key={photo.id}
                      href={photo.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="aspect-square rounded-lg overflow-hidden border border-gray-200"
                    >
                      <img
                        src={photo.file_url}
                        alt={photo.caption || "Visit photo"}
                        className="w-full h-full object-cover"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* New Photos */}
            {newPhotos.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">New uploads ({newPhotos.length})</p>
                <div className="grid grid-cols-3 gap-2">
                  {newPhotos.map((photo, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-cyan-300 bg-cyan-50">
                      <img
                        src={URL.createObjectURL(photo)}
                        alt="New upload"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeNewPhoto(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Button */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*,.pdf,.doc,.docx"
              multiple
              onChange={handlePhotoSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-cyan-400 hover:text-cyan-600 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Photos or Documents
            </button>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={saving || uploadingPhotos}
            className="w-full bg-cyan-600 text-white py-4 rounded-xl font-semibold hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving || uploadingPhotos ? "Saving..." : "Save Changes"}
          </button>

          {/* Delete button - only for Larry */}
          {userEmail === DELETE_ACCESS_EMAIL && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="w-full mt-4 bg-red-600 text-white py-4 rounded-xl font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting ? "Deleting..." : "Delete Visit"}
            </button>
          )}
        </form>
      </main>
    </div>
  );
}
