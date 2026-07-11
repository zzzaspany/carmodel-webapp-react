import React from "react";
import { Eye, DollarSign, Calendar, Tag, HardDrive } from "lucide-react";
import { CarModelRecord } from "../types";

interface CarTableProps {
  cars: CarModelRecord[];
  serverUrl: string;
  onViewDetails: (car: CarModelRecord) => void;
}

export default function CarTable({ cars, serverUrl, onViewDetails }: CarTableProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="py-4 px-5 text-xs font-mono font-semibold uppercase tracking-wider text-slate-500 w-20">Preview</th>
              <th className="py-4 px-5 text-xs font-mono font-semibold uppercase tracking-wider text-slate-500">Brand / Make</th>
              <th className="py-4 px-5 text-xs font-mono font-semibold uppercase tracking-wider text-slate-500">Model Name</th>
              <th className="py-4 px-5 text-xs font-mono font-semibold uppercase tracking-wider text-slate-500 w-24">Year</th>
              <th className="py-4 px-5 text-xs font-mono font-semibold uppercase tracking-wider text-slate-500 w-36">Type / Tag</th>
              <th className="py-4 px-5 text-xs font-mono font-semibold uppercase tracking-wider text-slate-500 w-36 text-right">Price</th>
              <th className="py-4 px-5 text-xs font-mono font-semibold uppercase tracking-wider text-slate-500 w-24 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {cars.map((car) => {
              const getBrandAndModel = () => {
                if (car.brand || car.make || car.model || car.name) {
                  return {
                    brand: car.brand || car.make || "—",
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
                  brand: "—",
                  model: `Record: ${car.id.slice(0, 8)}`
                };
              };

              const { brand, model } = getBrandAndModel();
              const year = car.year || new Date(car.created).getFullYear() || "—";
              const price = car.price ? Number(car.price) : null;
              const type = car.type || car.category || "—";
              
              // Image logic with robust array and string handling
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

              return (
                <tr 
                  key={car.id} 
                  className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                  onClick={() => onViewDetails(car)}
                >
                  <td className="py-3 px-5">
                    {imageUrl ? (
                      <img 
                        src={imageUrl} 
                        alt={model} 
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-lg object-cover border border-slate-200"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                        <HardDrive size={16} strokeWidth={1.5} />
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-5 font-display font-medium text-slate-800 text-sm">
                    {brand}
                  </td>
                  <td className="py-3 px-5 font-sans font-semibold text-slate-900 text-sm">
                    {model}
                  </td>
                  <td className="py-3 px-5 font-mono text-xs text-slate-600">
                    {year}
                  </td>
                  <td className="py-3 px-5">
                    {type !== "—" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono bg-slate-100 text-slate-700 border border-slate-200/50 uppercase text-[10px]">
                        {type}
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="py-3 px-5 text-right font-mono text-sm font-semibold text-slate-900">
                    {price !== null ? (
                      `$${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                    ) : (
                      <span className="text-slate-400 font-sans text-xs font-normal">No price listed</span>
                    )}
                  </td>
                  <td className="py-3 px-5 text-center">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewDetails(car);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer"
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
