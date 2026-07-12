import React from "react";
import { motion } from "motion/react";
import { Car, Fuel, Calendar, DollarSign, ArrowUpRight, ShieldCheck, Cpu } from "lucide-react";
import { CarModelRecord } from "../types";

interface CarCardProps {
  key?: any;
  car: CarModelRecord;
  serverUrl: string;
  onViewDetails: (car: CarModelRecord) => void;
}

export default function CarCard({ car, serverUrl, onViewDetails }: CarCardProps) {
  // Gracefully resolve fields from dynamic schemas
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
  
  // Try to find image or photo keys with robust array and string handling
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

  // Render a lovely fallback card visual if no image is present
  const renderFallbackVisual = () => {
    const hash = brand.charCodeAt(0) + (model.charCodeAt(0) || 0);
    const gradients = [
      "from-slate-900 to-indigo-950",
      "from-zinc-900 to-slate-800",
      "from-blue-950 to-slate-900",
      "from-neutral-900 to-stone-900",
      "from-emerald-950 to-slate-900"
    ];
    const gradient = gradients[hash % gradients.length];

    return (
      <div className={`w-full h-48 bg-gradient-to-br ${gradient} flex flex-col justify-between p-4 relative overflow-hidden group-hover:opacity-95 transition-opacity`}>
        {/* Abstract design elements */}
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute left-1/4 top-1/4 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex justify-between items-start z-10">
          <span className="text-white/40 font-mono text-[9px] uppercase tracking-wider">
            Premium Scale Model
          </span>
        </div>

        <div className="flex items-center justify-center z-10 my-2">
          <Car className="text-white/20 w-16 h-16 stroke-[1.2] group-hover:scale-110 transition-transform duration-300" />
        </div>

        <div className="z-10 flex justify-between items-end">
          <span className="text-white font-display font-medium text-lg leading-tight truncate">
            {brand} <span className="text-white font-semibold">{model}</span>
          </span>
        </div>
      </div>
    );
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="group bg-white rounded-2xl border border-slate-200/80 hover:border-slate-300 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col h-full cursor-pointer"
      onClick={() => onViewDetails(car)}
    >
      {/* Visual / Image area */}
      <div className="relative overflow-hidden bg-slate-100">
        {imageUrl ? (
          <div className="relative w-full h-48">
            <img 
              src={imageUrl} 
              alt={`${brand} ${model}`}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              onError={(e) => {
                // If the pocketbase file load fails, remove it so it falls back nicely
                e.currentTarget.style.display = 'none';
              }}
            />
            {/* Dark overlay with pure Brand/Model details */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10 flex flex-col justify-end p-4">
              <span className="text-white font-display font-medium text-lg drop-shadow-md truncate">
                {brand} <span className="font-semibold">{model}</span>
              </span>
            </div>
          </div>
        ) : (
          renderFallbackVisual()
        )}
      </div>

      {/* Details area */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        {description ? (
          <p className="text-xs text-slate-500 font-sans line-clamp-2 leading-relaxed">
            {description}
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            <div className="text-[10px] uppercase tracking-wider font-mono text-slate-400">Showroom Model</div>
            <p className="text-xs italic text-slate-400 font-sans">No description provided for this model.</p>
          </div>
        )}

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-700">
            {price !== null ? (
              <>
                <DollarSign size={14} className="text-slate-400" />
                <span className="font-mono text-sm font-semibold tracking-tight text-slate-900">
                  {price.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </>
            ) : (
              <span className="text-xs text-slate-400 font-mono font-medium">No price listed</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium font-sans text-slate-400 group-hover:text-slate-800 transition-colors">
              Inspect model
            </span>
            <span className="p-1 rounded-lg bg-slate-50 group-hover:bg-slate-100 text-slate-400 group-hover:text-slate-900 transition-colors">
              <ArrowUpRight size={14} />
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
