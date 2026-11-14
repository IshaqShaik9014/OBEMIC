'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  obeDatabaseService,
  EntityDefinition,
  FieldDefinition,
  LookupOption,
  MetadataResponse
} from '@/services/obe.database.service';
import { toast } from 'react-hot-toast';

export function DatabaseManagerView() {
  const [metadata, setMetadata] = useState<MetadataResponse | null>(null);
  const [selectedEntityKey, setSelectedEntityKey] = useState<string>('departments');
  const [records, setRecords] = useState<any[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Modal State
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [activeRecord, setActiveRecord] = useState<any | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleteConfirmationPrompt, setDeleteConfirmationPrompt] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 1. Load Metadata
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const meta = await obeDatabaseService.getMetadata();
        if (isMounted) {
          setMetadata(meta);
          if (meta.entities.length > 0) {
            setSelectedEntityKey(meta.entities[0].key);
          }
        }
      } catch (err: any) {
        toast.error(err.message || 'Failed to load database schema');
      }
    })();
    return () => { isMounted = false; };
  }, []);

  const currentEntity: EntityDefinition | undefined = useMemo(() => {
    return metadata?.entities.find(e => e.key === selectedEntityKey);
  }, [metadata, selectedEntityKey]);

  // 2. Fetch Records
  const fetchRecords = useCallback(async (page = 1, search = searchQuery) => {
    if (!selectedEntityKey) return;
    setIsLoading(true);
    try {
      const res = await obeDatabaseService.getRecords(selectedEntityKey, {
        page,
        limit: pageSize,
        search
      });
      setRecords(res.data || []);
      setTotalRecords(res.total || 0);
      setCurrentPage(res.page || 1);
      setTotalPages(res.totalPages || 1);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch records');
    } finally {
      setIsLoading(false);
    }
  }, [selectedEntityKey, pageSize, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
    fetchRecords(1, searchQuery);
  }, [selectedEntityKey, fetchRecords, searchQuery]);

  // Handle Search Submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRecords(1, searchQuery);
  };

  // 3. Open Create Modal
  const openCreateModal = () => {
    if (!currentEntity) return;
    const initial: Record<string, any> = {};
    currentEntity.fields.forEach(f => {
      if (f.creatable) {
        initial[f.name] = f.type === 'number' ? '' : '';
      }
    });
    setFormData(initial);
    setActiveRecord(null);
    setShowPassword(false);
    setModalMode('create');
  };

  // 4. Open Edit Modal
  const openEditModal = (item: any) => {
    if (!currentEntity) return;
    const initial: Record<string, any> = {};
    currentEntity.fields.forEach(f => {
      if (f.name === 'password') {
        initial.password = ''; // empty password means don't change
      } else {
        initial[f.name] = item[f.name] !== undefined && item[f.name] !== null ? item[f.name] : '';
      }
    });
    setFormData(initial);
    setActiveRecord(item);
    setShowPassword(false);
    setModalMode('edit');
  };

  // 5. Submit Form (Create or Edit)
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEntity) return;
    setIsSaving(true);
    try {
      if (modalMode === 'create') {
        await obeDatabaseService.createRecord(selectedEntityKey, formData);
        toast.success(`Successfully created ${currentEntity.singularLabel}!`);
      } else if (modalMode === 'edit' && activeRecord) {
        await obeDatabaseService.updateRecord(selectedEntityKey, activeRecord.id, formData);
        toast.success(`Successfully updated ${currentEntity.singularLabel}!`);
      }
      setModalMode(null);
      fetchRecords(currentPage, searchQuery);
    } catch (err: any) {
      toast.error(err.message || 'Operation failed');
    } finally {
      setIsSaving(false);
    }
  };

  // 6. Delete Flow
  const triggerDelete = (item: any) => {
    setDeleteTarget(item);
    setDeleteConfirmationPrompt(null);
  };

  const confirmDelete = async (force = false) => {
    if (!deleteTarget || !currentEntity) return;
    setIsDeleting(true);
    try {
      const res = await obeDatabaseService.deleteRecord(selectedEntityKey, deleteTarget.id, force);
      if (res.requiresConfirmation) {
        setDeleteConfirmationPrompt(res.message);
      } else {
        toast.success(res.message || `Deleted ${currentEntity.singularLabel}`);
        setDeleteTarget(null);
        setDeleteConfirmationPrompt(null);
        fetchRecords(currentPage, searchQuery);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete record');
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper to resolve cell display text
  const renderCellContent = (item: any, field: FieldDefinition) => {
    const val = item[field.name];

    // Relations
    if (field.name === 'departmentId' || field.name === 'department') {
      return item.department?.departmentName || item.departmentName || val || '—';
    }
    if (field.name === 'roleId') {
      return item.role?.roleName || val || '—';
    }
    if (field.name === 'facultyId') {
      return item.faculty ? `${item.faculty.name} (${item.faculty.employeeId || item.faculty.email})` : val || '—';
    }
    if (field.name === 'subjectId') {
      return item.subject ? `[${item.subject.subjectCode}] ${item.subject.subjectName}` : val || '—';
    }
    if (field.name === 'academicYearId' || field.name === 'academicYear') {
      return item.academicYear?.year || item.academicYear || val || '—';
    }
    if (field.name === 'semesterId' || field.name === 'semester') {
      return item.semester?.semester || item.semester || val || '—';
    }
    if (field.name === 'sectionId') {
      return item.section?.sectionName ? `Section ${item.section.sectionName}` : val || '—';
    }
    if (field.name === 'regulationId') {
      return item.regulation?.name || val || '—';
    }
    if (field.name === 'createdAt' || field.name === 'updatedAt') {
      if (!val) return '—';
      try {
        return new Date(val).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
      } catch {
        return val;
      }
    }

    if (val === null || val === undefined || val === '') return '—';

    // Badge styling for special columns
    if (field.name === 'subjectCode' || field.name === 'rollNumber' || field.name === 'coCode') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold bg-blue-50 text-blue-800 border border-blue-200">
          {val}
        </span>
      );
    }

    return String(val);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-[#0B1D33] via-[#1E3A5F] to-[#0B1D33] p-6 rounded-2xl shadow-xl border border-slate-700/50 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-blue-500/20 text-blue-300 rounded-xl border border-blue-400/30 text-xl font-bold">
              🗄️
            </span>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">OBE Master Database Hub</h2>
              <p className="text-sm text-slate-300 mt-0.5">
                Full-access administrative database console — Add, modify, or remove institution records directly.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchRecords(currentPage, searchQuery)}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-xl text-sm font-medium bg-slate-800/80 hover:bg-slate-700 border border-slate-600 text-slate-200 transition-all flex items-center gap-2"
          >
            <span className={isLoading ? 'animate-spin' : ''}>🔄</span>
            Refresh
          </button>
          {currentEntity && (
            <button
              onClick={openCreateModal}
              className="px-4 py-2 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2 hover:scale-[1.02]"
            >
              <span>➕</span>
              Add {currentEntity.singularLabel}
            </button>
          )}
        </div>
      </div>

      {/* 2. Entity Selector Pills */}
      <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          {metadata?.entities.map(ent => {
            const isSelected = ent.key === selectedEntityKey;
            return (
              <button
                key={ent.key}
                onClick={() => {
                  setSelectedEntityKey(ent.key);
                  setSearchQuery('');
                }}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                  isSelected
                    ? 'bg-[#0B1D33] text-white shadow-md shadow-slate-900/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span>{ent.label}</span>
                {isSelected && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500 text-white font-mono">
                    {totalRecords}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Search & Control Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-96">
          <div className="relative w-full">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={`Search ${currentEntity?.label || 'records'}...`}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl border border-slate-300 transition-all"
          >
            Find
          </button>
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                fetchRecords(1, '');
              }}
              className="px-2.5 py-2 text-slate-400 hover:text-slate-600 text-sm font-semibold"
            >
              Clear
            </button>
          )}
        </form>

        <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
          <span>Showing {records.length} of {totalRecords} records</span>
          <span className="text-slate-300">|</span>
          <span>Page {currentPage} of {totalPages || 1}</span>
        </div>
      </div>

      {/* 4. Data Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-16 text-center text-slate-400">
            <div className="inline-block animate-spin text-3xl mb-3">🔄</div>
            <p className="text-sm font-medium">Fetching records from database...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <span className="text-4xl block mb-2">📂</span>
            <p className="text-base font-semibold text-slate-600">No records found</p>
            <p className="text-xs text-slate-400 mt-1">
              {searchQuery ? `No results matching "${searchQuery}".` : `No entries currently stored in ${currentEntity?.label}.`}
            </p>
            {currentEntity && (
              <button
                onClick={openCreateModal}
                className="mt-4 px-4 py-2 text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-xl hover:bg-blue-100 transition-all"
              >
                + Add First {currentEntity.singularLabel}
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-12 text-center text-slate-400">#</th>
                  {currentEntity?.fields
                    .filter(f => f.showInTable)
                    .map(f => (
                      <th key={f.name} className="py-3.5 px-4">
                        {f.label}
                      </th>
                    ))}
                  <th className="py-3.5 px-4 text-right w-36">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {records.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 text-center text-xs text-slate-400 font-mono">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>
                    {currentEntity?.fields
                      .filter(f => f.showInTable)
                      .map(f => (
                        <td key={f.name} className="py-3.5 px-4 whitespace-nowrap">
                          {renderCellContent(item, f)}
                        </td>
                      ))}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-2">
                      <button
                        onClick={() => openEditModal(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-all"
                        title="Edit record"
                      >
                        <span>✏️</span> Edit
                      </button>
                      <button
                        onClick={() => triggerDelete(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-all"
                        title="Delete record"
                      >
                        <span>🗑️</span> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. Pagination Controls */}
        {totalPages > 1 && (
          <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex items-center justify-between">
            <button
              onClick={() => fetchRecords(currentPage - 1, searchQuery)}
              disabled={currentPage <= 1 || isLoading}
              className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              ← Previous
            </button>
            <div className="flex items-center gap-1 text-xs font-bold text-slate-600">
              Page {currentPage} of {totalPages}
            </div>
            <button
              onClick={() => fetchRecords(currentPage + 1, searchQuery)}
              disabled={currentPage >= totalPages || isLoading}
              className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* 6. Form Modal (Add / Edit) */}
      {modalMode && currentEntity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-scaleIn">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {modalMode === 'create' ? `Add New ${currentEntity.singularLabel}` : `Edit ${currentEntity.singularLabel}`}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {modalMode === 'create' ? 'Fill out the details to insert a new row.' : 'Update fields and save changes.'}
                </p>
              </div>
              <button
                onClick={() => setModalMode(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              {currentEntity.fields
                .filter(f => (modalMode === 'create' ? f.creatable : f.editable))
                .map(field => {
                  const val = formData[field.name] !== undefined ? formData[field.name] : '';

                  if (field.type === 'select') {
                    const options: LookupOption[] = field.optionsKey && metadata?.lookups
                      ? (metadata.lookups as any)[field.optionsKey] || []
                      : [];

                    return (
                      <div key={field.name} className="space-y-1">
                        <label className="block text-xs font-bold text-slate-700">
                          {field.label} {field.required && <span className="text-red-500">*</span>}
                        </label>
                        <select
                          value={val}
                          onChange={e => setFormData({ ...formData, [field.name]: e.target.value })}
                          required={field.required}
                          className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        >
                          <option value="">-- Select {field.label} --</option>
                          {options.map((opt: LookupOption) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  }

                  if (field.type === 'password') {
                    return (
                      <div key={field.name} className="space-y-1">
                        <label className="block text-xs font-bold text-slate-700">
                          {field.label} {modalMode === 'edit' && <span className="text-slate-400 font-normal">(leave blank to keep unchanged)</span>}
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={val}
                            onChange={e => setFormData({ ...formData, [field.name]: e.target.value })}
                            placeholder={modalMode === 'edit' ? '••••••••' : 'Enter initial password'}
                            required={modalMode === 'create' && field.required}
                            className="w-full px-3.5 py-2 pr-10 text-sm rounded-xl border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm"
                          >
                            {showPassword ? '👁️' : '🙈'}
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={field.name} className="space-y-1">
                      <label className="block text-xs font-bold text-slate-700">
                        {field.label} {field.required && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type={field.type === 'number' ? 'number' : 'text'}
                        step={field.type === 'number' ? 'any' : undefined}
                        value={val}
                        onChange={e => setFormData({ ...formData, [field.name]: e.target.value })}
                        required={field.required}
                        placeholder={`Enter ${field.label.toLowerCase()}...`}
                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      />
                    </div>
                  );
                })}

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-600/30 disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  {isSaving && <span className="animate-spin text-sm">🔄</span>}
                  {modalMode === 'create' ? 'Insert Record' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4 animate-scaleIn">
            <div className="flex items-center gap-3">
              <span className="p-3 bg-red-100 text-red-600 rounded-xl text-xl">⚠️</span>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete {currentEntity?.singularLabel}?</h3>
                <p className="text-xs text-slate-500 mt-0.5">This action cannot be undone.</p>
              </div>
            </div>

            {deleteConfirmationPrompt ? (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                <span className="font-bold block">⚠️ Cascade Warning:</span>
                <p>{deleteConfirmationPrompt}</p>
              </div>
            ) : (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
                Are you sure you want to permanently delete record{' '}
                <span className="font-mono font-bold text-slate-900">
                  {deleteTarget.departmentName ||
                    deleteTarget.subjectCode ||
                    deleteTarget.name ||
                    deleteTarget.rollNumber ||
                    deleteTarget.year ||
                    deleteTarget.id}
                </span>{' '}
                from <span className="font-bold">{currentEntity?.label}</span>?
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteConfirmationPrompt(null);
                }}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmDelete(!!deleteConfirmationPrompt)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 shadow-md shadow-red-600/30 disabled:opacity-50 transition-all flex items-center gap-1.5"
              >
                {isDeleting && <span className="animate-spin text-sm">🔄</span>}
                {deleteConfirmationPrompt ? 'Confirm Cascade Delete' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
