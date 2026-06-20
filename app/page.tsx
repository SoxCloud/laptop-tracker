"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";

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

interface LaptopProfile {
  serial: string;
  model: string;
  latestDate: string;
  latestStatus: string;
  totalRepairs: number;
}

type SortColumn = "date" | "user" | "model" | "serial" | "issue" | "status";

export default function RepairTracker() {
  const [view, setView] = useState<"laptops" | "repairs">("laptops");
  const [repairs, setRepairs] = useState<LaptopRepair[]>([]);
  const [allRepairs, setAllRepairs] = useState<LaptopRepair[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [configured, setConfigured] = useState(true);

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
    date: "", user: "", model: "", serial: "", issue: "", status: "Fixed", notes: "",
  });

  const [historyLaptop, setHistoryLaptop] = useState<{ serial: string; model: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("darkMode") === "true";
    return false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  const fetchKey = `${page}-${search}-${statusFilter}-${sortColumn}-${sortDirection}-${refreshKey}`;

  useEffect(() => {
    if (view !== "repairs") return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), sortColumn, sortDirection });
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      try {
        const res = await fetch(`/api/repairs?${params}`);
        const data = await res.json();
        if (!cancelled) {
          setRepairs(data.repairs || []);
          setTotal(data.total || 0);
          setConfigured(data.configured !== false);
          if (data.error) setError(data.error);
        }
      } catch {
        if (!cancelled) setError("Failed to load repairs.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchKey, view]);

  useEffect(() => {
    if (view !== "laptops") return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/repairs?pageSize=1000`);
        const data = await res.json();
        if (!cancelled) {
          setAllRepairs(data.repairs || []);
          setTotal(data.total || 0);
          setConfigured(data.configured !== false);
          if (data.error) setError(data.error);
        }
      } catch {
        if (!cancelled) setError("Failed to load laptops.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, refreshKey]);

  const laptopProfiles: LaptopProfile[] = useMemo(() => {
    const map = new Map<string, { model: string; date: string; status: string; count: number }>();
    for (const r of allRepairs) {
      const existing = map.get(r.serial);
      if (!existing || r.date > existing.date) {
        map.set(r.serial, { model: r.model, date: r.date, status: r.status, count: (existing?.count || 0) + 1 });
      } else {
        map.set(r.serial, { ...existing, count: existing.count + 1 });
      }
    }
    return Array.from(map.entries()).map(([serial, data]) => ({
      serial,
      model: data.model,
      latestDate: data.date,
      latestStatus: data.status,
      totalRepairs: data.count,
    })).sort((a, b) => b.latestDate.localeCompare(a.latestDate));
  }, [repairs]);

  const historyEntries = useMemo(() => {
    if (!historyLaptop) return [];
    return allRepairs
      .filter((r) => r.serial === historyLaptop.serial)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [allRepairs, historyLaptop]);

  const handleSearch = () => { setPage(1); setSearch(searchInput); };
  const handleSearchKeyDown = (e: React.KeyboardEvent) => { if (e.key === "Enter") handleSearch(); };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortColumn(column); setSortDirection("asc"); }
    setPage(1);
  };

  const sortArrow = (column: SortColumn) => {
    if (sortColumn !== column) return " \u2195";
    return sortDirection === "asc" ? " \u2191" : " \u2193";
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/repairs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, date: formData.date.split("-").reverse().join("/") }),
      });
      if (!res.ok) throw new Error("Failed to add");
      setFormData({ date: new Date().toISOString().split("T")[0], user: "", model: "", serial: "", issue: "", status: "Fixed", notes: "" });
      setPage(1);
      setRefreshKey((k) => k + 1);
    } catch { setError("Failed to add repair entry"); }
  };

  const switchView = (v: "laptops" | "repairs") => {
    setView(v);
    setPage(1);
    setSearchInput("");
    setSearch("");
    setStatusFilter("");
  };

  const openEditModal = (repair: LaptopRepair) => {
    const [d, m, y] = repair.date.split("/");
    setEditingRepair(repair);
    setEditFormData({ date: `${y}-${m}-${d}`, user: repair.user === "Not Assigned" ? "" : repair.user, model: repair.model, serial: repair.serial, issue: repair.issue, status: repair.status, notes: repair.notes });
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setEditFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRepair) return;
    try {
      const res = await fetch(`/api/repairs/${editingRepair.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editFormData, date: editFormData.date.split("-").reverse().join("/") }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setEditingRepair(null);
      setRefreshKey((k) => k + 1);
    } catch { setError("Failed to update repair entry"); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this entry?")) return;
    try {
      await fetch(`/api/repairs/${id}`, { method: "DELETE" });
      if (repairs.length === 1 && page > 1) setPage((p) => p - 1);
      setRefreshKey((k) => k + 1);
    } catch { setError("Failed to delete repair entry"); }
  };

  const handleExport = () => window.open("/api/repairs/export", "_blank");

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/repairs/import", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Import failed");
      else { setPage(1); setRefreshKey((k) => k + 1); }
    } catch { setError("Failed to import CSV"); }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      Fixed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      "Partly Fixed": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      "Not Fixed": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || "bg-gray-100 dark:bg-gray-700 dark:text-gray-300"}`}>
        {status}
      </span>
    );
  };

  const inputClass = "border p-2 rounded mt-1 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600";
  const labelClass = "text-sm font-medium text-gray-600 dark:text-gray-400";
  const cardClass = "bg-white dark:bg-gray-800 rounded-lg shadow-md";

  if (!configured && !loading && !error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 max-w-lg text-center">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">Laptop Repair Tracker</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Google Sheets is not configured.</p>
          <p className="text-sm text-left text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 p-4 rounded mb-4 font-mono">
            1. Set <strong>GOOGLE_SERVICE_ACCOUNT_KEY</strong> in .env<br/>
            2. Enable the Sheets API in Google Cloud<br/>
            3. Share your sheet with the service account
          </p>
          <button onClick={() => window.location.reload()} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition font-medium">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-8 text-slate-900 dark:text-gray-100">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Laptop Repair Tracker</h1>
          <div className="flex gap-2 flex-wrap items-center">
            <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-1 flex">
              <button onClick={() => switchView("laptops")} className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${view === "laptops" ? "bg-blue-600 text-white" : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"}`}>Laptops</button>
              <button onClick={() => switchView("repairs")} className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${view === "repairs" ? "bg-blue-600 text-white" : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"}`}>All Repairs</button>
            </div>
            <button onClick={handleExport} className="bg-green-600 text-white text-sm font-medium py-2 px-4 rounded hover:bg-green-700 transition">Export CSV</button>
            <button onClick={() => fileInputRef.current?.click()} className="bg-purple-600 text-white text-sm font-medium py-2 px-4 rounded hover:bg-purple-700 transition">Import CSV</button>
            <input ref={fileInputRef} type="file" accept=".csv" onChange={handleImport} className="hidden" />
          </div>
        </div>

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
                type="text" placeholder="Search by user, model, serial, issue..."
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

        {view === "laptops" ? (
          <>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-x-auto">
              <table className="min-w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-700 border-b-2 border-gray-200 dark:border-gray-700">
                    <th className="p-4 font-semibold text-gray-700 dark:text-gray-300">Model</th>
                    <th className="p-4 font-semibold text-gray-700 dark:text-gray-300">Serial Number</th>
                    <th className="p-4 font-semibold text-gray-700 dark:text-gray-300">Last Repair</th>
                    <th className="p-4 font-semibold text-gray-700 dark:text-gray-300">Latest Status</th>
                    <th className="p-4 font-semibold text-gray-700 dark:text-gray-300">Total Repairs</th>
                    <th className="p-4 font-semibold text-gray-700 dark:text-gray-300 w-24">History</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} className="p-8 text-center text-gray-500 dark:text-gray-400">Loading...</td></tr>
                  ) : laptopProfiles.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-gray-500 dark:text-gray-400">No laptops found.</td></tr>
                  ) : (
                    laptopProfiles.map((lp) => (
                      <tr key={lp.serial} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="p-4 text-sm text-gray-800 dark:text-gray-200">{lp.model}</td>
                        <td className="p-4 text-sm font-mono text-gray-800 dark:text-gray-200">{lp.serial}</td>
                        <td className="p-4 text-sm text-gray-800 dark:text-gray-200 whitespace-nowrap">{lp.latestDate}</td>
                        <td className="p-4 text-sm">{statusBadge(lp.latestStatus)}</td>
                        <td className="p-4 text-sm text-gray-800 dark:text-gray-200">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-bold">{lp.totalRepairs}</span>
                        </td>
                        <td className="p-4 text-sm">
                          <button onClick={() => setHistoryLaptop({ serial: lp.serial, model: lp.model })} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium">
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
              Showing {laptopProfiles.length} laptop{laptopProfiles.length !== 1 ? "s" : ""}
            </p>
          </>
        ) : (
          <>
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
                    <tr><td colSpan={8} className="p-8 text-center text-gray-500 dark:text-gray-400">Loading...</td></tr>
                  ) : repairs.length === 0 ? (
                    <tr><td colSpan={8} className="p-8 text-center text-gray-500 dark:text-gray-400">
                      {search || statusFilter ? "No repairs match your filters." : "No repairs logged yet."}
                    </td></tr>
                  ) : (
                    repairs.map((repair) => (
                      <tr key={repair.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="p-4 text-sm text-gray-800 dark:text-gray-200 whitespace-nowrap">{repair.date}</td>
                        <td className="p-4 text-sm text-gray-800 dark:text-gray-200">{repair.user}</td>
                        <td className="p-4 text-sm text-gray-800 dark:text-gray-200">{repair.model}</td>
                        <td className="p-4 text-sm font-mono text-gray-800 dark:text-gray-200">{repair.serial}</td>
                        <td className="p-4 text-sm text-gray-800 dark:text-gray-200">{repair.issue}</td>
                        <td className="p-4 text-sm">{statusBadge(repair.status)}</td>
                        <td className="p-4 text-sm text-gray-800 dark:text-gray-200 max-w-xs truncate" title={repair.notes}>{repair.notes}</td>
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
                        <button onClick={() => setPage(p)} className={`px-3 py-1 border rounded transition ${p === page ? "bg-blue-600 text-white" : "hover:bg-gray-100 dark:hover:bg-gray-700 border-gray-300 dark:border-gray-600"}`}>{p}</button>
                      </React.Fragment>
                    ))}
                  <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 border-gray-300 dark:border-gray-600 transition">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <button
        onClick={() => { const next = !darkMode; setDarkMode(next); localStorage.setItem("darkMode", String(next)); document.documentElement.classList.toggle("dark", next); }}
        className="fixed bottom-4 left-4 z-50 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition shadow-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
        title={`Switch to ${darkMode ? "light" : "dark"} mode`}
      >
        <span className="text-base">{darkMode ? "\u2600\uFE0F" : "\uD83C\uDF19"}</span>
        <span>{darkMode ? "Light" : "Dark"}</span>
      </button>

      {editingRepair && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setEditingRepair(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">Edit Repair Entry</h2>
            <form onSubmit={handleEditSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col"><label className={labelClass}>Date</label><input type="date" name="date" value={editFormData.date} onChange={handleEditInputChange} className={inputClass} required /></div>
              <div className="flex flex-col"><label className={labelClass}>User</label><input type="text" name="user" value={editFormData.user} onChange={handleEditInputChange} className={inputClass} /></div>
              <div className="flex flex-col"><label className={labelClass}>Model</label><input type="text" name="model" value={editFormData.model} onChange={handleEditInputChange} className={inputClass} required /></div>
              <div className="flex flex-col"><label className={labelClass}>Serial Number</label><input type="text" name="serial" value={editFormData.serial} onChange={handleEditInputChange} className={inputClass} required /></div>
              <div className="flex flex-col"><label className={labelClass}>Issue</label><input type="text" name="issue" value={editFormData.issue} onChange={handleEditInputChange} className={inputClass} required /></div>
              <div className="flex flex-col"><label className={labelClass}>Status</label>
                <select name="status" value={editFormData.status} onChange={handleEditInputChange} className={inputClass}>
                  <option value="Fixed">Fixed</option>
                  <option value="Partly Fixed">Partly Fixed</option>
                  <option value="Not Fixed">Not Fixed</option>
                </select>
              </div>
              <div className="flex flex-col sm:col-span-2"><label className={labelClass}>Notes</label><input type="text" name="notes" value={editFormData.notes} onChange={handleEditInputChange} className={inputClass} /></div>
              <div className="flex gap-3 sm:col-span-2 justify-end mt-2">
                <button type="button" onClick={() => setEditingRepair(null)} className="px-4 py-2 border rounded text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border-gray-300 dark:border-gray-600 transition">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition font-medium">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {historyLaptop && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setHistoryLaptop(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">Repair History &mdash; {historyLaptop.model} ({historyLaptop.serial})</h2>
              <button onClick={() => setHistoryLaptop(null)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl leading-none">&times;</button>
            </div>
            {historyEntries.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">No history found.</p>
            ) : (
              <table className="min-w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-700 border-b-2 border-gray-200 dark:border-gray-700">
                    <th className="p-3 font-semibold text-gray-700 dark:text-gray-300">Date</th>
                    <th className="p-3 font-semibold text-gray-700 dark:text-gray-300">User</th>
                    <th className="p-3 font-semibold text-gray-700 dark:text-gray-300">Issue</th>
                    <th className="p-3 font-semibold text-gray-700 dark:text-gray-300">Status</th>
                    <th className="p-3 font-semibold text-gray-700 dark:text-gray-300">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {historyEntries.map((entry) => (
                    <tr key={entry.id} className="border-b border-gray-200 dark:border-gray-700">
                      <td className="p-3 text-sm text-gray-800 dark:text-gray-200 whitespace-nowrap">{entry.date}</td>
                      <td className="p-3 text-sm text-gray-800 dark:text-gray-200">{entry.user}</td>
                      <td className="p-3 text-sm text-gray-800 dark:text-gray-200">{entry.issue}</td>
                      <td className="p-3 text-sm">{statusBadge(entry.status)}</td>
                      <td className="p-3 text-sm text-gray-800 dark:text-gray-200">{entry.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
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
