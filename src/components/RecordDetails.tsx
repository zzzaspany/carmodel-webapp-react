import React, { useState } from "react";
import { X, Trash2, Calendar, HardDrive, Coins, Tag, Info, Code, FileText, Check } from "lucide-react";
import { CarModelRecord } from "../types";

interface RecordDetailsProps {
  car: CarModelRecord;
  serverUrl: string;
  onClose: () => void;
  onDelete: (id: string) => Promise<void>;
}

export default function RecordDetails({ car, serverUrl, onClose, onDelete }: RecordDetailsProps) {
  const [activeTab, setActiveTab] = useState<"visual" | "json">("visual");
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const getBrandAndModel = () => {
    if (car.brand || car.make || car.model || car.name) {
      return {
        brand: car.brand || car.make || "Unknown Brand",
        model: car.model || car.name || "—"
      };
    }
    if (car.title) {
      const titleParts = car.title.trim().split(/\s+/);
      if (titleParts.length > 1) {
        return {
          brand: titleParts[0],
          model: titleParts.slice(1).join(" ")
        };
      } else if (titleParts.length === 1) {
        return {
          brand: titleParts[0],
          model: ""
        };
      }
    }
    return {
      brand: "Unknown Brand",
      model: `Record: ${car.id.slice(0, 8)}`
    };
  };

  const { brand, model } = getBrandAndModel();
  const price = car.price ? Number(car.price) : null;
  const description = car.description || "";

  // Image resolution with robust array and string handling
  const getImageFilename = () => {
    const isImageFile = (str: string): boolean => {
      if (typeof str !== "string") return false;
      const lower = str.toLowerCase();
      return (
        lower.endsWith(".jpg") ||
        lower.endsWith(".jpeg") ||
        lower.endsWith(".png") ||
        lower.endsWith(".webp") ||
        lower.endsWith(".svg") ||
        lower.endsWith(".gif")
      );
    };

    const resolveField = (val: any): string | null => {
      if (!val) return null;
      if (Array.isArray(val)) {
        const first = val.length > 0 ? val[0] : null;
        if (first && typeof first === "string") return first;
        return null;
      }
      if (typeof val === "string" && val.trim() !== "") {
        if (val.startsWith("[") && val.endsWith("]")) {
          try {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const first = parsed[0];
              if (first && typeof first === "string") return first;
            }
          } catch (e) {
            // ignore
          }
        }
        return val;
      }
      return null;
    };

    // 1. Try known fields first
    const candidates = [car.image, car.photo, car.imageUrl, car.pic, car.photos];
    for (const cand of candidates) {
      const resolved = resolveField(cand);
      if (resolved && isImageFile(resolved)) return resolved;
    }

    // 2. Dynamic scan of all object values for image extensions
    for (const [key, value] of Object.entries(car)) {
      // Skip system metadata keys
      if (["id", "collectionId", "collectionName", "created", "updated"].includes(key)) {
        continue;
      }
      const resolved = resolveField(value);
      if (resolved && isImageFile(resolved)) {
        return resolved;
      }
    }

    // 3. Fallback to any non-null resolved candidate if we couldn't find an image extension specifically
    for (const cand of candidates) {
      const resolved = resolveField(cand);
      if (resolved) return resolved;
    }

    return null;
  };

  const imageFilename = getImageFilename();
  const hasImage = typeof imageFilename === "string" && imageFilename.trim() !== "" && !imageFilename.startsWith("http");
  
  const cleanServerUrl = serverUrl.replace(/\/$/, "");
  const imageUrl = hasImage 
    ? `${cleanServerUrl}/api/files/${car.collectionId || car.collectionName}/${car.id}/${imageFilename}`
    : typeof imageFilename === "string" && imageFilename.startsWith("http")
    ? imageFilename
    : null;

  // Filter out system fields for metadata listing
  const systemKeys = ["id", "collectionId", "collectionName", "created", "updated", "expand"];
  const customFields = Object.entries(car).filter(([key]) => !systemKeys.includes(key));

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(car.id);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex justify-end transition-opacity">
      {/* Backdrop overlay closer */}
      <div className="absolute inset-0 cursor-default" onClick={onClose} />

      {/* Slide-over panel */}
      <div className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col z-10 border-l border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex flex-col">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">carmodel details</span>
            <h2 className="font-display font-semibold text-slate-900 text-lg">
              {brand} {model}
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-950 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>        {/* Dynamic content scrollable area (Purely visual customer-facing catalog details) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Large Image Banner */}
          {imageUrl ? (
            <div className="relative w-full h-56 rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
              <img 
                src={imageUrl} 
                alt={`${brand} ${model}`}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          ) : (
            <div className="w-full h-36 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center p-6 text-center">
              <HardDrive size={32} className="text-slate-400 mb-2 stroke-[1.2]" />
              <p className="text-xs text-slate-500 font-medium font-sans">No Image Visual Available</p>
            </div>
          )}

          {/* Prestige Pricing & Status Display */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <Coins size={16} />
              </div>
              <div>
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Price</div>
                <div className="text-sm font-sans font-bold text-slate-900">
                  {price !== null ? `${price.toLocaleString()} PLN` : "Price Upon Inquiry"}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Check size={16} />
              </div>
              <div>
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Showroom Status</div>
                <div className="text-sm font-sans font-bold text-slate-900">Exclusive Display</div>
              </div>
            </div>
          </div>

          {/* Description Block */}
          {description ? (
            <div className="space-y-2">
              <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">About this masterpiece</h3>
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                <p className="text-xs text-slate-600 leading-relaxed font-sans">{description}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">About this masterpiece</h3>
              <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center">
                <p className="text-xs text-slate-400 italic font-sans">A highly exclusive model from our private scale collection.</p>
              </div>
            </div>
          )}

          {/* Custom attributes/specifications detected in collection */}
          {customFields.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">Showroom Specifications</h3>
              <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white">
                {customFields.map(([key, value]) => {
                  // Skip standard fields or technical database names
                  if (["brand", "model", "year", "price", "type", "description", "image", "photo", "title", "photos", "pic", "imageUrl"].includes(key)) return null;
                  
                  const displayVal = typeof value === "object" ? JSON.stringify(value) : String(value);
                  return (
                    <div key={key} className="flex justify-between items-center py-3 px-4 text-xs">
                      <span className="font-mono text-slate-500 font-medium capitalize">{key}</span>
                      <span className="font-sans font-semibold text-slate-800">{displayVal || "—"}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Customer Call to Action Banner */}
          <div className="p-4 bg-indigo-50/50 border border-indigo-100/60 rounded-xl flex flex-col gap-2">
            <h4 className="text-xs font-semibold text-indigo-900 font-sans">Interested in this model?</h4>
            <p className="text-[11px] text-indigo-700/90 leading-relaxed font-sans">
              Connect with Konrad to inquire about details, purchase scale ratios, or arrange a private consultation.
            </p>
          </div>
        </div>

        {/* Footer controls */}
        <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
          <div>
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-200 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              >
                <Trash2 size={14} />
                <span>Delete Record</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-rose-700 font-medium font-sans animate-pulse">Are you sure?</span>
                <button
                  disabled={isDeleting}
                  onClick={handleDelete}
                  className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-sm cursor-pointer"
                >
                  {isDeleting ? "Deleting..." : "Yes, Delete"}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
