"use client";
import React, { useState } from "react";

// This tells TypeScript exactly what a laptop log looks like
interface LaptopRepair {
  id: number;
  date: string;
  user: string;
  model: string;
  serial: string;
  issue: string;
  status: string;
  notes: string;
}

export default function RepairTracker() {
  // Initial state populated with data from your spreadsheet
  const [repairs, setRepairs] = useState<LaptopRepair[]>([
    {
      id: 1,
      date: "16/06/2026",
      user: "Not Assigned",
      model: "HP",
      serial: "5CG6334LR6",
      issue: "Slow",
      status: "Fixed",
      notes: "Rolled over to keep receiving updates.",
    },
    {
      id: 2,
      date: "19/06/2026",
      user: "Pearl Khowa",
      model: "DELL LATITUDE",
      serial: "30LSPF2",
      issue: "Mouse",
      status: "Fixed",
      notes: "Rolled back mouse drivers to a previously functional one.",
    }
  ]);

  // Form state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0], // Defaults to today's date
    user: "",
    model: "",
    serial: "",
    issue: "",
    status: "Fixed",
    notes: ""
  });

  // Explicitly typing the input change event for TypeScript
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Explicitly typing the form submit event
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newRepair: LaptopRepair = {
      ...formData,
      id: Date.now(), 
      date: formData.date.split('-').reverse().join('/') 
    };
    setRepairs([...repairs, newRepair]);
    
    // Reset form
    setFormData({
      date: new Date().toISOString().split('T')[0],
      user: "",
      model: "",
      serial: "",
      issue: "",
      status: "Fixed",
      notes: ""
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 text-slate-900">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Laptop Repair Tracker</h1>

        {/* Input Form */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Log New Fix</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-600">Date</label>
              <input type="date" name="date" value={formData.date} onChange={handleInputChange} className="border p-2 rounded mt-1 bg-white text-gray-800" required />
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-600">User</label>
              <input type="text" name="user" placeholder="e.g. Delton Manaka" value={formData.user} onChange={handleInputChange} className="border p-2 rounded mt-1 bg-white text-gray-800" />
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-600">Model</label>
              <input type="text" name="model" placeholder="e.g. Lenovo Ideapad" value={formData.model} onChange={handleInputChange} className="border p-2 rounded mt-1 bg-white text-gray-800" required />
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-600">Serial Number</label>
              <input type="text" name="serial" placeholder="e.g. PF1MX80J" value={formData.serial} onChange={handleInputChange} className="border p-2 rounded mt-1 bg-white text-gray-800" required />
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-600">Issue</label>
              <input type="text" name="issue" placeholder="e.g. Multiple" value={formData.issue} onChange={handleInputChange} className="border p-2 rounded mt-1 bg-white text-gray-800" required />
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-600">Status</label>
              <select name="status" value={formData.status} onChange={handleInputChange} className="border p-2 rounded mt-1 bg-white text-gray-800">
                <option value="Fixed">Fixed</option>
                <option value="Partly Fixed">Partly Fixed</option>
                <option value="Not Fixed">Not Fixed</option>
              </select>
            </div>

            <div className="flex flex-col md:col-span-2 lg:col-span-2">
              <label className="text-sm font-medium text-gray-600">Notes</label>
              <input type="text" name="notes" placeholder="Repair details..." value={formData.notes} onChange={handleInputChange} className="border p-2 rounded mt-1 bg-white text-gray-800" />
            </div>

            <div className="flex items-end">
              <button type="submit" className="w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded hover:bg-blue-700 transition">
                Add Entry
              </button>
            </div>
          </form>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-lg shadow-md overflow-x-auto">
          <table className="min-w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-gray-200">
                <th className="p-4 font-semibold text-gray-700">Date</th>
                <th className="p-4 font-semibold text-gray-700">User</th>
                <th className="p-4 font-semibold text-gray-700">Model</th>
                <th className="p-4 font-semibold text-gray-700">Serial Number</th>
                <th className="p-4 font-semibold text-gray-700">Issue</th>
                <th className="p-4 font-semibold text-gray-700">Status</th>
                <th className="p-4 font-semibold text-gray-700">Notes</th>
              </tr>
            </thead>
            <tbody>
              {repairs.map((repair) => (
                <tr key={repair.id} className="border-b hover:bg-gray-50">
                  <td className="p-4 text-sm text-gray-800">{repair.date}</td>
                  <td className="p-4 text-sm text-gray-800">{repair.user || "Not Assigned"}</td>
                  <td className="p-4 text-sm text-gray-800">{repair.model}</td>
                  <td className="p-4 text-sm text-gray-800">{repair.serial}</td>
                  <td className="p-4 text-sm text-gray-800">{repair.issue}</td>
                  <td className="p-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium 
                      ${repair.status === 'Fixed' ? 'bg-green-100 text-green-800' : 
                        repair.status === 'Partly Fixed' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-red-100 text-red-800'}`}>
                      {repair.status}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-gray-800 max-w-xs truncate" title={repair.notes}>
                    {repair.notes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {repairs.length === 0 && (
            <div className="p-8 text-center text-gray-500">No repairs logged yet.</div>
          )}
        </div>

      </div>
    </div>
  );
}