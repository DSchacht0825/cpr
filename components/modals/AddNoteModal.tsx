"use client";

import { useState, useEffect } from "react";

interface AddNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (noteData: any) => Promise<void>;
  applicantId: string;
}

export default function AddNoteModal({ isOpen, onClose, onSave, applicantId }: AddNoteModalProps) {
  const [eventType, setEventType] = useState("note");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contactMethod, setContactMethod] = useState("");
  const [outcome, setOutcome] = useState("");
  const [nextSteps, setNextSteps] = useState("");
  const [isMilestone, setIsMilestone] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null>(null);
  const [locationStatus, setLocationStatus] = useState<"loading" | "success" | "error" | "denied">("loading");

  // Capture GPS location when modal opens
  useEffect(() => {
    if (isOpen && "geolocation" in navigator) {
      setLocationStatus("loading");
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
          setLocationStatus("success");
        },
        (error) => {
          console.error("Error getting location:", error);
          setLocationStatus(error.code === error.PERMISSION_DENIED ? "denied" : "error");
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      await onSave({
        applicant_id: applicantId,
        event_type: eventType,
        title,
        description,
        contact_method: contactMethod || null,
        outcome: outcome || null,
        next_steps: nextSteps || null,
        is_milestone: isMilestone,
        is_urgent: isUrgent,
        latitude: location?.latitude || null,
        longitude: location?.longitude || null,
        location_accuracy: location?.accuracy || null,
      });

      // Reset form
      setEventType("note");
      setTitle("");
      setDescription("");
      setContactMethod("");
      setOutcome("");
      setNextSteps("");
      setIsMilestone(false);
      setIsUrgent(false);
      onClose();
    } catch (error) {
      console.error("Error saving note:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Add Interaction</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="eventType" className="label">
                Interaction Type <span className="text-red-500">*</span>
              </label>
              <select
                id="eventType"
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="input-field"
                required
              >
                <option value="note">General Note</option>
                <option value="contact">Contact/Call</option>
                <option value="meeting">Meeting</option>
                <option value="document-received">Document Received</option>
                <option value="status-change">Status Change</option>
                <option value="milestone">Milestone</option>
              </select>
            </div>

            <div>
              <label htmlFor="title" className="label">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input-field"
                placeholder="Brief title for this interaction..."
                required
              />
            </div>

            <div>
              <label htmlFor="description" className="label">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input-field"
                rows={4}
                placeholder="Detailed notes about this interaction..."
              />
            </div>

            {(eventType === "contact" || eventType === "meeting") && (
              <>
                <div>
                  <label htmlFor="contactMethod" className="label">
                    Contact Method
                  </label>
                  <select
                    id="contactMethod"
                    value={contactMethod}
                    onChange={(e) => setContactMethod(e.target.value)}
                    className="input-field"
                  >
                    <option value="">Select method...</option>
                    <option value="phone">Phone</option>
                    <option value="email">Email</option>
                    <option value="in-person">In Person</option>
                    <option value="text">Text Message</option>
                    <option value="video">Video Call</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="outcome" className="label">
                    Outcome
                  </label>
                  <input
                    type="text"
                    id="outcome"
                    value={outcome}
                    onChange={(e) => setOutcome(e.target.value)}
                    className="input-field"
                    placeholder="What was the result of this interaction?"
                  />
                </div>
              </>
            )}

            <div>
              <label htmlFor="nextSteps" className="label">
                Next Steps
              </label>
              <textarea
                id="nextSteps"
                value={nextSteps}
                onChange={(e) => setNextSteps(e.target.value)}
                className="input-field"
                rows={2}
                placeholder="What needs to happen next?"
              />
            </div>

            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isMilestone}
                  onChange={(e) => setIsMilestone(e.target.checked)}
                  className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Mark as milestone</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isUrgent}
                  onChange={(e) => setIsUrgent(e.target.checked)}
                  className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Mark as urgent</span>
              </label>
            </div>

            {/* GPS Location Status */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                {locationStatus === "loading" && (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-cyan-600 border-t-transparent rounded-full"></div>
                    <span className="text-sm text-gray-600">Getting your location...</span>
                  </>
                )}
                {locationStatus === "success" && location && (
                  <>
                    <span className="text-green-600">📍</span>
                    <span className="text-sm text-gray-700">
                      Location captured (±{Math.round(location.accuracy)}m accuracy)
                    </span>
                  </>
                )}
                {locationStatus === "denied" && (
                  <>
                    <span className="text-yellow-600">⚠️</span>
                    <span className="text-sm text-gray-600">
                      Location permission denied - interaction will be saved without GPS
                    </span>
                  </>
                )}
                {locationStatus === "error" && (
                  <>
                    <span className="text-gray-400">📍</span>
                    <span className="text-sm text-gray-500">
                      Could not get location - interaction will be saved without GPS
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Interaction"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
