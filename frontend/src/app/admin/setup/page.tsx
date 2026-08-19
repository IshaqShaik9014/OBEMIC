'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Dropzone } from '@/components/ui/Dropzone';
import { adminService } from '@/services/admin.service';

type Tab = 'CO' | 'STAFF' | 'PO';

export default function AdminSetupPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('CO');
  
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setFile(null);
    setPreviewData(null);
  };

  const handlePreview = async () => {
    if (!file) return;
    setIsProcessing(true);
    setPreviewData(null);
    try {
      let result;
      if (activeTab === 'CO') result = await adminService.previewCourseOutcomes(file);
      else if (activeTab === 'STAFF') result = await adminService.previewStaff(file);
      else {
        alert('PO Upload preview not implemented yet.');
        setIsProcessing(false);
        return;
      }
      setPreviewData(result); // Store full result to preserve batchId
    } catch (err: any) {
      alert(err.message || 'Failed to preview file');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = async () => {
    if (!previewData) return;
    setIsProcessing(true);
    try {
      if (activeTab === 'CO') await adminService.confirmCourseOutcomes(previewData);
      else if (activeTab === 'STAFF') await adminService.confirmStaff(previewData);
      alert('Upload confirmed and saved successfully!');
      setFile(null);
      setPreviewData(null);
    } catch (err: any) {
      alert(err.message || 'Failed to confirm');
    } finally {
      setIsProcessing(false);
    }
  };

  // For rendering preview tables
  const renderPreviewTable = () => {
    if (!previewData) return null;
    
    let items: any[] = [];
    let isErrorState = false;
    let debugInfo = "";

    try {
      const payload = (typeof previewData === 'string') ? JSON.parse(previewData) : previewData;
      const actualPayload = payload.batchId ? payload : (payload.data?.batchId ? payload.data : payload);
      
      const invalidBlocks = actualPayload.invalidBlocks || [];
      const validBlocks = actualPayload.validBlocks || [];
      const allBlocks = [...invalidBlocks, ...validBlocks];
      
      if (allBlocks.length > 0) {
        allBlocks.forEach((b: any) => {
          if (b.courseOutcomes && Array.isArray(b.courseOutcomes) && b.courseOutcomes.length > 0) {
            b.courseOutcomes.forEach((co: any) => {
              items.push({
                Subject: b.normalizedSubjectCode || b.subjectCode,
                Name: b.subjectName,
                CO: co.coCode,
                Description: co.description,
                POs: JSON.stringify(co.poMatrix || {}),
                Status: (b.action === 'CONTEXT_CONFLICT' || co.action === 'CO_CONTENT_CONFLICT') ? '❌ Conflict' : '✅ Ready',
                Issues: b.issues && b.issues.length > 0 ? b.issues.join(' | ') : ''
              });
            });
          } else {
            items.push({
              Subject: b.normalizedSubjectCode || b.subjectCode,
              Name: b.subjectName,
              CO: 'N/A',
              Description: 'No COs found',
              POs: 'N/A',
              Status: '❌ ' + (b.action || 'FAILED'),
              Issues: b.issues && b.issues.length > 0 ? b.issues.join(' | ') : ''
            });
          }
        });
        if (invalidBlocks.length > 0) isErrorState = true;
      } else if (Array.isArray(actualPayload)) {
        items = actualPayload;
      } else {
        const arrayKey = Object.keys(actualPayload).find(key => Array.isArray(actualPayload[key]));
        if (arrayKey) items = actualPayload[arrayKey];
      }
      debugInfo = `Parsed successfully. allBlocks: ${allBlocks.length}, items: ${items.length}`;
    } catch (e: any) {
      debugInfo = `Error parsing: ${e.message}`;
    }

    if (!items || items.length === 0) {
      return (
        <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '16px', borderRadius: '8px', border: '1px solid #334155', overflowX: 'auto' }}>
          <p style={{ color: '#e2e8f0', fontSize: '0.9rem', marginBottom: '12px' }}>
            Processed Data Details (Fallback View): <br/>
            <span style={{color: '#94a3b8', fontSize: '0.8rem'}}>{debugInfo}</span>
          </p>
          <pre style={{ color: '#60a5fa', fontSize: '0.85rem', margin: 0 }}>{JSON.stringify(previewData, null, 2)}</pre>
          <Button onClick={handleConfirm} isLoading={isProcessing} style={{ width: '100%', marginTop: '16px', background: '#10B981', color: 'white' }}>
            Confirm & Save to Database
          </Button>
        </div>
      );
    }

    const keys = Object.keys(items[0]).slice(0, 6); // display up to 6 columns for preview

    return (
      <div style={{ marginTop: '20px' }}>
        <div style={{ overflowX: 'auto', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '8px', border: '1px solid #334155' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', color: '#f8fafc' }}>
            <thead>
              <tr style={{ background: 'rgba(59, 130, 246, 0.1)', borderBottom: '1px solid #3b82f6' }}>
                {keys.map(k => (
                  <th key={k} style={{ padding: '12px 16px', textTransform: 'capitalize', fontSize: '0.9rem', fontWeight: '600', color: '#93c5fd' }}>
                    {k.replace(/([A-Z])/g, ' $1').trim()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.slice(0, 10).map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #1e293b', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                  {keys.map(k => (
                    <td key={k} style={{ padding: '12px 16px', fontSize: '0.85rem', color: k === 'Status' && (item[k].includes('Conflict') || item[k].includes('FAILED')) ? '#ef4444' : '#e2e8f0' }} title={k === 'Status' ? (item.Issues || '') : ''}>
                      {typeof item[k] === 'object' ? JSON.stringify(item[k]) : String(item[k])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {items.length > 10 && (
            <div style={{ padding: '12px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic', borderTop: '1px solid #1e293b' }}>
              + {items.length - 10} more records ...
            </div>
          )}
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
          <p style={{ color: isErrorState ? '#ef4444' : '#34d399', fontSize: '0.9rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: isErrorState ? '#ef4444' : '#34d399' }}></span>
            {isErrorState ? `${items.length} records have validation issues and cannot be imported.` : `Valid: ${items.length} records ready for import`}
          </p>
          <Button 
            onClick={handleConfirm} 
            isLoading={isProcessing} 
            disabled={isErrorState} 
            style={{ 
              padding: '10px 24px', 
              background: isErrorState ? '#475569' : '#10B981', 
              color: 'white', 
              fontWeight: 'bold',
              cursor: isErrorState ? 'not-allowed' : 'pointer'
            }}
          >
            {isErrorState ? 'Fix Errors Before Saving' : 'Confirm & Save to Database'}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px' }}>
        <h1 style={{ fontSize: '1.8rem', color: '#f8fafc', margin: 0 }}>System Configuration</h1>
        <p style={{ color: '#94a3b8', margin: '4px 0 0 0' }}>Upload Curriculum Definitions & Staff Rosters</p>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid #334155' }}>
        <button 
          onClick={() => handleTabChange('CO')}
          style={{ padding: '12px 24px', background: activeTab === 'CO' ? 'rgba(59,130,246,0.1)' : 'transparent', color: activeTab === 'CO' ? '#60a5fa' : '#94a3b8', border: 'none', borderBottom: activeTab === 'CO' ? '2px solid #3b82f6' : '2px solid transparent', cursor: 'pointer', fontWeight: '600' }}
        >
          COs Upload
        </button>
        <button 
          onClick={() => handleTabChange('STAFF')}
          style={{ padding: '12px 24px', background: activeTab === 'STAFF' ? 'rgba(59,130,246,0.1)' : 'transparent', color: activeTab === 'STAFF' ? '#60a5fa' : '#94a3b8', border: 'none', borderBottom: activeTab === 'STAFF' ? '2px solid #3b82f6' : '2px solid transparent', cursor: 'pointer', fontWeight: '600' }}
        >
          Staff Upload
        </button>
        <button 
          onClick={() => handleTabChange('PO')}
          style={{ padding: '12px 24px', background: activeTab === 'PO' ? 'rgba(59,130,246,0.1)' : 'transparent', color: activeTab === 'PO' ? '#60a5fa' : '#94a3b8', border: 'none', borderBottom: activeTab === 'PO' ? '2px solid #3b82f6' : '2px solid transparent', cursor: 'pointer', fontWeight: '600' }}
        >
          POs, PSOs & PEOs Upload
        </button>
      </div>

      <Card glow>
        <h3 style={{ color: '#f8fafc', marginTop: 0 }}>
          {activeTab === 'CO' ? 'Upload CO-PO Matrix' : activeTab === 'STAFF' ? 'Upload Faculty Roster' : 'Upload Program Outcomes'}
        </h3>
        <p style={{ color: '#cbd5e1', fontSize: '0.9rem', marginBottom: '16px' }}>
          {activeTab === 'CO' ? 'Upload the Excel file containing Course Outcomes for your subjects.' : 
           activeTab === 'STAFF' ? 'Upload an Excel or CSV file containing faculty details (Name, Email, Employee ID) to onboard them.' : 
           'Upload the master definitions for POs, PSOs, and PEOs.'}
        </p>

        {!previewData && (
          <>
            <Dropzone
              selectedFile={file}
              onFileSelect={setFile}
              onClear={() => setFile(null)}
              title={`Upload ${activeTab} Data`}
              subtitle="Drag & drop your Excel/CSV file here"
            />
            <Button onClick={handlePreview} isLoading={isProcessing} disabled={!file} style={{ width: '100%', marginTop: '16px' }}>
              Process & Preview
            </Button>
          </>
        )}

        {previewData && (
          <div style={{ marginTop: '24px', background: 'rgba(15,23,42,0.4)', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ color: '#f8fafc', margin: 0 }}>Data Preview</h4>
              <button onClick={() => setPreviewData(null)} style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
            </div>
            {renderPreviewTable()}
          </div>
        )}
      </Card>
    </div>
  );
}
