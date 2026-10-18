import React, { useState } from 'react';
import {
  Upload,
  X,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Download,
  Check,
  FileCheck,
  ArrowRight,
  Database
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { bulkImportEmployees } from '../api';
import { Employee } from '../types';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ColumnMapping {
  employee_name: string;
  email_id: string;
  company_name: string;
  contact_number: string;
  whatsapp_number: string;
  job_title: string;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    employee_name: '',
    email_id: '',
    company_name: '',
    contact_number: '',
    whatsapp_number: '',
    job_title: '',
  });

  const [headerStatus, setHeaderStatus] = useState<{
    valid: boolean;
    missingRequired: string[];
    messages: string[];
  } | null>(null);

  const [importing, setImporting] = useState(false);

  const handleResetAndClose = () => {
    setFile(null);
    setRawHeaders([]);
    setRawRows([]);
    setHeaderStatus(null);
    setImporting(false);
    onClose();
  };

  if (!isOpen) return null;

  // Header Alias Dictionary for Smart Auto-Matching
  const normalizeHeader = (h: string) => h.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

  const HEADER_ALIASES: Record<keyof ColumnMapping, string[]> = {
    employee_name: [
      'vendorname', 'employeename', 'name', 'fullname', 'candidatename', 'employee', 'vendor', 'candidate',
      'firstname', 'contactname', 'personname', 'clientname', 'leadname', 'client', 'lead'
    ],
    email_id: [
      'emailid', 'email', 'emailaddress', 'mail', 'mailid', 'contactemail', 'vendoremail', 'candidateemail', 'primaryemail', 'useremail'
    ],
    company_name: [
      'companyname', 'company', 'organization', 'org', 'employer', 'account', 'business', 'agency', 'firm'
    ],
    contact_number: [
      'contactnumber', 'contact', 'phonenumber', 'phone', 'mobile', 'mobilephone', 'contactno', 'phoneno', 'tel', 'telephone'
    ],
    whatsapp_number: [
      'whatsappnumber', 'whatsapp', 'wanumber', 'whatsappno', 'wa'
    ],
    job_title: [
      'jobtitle', 'title', 'designation', 'role', 'position', 'job', 'occupation'
    ]
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });

        if (!jsonData || jsonData.length === 0) {
          alert('Spreadsheet is empty');
          return;
        }

        const rawHeaderRow = jsonData[0] || [];
        const headers = rawHeaderRow
          .map((h: any) => String(h ?? '').trim())
          .filter((h: string) => h.length > 0);

        if (headers.length === 0) {
          alert('Could not find valid column headers in the first row of the file.');
          return;
        }

        const rows = jsonData
          .slice(1)
          .filter((row: any[]) =>
            Array.isArray(row) &&
            row.some((cell) => cell !== undefined && cell !== null && String(cell).trim() !== '')
          );

        setRawHeaders(headers);
        setRawRows(rows);

        // Auto-match headers using alias dictionary
        const detectedMapping: ColumnMapping = {
          employee_name: '',
          email_id: '',
          company_name: '',
          contact_number: '',
          whatsapp_number: '',
          job_title: '',
        };

        (Object.keys(HEADER_ALIASES) as (keyof ColumnMapping)[]).forEach((fieldKey) => {
          const aliases = HEADER_ALIASES[fieldKey];
          const matchedHeader = headers.find((h: string) => aliases.includes(normalizeHeader(h)));
          if (matchedHeader) {
            detectedMapping[fieldKey] = matchedHeader;
          }
        });

        setColumnMapping(detectedMapping);
        validateHeaders(detectedMapping);
      } catch (err) {
        alert('Failed to parse Excel/CSV file. Please ensure it is a valid .xlsx, .xls, or .csv format.');
      }
    };
    reader.readAsBinaryString(uploadedFile);
  };

  const validateHeaders = (mapping: ColumnMapping) => {
    const missing: string[] = [];
    const messages: string[] = [];

    if (!mapping.employee_name) missing.push('Candidate/Vendor Name');
    if (!mapping.email_id) missing.push('Email ID');

    if (missing.length > 0) {
      messages.push(`Missing mandatory column mappings: ${missing.join(', ')}`);
    } else {
      messages.push('Mandatory columns (Name & Email ID) successfully mapped!');
    }

    setHeaderStatus({
      valid: missing.length === 0,
      missingRequired: missing,
      messages
    });
  };

  const handleMappingChange = (fieldKey: keyof ColumnMapping, headerValue: string) => {
    const updated = { ...columnMapping, [fieldKey]: headerValue };
    setColumnMapping(updated);
    validateHeaders(updated);
  };

  const handleDownloadSample = () => {
    const sampleData = [
      {
        'Vendor Name': 'Rahul Sharma',
        'Email ID': 'rahul.sharma@example.com',
        'Company Name': 'TechCorp India',
        'Contact Number': '+91 98765 43210',
        'WhatsApp Number': '+91 98765 43210',
        'Job Title': 'Senior Frontend Engineer'
      },
      {
        'Vendor Name': 'Priya Verma',
        'Email ID': 'priya.verma@example.com',
        'Company Name': 'DataScale Systems',
        'Contact Number': '+91 98123 45678',
        'WhatsApp Number': '+91 98123 45678',
        'Job Title': 'Lead Data Scientist'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Vendors');
    XLSX.writeFile(workbook, 'Rapid_Conect_Vendor_Import_Template.xlsx');
  };

  const handleExecuteImport = async () => {
    if (!columnMapping.employee_name || !columnMapping.email_id) {
      alert('Please select which columns contain Name and Email ID before importing.');
      return;
    }

    setImporting(true);
    try {
      const getVal = (row: any[], headerName: string) => {
        if (!headerName) return '';
        const idx = rawHeaders.indexOf(headerName);
        return idx !== -1 && row[idx] !== undefined && row[idx] !== null ? String(row[idx]).trim() : '';
      };

      const recordsToImport: Partial<Employee>[] = rawRows
        .filter((row) => Array.isArray(row) && row.length > 0)
        .map((row) => {
          return {
            employee_name: getVal(row, columnMapping.employee_name),
            email_id: getVal(row, columnMapping.email_id),
            company_name: getVal(row, columnMapping.company_name) || 'Rapid Conect',
            contact_number: getVal(row, columnMapping.contact_number) || undefined,
            whatsapp_number: getVal(row, columnMapping.whatsapp_number) || undefined,
            job_title: getVal(row, columnMapping.job_title) || undefined,
            status: 'Active'
          };
        })
        .filter((r) => r.employee_name && r.email_id);

      if (recordsToImport.length === 0) {
        alert('No valid rows with both Name and Email ID found to import. Please check your column selection.');
        setImporting(false);
        return;
      }

      const res = await bulkImportEmployees(recordsToImport as any);
      alert(res.message || `Successfully imported ${res.count} record(s)!`);
      onSuccess();
      handleResetAndClose();
    } catch (err: any) {
      alert(err.message || 'Failed to import records from spreadsheet');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Bulk Vendor Import via Excel / CSV</h2>
              <p className="text-xs text-slate-300">Upload vendor spreadsheet with smart header verification</p>
            </div>
          </div>

          <button onClick={handleResetAndClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {/* Top Bar: Sample Template Download */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-slate-800">Standard Excel Template</div>
              <div className="text-[11px] text-slate-500">Download formatted Excel sample with standard column headers</div>
            </div>

            <button
              onClick={handleDownloadSample}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg shadow-xs transition-all"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              <span>Download Template</span>
            </button>
          </div>

          {/* Upload Drop Zone */}
          {!file ? (
            <label className="border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50/50 hover:bg-indigo-50/30 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all space-y-3">
              <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <Upload className="w-6 h-6" />
              </div>
              <div className="text-center">
                <span className="text-sm font-bold text-slate-800">Click to upload spreadsheet</span>
                <span className="text-xs text-slate-500 block mt-0.5">Supports .xlsx, .xls, .csv files</span>
              </div>
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          ) : (
            <div className="space-y-5">
              {/* File Badge */}
              <div className="p-4 bg-indigo-50/60 border border-indigo-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-6 h-6 text-indigo-600" />
                  <div>
                    <div className="text-xs font-bold text-slate-900">{file.name}</div>
                    <div className="text-[11px] text-indigo-700 font-medium">
                      Parsed {rawRows.length} rows & {rawHeaders.length} column headers
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => { setFile(null); setRawRows([]); setRawHeaders([]); setHeaderStatus(null); }}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 underline"
                >
                  Choose Different File
                </button>
              </div>

              {/* Header Verification Alert Banner */}
              {headerStatus && (
                <div
                  className={`p-4 rounded-xl border space-y-2 ${
                    headerStatus.valid
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                      : 'bg-amber-50 text-amber-900 border-amber-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-xs">
                      {headerStatus.valid ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Header Verification Passed</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                          <span>Header Verification Alert</span>
                        </>
                      )}
                    </div>
                    <span className="text-[11px] font-semibold opacity-80">
                      {headerStatus.valid ? 'Standard Columns Detected' : 'Column Mapping Required'}
                    </span>
                  </div>

                  <p className="text-xs leading-relaxed">{headerStatus.messages[0]}</p>
                </div>
              )}

              {/* Column Mapping Section */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-indigo-600" />
                  <span>Verify Column Mapping</span>
                </h3>

                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Employee Name * {columnMapping.employee_name && <Check className="w-3 h-3 text-emerald-600 inline ml-1" />}
                    </label>
                    <select
                      value={columnMapping.employee_name}
                      onChange={e => handleMappingChange('employee_name', e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="">-- Select Column --</option>
                      {rawHeaders.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Email ID * {columnMapping.email_id && <Check className="w-3 h-3 text-emerald-600 inline ml-1" />}
                    </label>
                    <select
                      value={columnMapping.email_id}
                      onChange={e => handleMappingChange('email_id', e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="">-- Select Column --</option>
                      {rawHeaders.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Company Name</label>
                    <select
                      value={columnMapping.company_name}
                      onChange={e => handleMappingChange('company_name', e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="">-- Ignore Column --</option>
                      {rawHeaders.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Job Title</label>
                    <select
                      value={columnMapping.job_title}
                      onChange={e => handleMappingChange('job_title', e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="">-- Ignore Column --</option>
                      {rawHeaders.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Contact Number</label>
                    <select
                      value={columnMapping.contact_number}
                      onChange={e => handleMappingChange('contact_number', e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="">-- Ignore Column --</option>
                      {rawHeaders.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">WhatsApp Number</label>
                    <select
                      value={columnMapping.whatsapp_number}
                      onChange={e => handleMappingChange('whatsapp_number', e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="">-- Ignore Column --</option>
                      {rawHeaders.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Sample Parsed Rows Preview */}
              {rawRows.length > 0 && columnMapping.employee_name && columnMapping.email_id && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Parsed Rows Sample (Top 3)
                  </div>
                  <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="p-2">Name</th>
                          <th className="p-2">Email</th>
                          <th className="p-2">Company</th>
                          <th className="p-2">Job Title</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {rawRows.slice(0, 3).map((r, i) => {
                          const getCell = (headerName: string) => {
                            if (!headerName) return '—';
                            const idx = rawHeaders.indexOf(headerName);
                            return idx !== -1 && r[idx] !== undefined && r[idx] !== null && String(r[idx]).trim() !== ''
                              ? String(r[idx])
                              : '—';
                          };
                          return (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="p-2 font-semibold text-slate-800">{getCell(columnMapping.employee_name)}</td>
                              <td className="p-2 text-slate-600">{getCell(columnMapping.email_id)}</td>
                              <td className="p-2 text-slate-600">{getCell(columnMapping.company_name)}</td>
                              <td className="p-2 text-slate-600">{getCell(columnMapping.job_title)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleExecuteImport}
            disabled={!file || importing || !columnMapping.employee_name || !columnMapping.email_id}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-md disabled:opacity-50 transition-all"
          >
            <Database className="w-3.5 h-3.5" />
            <span>{importing ? 'Importing Vendors...' : `Import ${rawRows.length} Vendors`}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
