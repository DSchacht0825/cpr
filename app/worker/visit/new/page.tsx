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

  const [formData, setFormData] = useState({
    applicant_id: "",
    visit_type: "initial-contact",
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

    setSubmitting(true);

    try {
      // Create field visit
      const visitData = {
        ...formData,
        applicant_id: formData.applicant_id || null,
        staff_member: session.user.id,
        visit_date: new Date().toISOString(),
        latitude: location?.lat || null,
        longitude: location?.lng || null,
        is_synced: true,
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
          {/* Case Selection */}
          <section className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-4">Case Information</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Link to Assigned Case (Optional)
                </label>
                <select
                  name="applicant_id"
                  value={formData.applicant_id}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                >
                  <option value="">-- New/Unassigned Visit --</option>
                  {assignedCases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name} - {c.property_address}
                    </option>
                  ))}
                </select>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
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
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
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
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
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

          {/* Follow Up */}
          <section className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-4">Follow Up</h2>

            <div className="space-y-4">
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
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
