import React, { useState, useEffect } from "react";
import { X, Upload, Download, CheckCircle, AlertCircle, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import { endpoints } from "@/lib/apiService";

interface BulkExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function BulkExpenseModal({ isOpen, onClose, onSuccess }: BulkExpenseModalProps) {
  const [categories, setCategories] = useState<any[]>([]);
  const [parsedData, setParsedData] = useState<any[] | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [isUploading, setIsUploading] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
      setParsedData(null);
      setSelectedRows(new Set());
      fetchCategories();
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    try {
      const res: any = await endpoints.expenses.listCategories(true, 1, 100);
      setCategories(res.categories || res.items || (Array.isArray(res) ? res : []));
    } catch (err) {
      console.error("Failed to load categories", err);
    }
  };

  const downloadTemplate = () => {
    const ws_data = [
      ["Date", "Category", "Amount", "Notes"],
      ["2026-10-15", "Office Supplies", 150.50, "Printer ink and paper"],
      ["2026-10-16", "Marketing", 500, "Facebook Ads"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    
    // Auto-size columns
    ws['!cols'] = [{ wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 40 }];
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Expenses Template");
    XLSX.writeFile(wb, "Expense_Bulk_Upload_Template.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      
      const parsed = data.map((row: any, index: number) => {
        const catName = row["Category"]?.toString().trim();
        const matchedCat = categories.find(c => c.name.toLowerCase() === catName?.toLowerCase());
        
        let dateVal = row["Date"];
        try {
          if (typeof dateVal === "number") {
            // excel serial date
            const d = new Date(Math.round((dateVal - 25569) * 86400 * 1000));
            dateVal = d.toISOString().split("T")[0];
          } else if (dateVal) {
            dateVal = new Date(dateVal).toISOString().split("T")[0];
          }
        } catch(e) {
          dateVal = "";
        }
        
        const rawAmount = row["Amount"]?.toString() || "";
        const cleanAmount = rawAmount.replace(/[^0-9.-]+/g, "");
        const amount = parseFloat(cleanAmount) || 0;
        
        const errors = [];
        if (!matchedCat) errors.push(`Category '${catName || "empty"}' not found`);
        if (!dateVal) errors.push("Invalid date");
        if (amount <= 0) errors.push("Invalid amount");
        
        return {
          id: index,
          date: dateVal || "",
          categoryName: catName || "",
          categoryUlid: matchedCat?.ulid || null,
          amount: amount,
          notes: row["Notes"] || "",
          isValid: errors.length === 0,
          errors: errors
        };
      });
      
      setParsedData(parsed);
      setSelectedRows(new Set(parsed.filter((p: any) => p.isValid).map((p: any) => p.id)));
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const toggleRow = (id: number) => {
    const newSet = new Set(selectedRows);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedRows(newSet);
  };

  const toggleAll = () => {
    if (!parsedData) return;
    if (selectedRows.size === parsedData.filter(p => p.isValid).length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(parsedData.filter((p: any) => p.isValid).map((p: any) => p.id)));
    }
  };

  const handleBulkSave = async () => {
    if (!parsedData || selectedRows.size === 0) return;
    
    setIsUploading(true);
    const toSave = parsedData
      .filter((p: any) => selectedRows.has(p.id))
      .map((p: any) => ({
        category_ulid: p.categoryUlid,
        amount: p.amount,
        expense_date: p.date,
        notes: p.notes
      }));
      
    try {
      await endpoints.expenses.bulkCreate({ expenses: toSave });
      onSuccess();
    } catch (err) {
      console.error(err);
      alert("Failed to save some expenses. Please check your data.");
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-neutral-100 shrink-0">
          <div>
            <h2 className="text-xl font-black text-neutral-900">Bulk Upload Expenses</h2>
            <p className="text-sm font-medium text-neutral-500 mt-1">Upload an Excel file to quickly add multiple expenses</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          {!parsedData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border-2 border-dashed border-neutral-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center bg-neutral-50/50 hover:bg-neutral-50 transition-colors">
                <FileSpreadsheet className="w-12 h-12 text-[#6A0FAD] mb-4" />
                <h3 className="font-bold text-neutral-900 mb-2">1. Download Template</h3>
                <p className="text-sm text-neutral-500 mb-6 max-w-[250px]">
                  Start by downloading our formatted Excel template and fill in your expenses.
                </p>
                <button 
                  onClick={downloadTemplate}
                  className="bg-white border border-neutral-200 text-neutral-700 px-6 py-3 rounded-xl font-bold text-sm hover:border-[#6A0FAD] transition-colors flex items-center gap-2 shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  Download Excel Template
                </button>
              </div>

              <div className="border-2 border-dashed border-[#6A0FAD]/30 rounded-2xl p-8 flex flex-col items-center justify-center text-center bg-[#6A0FAD]/5 hover:bg-[#6A0FAD]/10 transition-colors relative">
                <Upload className="w-12 h-12 text-[#6A0FAD] mb-4" />
                <h3 className="font-bold text-neutral-900 mb-2">2. Upload Filled File</h3>
                <p className="text-sm text-neutral-500 mb-6 max-w-[250px]">
                  Upload your completed Excel file (.xlsx or .csv) to extract the expenses.
                </p>
                <button className="bg-[#6A0FAD] text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-[#5b0ca1] transition-colors shadow-md relative overflow-hidden flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Select File to Upload
                  <input 
                    type="file" 
                    accept=".xlsx, .xls, .csv" 
                    onChange={handleFileUpload} 
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between mb-4 shrink-0">
                <h3 className="font-bold text-neutral-900">Review Extracted Data</h3>
                <button 
                  onClick={() => setParsedData(null)}
                  className="text-sm font-bold text-neutral-500 hover:text-neutral-900 transition-colors"
                >
                  Upload a different file
                </button>
              </div>
              
              <div className="border border-neutral-200 rounded-xl overflow-hidden flex-1 flex flex-col min-h-0">
                <div className="overflow-x-auto flex-1 custom-scrollbar">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-neutral-50 sticky top-0 z-10 border-b border-neutral-200">
                      <tr>
                        <th className="py-3 px-4 w-12 text-center">
                          <input 
                            type="checkbox" 
                            className="rounded border-neutral-300 text-[#6A0FAD] focus:ring-[#6A0FAD]"
                            checked={selectedRows.size > 0 && selectedRows.size === parsedData.filter(p => p.isValid).length}
                            onChange={toggleAll}
                          />
                        </th>
                        <th className="py-3 px-4 font-bold text-neutral-500 uppercase tracking-wider text-xs">Status</th>
                        <th className="py-3 px-4 font-bold text-neutral-500 uppercase tracking-wider text-xs">Date</th>
                        <th className="py-3 px-4 font-bold text-neutral-500 uppercase tracking-wider text-xs">Category</th>
                        <th className="py-3 px-4 font-bold text-neutral-500 uppercase tracking-wider text-xs">Amount</th>
                        <th className="py-3 px-4 font-bold text-neutral-500 uppercase tracking-wider text-xs">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.map((row: any) => (
                        <tr key={row.id} className={`border-b border-neutral-100 last:border-0 hover:bg-neutral-50 transition-colors ${!row.isValid ? 'bg-red-50/50 hover:bg-red-50' : ''}`}>
                          <td className="py-3 px-4 text-center">
                            <input 
                              type="checkbox" 
                              className="rounded border-neutral-300 text-[#6A0FAD] focus:ring-[#6A0FAD] disabled:opacity-50"
                              checked={selectedRows.has(row.id)}
                              onChange={() => toggleRow(row.id)}
                              disabled={!row.isValid}
                            />
                          </td>
                          <td className="py-3 px-4">
                            {row.isValid ? (
                              <span className="flex items-center gap-1.5 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-md w-max">
                                <CheckCircle className="w-3.5 h-3.5" /> Valid
                              </span>
                            ) : (
                              <div className="flex flex-col gap-1">
                                <span className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-md w-max">
                                  <AlertCircle className="w-3.5 h-3.5" /> Invalid
                                </span>
                                <span className="text-[10px] text-red-500 font-bold max-w-[150px] whitespace-normal">
                                  {row.errors?.join(", ")}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className={`py-3 px-4 ${!row.date ? 'text-red-500' : 'text-neutral-900 font-medium'}`}>{row.date || 'Missing'}</td>
                          <td className={`py-3 px-4 ${!row.categoryUlid ? 'text-red-500' : 'text-neutral-900 font-medium'}`}>{row.categoryName || 'Missing'}</td>
                          <td className={`py-3 px-4 ${!row.amount ? 'text-red-500' : 'text-neutral-900 font-medium'}`}>₹{row.amount}</td>
                          <td className="py-3 px-4 text-neutral-600 truncate max-w-[200px]">{row.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-neutral-100 bg-neutral-50/50 flex items-center justify-end gap-3 shrink-0 rounded-b-3xl">
          <button 
            onClick={onClose}
            className="px-6 py-3 rounded-xl font-bold text-sm text-neutral-600 hover:bg-neutral-100 transition-colors"
          >
            Cancel
          </button>
          {parsedData && (
            <button 
              onClick={handleBulkSave}
              disabled={selectedRows.size === 0 || isUploading}
              className="bg-[#6A0FAD] text-white px-8 py-3 rounded-xl font-bold text-sm hover:bg-[#5b0ca1] transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isUploading ? "Saving..." : `Import ${selectedRows.size} Expenses`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
