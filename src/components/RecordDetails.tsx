import React, { useState } from "react";
import { X, Trash2, Calendar, HardDrive, DollarSign, Tag, Info, Code, FileText, Check } from "lucide-react";
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
  const year = car.year || new Date(car.created).getFullYear() || "—";
  const price = car.price ? Number(car.price) : null;
  const type = car.type || car.category || "—";
  const description = car.description || "";

  // Image resolution with robust array and string handling
  const getImageFilename = () => {
    const resolveField = (val: any): string | null => {
      if (!val) return null;
      if (Array.isArray(val)) {
        return val.length > 0 ? val[0] : null;
      }
      if (typeof val === "string" && val.trim() !== "") {
        if (val.startsWith("[") && val.endsWith("]")) {
          try {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed) && parsed.length > 0) {
              return parsed[0];
            }
          } catch (e) {
            // ignore
          }
        }
        return val;
      }
      return null;
    };

    const candidates = [car.image, car.photo, car.imageUrl, car.pic, car.photos];
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
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-100 bg-slate-50/50">
          <button
            onClick={() => setActiveTab("visual")}
            className={`flex-1 py-3 text-xs font-mono font-medium border-b-2 transition-all cursor-pointer ${
              activeTab === "visual" 
                ? "border-slate-900 text-slate-900 bg-white" 
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <div className="flex items-center justify-center gap-1.5">
              <FileText size={14} />
              <span>Attributes</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab("json")}
            className={`flex-1 py-3 text-xs font-mono font-medium border-b-2 transition-all cursor-pointer ${
              activeTab === "json" 
                ? "border-slate-900 text-slate-900 bg-white" 
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <div className="flex items-center justify-center gap-1.5">
              <Code size={14} />
              <span>Raw Record JSON</span>
            </div>
          </button>
        </div>

        {/* Dynamic content scrollable area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === "visual" ? (
            <>
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
                  <p className="text-xs text-slate-500 font-medium font-sans">No record attachment found</p>
                  <p className="text-[10px] text-slate-400 font-sans mt-0.5">Upload a file to `image` or `photo` column in Admin UI</p>
                </div>
              )}

              {/* Basic structured grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Calendar size={16} />
                  </div>
                  <div>
                    <div className="text-[10px] font-mono text-slate-400 uppercase">Production Year</div>
                    <div className="text-sm font-sans font-semibold text-slate-900">{year}</div>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                    <DollarSign size={16} />
                  </div>
                  <div>
                    <div className="text-[10px] font-mono text-slate-400 uppercase">Estimated Price</div>
                    <div className="text-sm font-sans font-semibold text-slate-900">
                      {price !== null ? `$${price.toLocaleString()}` : "Not listed"}
                    </div>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                    <Tag size={16} />
                  </div>
                  <div>
                    <div className="text-[10px] font-mono text-slate-400 uppercase">Engine/Type</div>
                    <div className="text-sm font-sans font-semibold text-slate-900 uppercase text-xs">{type}</div>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                  <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                    <Info size={16} />
                  </div>
                  <div>
                    <div className="text-[10px] font-mono text-slate-400 uppercase">Collection Name</div>
                    <div className="text-sm font-sans font-semibold text-slate-900">{car.collectionName}</div>
                  </div>
                </div>
              </div>

              {/* Description Block */}
              {description && (
                <div className="space-y-2">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">Model Description</h3>
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                    <p className="text-xs text-slate-600 leading-relaxed font-sans">{description}</p>
                  </div>
                </div>
              )}

              {/* Custom attributes detected in collection */}
              {customFields.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">Dynamic Schema Attributes</h3>
                  <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white">
                    {customFields.map(([key, value]) => {
                      if (["brand", "model", "year", "price", "type", "description", "image", "photo", "title", "photos", "pic", "imageUrl"].includes(key)) return null;
                      
                      const displayVal = typeof value === "object" ? JSON.stringify(value) : String(value);
                      return (
                        <div key={key} className="flex justify-between items-center py-3 px-4 text-xs">
                          <span className="font-mono text-slate-500 font-medium">{key}</span>
                          <span className="font-sans font-semibold text-slate-800">{displayVal || "—"}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* System Metadata */}
              <div className="space-y-2">
                <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">Database Metadata</h3>
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-2 font-mono text-[11px] text-slate-500">
                  <div className="flex justify-between">
                    <span>Record UID:</span>
                    <span className="text-slate-800 font-medium">{car.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Collection ID:</span>
                    <span className="text-slate-800 font-medium">{car.collectionId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Created Date:</span>
                    <span className="text-slate-800 font-medium">{new Date(car.created).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Updated Date:</span>
                    <span className="text-slate-800 font-medium">{new Date(car.updated).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="text-xs text-slate-500 font-sans leading-relaxed">
                Here is the full structured payload returned by your PocketBase database for this record. Any custom fields you add will appear here immediately.
              </div>
              <pre className="p-4 bg-slate-900 text-emerald-400 rounded-xl font-mono text-xs overflow-x-auto leading-relaxed shadow-inner max-h-[450px]">
                {JSON.stringify(car, null, 2)}
              </pre>
            </div>
          )}
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
