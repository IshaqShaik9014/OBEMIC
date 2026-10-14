'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Dropzone } from '@/components/ui/Dropzone';
import { adminService } from '@/services/admin.service';
import { toast } from 'react-hot-toast';

type Tab = 'CO' | 'STAFF' | 'PO' | 'ATTAINMENT' | 'DATABASE';

export default function AdminSetupPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('CO');
  
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Database Reset States
  const [isResetting, setIsResetting] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetMode, setResetMode] = useState<'clean' | 'demo'>('clean');
  const [confirmInput, setConfirmInput] = useState('');

  // Attainment Target States
  const [attainmentConfig, setAttainmentConfig] = useState<any>(null);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [threshold, setThreshold] = useState<number>(65);
  const [reason, setReason] = useState<string>('');
  const [isSavingAttainment, setIsSavingAttainment] = useState(false);
  const [loadingAttainment, setLoadingAttainment] = useState(false);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setFile(null);
    setPreviewData(null);
    setUploadError(null);
    if (tab === 'ATTAINMENT') {
      loadAttainmentConfig();
    }
  };

  const handleOpenResetModal = () => {
    setConfirmInput('');
    setShowResetModal(true);
  };

  const handleExecuteReset = async () => {
    if (confirmInput.trim().toUpperCase() !== 'RESET') {
      toast.error('Please type RESET to confirm.');
      return;
    }

    setIsResetting(true);
    try {
      const res = await adminService.resetDatabase();
      toast.success(res.message || 'All uploaded records cleared! Master seed data preserved.');
      setShowResetModal(false);
      setPreviewData(null);
      setFile(null);
      
      // If session was not preserved for any reason, re-route to login
      if (!res.sessionPreserved) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        document.cookie = 'accessToken=; path=/; max-age=0; SameSite=Strict';
        router.push('/login');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to clear uploaded data');
    } finally {
      setIsResetting(false);
    }
  };

  const loadAttainmentConfig = async (deptId?: string) => {
    setLoadingAttainment(true);
    try {
      const data = await adminService.getAttainmentConfig(deptId);
      setAttainmentConfig(data);
      setSelectedDeptId(data.departmentId);
      setThreshold(data.threshold || 65);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load attainment config');
    } finally {
      setLoadingAttainment(false);
    }
  };

  const handleSaveAttainment = async () => {
    if (!selectedDeptId) return toast.error('Please select a department');
    if (threshold < 0 || threshold > 100) return toast.error('Threshold must be between 0 and 100%');

    setIsSavingAttainment(true);
    try {
      const res = await adminService.updateAttainmentConfig({
        departmentId: selectedDeptId,
        threshold,
        reason: reason.trim() || undefined
      });
      toast.success(res.message || 'Attainment target saved successfully!');
      setReason('');
      await loadAttainmentConfig(selectedDeptId);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save attainment configuration');
    } finally {
      setIsSavingAttainment(false);
    }
  };

  const handlePreview = async () => {
    if (!file) return;
    setIsProcessing(true);
    setPreviewData(null);
    setUploadError(null);
    try {
      let result;
      if (activeTab === 'CO') result = await adminService.previewCourseOutcomes(file);
      else if (activeTab === 'STAFF') result = await adminService.previewStaff(file);
      else {
        toast.error('PO Upload preview not implemented yet.');
        setIsProcessing(false);
        return;
      }
      setPreviewData(result);
      toast.success('Preview generated successfully');
    } catch (err: any) {
      const errMsg = err.message || 'Failed to preview file';
      toast.error(errMsg);
      setUploadError(errMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = async () => {
    if (!previewData) return;
    setIsProcessing(true);
    try {
      const payload = (typeof previewData === 'string') ? JSON.parse(previewData) : previewData;
      const actualPayload = payload.batchId ? payload : (payload.data?.batchId ? payload.data : payload);

      if (activeTab === 'CO') {
        const validCodes = (actualPayload.validBlocks || []).map((b: any) => b.normalizedSubjectCode || b.subjectCode);
        await adminService.confirmCourseOutcomes({
          ...actualPayload,
          batchId: actualPayload.batchId,
          validSubjectCodes: validCodes
        });
      } else if (activeTab === 'STAFF') {
        const validIds = (actualPayload.validRecords || []).map((r: any) => r.employeeId);
        await adminService.confirmStaff({
          ...actualPayload,
          batchId: actualPayload.batchId,
          validEmployeeIds: validIds
        });
      }
      toast.success('Upload confirmed and saved successfully to database!');
      setFile(null);
      setPreviewData(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to confirm');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveAllConflicts = () => {
    if (!previewData) return;
    const payload = (typeof previewData === 'string') ? JSON.parse(previewData) : previewData;
    const actualPayload = payload.batchId ? payload : (payload.data?.batchId ? payload.data : payload);

    if (activeTab === 'CO') {
      const invalidCount = actualPayload.invalidBlocks?.length || 0;
      const validBlocks = (actualPayload.validBlocks || []).filter((b: any) =>
        b.action !== 'CONTEXT_CONFLICT' &&
        !b.issues?.some((i: string) => i.toLowerCase().includes('conflict'))
      );
      if (validBlocks.length === 0) {
        toast.error('No valid records remaining after removing conflicts.');
        return;
      }
      const updated = {
        ...actualPayload,
        invalidBlocks: [],
        validBlocks,
        canConfirm: true,
        summary: {
          ...actualPayload.summary,
          totalBlocks: validBlocks.length,
          validBlocks: validBlocks.length,
          invalidBlocks: 0
        }
      };
      setPreviewData(updated);
      toast.success(`Removed ${invalidCount} conflicted subject(s). Ready to import ${validBlocks.length} valid subjects.`);
    } else if (activeTab === 'STAFF') {
      const invalidCount = actualPayload.invalidRecords?.length || 0;
      const validRecords = (actualPayload.validRecords || []).filter((r: any) =>
        !r.issues?.some((i: string) => i.toLowerCase().includes('conflict'))
      );
      if (validRecords.length === 0) {
        toast.error('No valid records remaining after removing conflicts.');
        return;
      }
      const updated = {
        ...actualPayload,
        invalidRecords: [],
        validRecords,
        canConfirm: true
      };
      setPreviewData(updated);
      toast.success(`Removed ${invalidCount} conflicted faculty record(s). Ready to import ${validRecords.length} valid records.`);
    }
  };

  const handleRemoveItem = (idOrCode: string) => {
    if (!previewData || !idOrCode) return;
    const payload = (typeof previewData === 'string') ? JSON.parse(previewData) : previewData;
    const actualPayload = payload.batchId ? payload : (payload.data?.batchId ? payload.data : payload);

    if (activeTab === 'CO') {
      const newInvalidBlocks = (actualPayload.invalidBlocks || []).filter((b: any) =>
        (b.normalizedSubjectCode || b.subjectCode) !== idOrCode
      );
      const newValidBlocks = (actualPayload.validBlocks || []).filter((b: any) =>
        (b.normalizedSubjectCode || b.subjectCode) !== idOrCode
      );
      const updated = {
        ...actualPayload,
        invalidBlocks: newInvalidBlocks,
        validBlocks: newValidBlocks,
        canConfirm: newInvalidBlocks.length === 0 && newValidBlocks.length > 0
      };
      setPreviewData(updated);
      toast.success(`Removed subject "${idOrCode}".`);
    } else if (activeTab === 'STAFF') {
      const newInvalidRecords = (actualPayload.invalidRecords || []).filter((r: any) =>
        r.employeeId !== idOrCode
      );
      const newValidRecords = (actualPayload.validRecords || []).filter((r: any) =>
        r.employeeId !== idOrCode
      );
      const updated = {
        ...actualPayload,
        invalidRecords: newInvalidRecords,
        validRecords: newValidRecords,
        canConfirm: newInvalidRecords.length === 0 && newValidRecords.length > 0
      };
      setPreviewData(updated);
      toast.success(`Removed faculty record "${idOrCode}".`);
    }
  };

  const handleReplaceWithExisting = (idOrCode: string) => {
    if (!previewData || !idOrCode) return;
    const payload = (typeof previewData === 'string') ? JSON.parse(previewData) : previewData;
    const actualPayload = payload.batchId ? payload : (payload.data?.batchId ? payload.data : payload);

    if (activeTab === 'CO') {
      const invalidBlocks = actualPayload.invalidBlocks || [];
      const targetBlock = invalidBlocks.find((b: any) => (b.normalizedSubjectCode || b.subjectCode) === idOrCode);

      if (!targetBlock) {
        toast.error(`Subject "${idOrCode}" not found in conflicted list.`);
        return;
      }

      // Convert conflicted block to UNCHANGED by adopting existing DB values
      const resolvedBlock = {
        ...targetBlock,
        subjectName: targetBlock.existingDbSubjectName || targetBlock.subjectName,
        action: 'UNCHANGED',
        issues: (targetBlock.issues || []).filter((i: string) =>
          !i.toLowerCase().includes('database conflict') &&
          !i.toLowerCase().includes('co conflict')
        ),
        courseOutcomes: (targetBlock.courseOutcomes || []).map((co: any) => ({
          ...co,
          description: co.existingDbDescription || co.description,
          action: 'UNCHANGED',
          issues: (co.issues || []).filter((i: string) => !i.toLowerCase().includes('co conflict'))
        }))
      };

      const newInvalidBlocks = invalidBlocks.filter((b: any) => (b.normalizedSubjectCode || b.subjectCode) !== idOrCode);
      const newValidBlocks = [...(actualPayload.validBlocks || []), resolvedBlock];

      const updated = {
        ...actualPayload,
        invalidBlocks: newInvalidBlocks,
        validBlocks: newValidBlocks,
        canConfirm: newInvalidBlocks.length === 0 && newValidBlocks.length > 0
      };
      setPreviewData(updated);
      toast.success(`Subject "${idOrCode}" replaced with existing database record. Issue cleared!`);
    } else if (activeTab === 'STAFF') {
      const invalidRecords = actualPayload.invalidRecords || [];
      const targetRecord = invalidRecords.find((r: any) => r.employeeId === idOrCode);

      if (!targetRecord) {
        toast.error(`Faculty "${idOrCode}" not found in conflicted list.`);
        return;
      }

      const resolvedRecord = {
        ...targetRecord,
        facultyName: targetRecord.existingDbName || targetRecord.facultyName,
        action: 'UNCHANGED',
        issues: []
      };

      const newInvalidRecords = invalidRecords.filter((r: any) => r.employeeId !== idOrCode);
      const newValidRecords = [...(actualPayload.validRecords || []), resolvedRecord];

      const updated = {
        ...actualPayload,
        invalidRecords: newInvalidRecords,
        validRecords: newValidRecords,
        canConfirm: newInvalidRecords.length === 0 && newValidRecords.length > 0
      };
      setPreviewData(updated);
      toast.success(`Faculty "${idOrCode}" replaced with existing database record. Issue cleared!`);
    }
  };

  const handleReplaceAllWithExisting = () => {
    if (!previewData) return;
    const payload = (typeof previewData === 'string') ? JSON.parse(previewData) : previewData;
    const actualPayload = payload.batchId ? payload : (payload.data?.batchId ? payload.data : payload);

    if (activeTab === 'CO') {
      const invalidBlocks = actualPayload.invalidBlocks || [];
      const dbConflicted = invalidBlocks.filter((b: any) =>
        b.isExistingInDb ||
        b.action === 'DATABASE_CONFLICT' ||
        b.issues?.some((i: string) => i.toLowerCase().includes('database conflict') || i.toLowerCase().includes('co conflict'))
      );

      if (dbConflicted.length === 0) {
        toast.error('No database conflicts found to replace.');
        return;
      }

      const remainingInvalid = invalidBlocks.filter((b: any) => !dbConflicted.includes(b));
      const resolvedBlocks = dbConflicted.map((b: any) => ({
        ...b,
        subjectName: b.existingDbSubjectName || b.subjectName,
        action: 'UNCHANGED',
        issues: (b.issues || []).filter((i: string) =>
          !i.toLowerCase().includes('database conflict') &&
          !i.toLowerCase().includes('co conflict')
        ),
        courseOutcomes: (b.courseOutcomes || []).map((co: any) => ({
          ...co,
          description: co.existingDbDescription || co.description,
          action: 'UNCHANGED',
          issues: (co.issues || []).filter((i: string) => !i.toLowerCase().includes('co conflict'))
        }))
      }));

      const newValidBlocks = [...(actualPayload.validBlocks || []), ...resolvedBlocks];

      const updated = {
        ...actualPayload,
        invalidBlocks: remainingInvalid,
        validBlocks: newValidBlocks,
        canConfirm: remainingInvalid.length === 0 && newValidBlocks.length > 0
      };
      setPreviewData(updated);
      toast.success(`Replaced ${resolvedBlocks.length} conflicted subject(s) with existing database records. All conflicts cleared!`);
    }
  };

  const renderPreviewTable = () => {
    if (!previewData) return null;
    
    let items: any[] = [];
    let isErrorState = false;
    let conflictCount = 0;
    let validCount = 0;
    let existingDbConflictCount = 0;

    try {
      const payload = (typeof previewData === 'string') ? JSON.parse(previewData) : previewData;
      const actualPayload = payload.batchId ? payload : (payload.data?.batchId ? payload.data : payload);
      
      const invalidBlocks = actualPayload.invalidBlocks || [];
      const validBlocks = actualPayload.validBlocks || [];
      const invalidRecords = actualPayload.invalidRecords || [];
      const validRecords = actualPayload.validRecords || [];

      if (activeTab === 'CO' || (invalidBlocks.length + validBlocks.length) > 0) {
        conflictCount = invalidBlocks.length;
        validCount = validBlocks.length;

        // Process invalid blocks
        invalidBlocks.forEach((b: any) => {
          const subCode = b.normalizedSubjectCode || b.subjectCode;
          const isDbConflict = Boolean(
            b.isExistingInDb || 
            b.action === 'DATABASE_CONFLICT' || 
            b.issues?.some((i: string) => i.toLowerCase().includes('database conflict') || i.toLowerCase().includes('co conflict') || i.toLowerCase().includes('db:'))
          );
          if (isDbConflict) {
            existingDbConflictCount++;
          }

          if (b.courseOutcomes && Array.isArray(b.courseOutcomes) && b.courseOutcomes.length > 0) {
            b.courseOutcomes.forEach((co: any) => {
              items.push({
                Subject: subCode,
                Name: b.subjectName,
                CO: co.coCode,
                Description: co.description,
                POs: JSON.stringify(co.poMatrix || {}),
                Status: isDbConflict ? '[DB Conflict]' : '[Conflict]',
                Issues: (co.issues && co.issues.length > 0) ? co.issues.join(' | ') : (b.issues && b.issues.length > 0 ? b.issues.join(' | ') : 'Conflicted record'),
                __isInvalid: true,
                __id: subCode,
                __isDbConflict: isDbConflict
              });
            });
          } else {
            items.push({
              Subject: subCode,
              Name: b.subjectName,
              CO: 'N/A',
              Description: 'No COs found',
              POs: 'N/A',
              Status: isDbConflict ? '[DB Conflict]' : '[' + (b.action || 'FAILED') + ']',
              Issues: b.issues && b.issues.length > 0 ? b.issues.join(' | ') : 'Validation failed',
              __isInvalid: true,
              __id: subCode,
              __isDbConflict: isDbConflict
            });
          }
        });

        // Process valid blocks
        validBlocks.forEach((b: any) => {
          const subCode = b.normalizedSubjectCode || b.subjectCode;
          if (b.courseOutcomes && Array.isArray(b.courseOutcomes) && b.courseOutcomes.length > 0) {
            b.courseOutcomes.forEach((co: any) => {
              items.push({
                Subject: subCode,
                Name: b.subjectName,
                CO: co.coCode,
                Description: co.description,
                POs: JSON.stringify(co.poMatrix || {}),
                Status: b.action === 'UNCHANGED' ? '[Ready (Existing DB)]' : '[Ready]',
                Issues: b.issues && b.issues.length > 0 ? b.issues.join(' | ') : '',
                __isInvalid: false,
                __id: subCode,
                __isDbConflict: false
              });
            });
          } else {
            items.push({
              Subject: subCode,
              Name: b.subjectName,
              CO: 'N/A',
              Description: 'No COs found',
              POs: 'N/A',
              Status: '[' + (b.action || 'READY') + ']',
              Issues: b.issues && b.issues.length > 0 ? b.issues.join(' | ') : '',
              __isInvalid: false,
              __id: subCode,
              __isDbConflict: false
            });
          }
        });
      } else if (validRecords.length > 0 || invalidRecords.length > 0) {
        conflictCount = invalidRecords.length;
        validCount = validRecords.length;

        const inv = invalidRecords.map((r: any) => ({ ...r, __isInvalid: true, __id: r.employeeId, __isDbConflict: Boolean(r.issues?.some((i: string) => i.toLowerCase().includes('conflict') || i.toLowerCase().includes('already exists'))) }));
        const val = validRecords.map((r: any) => ({ ...r, __isInvalid: false, __id: r.employeeId, __isDbConflict: false }));
        items = [...inv, ...val];
        existingDbConflictCount = inv.filter((r: any) => r.__isDbConflict).length;
      }

      if (actualPayload.canConfirm === false || conflictCount > 0) {
        isErrorState = true;
      }
    } catch {
      return <div style={{ color: '#ef4444' }}>Error parsing preview payload</div>;
    }

    if (items.length === 0) {
      return <p style={{ color: '#94a3b8' }}>No records parsed.</p>;
    }

    const headers = Object.keys(items[0]).filter(k => !k.startsWith('__'));

    return (
      <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Banner if conflicts exist */}
        {isErrorState && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 18px',
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '8px',
            gap: '12px',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.4rem' }}>⚠️</span>
              <div>
                <div style={{ color: '#DC2626', fontWeight: 'bold', fontSize: '0.9rem' }}>
                  {conflictCount > 0 
                    ? `${conflictCount} conflicted or invalid item(s) found in workbook.`
                    : 'Validation issues detected.'}
                </div>
                <div style={{ color: '#64748B', fontSize: '0.8rem', marginTop: '2px' }}>
                  {existingDbConflictCount > 0 ? (
                    <span style={{ color: '#2563EB', fontWeight: '600' }}>
                      {existingDbConflictCount} conflict(s) are already present in DB. Click &quot;Replace with existing&quot; to clear the issue.
                    </span>
                  ) : validCount > 0 ? (
                    <span>You can remove conflicted records and proceed with the remaining {validCount} valid record(s).</span>
                  ) : (
                    <span>No valid records available in this upload.</span>
                  )}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {existingDbConflictCount > 0 && (
                <button
                  type="button"
                  onClick={handleReplaceAllWithExisting}
                  style={{
                    padding: '8px 16px',
                    background: '#2563EB',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 6px rgba(37, 99, 235, 0.3)'
                  }}
                >
                  🔄 Replace with existing ({existingDbConflictCount})
                </button>
              )}
              {validCount > 0 && (
                <button
                  type="button"
                  onClick={handleRemoveAllConflicts}
                  style={{
                    padding: '8px 16px',
                    background: '#DC2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 4px rgba(220, 38, 38, 0.3)'
                  }}
                >
                  🗑️ Remove Conflicted ({conflictCount}) & Proceed ({validCount} Valid)
                </button>
              )}
            </div>
          </div>
        )}

        <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: '8px', background: '#FFFFFF' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead style={{ background: '#F8FAFC', position: 'sticky', top: 0 }}>
              <tr>
                {headers.map(h => (
                  <th key={h} style={{ padding: '10px 14px', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
                <th style={{ padding: '10px 14px', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9', background: row.__isInvalid ? '#FEF2F2' : 'transparent' }}>
                  {headers.map(h => (
                    <td key={h} style={{ padding: '10px 14px', color: row.__isInvalid ? '#DC2626' : '#0F172A', fontWeight: row.__isInvalid ? '600' : 'normal' }}>
                      {typeof row[h] === 'object' ? JSON.stringify(row[h]) : String(row[h] || '')}
                    </td>
                  ))}
                  <td style={{ padding: '10px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    {row.__isDbConflict && (
                      <button
                        type="button"
                        onClick={() => handleReplaceWithExisting(row.__id)}
                        style={{
                          padding: '4px 10px',
                          background: '#EFF6FF',
                          color: '#2563EB',
                          border: '1px solid #BFDBFE',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          marginRight: '6px'
                        }}
                        title="Resolve conflict using the existing database record"
                      >
                        🔄 Replace with existing
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(row.__id)}
                      style={{
                        padding: '4px 10px',
                        background: row.__isInvalid ? '#FEE2E2' : '#F1F5F9',
                        color: row.__isInvalid ? '#DC2626' : '#475569',
                        border: row.__isInvalid ? '1px solid #FECACA' : '1px solid #E2E8F0',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: '600'
                      }}
                      title="Exclude this record from import"
                    >
                      ✕ Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            {isErrorState ? (
              <span style={{ color: '#EF4444', fontWeight: 'bold' }}>
                {conflictCount > 0 
                  ? `${conflictCount} conflict(s) blocking confirmation. Click 'Remove Conflicted Records' or exclude them to proceed.` 
                  : 'Review issues before proceeding.'}
              </span>
            ) : (
              <span style={{ color: '#10B981', fontWeight: 'bold' }}>
                ✓ Valid: {validCount || items.length} records ready for database save
              </span>
            )}
          </div>
          <Button 
            onClick={handleConfirm} 
            isLoading={isProcessing} 
            disabled={isErrorState}
            style={{ 
              padding: '10px 24px', 
              background: isErrorState ? '#94A3B8' : '#10B981', 
              color: 'white', 
              fontWeight: 'bold',
              cursor: isErrorState ? 'not-allowed' : 'pointer'
            }}
          >
            {isErrorState ? 'Fix/Remove Conflicts First' : 'Confirm & Save to Database'}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '1050px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: '16px' }}>
        <h1 style={{ fontSize: '1.75rem', color: '#0F172A', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>System Configuration</h1>
        <p style={{ color: '#64748B', fontSize: '0.9rem', margin: '4px 0 0 0' }}>Configure Curriculum, Staff Rosters & Attainment Targets</p>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #E2E8F0', flexWrap: 'wrap' }}>
        <button 
          onClick={() => handleTabChange('CO')}
          style={{ padding: '12px 18px', background: activeTab === 'CO' ? '#EFF6FF' : 'transparent', color: activeTab === 'CO' ? '#2563EB' : '#64748B', border: 'none', borderBottom: activeTab === 'CO' ? '2px solid #2563EB' : '2px solid transparent', cursor: 'pointer', fontWeight: '700', borderRadius: '8px 8px 0 0', fontSize: '0.9rem' }}
        >
          COs Upload
        </button>
        <button 
          onClick={() => handleTabChange('STAFF')}
          style={{ padding: '12px 18px', background: activeTab === 'STAFF' ? '#EFF6FF' : 'transparent', color: activeTab === 'STAFF' ? '#2563EB' : '#64748B', border: 'none', borderBottom: activeTab === 'STAFF' ? '2px solid #2563EB' : '2px solid transparent', cursor: 'pointer', fontWeight: '700', borderRadius: '8px 8px 0 0', fontSize: '0.9rem' }}
        >
          Staff Upload
        </button>
        <button 
          onClick={() => handleTabChange('PO')}
          style={{ padding: '12px 18px', background: activeTab === 'PO' ? '#EFF6FF' : 'transparent', color: activeTab === 'PO' ? '#2563EB' : '#64748B', border: 'none', borderBottom: activeTab === 'PO' ? '2px solid #2563EB' : '2px solid transparent', cursor: 'pointer', fontWeight: '700', borderRadius: '8px 8px 0 0', fontSize: '0.9rem' }}
        >
          POs & PSOs Upload
        </button>
        <button 
          onClick={() => handleTabChange('ATTAINMENT')}
          style={{ padding: '12px 18px', background: activeTab === 'ATTAINMENT' ? '#EFF6FF' : 'transparent', color: activeTab === 'ATTAINMENT' ? '#2563EB' : '#64748B', border: 'none', borderBottom: activeTab === 'ATTAINMENT' ? '2px solid #2563EB' : '2px solid transparent', cursor: 'pointer', fontWeight: '700', borderRadius: '8px 8px 0 0', fontSize: '0.9rem' }}
        >
          Target Attainment
        </button>
        <button 
          onClick={() => handleTabChange('DATABASE')}
          style={{ 
            padding: '12px 18px', 
            background: activeTab === 'DATABASE' ? '#FEF2F2' : 'transparent', 
            color: activeTab === 'DATABASE' ? '#DC2626' : '#64748B', 
            border: 'none', 
            borderBottom: activeTab === 'DATABASE' ? '2px solid #DC2626' : '2px solid transparent', 
            cursor: 'pointer', 
            fontWeight: '700',
            borderRadius: '8px 8px 0 0',
            fontSize: '0.9rem',
            transition: 'all 0.2s ease'
          }}
        >
          🧹 Reset Uploads
        </button>
      </div>

      {activeTab === 'ATTAINMENT' ? (
        <Card glow>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ color: '#0F172A', fontWeight: 700, margin: 0 }}>Department Attainment Target</h3>
              <p style={{ color: '#64748B', fontSize: '0.9rem', marginTop: '4px' }}>
                Define the benchmark percentage required for Course Outcome attainment in your department.
              </p>
            </div>
            {attainmentConfig?.isDepartmentScoped && (
              <span style={{ background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', padding: '6px 14px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600' }}>
                Scoped to {attainmentConfig.departmentName}
              </span>
            )}
          </div>

          {loadingAttainment ? (
            <p style={{ color: '#64748B' }}>Loading attainment configuration...</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Department Selection */}
              <div>
                <label style={{ color: '#334155', fontSize: '0.9rem', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>
                  Target Department
                </label>
                {attainmentConfig?.isDepartmentScoped ? (
                  <input 
                    type="text" 
                    value={attainmentConfig.departmentName} 
                    disabled 
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#F8FAFC', color: '#64748B', border: '1px solid #CBD5E1', cursor: 'not-allowed' }}
                  />
                ) : (
                  <select 
                    value={selectedDeptId} 
                    onChange={e => {
                      setSelectedDeptId(e.target.value);
                      loadAttainmentConfig(e.target.value);
                    }}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#FFFFFF', color: '#0F172A', border: '1px solid #CBD5E1' }}
                  >
                    {attainmentConfig?.departments?.map((d: any) => (
                      <option key={d.id} value={d.id}>{d.departmentName}</option>
                    ))}
                  </select>
                )}
                {attainmentConfig?.isDepartmentScoped && (
                  <p style={{ color: '#64748B', fontSize: '0.8rem', marginTop: '4px' }}>
                    As department administrator, you are authorized to adjust attainment targets solely for your assigned department.
                  </p>
                )}
              </div>

              {/* Target Slider & Value */}
              <div style={{ background: '#F8FAFC', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <label style={{ color: '#0F172A', fontWeight: '700', fontSize: '1rem' }}>
                    Attainment Target Benchmark (%)
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.8rem', fontWeight: '800', color: '#2563EB' }}>{threshold}%</span>
                    <span style={{ fontSize: '0.85rem', color: '#475569', background: '#FFFFFF', padding: '4px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontWeight: '600' }}>
                      {(3 * (threshold / 100)).toFixed(2)} / 3.00 Scale
                    </span>
                  </div>
                </div>

                <input 
                  type="range" 
                  min="40" 
                  max="90" 
                  step="1" 
                  value={threshold} 
                  onChange={e => setThreshold(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#2563EB', cursor: 'pointer' }}
                />

                {/* Quick Presets */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
                  {[60, 65, 70, 75].map(val => (
                    <button
                      key={val}
                      onClick={() => setThreshold(val)}
                      type="button"
                      style={{
                        padding: '6px 14px',
                        background: threshold === val ? '#2563EB' : '#FFFFFF',
                        color: threshold === val ? '#FFFFFF' : '#334155',
                        border: '1px solid #CBD5E1',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '0.85rem'
                      }}
                    >
                      {val}% ({(3 * (val / 100)).toFixed(2)})
                    </button>
                  ))}
                </div>
              </div>

              {/* Adjustment Reason */}
              <div>
                <label style={{ color: '#334155', fontSize: '0.9rem', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>
                  Reason for Target Adjustment (Optional)
                </label>
                <input 
                  type="text" 
                  value={reason} 
                  onChange={e => setReason(e.target.value)}
                  placeholder="e.g., Department Academic Advisory revision for NBA compliance"
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#FFFFFF', color: '#0F172A', border: '1px solid #CBD5E1' }}
                />
              </div>

              <Button 
                onClick={handleSaveAttainment} 
                isLoading={isSavingAttainment}
                style={{ width: '100%', padding: '12px', fontWeight: 'bold' }}
              >
                Save Attainment Target for {attainmentConfig?.departmentName}
              </Button>

              {/* Change History */}
              {attainmentConfig?.history && attainmentConfig.history.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <h4 style={{ color: '#64748B', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                    Recent Target Adjustment History
                  </h4>
                  <div style={{ background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
                    {attainmentConfig.history.map((h: any, i: number) => (
                      <div key={h.id || i} style={{ padding: '10px 14px', borderBottom: i < attainmentConfig.history.length - 1 ? '1px solid #F1F5F9' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                        <div>
                          <span style={{ color: '#2563EB', fontWeight: 'bold' }}>{h.newThreshold}%</span>
                          {h.oldThreshold !== null && <span style={{ color: '#64748B' }}> (from {h.oldThreshold}%)</span>}
                          {h.reason && <span style={{ color: '#334155', marginLeft: '10px' }}> - {h.reason}</span>}
                        </div>
                        <div style={{ color: '#64748B', fontSize: '0.8rem' }}>
                          {h.user?.name || 'Admin'} • {new Date(h.changedAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      ) : activeTab === 'DATABASE' ? (
        <Card glow style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '28px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ color: '#0F172A', margin: 0, fontSize: '1.35rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span>🧹</span> Reset Uploaded Data & Restore Master Seed
                </h3>
                <p style={{ color: '#64748B', fontSize: '0.9rem', marginTop: '6px', maxWidth: '720px', lineHeight: '1.5' }}>
                  Quickly cleans all Excel-uploaded subjects, faculty rosters, reports, and import conflicts from the database while <strong style={{ color: '#2563EB' }}>preserving all Master Seed data</strong> (departments, regulations, core subjects CS301 & 23ME3T01, seed faculty, and demo students).
                </p>
              </div>
              <span style={{ 
                background: '#EFF6FF', 
                color: '#2563EB', 
                border: '1px solid #BFDBFE', 
                padding: '6px 14px', 
                borderRadius: '8px', 
                fontSize: '0.8rem', 
                fontWeight: '600' 
              }}>
                Local Maintenance Tool
              </span>
            </div>

            {/* Preserved Data Status Grid */}
            <div style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '18px 20px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '14px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#334155', fontSize: '0.85rem' }}>
                <span style={{ color: '#10B981', fontWeight: 'bold' }}>✓</span>
                <span><strong>Preserves:</strong> 10 Core Departments (CSE, IT, Mech, etc.)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#334155', fontSize: '0.85rem' }}>
                <span style={{ color: '#10B981', fontWeight: 'bold' }}>✓</span>
                <span><strong>Preserves:</strong> Master Subjects (CS301, 23ME3T01) & COs</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#334155', fontSize: '0.85rem' }}>
                <span style={{ color: '#10B981', fontWeight: 'bold' }}>✓</span>
                <span><strong>Preserves:</strong> Seed Faculty (Dr. Kumar, Dr. Ravi, John Doe)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#334155', fontSize: '0.85rem' }}>
                <span style={{ color: '#10B981', fontWeight: 'bold' }}>✓</span>
                <span><strong>Preserves:</strong> Demo Students (22ME001 – 22ME005) & Surveys</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#334155', fontSize: '0.85rem' }}>
                <span style={{ color: '#EF4444', fontWeight: 'bold' }}>✕</span>
                <span><strong>Clears:</strong> All User-Uploaded Excel Batches & Conflicts</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#334155', fontSize: '0.85rem' }}>
                <span style={{ color: '#2563EB', fontWeight: 'bold' }}>★</span>
                <span><strong>Session:</strong> Stays active (no re-login required)</span>
              </div>
            </div>

            {/* Action Bar */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '8px',
              borderTop: '1px solid #E2E8F0',
              flexWrap: 'wrap',
              gap: '16px'
            }}>
              <p style={{ margin: 0, color: '#64748B', fontSize: '0.825rem' }}>
                Use this anytime you finish testing Excel uploads and want a clean slate without losing base college data.
              </p>
              <Button
                onClick={handleOpenResetModal}
                isLoading={isResetting}
                style={{
                  background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                  color: 'white',
                  fontWeight: '700',
                  padding: '12px 28px',
                  borderRadius: '10px',
                  boxShadow: '0 4px 16px rgba(220, 38, 38, 0.35)',
                  fontSize: '0.9rem'
                }}
              >
                🧹 Clear Uploaded Data (Keep Master Seed)
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card glow>
          <h3 style={{ color: '#0F172A', fontWeight: 700, marginTop: 0 }}>
            {activeTab === 'CO' ? 'Upload CO-PO Matrix' : activeTab === 'STAFF' ? 'Upload Faculty Roster' : 'Upload Program Outcomes'}
          </h3>
          <p style={{ color: '#64748B', fontSize: '0.9rem', marginBottom: '16px' }}>
            {activeTab === 'CO' ? 'Upload the Excel file containing Course Outcomes for your subjects.' : 
             activeTab === 'STAFF' ? 'Upload an Excel or CSV file containing faculty details (Name, Email, Employee ID) to onboard them.' : 
             'Upload the master definitions for POs, PSOs, and PEOs.'}
          </p>

          {!previewData && (
            <>
              <Dropzone
                selectedFile={file}
                onFileSelect={(f) => {
                  setFile(f);
                  setUploadError(null);
                }}
                onClear={() => {
                  setFile(null);
                  setUploadError(null);
                }}
                title={`Upload ${activeTab} Data`}
                subtitle="Drag & drop your Excel/CSV file here"
              />

              {uploadError && (
                <div style={{
                  marginTop: '16px',
                  padding: '14px 18px',
                  background: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px'
                }}>
                  <span style={{ fontSize: '1.4rem', lineHeight: '1' }}>⚠️</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#B91C1C', fontWeight: '700', fontSize: '0.95rem', marginBottom: '4px' }}>
                      {uploadError.toLowerCase().includes('po mapping missing') ? 'PO Mapping Missing in Excel' : 'Upload Error'}
                    </div>
                    <div style={{ color: '#7F1D1D', fontSize: '0.85rem', lineHeight: '1.4' }}>
                      {uploadError}
                    </div>
                    {uploadError.toLowerCase().includes('po mapping missing') && (
                      <div style={{ marginTop: '8px', color: '#991B1B', fontSize: '0.825rem', background: '#FEE2E2', padding: '8px 12px', borderRadius: '6px', border: '1px solid #FECACA' }}>
                        💡 <strong>Required Format:</strong> The Excel file must include columns for Program Outcomes (<strong>PO1 to PO12</strong> and <strong>PSO1 to PSO2</strong>) with correlation rating values (1, 2, 3 or -).
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setUploadError(null)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#991B1B',
                      cursor: 'pointer',
                      fontSize: '1.1rem',
                      padding: '0 4px',
                      fontWeight: 'bold'
                    }}
                  >
                    ✕
                  </button>
                </div>
              )}

              <Button onClick={handlePreview} isLoading={isProcessing} disabled={!file} style={{ width: '100%', marginTop: '16px' }}>
                Process & Preview
              </Button>
            </>
          )}

          {previewData && (
            <div style={{ marginTop: '24px', background: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ color: '#0F172A', fontWeight: 700, margin: 0 }}>Data Preview</h4>
                <button onClick={() => setPreviewData(null)} style={{ background: '#FFFFFF', border: '1px solid #FECACA', color: '#DC2626', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
              </div>
              {renderPreviewTable()}
            </div>
          )}
        </Card>
      )}

      {/* Confirmation Modal */}
      {showResetModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '16px',
            maxWidth: '520px',
            width: '100%',
            padding: '28px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <span style={{ fontSize: '1.8rem' }}>⚠️</span>
              <h3 style={{ margin: 0, color: '#0F172A', fontSize: '1.25rem', fontWeight: '700' }}>
                Confirm Reset of Uploaded Data
              </h3>
            </div>
            <p style={{ color: '#475569', fontSize: '0.92rem', lineHeight: '1.5', margin: '0 0 16px 0' }}>
              This will remove all uploaded Excel subjects, staff rosters, reports, and import batches. <strong>The Master Seed data (departments, regulations, CS301, 23ME3T01, Dr. Kumar, Dr. Ravi, and students) will remain intact.</strong>
            </p>
            <div style={{ background: '#F8FAFC', padding: '12px 16px', borderRadius: '8px', border: '1px solid #E2E8F0', marginBottom: '20px' }}>
              <p style={{ margin: 0, fontSize: '0.825rem', color: '#64748B' }}>
                ✓ Your current login session will remain active.
              </p>
            </div>
            <div style={{ marginBottom: '22px' }}>
              <label style={{ display: 'block', color: '#334155', fontSize: '0.85rem', fontWeight: '600', marginBottom: '8px' }}>
                Type <span style={{ color: '#DC2626', fontWeight: '800' }}>RESET</span> to confirm:
              </label>
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="RESET"
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  background: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  color: '#0F172A',
                  fontSize: '0.95rem',
                  outline: 'none'
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                disabled={isResetting}
                style={{
                  padding: '9px 18px',
                  background: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  color: '#475569',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '600'
                }}
              >
                Cancel
              </button>
              <Button
                onClick={handleExecuteReset}
                isLoading={isResetting}
                disabled={confirmInput.trim().toUpperCase() !== 'RESET'}
                style={{
                  padding: '9px 22px',
                  background: confirmInput.trim().toUpperCase() === 'RESET' ? '#DC2626' : '#94A3B8',
                  color: 'white',
                  fontWeight: 'bold',
                  borderRadius: '8px',
                  cursor: confirmInput.trim().toUpperCase() === 'RESET' ? 'pointer' : 'not-allowed'
                }}
              >
                Proceed with Reset
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
