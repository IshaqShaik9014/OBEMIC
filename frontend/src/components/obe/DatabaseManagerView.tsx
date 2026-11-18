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
import {
  EntityIcon,
  IconRefresh,
  IconSprout,
  IconPlus,
  IconSearch,
  IconEdit,
  IconTrash,
  IconFolderEmpty,
  IconX,
  IconCheck,
  IconBuilding,
  IconEye,
  IconEyeOff
} from '@/components/ui/Icons';

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
  const [isSeeding, setIsSeeding] = useState(false);

  // Hover states for interactive elements
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);

  // 1. Load Metadata
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const meta = await obeDatabaseService.getMetadata();
        if (isMounted) {
          setMetadata(meta);
          if (meta.entities.length > 0 && !selectedEntityKey) {
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
  }, [selectedEntityKey, pageSize]);

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
        initial.password = ''; // empty password means keep unchanged
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
        toast.success(`Successfully added to ${currentEntity.label}!`);
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

  // 7. Seed Master Data Flow
  const handleSeedMaster = async () => {
    if (!window.confirm('Initialize & seed all standard institutional master data (Departments, Regulations, Academic Years, Semesters, Sections, Program Outcomes, and Sample Subjects)?')) {
      return;
    }
    setIsSeeding(true);
    try {
      const res = await obeDatabaseService.seedMasterData();
      toast.success(res.message || 'Master institutional data seeded successfully!');
      const meta = await obeDatabaseService.getMetadata();
      setMetadata(meta);
      fetchRecords(currentPage, searchQuery);
    } catch (err: any) {
      toast.error(err.message || 'Failed to seed master data');
    } finally {
      setIsSeeding(false);
    }
  };

  // Helper to resolve cell display text with custom badge styling
  const renderCellContent = (item: any, field: FieldDefinition) => {
    const val = item[field.name];

    // Relations
    if (field.name === 'departmentId' || field.name === 'department') {
      const name = item.department?.departmentName || item.departmentName || val;
      return name ? (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontWeight: 600,
          color: '#1E293B'
        }}>
          <IconBuilding size={14} color="#64748B" />
          {name}
        </span>
      ) : '—';
    }
    if (field.name === 'roleId') {
      const roleName = item.role?.roleName || val;
      if (!roleName) return '—';
      const isCoord = roleName === 'COORDINATOR';
      const isObe = roleName === 'OBE_INCHARGE';
      const isAdmin = roleName === 'ADMIN';
      return (
        <span style={{
          padding: '3px 8px',
          borderRadius: '6px',
          fontSize: '0.75rem',
          fontWeight: 700,
          background: isObe ? '#FEF3C7' : isCoord ? '#DCFCE7' : isAdmin ? '#F3E8FF' : '#EFF6FF',
          color: isObe ? '#92400E' : isCoord ? '#15803D' : isAdmin ? '#7E22CE' : '#1D4ED8',
          border: isObe ? '1px solid #FDE68A' : isCoord ? '1px solid #BBF7D0' : isAdmin ? '1px solid #E9D5FF' : '1px solid #BFDBFE'
        }}>
          {isObe ? 'OBE In-charge' : isCoord ? 'Branch Coordinator' : isAdmin ? 'HOD / Admin' : 'Faculty'}
        </span>
      );
    }
    if (field.name === 'facultyId') {
      return item.faculty ? (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 600, color: '#0F172A' }}>{item.faculty.name}</span>
          <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
            {item.faculty.employeeId ? `[${item.faculty.employeeId}] ` : ''}{item.faculty.email}
          </span>
        </div>
      ) : val || '—';
    }
    if (field.name === 'subjectId') {
      return item.subject ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            background: '#EFF6FF',
            color: '#1D4ED8',
            border: '1px solid #BFDBFE',
            padding: '2px 6px',
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontWeight: 700,
            fontSize: '0.78rem'
          }}>
            {item.subject.subjectCode}
          </span>
          <span style={{ fontWeight: 500, color: '#1E293B' }}>{item.subject.subjectName}</span>
        </div>
      ) : val || '—';
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
        return (
          <span style={{ color: '#64748B', fontSize: '0.8rem' }}>
            {new Date(val).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
          </span>
        );
      } catch {
        return val;
      }
    }

    if (val === null || val === undefined || val === '') return '—';

    // Badge styling for codes / roll numbers / keys
    if (field.name === 'subjectCode' || field.name === 'rollNumber' || field.name === 'coCode') {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '2px 8px',
          borderRadius: '5px',
          fontSize: '0.8rem',
          fontFamily: 'monospace',
          fontWeight: 700,
          background: '#EFF6FF',
          color: '#1D4ED8',
          border: '1px solid #BFDBFE'
        }}>
          {val}
        </span>
      );
    }

    // Passwords masked
    if (field.name === 'password') {
      return <span style={{ color: '#94A3B8', fontFamily: 'monospace' }}>••••••••</span>;
    }

    return String(val);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* 1. Header Toolbar Card */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '16px',
        padding: '20px 24px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
            border: '1px solid #BFDBFE',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 1px 3px rgba(37, 99, 235, 0.08)',
            flexShrink: 0
          }}>
            <EntityIcon entityKey={currentEntity?.key} iconName={currentEntity?.icon} size={22} color="#1D4ED8" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{
                fontSize: '1.35rem',
                fontWeight: 800,
                color: '#0F172A',
                margin: 0,
                letterSpacing: '-0.02em'
              }}>
                {currentEntity?.label || 'Database Records'}
              </h2>
              <span style={{
                padding: '2px 9px',
                borderRadius: '9999px',
                fontSize: '0.74rem',
                fontWeight: 700,
                background: '#F1F5F9',
                color: '#334155',
                border: '1px solid #E2E8F0'
              }}>
                {totalRecords} {totalRecords === 1 ? 'record' : 'records'}
              </span>
            </div>
            <p style={{
              margin: '3px 0 0 0',
              fontSize: '0.84rem',
              color: '#64748B'
            }}>
              {currentEntity?.description || 'Browse, filter, insert, edit, or remove records across institution tables.'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => fetchRecords(currentPage, searchQuery)}
            disabled={isLoading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '0.84rem',
              fontWeight: 600,
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              color: '#334155',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              transition: 'all 0.15s ease'
            }}
          >
            <IconRefresh size={15} color="#64748B" style={{ transform: isLoading ? 'rotate(360deg)' : 'none', transition: 'transform 0.5s ease' }} />
            Refresh
          </button>

          <button
            type="button"
            onClick={handleSeedMaster}
            disabled={isSeeding}
            title="Seed standard institutional master data (Departments, Regulations, Academic Years, Semesters, Sections, Outcomes)"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '0.84rem',
              fontWeight: 600,
              background: '#F0FDF4',
              border: '1px solid #BBF7D0',
              color: '#15803D',
              cursor: isSeeding ? 'not-allowed' : 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              transition: 'all 0.15s ease'
            }}
          >
            <IconSprout size={15} color="#15803D" />
            {isSeeding ? 'Seeding...' : 'Seed Master Data'}
          </button>

          {currentEntity && (
            <button
              type="button"
              onClick={openCreateModal}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.84rem',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                color: '#FFFFFF',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(37, 99, 235, 0.28)',
                transition: 'all 0.15s ease'
              }}
            >
              <IconPlus size={15} color="#FFFFFF" />
              Add {currentEntity.singularLabel}
            </button>
          )}
        </div>
      </div>

      {/* 2. Entity Navigation Tab Strip */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '12px',
        padding: '8px 10px',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '6px'
      }}>
        {metadata?.entities.map(ent => {
          const isSelected = ent.key === selectedEntityKey;
          const isHovered = hoveredTab === ent.key;
          return (
            <button
              key={ent.key}
              type="button"
              onClick={() => {
                setSelectedEntityKey(ent.key);
                setSearchQuery('');
              }}
              onMouseEnter={() => setHoveredTab(ent.key)}
              onMouseLeave={() => setHoveredTab(null)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '7px 13px',
                borderRadius: '8px',
                fontSize: '0.83rem',
                fontWeight: isSelected ? 700 : 500,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                border: isSelected ? '1px solid #0B1D33' : '1px solid transparent',
                background: isSelected
                  ? '#0B1D33'
                  : isHovered
                  ? '#F1F5F9'
                  : 'transparent',
                color: isSelected ? '#FFFFFF' : isHovered ? '#0F172A' : '#475569',
                boxShadow: isSelected ? '0 1px 4px rgba(11, 29, 51, 0.2)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <EntityIcon
                entityKey={ent.key}
                iconName={ent.icon}
                size={15}
                color={isSelected ? '#60A5FA' : isHovered ? '#2563EB' : '#64748B'}
              />
              <span>{ent.label}</span>
              {isSelected && (
                <span style={{
                  padding: '1px 6px',
                  borderRadius: '9999px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  background: '#2563EB',
                  color: '#FFFFFF'
                }}>
                  {totalRecords}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 3. Search & Control Toolbar */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '12px',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)'
      }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 300px', maxWidth: '440px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <span style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94A3B8',
              display: 'flex',
              alignItems: 'center',
              pointerEvents: 'none'
            }}>
              <IconSearch size={15} color="#94A3B8" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={`Search ${currentEntity?.label || 'records'}...`}
              style={{
                width: '100%',
                padding: '8px 12px 8px 34px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '0.85rem',
                color: '#0F172A',
                backgroundColor: '#FFFFFF',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              padding: '8px 14px',
              background: '#F8FAFC',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              color: '#334155',
              fontWeight: 600,
              fontSize: '0.84rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
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
              style={{
                padding: '8px 10px',
                background: 'transparent',
                border: 'none',
                color: '#64748B',
                fontWeight: 600,
                fontSize: '0.84rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <IconX size={14} /> Clear
            </button>
          )}
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.82rem', color: '#64748B' }}>
          <span>
            Showing <strong style={{ color: '#0F172A' }}>{records.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</strong> - <strong style={{ color: '#0F172A' }}>{Math.min(currentPage * pageSize, totalRecords)}</strong> of <strong style={{ color: '#0F172A' }}>{totalRecords}</strong>
          </span>
          <span style={{ color: '#CBD5E1' }}>|</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Per page:</span>
            <select
              value={pageSize}
              onChange={e => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '0.8rem',
                color: '#334155',
                background: '#FFFFFF',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Modern Data Table Card */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '14px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        overflow: 'hidden'
      }}>
        {isLoading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748B' }}>
            <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '50%', background: '#EFF6FF', marginBottom: '12px' }}>
              <IconRefresh size={24} color="#2563EB" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
            <p style={{ margin: 0, fontWeight: 600, fontSize: '0.92rem', color: '#334155' }}>
              Querying {currentEntity?.label}...
            </p>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#94A3B8' }}>
              Fetching latest records directly from database
            </p>
          </div>
        ) : records.length === 0 ? (
          <div style={{ padding: '56px 20px', textAlign: 'center', color: '#64748B' }}>
            <div style={{ display: 'inline-flex', padding: '14px', borderRadius: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0', marginBottom: '14px' }}>
              <IconFolderEmpty size={36} color="#94A3B8" />
            </div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.05rem', fontWeight: 700, color: '#0F172A' }}>
              No records found
            </h3>
            <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748B' }}>
              {searchQuery
                ? `No records matching "${searchQuery}" in ${currentEntity?.label}.`
                : `There are currently no records stored in ${currentEntity?.label}.`}
            </p>
            {currentEntity && (
              <button
                type="button"
                onClick={openCreateModal}
                style={{
                  marginTop: '16px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  background: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  color: '#1D4ED8',
                  cursor: 'pointer'
                }}
              >
                <IconPlus size={14} color="#1D4ED8" /> Add First {currentEntity.singularLabel}
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid #E2E8F0' }}>
                  <th style={{
                    padding: '12px 16px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    color: '#64748B',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    width: '48px',
                    textAlign: 'center'
                  }}>
                    #
                  </th>
                  {currentEntity?.fields
                    .filter(f => f.showInTable)
                    .map(f => (
                      <th
                        key={f.name}
                        style={{
                          padding: '12px 16px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          color: '#64748B',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {f.label}
                      </th>
                    ))}
                  <th style={{
                    padding: '12px 16px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    color: '#64748B',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    textAlign: 'right',
                    width: '140px'
                  }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {records.map((item, idx) => {
                  const rowId = item.id || String(idx);
                  const isHovered = hoveredRowId === rowId;
                  return (
                    <tr
                      key={rowId}
                      onMouseEnter={() => setHoveredRowId(rowId)}
                      onMouseLeave={() => setHoveredRowId(null)}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        background: isHovered ? '#F8FAFC' : '#FFFFFF',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <td style={{
                        padding: '12px 16px',
                        textAlign: 'center',
                        fontSize: '0.78rem',
                        fontFamily: 'monospace',
                        color: '#94A3B8',
                        fontWeight: 600
                      }}>
                        {(currentPage - 1) * pageSize + idx + 1}
                      </td>
                      {currentEntity?.fields
                        .filter(f => f.showInTable)
                        .map(f => (
                          <td
                            key={f.name}
                            style={{
                              padding: '12px 16px',
                              fontSize: '0.86rem',
                              color: '#1E293B',
                              whiteSpace: 'nowrap',
                              verticalAlign: 'middle'
                            }}
                          >
                            {renderCellContent(item, f)}
                          </td>
                        ))}
                      <td style={{
                        padding: '12px 16px',
                        textAlign: 'right',
                        whiteSpace: 'nowrap',
                        verticalAlign: 'middle'
                      }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            title={`Edit ${currentEntity?.singularLabel}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '5px 10px',
                              borderRadius: '6px',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              background: '#EFF6FF',
                              color: '#1D4ED8',
                              border: '1px solid #BFDBFE',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <IconEdit size={13} color="#1D4ED8" /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => triggerDelete(item)}
                            title={`Delete ${currentEntity?.singularLabel}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '5px 10px',
                              borderRadius: '6px',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              background: '#FEF2F2',
                              color: '#DC2626',
                              border: '1px solid #FECACA',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <IconTrash size={13} color="#DC2626" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. Pagination Footer */}
        {totalPages > 1 && (
          <div style={{
            background: '#F8FAFC',
            padding: '12px 20px',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <button
              type="button"
              onClick={() => fetchRecords(currentPage - 1, searchQuery)}
              disabled={currentPage <= 1 || isLoading}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: currentPage <= 1 ? '#94A3B8' : '#334155',
                background: '#FFFFFF',
                cursor: currentPage <= 1 ? 'not-allowed' : 'pointer'
              }}
            >
              &larr; Previous
            </button>

            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>
              Page <strong style={{ color: '#0F172A' }}>{currentPage}</strong> of <strong style={{ color: '#0F172A' }}>{totalPages}</strong>
            </div>

            <button
              type="button"
              onClick={() => fetchRecords(currentPage + 1, searchQuery)}
              disabled={currentPage >= totalPages || isLoading}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: currentPage >= totalPages ? '#94A3B8' : '#334155',
                background: '#FFFFFF',
                cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer'
              }}
            >
              Next &rarr;
            </button>
          </div>
        )}
      </div>

      {/* 6. Form Modal (Create or Edit Record) */}
      {modalMode && currentEntity && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            maxWidth: '620px',
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #CBD5E1',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid #E2E8F0',
              background: '#F8FAFC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <EntityIcon entityKey={currentEntity.key} iconName={currentEntity.icon} size={18} color="#2563EB" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0F172A' }}>
                    {modalMode === 'create' ? `Add New ${currentEntity.singularLabel}` : `Edit ${currentEntity.singularLabel}`}
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748B' }}>
                    {modalMode === 'create'
                      ? `Create a new record in ${currentEntity.label}`
                      : `Update record properties in ${currentEntity.label}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalMode(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748B',
                  cursor: 'pointer',
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '6px'
                }}
              >
                <IconX size={18} color="#64748B" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={{
                padding: '22px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                overflowY: 'auto',
                flex: 1
              }}>
                {currentEntity.fields
                  .filter(f => (modalMode === 'create' ? f.creatable : f.editable))
                  .map(field => {
                    const val = formData[field.name] !== undefined ? formData[field.name] : '';

                    if (field.type === 'select') {
                      const options: LookupOption[] = field.optionsKey && metadata?.lookups
                        ? (metadata.lookups as any)[field.optionsKey] || []
                        : [];

                      return (
                        <div key={field.name}>
                          <label style={{
                            display: 'block',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            color: '#334155',
                            marginBottom: '6px'
                          }}>
                            {field.label} {field.required && <span style={{ color: '#EF4444' }}>*</span>}
                          </label>
                          <select
                            value={val}
                            onChange={e => setFormData({ ...formData, [field.name]: e.target.value })}
                            required={field.required}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              borderRadius: '8px',
                              border: '1px solid #CBD5E1',
                              fontSize: '0.88rem',
                              color: '#0F172A',
                              background: '#FFFFFF',
                              outline: 'none',
                              boxSizing: 'border-box'
                            }}
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
                        <div key={field.name}>
                          <label style={{
                            display: 'block',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            color: '#334155',
                            marginBottom: '6px'
                          }}>
                            {field.label}{' '}
                            {modalMode === 'edit' ? (
                              <span style={{ color: '#94A3B8', fontWeight: 400, fontSize: '0.78rem' }}>
                                (leave blank to keep current password)
                              </span>
                            ) : field.required ? (
                              <span style={{ color: '#EF4444' }}>*</span>
                            ) : null}
                          </label>
                          <div style={{ position: 'relative' }}>
                            <input
                              type={showPassword ? 'text' : 'password'}
                              value={val}
                              onChange={e => setFormData({ ...formData, [field.name]: e.target.value })}
                              placeholder={modalMode === 'edit' ? '••••••••' : 'Enter account password'}
                              required={modalMode === 'create' && field.required}
                              style={{
                                width: '100%',
                                padding: '10px 40px 10px 12px',
                                borderRadius: '8px',
                                border: '1px solid #CBD5E1',
                                fontSize: '0.88rem',
                                color: '#0F172A',
                                outline: 'none',
                                boxSizing: 'border-box',
                                fontFamily: 'monospace'
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              style={{
                                position: 'absolute',
                                right: '10px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'none',
                                border: 'none',
                                color: '#64748B',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                padding: '4px'
                              }}
                            >
                              {showPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={field.name}>
                        <label style={{
                          display: 'block',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          color: '#334155',
                          marginBottom: '6px'
                        }}>
                          {field.label} {field.required && <span style={{ color: '#EF4444' }}>*</span>}
                        </label>
                        <input
                          type={field.type === 'number' ? 'number' : 'text'}
                          step={field.type === 'number' ? 'any' : undefined}
                          value={val}
                          onChange={e => setFormData({ ...formData, [field.name]: e.target.value })}
                          required={field.required}
                          placeholder={`Enter ${field.label.toLowerCase()}...`}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: '1px solid #CBD5E1',
                            fontSize: '0.88rem',
                            color: '#0F172A',
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                    );
                  })}
              </div>

              {/* Modal Footer */}
              <div style={{
                padding: '14px 24px',
                background: '#F8FAFC',
                borderTop: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px'
              }}>
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#475569',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                    color: '#FFFFFF',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {isSaving && <IconRefresh size={14} color="#FFFFFF" style={{ animation: 'spin 1s linear infinite' }} />}
                  {modalMode === 'create' ? 'Save New Record' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Delete Confirmation Modal */}
      {deleteTarget && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            maxWidth: '460px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #CBD5E1',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.4rem'
              }}>
                ⚠️
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0F172A' }}>
                  Delete {currentEntity?.singularLabel}?
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748B' }}>
                  This action will permanently delete this record from the database.
                </p>
              </div>
            </div>

            {deleteConfirmationPrompt ? (
              <div style={{
                padding: '12px 14px',
                background: '#FFFBEB',
                border: '1px solid #FDE68A',
                borderRadius: '10px',
                fontSize: '0.82rem',
                color: '#92400E',
                lineHeight: '1.45'
              }}>
                <strong style={{ display: 'block', marginBottom: '4px' }}>⚠️ Cascade Notice:</strong>
                {deleteConfirmationPrompt}
              </div>
            ) : (
              <div style={{
                padding: '12px 14px',
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                fontSize: '0.84rem',
                color: '#475569'
              }}>
                Are you sure you want to permanently remove{' '}
                <strong style={{ color: '#0F172A' }}>
                  {deleteTarget.departmentName ||
                    deleteTarget.subjectCode ||
                    deleteTarget.name ||
                    deleteTarget.rollNumber ||
                    deleteTarget.year ||
                    deleteTarget.bundleName ||
                    `#${deleteTarget.id}`}
                </strong>{' '}
                from <strong style={{ color: '#0F172A' }}>{currentEntity?.label}</strong>?
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '6px' }}>
              <button
                type="button"
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteConfirmationPrompt(null);
                }}
                disabled={isDeleting}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#475569',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  cursor: isDeleting ? 'not-allowed' : 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => confirmDelete(!!deleteConfirmationPrompt)}
                disabled={isDeleting}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                  color: '#FFFFFF',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 6px rgba(239, 68, 68, 0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {isDeleting && <IconRefresh size={14} color="#FFFFFF" style={{ animation: 'spin 1s linear infinite' }} />}
                {deleteConfirmationPrompt ? 'Confirm Cascade Delete' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
