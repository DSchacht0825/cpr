"use client";

import { useState } from "react";

interface UpdateStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (status: string, note?: string) => Promise<void>;
  currentStatus: string;
}

export default function UpdateStatusModal({
  isOpen,
  onClose,
  onSave,
  currentStatus,
}: UpdateStatusModalProps) {
  const [newStatus, setNewStatus] = useState(currentStatus);
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      await onSave(newStatus, note);
      setNote("");
      onClose();
    } catch (error) {
      console.error("Error updating status:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "contacted":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "in-progress":
        return "bg-cyan-100 text-cyan-800 border-cyan-300";
      case "qualified":
        return "bg-green-100 text-green-800 border-green-300";
      case "closed":
        return "bg-gray-100 text-gray-800 border-gray-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Update Status</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label mb-3">Select New Status</label>
              <div className="space-y-2">
                {["pending", "contacted", "in-progress", "qualified", "closed"].map((status) => (
                  <label
                    key={status}
                    className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      newStatus === status
                        ? getStatusColor(status) + " border-current"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="status"
                      value={status}
                      checked={newStatus === status}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300"
                    />
                    <span className="ml-3 font-medium capitalize">{status.replace("-", " ")}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="note" className="label">
                Note (optional)
              </label>
              <textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="input-field"
                rows={3}
                placeholder="Add a note about this status change..."
              />
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving || newStatus === currentStatus}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {isSaving ? "Updating..." : "Update Status"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
