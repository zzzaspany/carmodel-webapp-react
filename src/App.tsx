import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Database, Search, Grid, List, Plus, RefreshCw, 
  AlertCircle, CheckCircle2, SlidersHorizontal, HelpCircle, ArrowRight, Car
} from "lucide-react";
import { CarModelRecord, ConnectionStatus } from "./types";
import SchemaGuide from "./components/SchemaGuide";
import CarCard from "./components/CarCard";
import CarTable from "./components/CarTable";
import RecordDetails from "./components/RecordDetails";
import AddRecordModal from "./components/AddRecordModal";

export default function App() {
  // Read initial configuration from localStorage if available
  const [serverUrl, setServerUrl] = useState(() => {
    const saved = localStorage.getItem("pb_server_url");
    if (saved) {
      if (saved.includes("//pocketbase:") || saved.includes("//pocketbase/") || saved === "http://pocketbase:8090") {
        return window.location.origin + "/pb";
      }
      return saved;
    }

    // Check if injected by container runtime or defined in window
    const winUrl = (window as any).POCKETBASE_URL;
    if (winUrl && winUrl !== "__POCKETBASE_URL__" && winUrl.trim() !== "") {
      // If the URL is container-internal (like http://pocketbase:8090),
      // the browser cannot reach it directly. We should use the same-origin proxy path '/pb' instead.
      if (winUrl.includes("//pocketbase:") || winUrl.includes("//pocketbase/") || winUrl === "http://pocketbase:8090") {
        return window.location.origin + "/pb";
      }
      return winUrl;
    }

    // Check build-time Vite env var fallback
    const envUrl = (import.meta as any).env.VITE_POCKETBASE_URL;
    if (envUrl) {
      if (envUrl.includes("//pocketbase:") || envUrl.includes("//pocketbase/") || envUrl === "http://pocketbase:8090") {
        return window.location.origin + "/pb";
      }
      return envUrl;
    }

    return "http://localhost:8090";
  });
  
  const [viewMode, setViewMode] = useState<"grid" | "table">(() => {
    return (localStorage.getItem("pb_view_mode") as "grid" | "table") || "grid";
  });

  // Get contact email from window object (injected in container) or Vite env
  const contactEmail = useMemo(() => {
    const winEmail = (window as any).CONTACT_EMAIL;
    if (winEmail && winEmail !== "__CONTACT_EMAIL__" && winEmail.trim() !== "") {
      return winEmail.trim();
    }
    // Fallback to build-time Vite env var
    const envEmail = (import.meta as any).env.VITE_CONTACT_EMAIL;
    if (envEmail && envEmail.trim() !== "") {
      return envEmail.trim();
    }
    return null;
  }, []);

  // Database lists and fetch status
  const [cars, setCars] = useState<CarModelRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  // Connection and admin settings
  const [connection, setConnection] = useState<ConnectionStatus>({
    connected: false,
    checking: true,
    error: null
  });

  // Modal / detail panel states
  const [selectedCar, setSelectedCar] = useState<CarModelRecord | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [sortBy, setSortBy] = useState("newest");

  // Save configurations on updates
  useEffect(() => {
    localStorage.setItem("pb_server_url", serverUrl);
  }, [serverUrl]);

  useEffect(() => {
    localStorage.setItem("pb_view_mode", viewMode);
  }, [viewMode]);

  // Test raw server connection (health check)
  const testConnectionOnly = async (urlToCheck: string): Promise<boolean> => {
    try {
      const res = await fetch(`${urlToCheck}/api/health`, { 
        method: "GET",
        signal: AbortSignal.timeout(2000) // 2s timeout
      });
      if (res.ok) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Fetch all records from the carmodel collection
  const fetchRecords = async () => {
    setLoading(true);
    setFetchError(null);
    setConnection(prev => ({ ...prev, checking: true }));

    const cleanUrl = serverUrl.replace(/\/$/, ""); // Strip trailing slash

    try {
      // First try to check health
      const isHealthy = await testConnectionOnly(cleanUrl);
      
      // Attempt to load collection records
      const res = await fetch(`${cleanUrl}/api/collections/carmodel/records?sort=-created&page=1&perPage=100`, {
        signal: AbortSignal.timeout(4000)
      });

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("Collection 'carmodel' was not found in your PocketBase setup. Click 'How to set up' below for instructions.");
        }
        throw new Error(`Failed to load. Database returned status code ${res.status}.`);
      }

      const data = await res.json();
      setCars(data.items || []);
      
      setConnection({
        connected: true,
        checking: false,
        error: null,
        serverInfo: { healthy: isHealthy }
      });
    } catch (err: any) {
      setCars([]);
      const isNetworkError = err.name === "TypeError" || err.message?.includes("Failed to fetch");
      const msg = isNetworkError 
        ? "Could not connect to server. Ensure your local PocketBase serve is running at the address shown below."
        : err.message || "An unexpected error occurred.";
      
      setFetchError(msg);
      setConnection({
        connected: false,
        checking: false,
        error: msg
      });
    } finally {
      setLoading(false);
    }
  };

  // Trigger initial fetch on load
  useEffect(() => {
    fetchRecords();
  }, [serverUrl]);

  // Submit new record POST
  const handleAddRecord = async (payload: any): Promise<boolean> => {
    const cleanUrl = serverUrl.replace(/\/$/, "");
    try {
      const res = await fetch(`${cleanUrl}/api/collections/carmodel/records`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        // Reload list automatically on success
        await fetchRecords();
        return true;
      }
      return false;
    } catch (err) {
      console.error("Error creating record:", err);
      return false;
    }
  };

  // Delete record DELETE
  const handleDeleteRecord = async (id: string) => {
    const cleanUrl = serverUrl.replace(/\/$/, "");
    try {
      const res = await fetch(`${cleanUrl}/api/collections/carmodel/records/${id}`, {
        method: "DELETE"
      });

      if (res.ok) {
        // Filter out locally and refresh
        setCars(prev => prev.filter(c => c.id !== id));
      } else {
        throw new Error(`Server returned status: ${res.status}`);
      }
    } catch (err) {
      alert("Failed to delete record from PocketBase. Ensure delete rules are unlocked.");
    }
  };



  // Extract list of all unique motorization types in collection for filtering
  const dynamicTypes = useMemo(() => {
    const types = new Set<string>();
    cars.forEach(car => {
      const t = car.type || car.category;
      if (t) types.add(t);
    });
    return ["All", ...Array.from(types)];
  }, [cars]);

  // Filter and sort the cars list client-side
  const filteredAndSortedCars = useMemo(() => {
    let result = [...cars];

    // Search filter
    if (searchTerm.trim() !== "") {
      const query = searchTerm.toLowerCase();
      result = result.filter(car => {
        const brand = (car.brand || car.make || "").toLowerCase();
        const model = (car.model || car.name || "").toLowerCase();
        const desc = (car.description || "").toLowerCase();
        return brand.includes(query) || model.includes(query) || desc.includes(query);
      });
    }

    // Type filter
    if (typeFilter !== "All") {
      result = result.filter(car => (car.type || car.category) === typeFilter);
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === "price-asc") {
        return (Number(a.price) || 0) - (Number(b.price) || 0);
      }
      if (sortBy === "price-desc") {
        return (Number(b.price) || 0) - (Number(a.price) || 0);
      }
      if (sortBy === "year-desc") {
        return (Number(b.year) || 0) - (Number(a.year) || 0);
      }
      if (sortBy === "brand-asc") {
        const brandA = (a.brand || a.make || "").toLowerCase();
        const brandB = (b.brand || b.make || "").toLowerCase();
        return brandA.localeCompare(brandB);
      }
      // default: newest first (created field)
      return new Date(b.created).getTime() - new Date(a.created).getTime();
    });

    return result;
  }, [cars, searchTerm, typeFilter, sortBy]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* Premium Top Navigation Bar */}
      <header className="sticky top-0 bg-white border-b border-slate-200/80 backdrop-blur-md z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-900 text-white rounded-xl shadow-sm">
              <Car size={18} strokeWidth={2} />
            </div>
            <div>
              <h1 className="font-display font-bold text-slate-900 tracking-tight text-base sm:text-lg flex items-center gap-1.5">
                Private car models collection
              </h1>
              {contactEmail ? (
                <p className="text-[10px] text-indigo-600 font-mono">
                  Contact: <a href={`mailto:${contactEmail}`} className="hover:underline">{contactEmail}</a>
                </p>
              ) : (
                <p className="text-[10px] text-slate-400 font-mono hidden sm:block">
                  curated private collection
                </p>
              )}
            </div>
          </div>

          {/* Quick status details & settings control */}
          <div className="flex items-center gap-3">
            {/* Status indicator */}
            <div className="flex items-center gap-2">
              {connection.checking ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200/60 rounded-lg font-mono text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <span className="hidden xs:inline">Checking connection...</span>
                </div>
              ) : connection.connected ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-lg font-mono text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="hidden xs:inline">Connected to Localhost</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200/60 rounded-lg font-mono text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  <span className="hidden xs:inline">Offline</span>
                </div>
              )}
            </div>

            {/* Refresh list */}
            <button
              disabled={loading}
              onClick={fetchRecords}
              className={`p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all cursor-pointer ${
                loading ? "opacity-65" : ""
              }`}
              title="Refresh Collection List"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

      </header>

      {/* Main page content area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Connection/Collection Banner Notifications */}
        {!connection.checking && !connection.connected && (
          <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-rose-100 text-rose-800 rounded-xl shrink-0 mt-0.5">
                <AlertCircle size={16} />
              </div>
              <div>
                <h4 className="font-display font-semibold text-rose-950 text-sm">
                  Cannot connect to local PocketBase
                </h4>
                <p className="text-xs text-rose-700/90 font-sans mt-0.5 leading-relaxed">
                  Make sure PocketBase is running locally on <code className="bg-rose-100 px-1 py-0.5 rounded text-rose-900 font-mono">{serverUrl}</code> and contains a public <code className="bg-rose-100 px-1 py-0.5 rounded text-rose-900 font-mono">carmodel</code> collection.
                </p>
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto self-end sm:self-center">
              <button
                onClick={fetchRecords}
                className="flex-1 sm:flex-initial px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                Retry Refresh
              </button>
            </div>
          </div>
        )}

        {/* Dashboard filters, actions & controls */}
        {connection.connected && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
            
            {/* Left search and toggle filters */}
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              {/* Live search input */}
              <div className="relative flex items-center flex-1">
                <Search size={16} className="absolute left-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search brand, model, description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 hover:bg-slate-50/50 focus:bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-sans"
                />
              </div>

            </div>

            {/* Right layout settings & Action triggers */}
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              {/* Sorting selector */}
              <div className="relative flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 border border-slate-200 rounded-xl">
                <SlidersHorizontal size={13} className="text-slate-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent text-xs font-sans text-slate-700 focus:outline-none cursor-pointer pr-1"
                >
                  <option value="newest">Newest First</option>
                  <option value="brand-asc">Alphabetical (Brand)</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                </select>
              </div>

              {/* Grid / List switcher */}
              <div className="flex bg-slate-50 border border-slate-200 rounded-xl p-1 shrink-0">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    viewMode === "grid" 
                      ? "bg-white text-slate-900 shadow-xs border border-slate-200/50" 
                      : "text-slate-400 hover:text-slate-800"
                  }`}
                  title="Grid Layout"
                >
                  <Grid size={15} />
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    viewMode === "table" 
                      ? "bg-white text-slate-900 shadow-xs border border-slate-200/50" 
                      : "text-slate-400 hover:text-slate-800"
                  }`}
                  title="Dense Table Layout"
                >
                  <List size={15} />
                </button>
              </div>

              {/* Add record action */}
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Plus size={14} />
                <span>Add Model</span>
              </button>
            </div>

          </div>
        )}

        {/* Content displays */}
        {connection.checking ? (
          /* Loading visual */
          <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200 shadow-sm min-h-[300px]">
            <RefreshCw className="animate-spin text-indigo-500 w-8 h-8 mb-4 stroke-[1.5]" />
            <p className="text-sm font-display font-medium text-slate-800">Verifying local database connection...</p>
            <p className="text-xs text-slate-400 mt-1 font-sans">Connecting to {serverUrl}</p>
          </div>
        ) : !connection.connected ? (
          /* Guide view if not connected */
          <SchemaGuide serverUrl={serverUrl} onSeeded={fetchRecords} />
        ) : cars.length === 0 ? (
          /* Connected but collection is completely empty */
          <div className="flex flex-col items-center justify-center text-center p-8 bg-white border border-slate-200 rounded-2xl min-h-[350px]">
            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-4 border border-indigo-100">
              <Database size={24} />
            </div>
            <h3 className="font-display font-semibold text-slate-900 text-lg">Your "carmodel" collection is empty</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1 mb-6 leading-relaxed">
              Successfully connected to PocketBase, but we found no records in collection `carmodel`. Add your first record to begin or run the automated seed below!
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowAddModal(true)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-2 justify-center"
              >
                <Plus size={14} />
                <span>Create Car Model Manually</span>
              </button>
              
              <button
                onClick={() => {
                  // Scroll to seeding steps inside the guide which we can show as subpanel
                  const schemaGuideSection = document.getElementById("seed-helper");
                  if (schemaGuideSection) {
                    schemaGuideSection.scrollIntoView({ behavior: "smooth" });
                  } else {
                    // Temporarily disconnect to trigger guide which has beautiful seed
                    setConnection(prev => ({ ...prev, connected: false }));
                  }
                }}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                How do I seed data?
              </button>
            </div>
          </div>
        ) : filteredAndSortedCars.length === 0 ? (
          /* No search matching result */
          <div className="text-center p-12 bg-white rounded-2xl border border-slate-200">
            <Search className="text-slate-300 w-10 h-10 mx-auto mb-3 stroke-[1.2]" />
            <h4 className="font-display font-medium text-slate-800 text-sm">No matching models found</h4>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or typing a different keyword.</p>
            <button
              onClick={() => {
                setSearchTerm("");
                setTypeFilter("All");
              }}
              className="mt-4 px-4 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-600 transition-colors cursor-pointer"
            >
              Clear Search filters
            </button>
          </div>
        ) : (
          /* List presentation */
          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <p className="text-xs text-slate-400 font-mono uppercase tracking-wider">
                Showing {filteredAndSortedCars.length} of {cars.length} Models
              </p>
              
              {/* Quick tip on images */}
              <span className="text-[10px] text-slate-400 font-sans italic hidden sm:inline">
                💡 Tip: Upload a JPG/PNG in your PocketBase column "image" to see real vehicle visuals!
              </span>
            </div>

            <AnimatePresence mode="popLayout">
              {viewMode === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredAndSortedCars.map((car) => (
                    <CarCard 
                      key={car.id} 
                      car={car} 
                      serverUrl={serverUrl} 
                      onViewDetails={setSelectedCar} 
                    />
                  ))}
                </div>
              ) : (
                <CarTable 
                  cars={filteredAndSortedCars} 
                  serverUrl={serverUrl} 
                  onViewDetails={setSelectedCar} 
                />
              )}
            </AnimatePresence>
          </div>
        )}

      </main>

      {/* Footer copyright and diagnostics */}
      <footer className="mt-auto bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="text-center sm:text-left">
            <p className="font-sans font-medium text-slate-500">
              Private car models collection
            </p>
            {contactEmail && (
              <p className="text-slate-400 mt-1 font-sans">
                For inquiries, email us at: <a href={`mailto:${contactEmail}`} className="text-indigo-600 hover:underline font-semibold">{contactEmail}</a>
              </p>
            )}
          </div>
          <div className="flex items-center gap-4 font-mono text-[10px]">
            <span>Active URL: <code className="bg-slate-50 px-1.5 py-0.5 border border-slate-100 rounded text-slate-500 font-semibold">{serverUrl}</code></span>
            <span className="hidden sm:inline">Collection: <code className="bg-slate-50 px-1.5 py-0.5 border border-slate-100 rounded text-slate-500 font-semibold">carmodel</code></span>
          </div>
        </div>
      </footer>

      {/* Slide-over details drawer */}
      <AnimatePresence>
        {selectedCar && (
          <RecordDetails 
            car={selectedCar} 
            serverUrl={serverUrl} 
            onClose={() => setSelectedCar(null)} 
            onDelete={handleDeleteRecord} 
          />
        )}
      </AnimatePresence>

      {/* Add Model Overlay Modal */}
      <AnimatePresence>
        {showAddModal && (
          <AddRecordModal 
            onClose={() => setShowAddModal(false)} 
            onSubmit={handleAddRecord} 
          />
        )}
      </AnimatePresence>

    </div>
  );
}
