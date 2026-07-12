import React, { useState } from "react";
import { X, Plus, Terminal, HelpCircle } from "lucide-react";

interface AddRecordModalProps {
  onClose: () => void;
  onSubmit: (data: any) => Promise<boolean>;
}

export default function AddRecordModal({ onClose, onSubmit }: AddRecordModalProps) {
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brand.trim() || !model.trim()) {
      setError("Brand and Model name are required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload = {
      brand: brand.trim(),
      model: model.trim(),
      year: new Date().getFullYear(),
      price: price ? Number(price) : null,
      type: "Showroom",
      description: description.trim()
    };

    try {
      const success = await onSubmit(payload);
      if (success) {
        onClose();
      } else {
        setError("PocketBase rejected the submission. Ensure the 'carmodel' collection exists and public 'Create' rule is set to empty string (unlocked).");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      {/* Click outside to close */}
      <div className="absolute inset-0 cursor-default" onClick={onClose} />

      {/* Modal box */}
      <div className="relative bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 z-10 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100">
          <div>
            <h3 className="font-display font-semibold text-slate-900 text-lg">Add New Car Model</h3>
            <p className="text-xs text-slate-400 font-sans mt-0.5">Send a real POST request to local PocketBase</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-950 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 text-xs rounded-xl leading-relaxed font-sans">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-500">Brand / Manufacturer *</label>
              <input
                type="text"
                required
                placeholder="e.g. Tesla"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-50/50 focus:bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-sans"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-500">Model Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Model Y"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-50/50 focus:bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-sans"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-500">Price (PLN)</label>
            <div className="relative flex items-center">
              <input
                type="number"
                placeholder="e.g. 180000"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full pl-3 pr-12 py-2 bg-slate-50 hover:bg-slate-50/50 focus:bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
              />
              <span className="absolute right-3 text-slate-400 text-xs font-mono">PLN</span>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-500">Short Description</label>
            <textarea
              placeholder="Provide clean technical or model summary details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-50/50 focus:bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-sans resize-none"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-semibold shadow-sm transition-all text-white cursor-pointer ${
                submitting 
                  ? "bg-slate-300 cursor-not-allowed" 
                  : "bg-slate-900 hover:bg-slate-800"
              }`}
            >
              <Plus size={14} />
              <span>{submitting ? "Adding Record..." : "Add to PocketBase"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
