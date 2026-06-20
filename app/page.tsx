"use client";
import React, { useState, useEffect, useRef } from "react";

interface LaptopRepair {
  id: string;
  date: string;
  user: string;
  model: string;
  serial: string;
  issue: string;
  status: string;
  notes: string;
}

type SortColumn = "date" | "user" | "model" | "serial" | "issue" | "status";

export default function RepairTracker() {
  const [repairs, setRepairs] = useState<LaptopRepair[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const pageSize = 25;
  const totalPages = Math.ceil(total / pageSize);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [sortColumn, setSortColumn] = useState<SortColumn>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    user: "",
    model: "",
    serial: "",
    issue: "",
    status: "Fixed",
    notes: "",
  });

  const [editingRepair, setEditingRepair] = useState<LaptopRepair | null>(null);
  const [editFormData, setEditFormData] = useState({
    date: "",
    user: "",
    model: "",
    serial: "",
    issue: "",
    status: "Fixed",
    notes: "",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [storageMode, setStorageMode] = useState("");
  const [sheetUrl, setSheetUrl] = useState("");
  const [importingSheet, setImportingSheet] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("darkMode") === "true";
    }
    return false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  const fetchKey = `${page}-${search}-${statusFilter}-${sortColumn}-${sortDirection}-${refreshKey}`;

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem("darkMode", String(next));
    document.documentElement.classList.toggle("dark", next);
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        sortColumn,
        sortDirection,
      });
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);

      try {
        const res = await fetch(`/api/repairs?${params}`);
        const data = await res.json();
        if (!cancelled) {
          setRepairs(data.repairs || []);
          setTotal(data.total || 0);
          if (data.storage) setStorageMode(data.storage);
          if (data.error) setError(data.error);
        }
      } catch {
        if (!cancelled) setError("Failed to load repairs. Is the server running?");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchKey]);

  const handleSearch = () => {
    setPage(1);
    setSearch(searchInput);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
    setPage(1);
  };

  const sortArrow = (column: SortColumn) => {
    if (sortColumn !== column) return " \u2195";
    return sortDirection === "asc" ? " \u2191" : " \u2193";
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/repairs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          date: formData.date.split("-").reverse().join("/"),
        }),
      });
      if (!res.ok) throw new Error("Failed to add");
      setFormData({
        date: new Date().toISOString().split("T")[0],
        user: "",
        model: "",
        serial: "",
        issue: "",
        status: "Fixed",
        notes: "",
      });
      setPage(1);
      setRefreshKey((k) => k + 1);
    } catch {
      setError("Failed to add repair entry");
    }
  };

  const openEditModal = (repair: LaptopRepair) => {
    const [d, m, y] = repair.date.split("/");
    setEditingRepair(repair);
    setEditFormData({
      date: `${y}-${m}-${d}`,
      user: repair.user === "Not Assigned" ? "" : repair.user,
      model: repair.model,
      serial: repair.serial,
      issue: repair.issue,
      status: repair.status,
      notes: repair.notes,
    });
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRepair) return;
    try {
      const res = await fetch(`/api/repairs/${editingRepair.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editFormData,
          date: editFormData.date.split("-").reverse().join("/"),
        }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setEditingRepair(null);
      setRefreshKey((k) => k + 1);
    } catch {
      setError("Failed to update repair entry");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this entry?")) return;
    try {
      const res = await fetch(`/api/repairs/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      if (repairs.length === 1 && page > 1) setPage((p) => p - 1);
      setRefreshKey((k) => k + 1);
    } catch {
      setError("Failed to delete repair entry");
    }
  };

  const handleExport = () => {
    window.open("/api/repairs/export", "_blank");
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/repairs/import", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Import failed");
      } else {
        setPage(1);
        setRefreshKey((k) => k + 1);
      }
    } catch {
      setError("Failed to import CSV");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImportSheet = async () => {
    if (!sheetUrl.trim()) return;
    setImportingSheet(true);
    setError("");
    try {
      const res = await fetch("/api/repairs/import-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: sheetUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to import from sheet");
      } else {
        setSheetUrl("");
        setPage(1);
        setRefreshKey((k) => k + 1);
      }
    } catch {
      setError("Failed to import from sheet");
    } finally {
      setImportingSheet(false);
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      Fixed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      "Partly Fixed": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      "Not Fixed": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"}`}>
        {status}
      </span>
    );
  };

  const inputClass = "border p-2 rounded mt-1 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600";
  const labelClass = "text-sm font-medium text-gray-600 dark:text-gray-400";
  const btnPrimary = "bg-blue-600 text-white font-semibold py-2 px-4 rounded hover:bg-blue-700 transition";
  const cardClass = "bg-white dark:bg-gray-800 rounded-lg shadow-md";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-8 text-slate-900 dark:text-gray-100">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Laptop Repair Tracker</h1>
            {storageMode && (
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${storageMode === "sheets" ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400"}`}>
                {storageMode === "sheets" ? "Google Sheets" : "Local DB"}
              </span>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={handleExport} className="bg-green-600 text-white text-sm font-medium py-2 px-4 rounded hover:bg-green-700 transition">
              Export CSV
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="bg-purple-600 text-white text-sm font-medium py-2 px-4 rounded hover:bg-purple-700 transition">
              Import CSV
            </button>
            <input ref={fileInputRef} type="file" accept=".csv" onChange={handleImport} className="hidden" />
          </div>
        </div>

        {storageMode === "sqlite" && (
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md mb-6 border border-blue-200 dark:border-blue-800">
            <details className="group">
              <summary className="text-sm font-semibold text-blue-700 dark:text-blue-400 cursor-pointer list-none flex items-center gap-2">
                <span className="group-open:rotate-90 transition-transform">&rarr;</span>
                Import from Google Sheet (one-time pull)
              </summary>
              <div className="mt-3 flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Paste published CSV URL here..."
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleImportSheet()}
                  className="flex-1 border p-2 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600 text-sm"
                />
                <button
                  onClick={handleImportSheet}
                  disabled={importingSheet || !sheetUrl.trim()}
                  className="bg-blue-600 text-white text-sm font-medium py-2 px-4 rounded hover:bg-blue-700 transition disabled:opacity-40 whitespace-nowrap"
                >
                  {importingSheet ? "Importing..." : "Pull from Sheet"}
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                In Google Sheets: File &rarr; Share &rarr; Publish to web &rarr; select &ldquo;Comma-separated values (.csv)&rdquo; &rarr; Publish. Then paste the URL above.
              </p>
            </details>
          </div>
        )}

        {error && (
          <div className="bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-6 text-sm">
            {error}
            <button onClick={() => setError("")} className="float-right font-bold">&times;</button>
          </div>
        )}

        <div className={`${cardClass} p-6 mb-6`}>
          <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">Log New Fix</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div className="flex flex-col">
              <label className={labelClass}>Date</label>
              <input type="date" name="date" value={formData.date} onChange={handleInputChange} className={inputClass} required />
            </div>
            <div className="flex flex-col">
              <label className={labelClass}>User</label>
              <input type="text" name="user" placeholder="e.g. Delton Manaka" value={formData.user} onChange={handleInputChange} className={inputClass} />
            </div>
            <div className="flex flex-col">
              <label className={labelClass}>Model</label>
              <input type="text" name="model" placeholder="e.g. Lenovo Ideapad" value={formData.model} onChange={handleInputChange} className={inputClass} required />
            </div>
            <div className="flex flex-col">
              <label className={labelClass}>Serial Number</label>
              <input type="text" name="serial" placeholder="e.g. PF1MX80J" value={formData.serial} onChange={handleInputChange} className={inputClass} required />
            </div>
            <div className="flex flex-col">
              <label className={labelClass}>Issue</label>
              <input type="text" name="issue" placeholder="e.g. Multiple" value={formData.issue} onChange={handleInputChange} className={inputClass} required />
            </div>
            <div className="flex flex-col">
              <label className={labelClass}>Status</label>
              <select name="status" value={formData.status} onChange={handleInputChange} className={inputClass}>
                <option value="Fixed">Fixed</option>
                <option value="Partly Fixed">Partly Fixed</option>
                <option value="Not Fixed">Not Fixed</option>
              </select>
            </div>
            <div className="flex flex-col md:col-span-2 lg:col-span-2">
              <label className={labelClass}>Notes</label>
              <input type="text" name="notes" placeholder="Repair details..." value={formData.notes} onChange={handleInputChange} className={inputClass} />
            </div>
            <div className="flex items-end">
              <button type="submit" className="w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded hover:bg-blue-700 transition">Add Entry</button>
            </div>
          </form>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md mb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                placeholder="Search by user, model, serial, issue..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="flex-1 border p-2 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600"
              />
              <button onClick={handleSearch} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition font-medium">Search</button>
            </div>
            <div className="flex gap-2 items-center">
              <label className={labelClass}>Status:</label>
              <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="border p-2 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600">
                <option value="">All</option>
                <option value="Fixed">Fixed</option>
                <option value="Partly Fixed">Partly Fixed</option>
                <option value="Not Fixed">Not Fixed</option>
              </select>
              {(search || statusFilter) && (
                <button onClick={() => { setSearchInput(""); setSearch(""); setStatusFilter(""); setPage(1); }} className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300">Clear</button>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-x-auto">
          <table className="min-w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-700 border-b-2 border-gray-200 dark:border-gray-700">
                <Th onClick={() => handleSort("date")} active={sortColumn === "date"}>Date{sortArrow("date")}</Th>
                <Th onClick={() => handleSort("user")} active={sortColumn === "user"}>User{sortArrow("user")}</Th>
                <Th onClick={() => handleSort("model")} active={sortColumn === "model"}>Model{sortArrow("model")}</Th>
                <Th onClick={() => handleSort("serial")} active={sortColumn === "serial"}>Serial Number{sortArrow("serial")}</Th>
                <Th onClick={() => handleSort("issue")} active={sortColumn === "issue"}>Issue{sortArrow("issue")}</Th>
                <Th onClick={() => handleSort("status")} active={sortColumn === "status"}>Status{sortArrow("status")}</Th>
                <th className="p-4 font-semibold text-gray-700 dark:text-gray-300">Notes</th>
                <th className="p-4 font-semibold text-gray-700 dark:text-gray-300 w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500 dark:text-gray-400">Loading...</td>
                </tr>
              ) : repairs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500 dark:text-gray-400">
                    {search || statusFilter ? "No repairs match your filters." : "No repairs logged yet. Add one above!"}
                  </td>
                </tr>
              ) : (
                repairs.map((repair) => (
                  <tr key={repair.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="p-4 text-sm text-gray-800 dark:text-gray-200 whitespace-nowrap">{repair.date}</td>
                    <td className="p-4 text-sm text-gray-800 dark:text-gray-200">{repair.user}</td>
                    <td className="p-4 text-sm text-gray-800 dark:text-gray-200">{repair.model}</td>
                    <td className="p-4 text-sm text-gray-800 dark:text-gray-200 font-mono">{repair.serial}</td>
                    <td className="p-4 text-sm text-gray-800 dark:text-gray-200">{repair.issue}</td>
                    <td className="p-4 text-sm">{statusBadge(repair.status)}</td>
                    <td className="p-4 text-sm text-gray-800 dark:text-gray-200 max-w-xs truncate" title={repair.notes}>
                      {repair.notes}
                    </td>
                    <td className="p-4 text-sm whitespace-nowrap">
                      <button onClick={() => openEditModal(repair)} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mr-3 font-medium">Edit</button>
                      <button onClick={() => handleDelete(repair.id)} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium">Del</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 text-sm text-gray-600 dark:text-gray-400">
            <span>Showing {repairs.length} of {total} entries</span>
            <div className="flex gap-2 items-center">
              <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 border-gray-300 dark:border-gray-600 transition">Previous</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                .map((p, idx, arr) => (
                  <React.Fragment key={p}>
                    {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1">...</span>}
                    <button onClick={() => setPage(p)} className={`px-3 py-1 border rounded transition ${p === page ? "bg-blue-600 text-white" : "hover:bg-gray-100 dark:hover:bg-gray-700 border-gray-300 dark:border-gray-600"}`}>
                      {p}
                    </button>
                  </React.Fragment>
                ))}
              <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 border-gray-300 dark:border-gray-600 transition">Next</button>
            </div>
          </div>
        )}
      </div>

      {editingRepair && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setEditingRepair(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">Edit Repair Entry</h2>
            <form onSubmit={handleEditSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col">
                <label className={labelClass}>Date</label>
                <input type="date" name="date" value={editFormData.date} onChange={handleEditInputChange} className={inputClass} required />
              </div>
              <div className="flex flex-col">
                <label className={labelClass}>User</label>
                <input type="text" name="user" value={editFormData.user} onChange={handleEditInputChange} className={inputClass} />
              </div>
              <div className="flex flex-col">
                <label className={labelClass}>Model</label>
                <input type="text" name="model" value={editFormData.model} onChange={handleEditInputChange} className={inputClass} required />
              </div>
              <div className="flex flex-col">
                <label className={labelClass}>Serial Number</label>
                <input type="text" name="serial" value={editFormData.serial} onChange={handleEditInputChange} className={inputClass} required />
              </div>
              <div className="flex flex-col">
                <label className={labelClass}>Issue</label>
                <input type="text" name="issue" value={editFormData.issue} onChange={handleEditInputChange} className={inputClass} required />
              </div>
              <div className="flex flex-col">
                <label className={labelClass}>Status</label>
                <select name="status" value={editFormData.status} onChange={handleEditInputChange} className={inputClass}>
                  <option value="Fixed">Fixed</option>
                  <option value="Partly Fixed">Partly Fixed</option>
                  <option value="Not Fixed">Not Fixed</option>
                </select>
              </div>
              <div className="flex flex-col sm:col-span-2">
                <label className={labelClass}>Notes</label>
                <input type="text" name="notes" value={editFormData.notes} onChange={handleEditInputChange} className={inputClass} />
              </div>
              <div className="flex gap-3 sm:col-span-2 justify-end mt-2">
                <button type="button" onClick={() => setEditingRepair(null)} className="px-4 py-2 border rounded text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border-gray-300 dark:border-gray-600 transition">Cancel</button>
                <button type="submit" className={btnPrimary}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <button
        onClick={toggleDarkMode}
        className="fixed bottom-4 left-4 z-50 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition shadow-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
        title={`Switch to ${darkMode ? "light" : "dark"} mode`}
      >
        <span className="text-base">{darkMode ? "\u2600\uFE0F" : "\uD83C\uDF19"}</span>
        <span>{darkMode ? "Light" : "Dark"}</span>
      </button>
    </div>
  );
}

function Th({ children, onClick, active }: { children: React.ReactNode; onClick: () => void; active: boolean }) {
  return (
    <th className={`p-4 font-semibold cursor-pointer select-none ${active ? "text-blue-700 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"} hover:text-blue-600 dark:hover:text-blue-400`} onClick={onClick}>
      {children}
    </th>
  );
}
