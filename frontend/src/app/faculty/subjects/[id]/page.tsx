'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { facultyService } from '@/services/faculty.service';
import { toast } from 'react-hot-toast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Dropzone } from '@/components/ui/Dropzone';
import { AttainmentBarChart } from '@/components/ui/Charts';

const TABS = ['cos', 'pos', 'peos', 'marks', 'indirect', 'direct', 'overall_attainment', 'copo_attainment', 'printable_summary'];
const TAB_LABELS: Record<string, string> = {
  cos: "List of CO's",
  pos: "List of PO's",
  peos: "List of PEO's & PSO's",
  marks: "Evaluation Marks Entry",
  indirect: "Indirect Assessment",
  direct: "Direct Assessment",
  copo_attainment: "CO-PO Attainment",
  overall_attainment: "Overall Attainment",
  printable_summary: "Printable Summary",
};

export default function SubjectWizardPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const subjectId = unwrappedParams.id;
  const router = useRouter();

  const [activeTab, setActiveTab] = useState('cos');
  const [subjectInfo, setSubjectInfo] = useState<any>(null);
  const [progress, setProgress] = useState<any>({ indirect: false, direct: false, copo: false, overall: false });
  const [loading, setLoading] = useState(true);

  // Data states
  const [cos, setCos] = useState<any[]>([]);
  const [poData, setPoData] = useState<any>({ pos: [], peos: [], psos: [] });
  const [indirectData, setIndirectData] = useState<any[]>([]);
  const [directData, setDirectData] = useState<any>(null);
  const [copoMap, setCopoMap] = useState<any>(null);

  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [marksType, setMarksType] = useState('internal');
  const [isUploading, setIsUploading] = useState(false);
  const [latestBlob, setLatestBlob] = useState<{ blob: Blob, filename: string } | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [activeReport, setActiveReport] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncingStudents, setIsSyncingStudents] = useState(false);

  // Direct Target Level
  const [targetLevel, setTargetLevel] = useState(65);

  useEffect(() => {
    async function init() {
      try {
        const subjects = await facultyService.getAssignedSubjects();
        const sub = subjects.find(s => s.subjectId === subjectId);
        if (sub) {
          setSubjectInfo(sub);
          setProgress(sub.progressState);
          const isLabSub = sub.subjectName?.toLowerCase().includes('lab');
          setMarksType(isLabSub ? 'lab' : 'internal');

          // Fetch all required data upfront
          const [coRes, poRes, indRes, dirRes, copoRes] = await Promise.all([
            facultyService.getSubjectCOs(subjectId),
            facultyService.getPOs(sub.departmentId),
            facultyService.getIndirectAssessment(subjectId),
            facultyService.getDirectAssessment(subjectId),
            facultyService.getCOPOMapping(subjectId)
          ]);

          setCos(coRes);
          setPoData(poRes);
          setIndirectData(indRes);
          setDirectData(dirRes);
          setCopoMap(copoRes);

          // Fetch history to track submission status
          try {
            const history = await facultyService.getReportHistory();
            const rep = history.find(h => h.subjectId === subjectId);
            if (rep) setActiveReport(rep);
          } catch (err) {
            console.error("Failed to load report history", err);
          }
        }
      } catch (e) {
        console.error("Failed to load subject", e);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [subjectId]);

  // Calculate combined CO data globally
  const globalCOData: Record<string, { dir: number; ind: number; final: number }> = {};
  ['CO1', 'CO2', 'CO3', 'CO4', 'CO5'].forEach((co) => {
    const dir = directData?.data?.[co]?.direct3Scale || 0;
    let sum = 0;
    (indirectData || []).forEach((stu: any) => sum += (stu.scores?.[co] || 5));
    const avg5Scale = sum / (indirectData?.length || 1);
    const ind = (avg5Scale / 5) * 3;
    const final = (dir * 0.6) + (ind * 0.4);
    globalCOData[co] = { dir, ind, final };
  });

  const poLabels = Array.from({length: 12}, (_, i) => `PO${i+1}`).concat(['PSO1', 'PSO2']);
  const poAttainmentData = poLabels.map(po => {
    if (!copoMap) return 0;
    let sumProduct = 0;
    let sumWeight = 0;
    ['CO1', 'CO2', 'CO3', 'CO4', 'CO5'].forEach(co => {
       const weightStr = copoMap?.[co]?.[po];
       const weight = Number(weightStr);
       if (!isNaN(weight) && weight > 0) {
           sumProduct += (globalCOData[co].final * weight);
           sumWeight += weight;
       }
    });
    return sumWeight > 0 ? Number((sumProduct / sumWeight).toFixed(2)) : 0;
  });

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    try {
      let res;
      if (marksType === 'internal') {
        res = await facultyService.generateInternalReport(file, subjectInfo.subjectCode);
      } else if (marksType === 'external') {
        res = await facultyService.generateExternalReport(file, subjectInfo.subjectCode);
      } else {
        res = await facultyService.generateLabReport(file, subjectInfo.subjectCode);
      }
      
      const filename = `Generated_${marksType.toUpperCase()}_OBE_${subjectInfo.subjectCode}.xlsx`;
      if (res && res.blob) {
        setLatestBlob({ blob: res.blob, filename });
      }

      toast.success('Marks processed & saved to backend! You can now download the generated report.');
      const updatedDir = await facultyService.getDirectAssessment(subjectId);
      setDirectData(updatedDir);
      setFile(null);
    } catch (e: any) {
      toast.error(e.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadGenerated = async () => {
    if (latestBlob) {
      const url = window.URL.createObjectURL(latestBlob.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = latestBlob.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Generated report downloaded!');
      return;
    }

    // Fallback: If page was refreshed, download latest generated report for this subject from backend history
    setIsDownloading(true);
    try {
      const history = await facultyService.getReportHistory();
      const matchingReport = history.find(h => 
        h.subjectId === subjectId || 
        h.subject?.subjectCode === subjectInfo?.subjectCode
      );

      if (matchingReport) {
        const blob = await facultyService.downloadReport(matchingReport.id);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Generated_${matchingReport.reportType}_OBE_${subjectInfo?.subjectCode || 'Report'}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        toast.success('Generated report downloaded from database!');
      } else {
        toast.error('No generated report found for this subject yet. Please upload and process marks first.');
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to download report');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSyncStudents = async () => {
    setIsSyncingStudents(true);
    try {
      const res = await facultyService.syncStudents(subjectId);
      toast.success(res.message || `Successfully synced ${res.count} students!`);
      const updatedInd = await facultyService.getIndirectAssessment(subjectId);
      setIndirectData(updatedInd);
    } catch (e: any) {
      toast.error(e.message || 'Failed to extract students from sheet');
    } finally {
      setIsSyncingStudents(false);
    }
  };

  const handleSubmitReport = async () => {
    let repId = activeReport?.id;
    if (!repId) {
      try {
        const history = await facultyService.getReportHistory();
        const rep = history.find(h => h.subjectId === subjectId);
        if (rep) repId = rep.id;
      } catch (e) {}
    }

    if (!repId) {
      toast.error('No generated report found for this subject. Please process marks first.');
      return;
    }

    setIsSubmitting(true);
    try {
      await facultyService.submitReport(repId);
      toast.success('Final attainment report successfully submitted to Admin for review!');
      setActiveReport((prev: any) => prev ? { ...prev, status: 'SUBMITTED' } : { id: repId, status: 'SUBMITTED' });
    } catch (e: any) {
      toast.error(e.message || 'Failed to submit report');
    } finally {
      setIsSubmitting(false);
    }
  };

  const completeStep = async (step: string) => {
    try {
      let key = step;
      if (step === 'overall_attainment') key = 'overall';
      if (step === 'copo_attainment') key = 'copo';
      
      const newProg = { ...progress, [key]: true };
      await facultyService.updateProgress(subjectId, newProg);
      setProgress(newProg);
      
      const stepOrder = ['indirect', 'direct', 'overall_attainment', 'copo_attainment'];
      const currentIdx = stepOrder.indexOf(step);
      if (currentIdx < stepOrder.length - 1) {
        setActiveTab(stepOrder[currentIdx + 1]);
      } else {
        setActiveTab('printable_summary');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const isLocked = (tab: string) => {
    if (tab === 'direct') return !progress.indirect;
    if (tab === 'overall_attainment') return !progress.direct;
    if (tab === 'copo_attainment') return !progress.overall;
    if (tab === 'printable_summary') return !progress.copo;
    return false;
  };

  if (loading) return <div style={{ color: '#0F172A', padding: '40px', textAlign: 'center' }}>Loading Subject Wizard...</div>;
  if (!subjectInfo) return <div style={{ color: '#ef4444', padding: '40px', textAlign: 'center' }}>Subject not found.</div>;

  const isLab = subjectInfo?.subjectName?.toLowerCase().includes('lab') || false;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'cos':
        return (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <h3 style={{ textAlign: 'center', color: '#0F172A', marginBottom: '16px', fontWeight: 700 }}>Course Outcomes (COs)</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', background: '#FFFFFF', borderRadius: '8px', overflow: 'hidden', border: '1px solid #E2E8F0' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Outcome</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Description</th>
                </tr>
              </thead>
              <tbody>
                {cos.map((co: any) => (
                  <tr key={co.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 'bold', color: '#2563EB' }}>{co.coCode}</td>
                    <td style={{ padding: '12px 16px', color: '#334155' }}>{co.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'pos':
        return (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <h3 style={{ textAlign: 'center', color: '#0F172A', marginBottom: '16px', fontWeight: 700 }}>Program Outcomes (POs)</h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              {poData.pos.map((po: any) => (
                <div key={po.id} style={{ padding: '16px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ padding: '4px 8px', background: '#2563EB', color: '#fff', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>{po.code}</span>
                    <strong style={{ color: '#0F172A' }}>{po.title}</strong>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569' }}>{po.description}</p>
                </div>
              ))}
            </div>
          </div>
        );

      case 'peos':
        return (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <h3 style={{ textAlign: 'center', color: '#0F172A', marginBottom: '16px', fontWeight: 700 }}>PEOs & PSOs</h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              {poData.peos.map((peo: any) => (
                <div key={peo.id} style={{ padding: '16px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ padding: '4px 8px', background: '#0284C7', color: '#fff', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>{peo.code}</span>
                    <strong style={{ color: '#0F172A' }}>{peo.title}</strong>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569' }}>{peo.description}</p>
                </div>
              ))}
              {poData.psos.map((pso: any) => (
                <div key={pso.id} style={{ padding: '16px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', marginTop: '12px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ padding: '4px 8px', background: '#7C3AED', color: '#fff', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>{pso.code}</span>
                    <strong style={{ color: '#0F172A' }}>{pso.title}</strong>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569' }}>{pso.description}</p>
                </div>
              ))}
            </div>
          </div>
        );

      case 'marks':
        return (
          <div style={{ animation: 'fadeIn 0.3s ease', display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '600px', margin: '0 auto' }}>
            <h3 style={{ textAlign: 'center', color: '#0F172A', fontWeight: 700 }}>Evaluation Marks Entry</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ color: '#475569', fontSize: '0.9rem', fontWeight: 'bold' }}>Assessment Milestone</label>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <select 
                  value={marksType} 
                  onChange={e => setMarksType(e.target.value)}
                  style={{ padding: '12px', borderRadius: '8px', background: '#FFFFFF', color: '#0F172A', border: '1px solid #CBD5E1', flex: 1, fontWeight: 500 }}
                >
                  {!isLab && <option value="internal">Internal Marks</option>}
                  {!isLab && <option value="external">External Marks</option>}
                  {isLab && <option value="lab">Lab Marks</option>}
                </select>
                <a 
                  href={
                    isLab 
                      ? "/templates/Lab_Template.xlsx" 
                      : marksType === 'internal' 
                        ? "/templates/Internal_Template.xlsx" 
                        : "/templates/External_Template.xlsx"
                  }
                  download
                  style={{ padding: '12px 16px', background: '#FFFFFF', color: '#2563EB', borderRadius: '8px', textDecoration: 'none', border: '1px solid #CBD5E1', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', fontWeight: 600 }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Download Template
                </a>
              </div>
            </div>

            <Dropzone
              selectedFile={file}
              onFileSelect={setFile}
              onClear={() => setFile(null)}
              title={`Upload ${marksType.toUpperCase()} Excel Sheet`}
              subtitle="Drag & drop standard MIC Autonomous Template"
            />

            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
              <Button 
                onClick={handleUpload} 
                isLoading={isUploading} 
                disabled={!file} 
                style={{ 
                  flex: 1, 
                  padding: '12px', 
                  background: file ? 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)' : '#E2E8F0', 
                  color: file ? '#ffffff' : '#94A3B8',
                  border: 'none',
                  fontWeight: 'bold' 
                }}
              >
                Process & Save to Backend
              </Button>
              
              <Button 
                onClick={handleDownloadGenerated} 
                isLoading={isDownloading}
                disabled={!latestBlob && !(directData?.hasInternal || directData?.hasExternal)}
                style={{ 
                  flex: 1, 
                  padding: '12px', 
                  background: (latestBlob || directData?.hasInternal || directData?.hasExternal) ? '#10B981' : '#E2E8F0',
                  color: (latestBlob || directData?.hasInternal || directData?.hasExternal) ? '#ffffff' : '#94A3B8',
                  border: 'none',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Download Generated Excel
              </Button>
            </div>

            <Button
              onClick={handleSyncStudents}
              isLoading={isSyncingStudents}
              disabled={!directData?.hasInternal && !directData?.hasExternal}
              style={{
                width: '100%',
                marginTop: '10px',
                padding: '10px',
                background: '#EFF6FF',
                border: '1px dashed #3B82F6',
                color: '#2563EB',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              Extract & Synchronize Students from Marks Sheet
            </Button>

            <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '16px', fontSize: '0.9rem', color: '#475569' }}>
               <span>Internal: {directData?.hasInternal ? '✅ Uploaded' : '❌ Pending'}</span>
               <span>External: {directData?.hasExternal ? '✅ Uploaded' : '❌ Pending'}</span>
            </div>
          </div>
        );

      case 'indirect':
        const indirectAvg: any = {};
        ['CO1', 'CO2', 'CO3', 'CO4', 'CO5'].forEach(co => {
          let sum = 0;
          indirectData.forEach(stu => sum += (stu.scores[co] || 5));
          const avg5Scale = sum / (indirectData.length || 1);
          indirectAvg[co] = (avg5Scale / 5) * 3; // scale to 3
        });

        return (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <h3 style={{ textAlign: 'center', color: '#0F172A', marginBottom: '8px', fontWeight: 700 }}>Course End Survey (Indirect Assessment)</h3>
            <p style={{ textAlign: 'center', color: '#64748B', marginBottom: '24px' }}>Real student survey data fetched from the DB</p>
            
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', color: '#475569', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '12px' }}>Roll No</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Student Name</th>
                  <th>CO1</th><th>CO2</th><th>CO3</th><th>CO4</th><th>CO5</th>
                </tr>
              </thead>
              <tbody>
                {indirectData.map((stu: any) => (
                  <tr key={stu.id} style={{ borderBottom: '1px solid #F1F5F9', color: '#334155' }}>
                    <td style={{ padding: '12px', fontWeight: 'bold' }}>{stu.rollNo}</td>
                    <td style={{ padding: '12px', textAlign: 'left' }}>{stu.name}</td>
                    {['CO1','CO2','CO3','CO4','CO5'].map(co => <td key={co}>{stu.scores[co]}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginTop: '32px', textAlign: 'center' }}>
              <h4 style={{ color: '#0F172A', marginBottom: '16px', fontWeight: 700 }}>Weighted Averages (3-Scale)</h4>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '24px' }}>
                {Object.keys(indirectAvg).map(co => (
                  <div key={co} style={{ background: '#F8FAFC', padding: '16px 24px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <div style={{ color: '#64748B', fontSize: '0.9rem', marginBottom: '4px', fontWeight: 600 }}>{co}</div>
                    <div style={{ color: '#2563EB', fontSize: '1.4rem', fontWeight: 'bold' }}>{indirectAvg[co].toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: '32px', textAlign: 'center', borderTop: '1px dashed #CBD5E1', paddingTop: '24px' }}>
              {progress.indirect ? (
                <div style={{ color: '#10b981', fontWeight: 'bold' }}>✅ Indirect Assessment Completed</div>
              ) : (
                <Button onClick={() => completeStep('indirect')} variant="success">Confirm & Complete Indirect Assessment</Button>
              )}
            </div>
          </div>
        );

      case 'direct':
        return (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <h3 style={{ textAlign: 'center', color: '#0F172A', marginBottom: '16px', fontWeight: 700 }}>Direct Assessment Attainment</h3>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', alignItems: 'center', marginBottom: '24px' }}>
              <label style={{ color: '#334155', fontWeight: 'bold' }}>Target Level (%):</label>
              <select value={targetLevel} onChange={e => setTargetLevel(Number(e.target.value))} style={{ padding: '8px 12px', borderRadius: '6px', background: '#FFFFFF', color: '#0F172A', border: '1px solid #CBD5E1', fontWeight: 500 }}>
                <option value={60}>60%</option>
                <option value={65}>65%</option>
                <option value={70}>70%</option>
              </select>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: '#2563EB', color: '#fff' }}>
                  <th style={{ padding: '12px' }}>CO</th>
                  <th style={{ padding: '12px' }}>Internal Pct</th>
                  <th style={{ padding: '12px' }}>Internal (3)</th>
                  <th style={{ padding: '12px' }}>External Pct</th>
                  <th style={{ padding: '12px' }}>External (3)</th>
                  <th style={{ padding: '12px', background: '#1D4ED8' }}>Direct Attn (3)</th>
                  <th style={{ padding: '12px', background: '#10b981' }}>Target (3)</th>
                </tr>
              </thead>
              <tbody>
                {['CO1', 'CO2', 'CO3', 'CO4', 'CO5'].map((co, idx) => {
                  const row = directData?.data[co];
                  if (!row) return null;
                  return (
                    <tr key={co} style={{ borderBottom: '1px solid #F1F5F9', color: '#334155', background: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
                      <td style={{ padding: '12px', fontWeight: 'bold', color: '#0F172A' }}>{co}</td>
                      <td>{row.internalPct.toFixed(2)}%</td>
                      <td style={{ fontWeight: 'bold' }}>{row.internal3Scale.toFixed(2)}</td>
                      <td>{row.externalPct.toFixed(2)}%</td>
                      <td style={{ fontWeight: 'bold' }}>{row.external3Scale.toFixed(2)}</td>
                      <td style={{ fontWeight: 'bold', color: '#2563EB' }}>{row.direct3Scale.toFixed(2)}</td>
                      <td style={{ fontWeight: 'bold', color: '#10b981' }}>{row.target3Scale.toFixed(2)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <div style={{ marginTop: '32px', textAlign: 'center', borderTop: '1px dashed #CBD5E1', paddingTop: '24px' }}>
              {progress.direct ? (
                <div style={{ color: '#10b981', fontWeight: 'bold' }}>✅ Direct Assessment Completed</div>
              ) : (
                <Button onClick={() => completeStep('direct')} variant="success">Confirm & Complete Direct Assessment</Button>
              )}
            </div>
          </div>
        );

      case 'copo_attainment':
        return (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <h3 style={{ textAlign: 'center', color: '#0F172A', marginBottom: '16px', fontWeight: 700 }}>CO-PO Attainment Matrix</h3>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', color: '#475569', borderBottom: '1px solid #E2E8F0' }}>
                    <th style={{ padding: '10px' }}>CO</th>
                    {Array.from({length: 12}, (_, i) => <th key={i}>PO{i+1}</th>)}
                    <th>PSO1</th><th>PSO2</th>
                  </tr>
                </thead>
                <tbody>
                  {['CO1', 'CO2', 'CO3', 'CO4', 'CO5'].map((co) => (
                    <tr key={co} style={{ borderBottom: '1px solid #F1F5F9', color: '#334155' }}>
                      <td style={{ padding: '10px', fontWeight: 'bold', color: '#0F172A' }}>{co}</td>
                      {Array.from({length: 12}, (_, i) => <td key={i}>{copoMap?.[co]?.[`PO${i+1}`] || '-'}</td>)}
                      <td>{copoMap?.[co]?.['PSO1'] || '-'}</td>
                      <td>{copoMap?.[co]?.['PSO2'] || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ height: '350px', marginTop: '32px', background: '#FFFFFF', border: '1px solid #E2E8F0', padding: '16px', borderRadius: '8px' }}>
               <AttainmentBarChart 
                 labels={Array.from({length: 12}, (_, i) => `PO${i+1}`).concat(['PSO1', 'PSO2'])}
                 datasets={[{ label: 'PO Attainment', data: poAttainmentData, backgroundColor: '#2563EB' }]}
               />
            </div>

            <div style={{ marginTop: '32px', textAlign: 'center', borderTop: '1px dashed #CBD5E1', paddingTop: '24px' }}>
              {progress.copo ? (
                <div style={{ color: '#10b981', fontWeight: 'bold' }}>✅ CO-PO Assessment Completed</div>
              ) : (
                <Button onClick={() => completeStep('copo_attainment')} variant="success">Confirm & Complete CO-PO Matrix</Button>
              )}
            </div>
          </div>
        );

      case 'overall_attainment':
        // Math to combine Direct and Indirect for the table
        const combinedData: any[] = [];
        cos.map((c: any) => c.coCode).forEach(co => {
           let sum = 0;
           indirectData.forEach(stu => sum += (stu.scores[co] || 5));
           const avg5Scale = sum / (indirectData.length || 1);
           const ind = (avg5Scale / 5) * 3;
           const dir = directData?.data[co]?.direct3Scale || 0;
           const final = (0.6 * dir) + (0.4 * ind);
           combinedData.push({ co, dir, ind, final, tgt: directData?.data[co]?.target3Scale || 0 });
        });

        return (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
             <h3 style={{ textAlign: 'center', color: '#0F172A', marginBottom: '16px', fontWeight: 700 }}>Overall Attainment (60% Direct + 40% Indirect)</h3>
             <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: '#2563EB', color: '#fff' }}>
                  <th style={{ padding: '12px' }}>CO</th>
                  <th style={{ padding: '12px' }}>Direct (A)</th>
                  <th style={{ padding: '12px' }}>Indirect (B)</th>
                  <th style={{ padding: '12px', background: '#1D4ED8' }}>Final Attainment</th>
                  <th style={{ padding: '12px', background: '#10b981' }}>Target (3)</th>
                </tr>
              </thead>
              <tbody>
                {combinedData.map((row, idx) => (
                    <tr key={row.co} style={{ borderBottom: '1px solid #F1F5F9', color: '#334155', background: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
                      <td style={{ padding: '12px', fontWeight: 'bold', color: '#0F172A' }}>{row.co}</td>
                      <td>{row.dir.toFixed(2)}</td>
                      <td>{row.ind.toFixed(2)}</td>
                      <td style={{ fontWeight: 'bold', color: '#2563EB' }}>{row.final.toFixed(2)}</td>
                      <td style={{ fontWeight: 'bold', color: '#10b981' }}>{row.tgt.toFixed(2)}</td>
                    </tr>
                ))}
              </tbody>
            </table>

            <div style={{ height: '350px', marginTop: '32px', background: '#FFFFFF', border: '1px solid #E2E8F0', padding: '16px', borderRadius: '8px' }}>
               <AttainmentBarChart 
                 labels={cos.map((c: any) => c.coCode)}
                 datasets={[
                   { label: 'Direct', data: combinedData.map(d => d.dir), backgroundColor: '#2563EB' },
                   { label: 'Indirect', data: combinedData.map(d => d.ind), backgroundColor: '#7C3AED' },
                   { label: 'Final', data: combinedData.map(d => d.final), backgroundColor: '#10B981' },
                 ]}
               />
            </div>

            <div style={{ marginTop: '32px', textAlign: 'center', borderTop: '1px dashed #CBD5E1', paddingTop: '24px' }}>
              {progress.overall ? (
                <div style={{ color: '#10b981', fontWeight: 'bold' }}>✅ Overall Assessment Completed</div>
              ) : (
                <Button onClick={() => completeStep('overall_attainment')} variant="success">Confirm & Complete Overall</Button>
              )}
            </div>
          </div>
        );

      case 'printable_summary':
        const isApproved = activeReport?.status === 'APPROVED';
        const isSubmitted = activeReport?.status === 'SUBMITTED';

        return (
          <div style={{ animation: 'fadeIn 0.3s ease', textAlign: 'center', maxWidth: '650px', margin: '0 auto' }}>
            <h3 style={{ color: '#0F172A', marginBottom: '8px', fontWeight: 700 }}>Final Attainment Report</h3>
            <p style={{ color: '#64748B', marginBottom: '24px' }}>Review your finalized Direct and Indirect attainment figures and submit for institutional review.</p>
            
            {/* Status Banner */}
            {isApproved ? (
              <div style={{ background: '#ECFDF5', border: '1px solid #10B981', padding: '16px', borderRadius: '8px', color: '#065F46', marginBottom: '24px', fontWeight: 'bold' }}>
                🎉 Report Approved & Officially Published by Department Admin!
              </div>
            ) : isSubmitted ? (
              <div style={{ background: '#FFFBEB', border: '1px solid #F59E0B', padding: '16px', borderRadius: '8px', color: '#92400E', marginBottom: '24px', fontWeight: 'bold' }}>
                ⏳ Report Submitted to Admin! Awaiting Review and Final Approval.
              </div>
            ) : (
              <div style={{ background: '#EFF6FF', border: '1px solid #3B82F6', padding: '16px', borderRadius: '8px', color: '#1E40AF', marginBottom: '24px' }}>
                📋 All milestones completed! Click below to submit your official attainment calculations to the Department Admin for approval.
              </div>
            )}

            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {!isApproved && (
                <Button 
                  onClick={handleSubmitReport} 
                  isLoading={isSubmitting} 
                  disabled={isSubmitted}
                  style={{ 
                    fontSize: '1.05rem', 
                    padding: '14px 28px', 
                    background: isSubmitted ? '#E2E8F0' : '#10B981', 
                    color: isSubmitted ? '#94A3B8' : '#ffffff',
                    fontWeight: 'bold',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  🚀 {isSubmitted ? 'Already Submitted to Admin' : 'Submit Final Report to Admin'}
                </Button>
              )}

              <Button 
                onClick={() => window.print()} 
                style={{ 
                  fontSize: '1.05rem', 
                  padding: '14px 28px',
                  background: '#FFFFFF',
                  color: '#0F172A',
                  border: '1px solid #CBD5E1',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 600
                }}
              >
                🖨️ Print Final OBE Report
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <div className="no-print" style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid #E2E8F0', paddingBottom: '16px' }}>
        <button onClick={() => router.push('/faculty/dashboard')} style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#334155', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
           &larr; Back
        </button>
        <div>
          <h1 style={{ fontSize: '1.8rem', color: '#0F172A', margin: 0, fontWeight: 700 }}>{subjectInfo.subjectName} ({subjectInfo.subjectCode})</h1>
          <p style={{ color: '#2563EB', margin: '4px 0 0 0', fontWeight: 'bold', fontSize: '0.9rem' }}>
            Regulation: MIC-23 &bull; AY: {subjectInfo.academicYear} &bull; Sem: {subjectInfo.semester}
          </p>
        </div>
      </div>

      <Card glow>
        {/* Horizontal Scrollable Tabs */}
        <div style={{ display: 'flex', overflowX: 'auto', gap: '8px', marginBottom: '24px', paddingBottom: '8px', borderBottom: '1px solid #E2E8F0' }}>
          {TABS.map((tab) => {
            const locked = isLocked(tab);
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                disabled={locked}
                onClick={() => setActiveTab(tab)}
                style={{
                  whiteSpace: 'nowrap',
                  padding: '10px 16px',
                  background: active ? '#2563EB' : 'transparent',
                  color: active ? '#fff' : (locked ? '#94A3B8' : '#475569'),
                  border: active ? 'none' : '1px solid #E2E8F0',
                  borderRadius: '8px',
                  cursor: locked ? 'not-allowed' : 'pointer',
                  fontWeight: active ? 'bold' : '500',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {locked && <span>🔒</span>}
                {(!locked && tab !== 'cos' && tab !== 'pos' && tab !== 'peos' && tab !== 'marks') && <span style={{ color: progress[tab.split('_')[0]] ? '#10b981' : '#f59e0b' }}>{progress[tab.split('_')[0]] ? '✓' : '◯'}</span>}
                {TAB_LABELS[tab]}
              </button>
            );
          })}
        </div>

        {/* Tab Panel */}
        <div style={{ minHeight: '400px' }}>
          {renderTabContent()}
        </div>

      </Card>
    </div>

    {/* PRINT-ONLY FINAL REPORT */}
    <div className="print-only" style={{ fontFamily: 'sans-serif', width: '100%', maxWidth: '210mm', margin: '0 auto', overflow: 'hidden' }}>
      <img 
        src="/summary-header.png" 
        alt="Official Report Header" 
        style={{ width: '100%', maxWidth: '100%', display: 'block', margin: '0 auto', boxSizing: 'border-box', objectFit: 'contain' }} 
      />
      <hr style={{ border: 'none', borderTop: '1px solid #000', marginBottom: '20px' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', fontSize: '14px', lineHeight: '1.6' }}>
        <div>
          <strong style={{ fontSize: '16px' }}>ATTAINMENTS OF COs</strong><br/>
          <strong>DEPARTMENT:</strong> {subjectInfo.department.toUpperCase()}<br/>
          <strong>ACADEMIC YEAR:</strong> {subjectInfo.academicYear}<br/>
          <strong>NAME OF THE COURSE:</strong> {subjectInfo.subjectName.toUpperCase()}
        </div>
        <div style={{ textAlign: 'right' }}>
          <strong style={{ fontSize: '16px' }}>{subjectInfo.subjectCode}</strong><br/>
          <strong>DATE:</strong> {new Date().toLocaleDateString('en-GB')}<br/>
          <strong>SEMESTER:</strong> {subjectInfo.semester}<br/>
          <strong>COURSE COORDINATOR:</strong> {subjectInfo.facultyName || 'N/A'}
        </div>
      </div>

      {/* 1. Direct Assessment */}
      <h3 style={{ margin: '10px 0', fontSize: '16px' }}>1. COs Attainment through Direct Assessment(A):</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px', border: '1px solid #000', textAlign: 'center', fontSize: '14px' }}>
        <thead>
          <tr style={{ background: '#eee' }}>
            <th style={{ border: '1px solid #000', padding: '8px' }}>Course<br/>Outcomes</th>
            <th style={{ border: '1px solid #000', padding: '8px' }}>Internal<br/>Exam (x1)</th>
            <th style={{ border: '1px solid #000', padding: '8px' }}>End Exam (x3)</th>
            <th style={{ border: '1px solid #000', padding: '8px' }}>Attainment (A)<br/>[0.3(x1)+0.70(x3)]</th>
            <th style={{ border: '1px solid #000', padding: '8px' }}>Target<br/>(3-Scale)</th>
          </tr>
        </thead>
        <tbody>
          {['CO1', 'CO2', 'CO3', 'CO4', 'CO5'].map((co) => {
             const d = directData?.data?.[co];
             return (
               <tr key={co}>
                 <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>{co}</td>
                 <td style={{ border: '1px solid #000', padding: '8px' }}>{d ? d.internal3Scale.toFixed(2) : '-'}</td>
                 <td style={{ border: '1px solid #000', padding: '8px' }}>{d ? d.external3Scale.toFixed(2) : '-'}</td>
                 <td style={{ border: '1px solid #000', padding: '8px' }}>{d ? d.direct3Scale.toFixed(2) : '-'}</td>
                 <td style={{ border: '1px solid #000', padding: '8px' }}>{d ? d.target3Scale.toFixed(2) : '1.80'}</td>
               </tr>
             );
          })}
        </tbody>
      </table>

      {/* 2. Indirect Assessment */}
      <h3 style={{ margin: '10px 0', fontSize: '16px' }}>2. COs Attainment through Indirect Assessment: Course End Survey(B)</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px', border: '1px solid #000', textAlign: 'center', fontSize: '14px' }}>
        <thead>
          <tr style={{ background: '#eee' }}>
            <th style={{ border: '1px solid #000', padding: '8px' }} rowSpan={2}>Course<br/>outcomes</th>
            <th style={{ border: '1px solid #000', padding: '8px' }} colSpan={5}>Course end survey points</th>
            <th style={{ border: '1px solid #000', padding: '8px' }} rowSpan={2}>Weighted Average<br/>(3-scale)</th>
          </tr>
          <tr style={{ background: '#eee' }}>
            <th style={{ border: '1px solid #000', padding: '4px' }}>5</th>
            <th style={{ border: '1px solid #000', padding: '4px' }}>4</th>
            <th style={{ border: '1px solid #000', padding: '4px' }}>3</th>
            <th style={{ border: '1px solid #000', padding: '4px' }}>2</th>
            <th style={{ border: '1px solid #000', padding: '4px' }}>1</th>
          </tr>
        </thead>
        <tbody>
          {(() => {
             return ['CO1', 'CO2', 'CO3', 'CO4', 'CO5'].map((co) => {
               let count5=0, count4=0, count3=0, count2=0, count1=0;
               let sum = 0;
               (indirectData || []).forEach((stu: any) => {
                  const score = stu.scores?.[co] || 5;
                  sum += score;
                  if (score === 5) count5++;
                  else if (score === 4) count4++;
                  else if (score === 3) count3++;
                  else if (score === 2) count2++;
                  else if (score === 1) count1++;
               });
               const avg5Scale = sum / (indirectData?.length || 1);
               const ind = (avg5Scale / 5) * 3;
               return (
                 <tr key={co}>
                   <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>{co}</td>
                   <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>{count5}</td>
                   <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>{count4}</td>
                   <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>{count3}</td>
                   <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>{count2}</td>
                   <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>{count1}</td>
                   <td style={{ border: '1px solid #000', padding: '8px' }}>{ind.toFixed(2)}</td>
                 </tr>
               );
             });
          })()}
        </tbody>
      </table>

      {/* 3. Final Attainment */}
      <h3 style={{ margin: '10px 0', fontSize: '16px', pageBreakBefore: 'always' }}>3. Final Attainment of COs:</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '40px', border: '1px solid #000', textAlign: 'center', fontSize: '14px' }}>
        <thead>
          <tr style={{ background: '#eee' }}>
            <th style={{ border: '1px solid #000', padding: '8px' }}>Course<br/>Outcomes</th>
            <th style={{ border: '1px solid #000', padding: '8px' }}>Direct<br/>Assessment<br/>(A)</th>
            <th style={{ border: '1px solid #000', padding: '8px' }}>Indirect<br/>Assessment<br/>(B)</th>
            <th style={{ border: '1px solid #000', padding: '8px' }}>Final<br/>Attainment<br/>[0.6(A)+0.4(B)]</th>
            <th style={{ border: '1px solid #000', padding: '8px' }}>Target<br/>(3-Scale)</th>
          </tr>
        </thead>
        <tbody>
          {(() => {
            const combinedDataForPrint: any[] = [];
            ['CO1', 'CO2', 'CO3', 'CO4', 'CO5'].forEach((co) => {
               const d = directData?.data?.[co];
               const dir = d?.direct3Scale || 0;
               const tgt = d?.target3Scale || 1.80;
               let sum = 0;
               (indirectData || []).forEach((stu: any) => sum += (stu.scores?.[co] || 5));
               const avg5Scale = sum / (indirectData?.length || 1);
               const ind = (avg5Scale / 5) * 3;
               const final = (dir * 0.6) + (ind * 0.4);
               combinedDataForPrint.push({ co, dir, ind, final, tgt });
            });
            return combinedDataForPrint.map((row) => (
               <tr key={row.co}>
                 <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>{row.co}</td>
                 <td style={{ border: '1px solid #000', padding: '8px' }}>{row.dir.toFixed(2)}</td>
                 <td style={{ border: '1px solid #000', padding: '8px' }}>{row.ind.toFixed(2)}</td>
                 <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>{row.final.toFixed(2)}</td>
                 <td style={{ border: '1px solid #000', padding: '8px' }}>{row.tgt.toFixed(2)}</td>
               </tr>
            ));
          })()}
        </tbody>
      </table>

      {/* Visual Graphs */}
      <h3 style={{ textAlign: 'center', margin: '20px 0 10px 0', fontSize: '16px', fontWeight: 'bold' }}>Summary of CO Attainment</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '40px', width: '100%' }}>
        <div style={{ height: '280px', borderRadius: '8px', border: '1px solid #ccc', pageBreakInside: 'avoid', display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '700px', margin: '0 auto', overflow: 'hidden' }}>
          <div style={{ position: 'relative', flex: 1, width: '100%' }}>
            {(() => {
              const combinedDataForPrint: any[] = [];
              ['CO1', 'CO2', 'CO3', 'CO4', 'CO5'].forEach((co) => {
                 const dir = directData?.data?.[co]?.direct3Scale || 0;
                 let sum = 0;
                 (indirectData || []).forEach((stu: any) => sum += (stu.scores?.[co] || 5));
                 const avg5Scale = sum / (indirectData?.length || 1);
                 const ind = (avg5Scale / 5) * 3;
                 const final = (dir * 0.6) + (ind * 0.4);
                 combinedDataForPrint.push({ co, dir, ind, final });
              });
              return (
                <AttainmentBarChart 
                  labels={['CO1', 'CO2', 'CO3', 'CO4', 'CO5']}
                  datasets={[
                    { label: 'Direct CO Attainment', data: combinedDataForPrint.map(d => d.dir), backgroundColor: '#3b82f6' },
                    { label: 'Indirect CO Attainment', data: combinedDataForPrint.map(d => d.ind), backgroundColor: '#ef4444' },
                    { label: 'Final CO Attainment', data: combinedDataForPrint.map(d => d.final), backgroundColor: '#84cc16' },
                  ]}
                />
              );
            })()}
          </div>
        </div>
      </div>

      {/* CO-PO Attainment Matrix */}
      <h3 style={{ margin: '30px 0 10px 0', fontSize: '16px', pageBreakBefore: 'always' }}>4. CO-PO Attainment Matrix</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px', border: '1px solid #000', textAlign: 'center', fontSize: '14px' }}>
        <thead>
          <tr style={{ background: '#eee' }}>
            <th style={{ border: '1px solid #000', padding: '8px' }}>CO</th>
            {Array.from({length: 12}, (_, i) => <th key={i} style={{ border: '1px solid #000', padding: '8px' }}>PO{i+1}</th>)}
            <th style={{ border: '1px solid #000', padding: '8px' }}>PSO1</th>
            <th style={{ border: '1px solid #000', padding: '8px' }}>PSO2</th>
          </tr>
        </thead>
        <tbody>
          {['CO1', 'CO2', 'CO3', 'CO4', 'CO5'].map((co) => (
            <tr key={co}>
              <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>{co}</td>
              {Array.from({length: 12}, (_, i) => (
                <td key={i} style={{ border: '1px solid #000', padding: '8px' }}>{copoMap?.[co]?.[`PO${i+1}`] || '-'}</td>
              ))}
              <td style={{ border: '1px solid #000', padding: '8px' }}>{copoMap?.[co]?.['PSO1'] || '-'}</td>
              <td style={{ border: '1px solid #000', padding: '8px' }}>{copoMap?.[co]?.['PSO2'] || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* PO Graph */}
      <div style={{ height: '280px', borderRadius: '8px', border: '1px solid #ccc', pageBreakInside: 'avoid', display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '700px', margin: '0 auto', overflow: 'hidden' }}>
        <h4 style={{ textAlign: 'center', margin: '0 0 10px 0' }}>PO Attainment Summary</h4>
        <div style={{ position: 'relative', flex: 1, width: '100%' }}>
          <AttainmentBarChart 
            labels={Array.from({length: 12}, (_, i) => `PO${i+1}`).concat(['PSO1', 'PSO2'])}
            datasets={[{ label: 'PO Attainment', data: poAttainmentData, backgroundColor: '#3b82f6' }]}
          />
        </div>
      </div>

      <div style={{ marginTop: '80px', display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ textAlign: 'center' }}>
           <p>_______________________</p>
           <p><strong>Faculty Signature</strong></p>
        </div>
        <div style={{ textAlign: 'center' }}>
           <p>_______________________</p>
           <p><strong>HOD Signature</strong></p>
        </div>
      </div>
    </div>

    </>
  );
}
