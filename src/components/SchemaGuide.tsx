import React, { useState } from "react";
import { Copy, Check, Terminal, Server, Database, PlusCircle, ArrowRight } from "lucide-react";

export default function SchemaGuide({ serverUrl, onSeeded }: { serverUrl: string, onSeeded?: () => void }) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<{ success: boolean; message: string } | null>(null);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const sampleCars = [
    { brand: "Tesla", model: "Model S Plaid", year: 2024, price: 89990, type: "Electric", description: "Tri-motor all-wheel drive platform with torque vectoring, delivering 1,020 horsepower." },
    { brand: "Porsche", model: "911 GT3 RS", year: 2023, price: 223800, type: "Gasoline", description: "High-performance sports car focused on aerodynamics and track capability." },
    { brand: "Rivian", model: "R1S", year: 2024, price: 74900, type: "Electric", description: "Versatile electric SUV designed for off-road adventure and daily utility." },
    { brand: "BMW", model: "M4 Competition", year: 2024, price: 82200, type: "Gasoline", description: "Coupe featuring a twin-turbo inline-six with 503 horsepower and precision handling." },
    { brand: "Audi", model: "e-tron GT", year: 2023, price: 104900, type: "Electric", description: "Grand tourer electric vehicle combining athletic performance with luxury craftsmanship." }
  ];

  const handleSeedRealDatabase = async () => {
    setSeeding(true);
    setSeedResult(null);
    let successCount = 0;
    
    try {
      for (const car of sampleCars) {
        const response = await fetch(`${serverUrl}/api/collections/carmodel/records`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(car),
        });
        
        if (response.ok) {
          successCount++;
        }
      }
      
      if (successCount > 0) {
        setSeedResult({
          success: true,
          message: `Successfully seeded ${successCount} car models into your local PocketBase!`
        });
        if (onSeeded) onSeeded();
      } else {
        setSeedResult({
          success: false,
          message: "Could not write to collection. Make sure the 'carmodel' collection exists and has public create access allowed (API rules set to empty string for 'Create')."
        });
      }
    } catch (err: any) {
      setSeedResult({
        success: false,
        message: `Failed to connect: ${err.message}. Ensure PocketBase is running on ${serverUrl} and CORS is allowed.`
      });
    } finally {
      setSeeding(false);
    }
  };

  const curlCommand = `curl -X POST ${serverUrl}/api/collections/carmodel/records \\
  -H "Content-Type: application/json" \\
  -d '{"brand": "Tesla", "model": "Model 3", "year": 2024, "price": 38990, "type": "Electric", "description": "Rear-wheel drive electric sedan with premium features."}'`;

  const schemaJson = `{
  "name": "carmodel",
  "type": "base",
  "schema": [
    { "name": "brand", "type": "text", "required": true },
    { "name": "model", "type": "text", "required": true },
    { "name": "year", "type": "number" },
    { "name": "price", "type": "number" },
    { "name": "type", "type": "text" },
    { "name": "description", "type": "text" },
    { "name": "image", "type": "file", "options": { "maxSelect": 1, "maxSize": 5242880, "mimeTypes": ["image/jpeg", "image/png", "image/webp"] } }
  ],
  "listRule": "",
  "viewRule": "",
  "createRule": "",
  "updateRule": "",
  "deleteRule": ""
}`;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 lg:p-8 max-w-4xl mx-auto space-y-8">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-xs font-mono">
          <Server size={12} className="animate-pulse" />
          PocketBase Setup Required
        </div>
        <h2 className="text-2xl font-display font-semibold text-slate-900">
          How to connect your local PocketBase instance
        </h2>
        <p className="text-sm text-slate-500 font-sans">
          To display records, this application makes client-side fetch requests to your local PocketBase server. Follow these simple steps to configure it.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Step 1 */}
        <div className="p-5 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-mono flex items-center justify-center font-bold">1</span>
              <h3 className="font-semibold text-slate-800 font-display">Run your PocketBase Server</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4 font-sans leading-relaxed">
              Download PocketBase and launch it on your machine. By default, it runs on port 8090.
            </p>
          </div>
          <div className="space-y-2 mt-auto">
            <div className="flex justify-between items-center bg-slate-900 text-slate-200 px-3 py-2 rounded-lg font-mono text-xs overflow-x-auto">
              <span>./pocketbase serve --http=127.0.0.1:8090</span>
              <button 
                onClick={() => copyToClipboard("./pocketbase serve --http=127.0.0.1:8090", 1)}
                className="text-slate-400 hover:text-white ml-2 transition-colors focus:outline-none"
              >
                {copiedIndex === 1 ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        </div>

        {/* Step 2 */}
        <div className="p-5 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-mono flex items-center justify-center font-bold">2</span>
              <h3 className="font-semibold text-slate-800 font-display">Create "carmodel" Collection</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4 font-sans leading-relaxed">
              Navigate to the Admin UI (<a href="http://127.0.0.1:8090/_/" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-semibold">http://127.0.0.1:8090/_/</a>) and create a collection named <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800 font-mono text-xs">carmodel</code>.
            </p>
          </div>
          <div className="mt-auto">
            <button
              onClick={() => copyToClipboard(schemaJson, 2)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            >
              {copiedIndex === 2 ? (
                <>
                  <Check size={14} className="text-emerald-500" />
                  <span>Schema copied!</span>
                </>
              ) : (
                <>
                  <Database size={14} className="text-indigo-500" />
                  <span>Copy Recommended Collection Schema</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Step 3 */}
      <div className="p-6 bg-slate-50 rounded-xl border border-slate-100 space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-mono flex items-center justify-center font-bold">3</span>
          <h3 className="font-semibold text-slate-800 font-display">Allow API Access (API Rules)</h3>
        </div>
        <p className="text-xs text-slate-500 font-sans leading-relaxed">
          By default, records are private. In your PocketBase Admin console, open your collection's settings, click on the **"API Rules"** tab, and set the **List**, **View**, and optionally **Create** rules to unlock public access (leave them as empty strings <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800 font-mono text-xs">""</code>).
        </p>
        <div className="border-t border-slate-200 pt-4 mt-2">
          <p className="text-xs font-medium text-slate-700 mb-2 font-display flex items-center gap-1.5">
            <PlusCircle size={14} className="text-emerald-500" />
            Quickly seed sample records via real API requests:
          </p>
          <p className="text-xs text-slate-500 mb-3 leading-relaxed">
            If your collection rules allow public creation, you can click the button below to execute real POST fetch calls to automatically seed your local collection with 5 gorgeous sample cars.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              disabled={seeding}
              onClick={handleSeedRealDatabase}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium transition-colors shadow-sm cursor-pointer ${
                seeding 
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed" 
                  : "bg-slate-900 text-white hover:bg-slate-800 font-mono"
              }`}
            >
              {seeding ? "Sending API requests..." : "Seed Local Collection via API"}
              <ArrowRight size={14} />
            </button>

            <button
              onClick={() => copyToClipboard(curlCommand, 3)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-mono transition-colors cursor-pointer"
            >
              {copiedIndex === 3 ? (
                <>
                  <Check size={14} className="text-emerald-500" />
                  <span>cURL Command copied!</span>
                </>
              ) : (
                <>
                  <Terminal size={14} />
                  <span>Copy cURL Setup Command</span>
                </>
              )}
            </button>
          </div>

          {seedResult && (
            <div className={`mt-3 p-3 rounded-lg text-xs ${
              seedResult.success 
                ? "bg-emerald-50 text-emerald-800 border border-emerald-100" 
                : "bg-rose-50 text-rose-800 border border-rose-100"
            }`}>
              {seedResult.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
