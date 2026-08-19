'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { facultyService } from '@/services/faculty.service';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Dropzone } from '@/components/ui/Dropzone';
import { AttainmentBarChart } from '@/components/ui/Charts';

const TABS = ['cos', 'pos', 'peos', 'marks', 'indirect', 'direct', 'copo_attainment', 'overall_attainment', 'printable_summary'];
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
    let sumAttainment = 0;
    let count = 0;
    ['CO1', 'CO2', 'CO3', 'CO4', 'CO5'].forEach(co => {
       const weight = copoMap[co]?.[po];
       if (weight && weight !== '-' && weight !== 0 && weight !== '0') {
           sumAttainment += globalCOData[co].final;
           count++;
       }
    });
    return count > 0 ? (sumAttainment / count) : 0;
  });

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    try {
      if (marksType === 'internal') {
        await facultyService.generateInternalReport(file, subjectInfo.subjectCode);
      } else if (marksType === 'external') {
        await facultyService.generateExternalReport(file, subjectInfo.subjectCode);
      } else {
        await facultyService.generateLabReport(file, subjectInfo.subjectCode);
      }
      alert('Marks successfully processed and saved to database!');
      const updatedDir = await facultyService.getDirectAssessment(subjectId);
      setDirectData(updatedDir);
      setFile(null);
    } catch (e: any) {
      alert(e.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const completeStep = async (step: string) => {
    try {
      const newProg = { ...progress, [step]: true };
      await facultyService.updateProgress(subjectId, newProg);
      setProgress(newProg);
      
      const stepOrder = ['indirect', 'direct', 'copo_attainment', 'overall_attainment'];
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
    if (tab === 'copo_attainment') return !progress.direct;
    if (tab === 'overall_attainment') return !progress.copo;
    if (tab === 'printable_summary') return !progress.overall;
    return false;
  };

  if (loading) return <div style={{ color: '#fff' }}>Loading Subject Wizard...</div>;
  if (!subjectInfo) return <div style={{ color: '#ef4444' }}>Subject not found.</div>;

  const isLab = subjectInfo?.subjectName?.toLowerCase().includes('lab') || false;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'cos':
        return (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <h3 style={{ textAlign: 'center', color: '#f8fafc', marginBottom: '16px' }}>Course Outcomes (COs)</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '8px', overflow: 'hidden' }}>
              <thead>
                <tr style={{ background: '#1e293b' }}>
                  <th style={{ padding: '12px 16px', color: '#94a3b8' }}>Outcome</th>
                  <th style={{ padding: '12px 16px', color: '#94a3b8' }}>Description</th>
                </tr>
              </thead>
              <tbody>
                {cos.map((co: any) => (
                  <tr key={co.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 'bold', color: '#3b82f6' }}>{co.coCode}</td>
                    <td style={{ padding: '12px 16px', color: '#e2e8f0' }}>{co.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'pos':
        return (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <h3 style={{ textAlign: 'center', color: '#f8fafc', marginBottom: '16px' }}>Program Outcomes (POs)</h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              {poData.pos.map((po: any) => (
                <div key={po.id} style={{ padding: '16px', background: 'rgba(15, 23, 42, 0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ padding: '4px 8px', background: '#3b82f6', color: '#fff', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>{po.code}</span>
                    <strong style={{ color: '#f8fafc' }}>{po.title}</strong>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#cbd5e1' }}>{po.description}</p>
                </div>
              ))}
            </div>
          </div>
        );

      case 'peos':
        return (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <h3 style={{ textAlign: 'center', color: '#f8fafc', marginBottom: '16px' }}>PEOs & PSOs</h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              {poData.peos.map((peo: any) => (
                <div key={peo.id} style={{ padding: '16px', background: 'rgba(15, 23, 42, 0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ padding: '4px 8px', background: '#0ea5e9', color: '#fff', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>{peo.code}</span>
                    <strong style={{ color: '#f8fafc' }}>{peo.title}</strong>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#cbd5e1' }}>{peo.description}</p>
                </div>
              ))}
              {poData.psos.map((pso: any) => (
                <div key={pso.id} style={{ padding: '16px', background: 'rgba(15, 23, 42, 0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', marginTop: '12px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ padding: '4px 8px', background: '#8b5cf6', color: '#fff', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>{pso.code}</span>
                    <strong style={{ color: '#f8fafc' }}>{pso.title}</strong>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#cbd5e1' }}>{pso.description}</p>
                </div>
              ))}
            </div>
          </div>
        );

      case 'marks':
        return (
          <div style={{ animation: 'fadeIn 0.3s ease', display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '600px', margin: '0 auto' }}>
            <h3 style={{ textAlign: 'center', color: '#f8fafc' }}>Evaluation Marks Entry</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: 'bold' }}>Assessment Milestone</label>
              <select 
                value={marksType} 
                onChange={e => setMarksType(e.target.value)}
                style={{ padding: '12px', borderRadius: '8px', background: '#0f172a', color: '#fff', border: '1px solid #334155' }}
              >
                {!isLab && <option value="internal">Internal Marks</option>}
                {!isLab && <option value="external">External Marks</option>}
                {isLab && <option value="lab">Lab Marks</option>}
              </select>
            </div>

            <Dropzone
              selectedFile={file}
              onFileSelect={setFile}
              onClear={() => setFile(null)}
              title={`Upload ${marksType.toUpperCase()} Excel Sheet`}
              subtitle="Drag & drop standard MIC Autonomous Template"
            />

            <Button onClick={handleUpload} isLoading={isUploading} disabled={!file} style={{ width: '100%' }}>
              Process & Save to Backend
            </Button>

            <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '16px', fontSize: '0.9rem', color: '#94a3b8' }}>
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
            <h3 style={{ textAlign: 'center', color: '#f8fafc', marginBottom: '8px' }}>Course End Survey (Indirect Assessment)</h3>
            <p style={{ textAlign: 'center', color: '#94a3b8', marginBottom: '24px' }}>Real student survey data fetched from the DB</p>
            
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', background: 'rgba(15, 23, 42, 0.4)' }}>
              <thead>
                <tr style={{ background: '#1e293b', color: '#94a3b8' }}>
                  <th style={{ padding: '12px' }}>Roll No</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Student Name</th>
                  <th>CO1</th><th>CO2</th><th>CO3</th><th>CO4</th><th>CO5</th>
                </tr>
              </thead>
              <tbody>
                {indirectData.map((stu: any) => (
                  <tr key={stu.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#e2e8f0' }}>
                    <td style={{ padding: '12px', fontWeight: 'bold' }}>{stu.rollNo}</td>
                    <td style={{ padding: '12px', textAlign: 'left' }}>{stu.name}</td>
                    {['CO1','CO2','CO3','CO4','CO5'].map(co => <td key={co}>{stu.scores[co]}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginTop: '32px', textAlign: 'center' }}>
              <h4 style={{ color: '#f8fafc', marginBottom: '16px' }}>Weighted Averages (3-Scale)</h4>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '24px' }}>
                {Object.keys(indirectAvg).map(co => (
                  <div key={co} style={{ background: '#0f172a', padding: '16px 24px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                    <div style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '4px' }}>{co}</div>
                    <div style={{ color: '#3b82f6', fontSize: '1.4rem', fontWeight: 'bold' }}>{indirectAvg[co].toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: '32px', textAlign: 'center', borderTop: '1px dashed #334155', paddingTop: '24px' }}>
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
            <h3 style={{ textAlign: 'center', color: '#f8fafc', marginBottom: '16px' }}>Direct Assessment Attainment</h3>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', alignItems: 'center', marginBottom: '24px' }}>
              <label style={{ color: '#cbd5e1', fontWeight: 'bold' }}>Target Level (%):</label>
              <select value={targetLevel} onChange={e => setTargetLevel(Number(e.target.value))} style={{ padding: '8px', borderRadius: '4px', background: '#0f172a', color: '#fff' }}>
                <option value={60}>60%</option>
                <option value={65}>65%</option>
                <option value={70}>70%</option>
              </select>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', background: 'rgba(15, 23, 42, 0.4)', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: '#3b82f6', color: '#fff' }}>
                  <th style={{ padding: '12px' }}>CO</th>
                  <th style={{ padding: '12px' }}>Internal Pct</th>
                  <th style={{ padding: '12px' }}>Internal (3)</th>
                  <th style={{ padding: '12px' }}>External Pct</th>
                  <th style={{ padding: '12px' }}>External (3)</th>
                  <th style={{ padding: '12px', background: '#2563eb' }}>Direct Attn (3)</th>
                  <th style={{ padding: '12px', background: '#10b981' }}>Target (3)</th>
                </tr>
              </thead>
              <tbody>
                {['CO1', 'CO2', 'CO3', 'CO4', 'CO5'].map((co, idx) => {
                  const row = directData?.data[co];
                  if (!row) return null;
                  return (
                    <tr key={co} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#e2e8f0', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                      <td style={{ padding: '12px', fontWeight: 'bold' }}>{co}</td>
                      <td>{row.internalPct.toFixed(2)}%</td>
                      <td style={{ fontWeight: 'bold' }}>{row.internal3Scale.toFixed(2)}</td>
                      <td>{row.externalPct.toFixed(2)}%</td>
                      <td style={{ fontWeight: 'bold' }}>{row.external3Scale.toFixed(2)}</td>
                      <td style={{ fontWeight: 'bold', color: '#3b82f6' }}>{row.direct3Scale.toFixed(2)}</td>
                      <td style={{ fontWeight: 'bold', color: '#10b981' }}>{row.target3Scale.toFixed(2)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <div style={{ marginTop: '32px', textAlign: 'center', borderTop: '1px dashed #334155', paddingTop: '24px' }}>
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
            <h3 style={{ textAlign: 'center', color: '#f8fafc', marginBottom: '16px' }}>CO-PO Attainment Matrix</h3>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', background: 'rgba(15, 23, 42, 0.4)', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#1e293b', color: '#94a3b8' }}>
                    <th style={{ padding: '10px' }}>CO</th>
                    {Array.from({length: 12}, (_, i) => <th key={i}>PO{i+1}</th>)}
                    <th>PSO1</th><th>PSO2</th>
                  </tr>
                </thead>
                <tbody>
                  {['CO1', 'CO2', 'CO3', 'CO4', 'CO5'].map((co) => (
                    <tr key={co} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#e2e8f0' }}>
                      <td style={{ padding: '10px', fontWeight: 'bold' }}>{co}</td>
                      {Array.from({length: 12}, (_, i) => <td key={i}>{copoMap[co][`PO${i+1}`] || '-'}</td>)}
                      <td>{copoMap[co]['PSO1'] || '-'}</td>
                      <td>{copoMap[co]['PSO2'] || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ height: '350px', marginTop: '32px', background: '#0f172a', padding: '16px', borderRadius: '8px' }}>
               <AttainmentBarChart 
                 labels={Array.from({length: 12}, (_, i) => `PO${i+1}`).concat(['PSO1', 'PSO2'])}
                 datasets={[{ label: 'PO Attainment', data: poAttainmentData, backgroundColor: '#3b82f6' }]}
               />
            </div>

            <div style={{ marginTop: '32px', textAlign: 'center', borderTop: '1px dashed #334155', paddingTop: '24px' }}>
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
             <h3 style={{ textAlign: 'center', color: '#f8fafc', marginBottom: '16px' }}>Overall Attainment (60% Direct + 40% Indirect)</h3>
             <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', background: 'rgba(15, 23, 42, 0.4)', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: '#3b82f6', color: '#fff' }}>
                  <th style={{ padding: '12px' }}>CO</th>
                  <th style={{ padding: '12px' }}>Direct (A)</th>
                  <th style={{ padding: '12px' }}>Indirect (B)</th>
                  <th style={{ padding: '12px', background: '#2563eb' }}>Final Attainment</th>
                  <th style={{ padding: '12px', background: '#10b981' }}>Target (3)</th>
                </tr>
              </thead>
              <tbody>
                {combinedData.map((row, idx) => (
                    <tr key={row.co} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#e2e8f0', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                      <td style={{ padding: '12px', fontWeight: 'bold' }}>{row.co}</td>
                      <td>{row.dir.toFixed(2)}</td>
                      <td>{row.ind.toFixed(2)}</td>
                      <td style={{ fontWeight: 'bold', color: '#3b82f6' }}>{row.final.toFixed(2)}</td>
                      <td style={{ fontWeight: 'bold', color: '#10b981' }}>{row.tgt.toFixed(2)}</td>
                    </tr>
                ))}
              </tbody>
            </table>

            <div style={{ height: '350px', marginTop: '32px', background: '#0f172a', padding: '16px', borderRadius: '8px' }}>
               <AttainmentBarChart 
                 labels={cos.map((c: any) => c.coCode)}
                 datasets={[
                   { label: 'Direct', data: combinedData.map(d => d.dir), backgroundColor: '#3b82f6' },
                   { label: 'Indirect', data: combinedData.map(d => d.ind), backgroundColor: '#8b5cf6' },
                   { label: 'Final', data: combinedData.map(d => d.final), backgroundColor: '#10b981' },
                 ]}
               />
            </div>

            <div style={{ marginTop: '32px', textAlign: 'center', borderTop: '1px dashed #334155', paddingTop: '24px' }}>
              {progress.overall ? (
                <div style={{ color: '#10b981', fontWeight: 'bold' }}>✅ Overall Assessment Completed</div>
              ) : (
                <Button onClick={() => completeStep('overall_attainment')} variant="success">Confirm & Complete Overall</Button>
              )}
            </div>
          </div>
        );

      case 'printable_summary':
        return (
          <div style={{ animation: 'fadeIn 0.3s ease', textAlign: 'center' }}>
            <h3 style={{ color: '#f8fafc', marginBottom: '16px' }}>Printable Summary</h3>
            <p style={{ color: '#94a3b8', marginBottom: '32px' }}>Your report is ready to print.</p>
            <Button onClick={() => window.print()} style={{ fontSize: '1.2rem', padding: '16px 32px' }}>
               🖨️ Print Final OBE Report
            </Button>
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px' }}>
        <button onClick={() => router.push('/faculty/dashboard')} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#e2e8f0', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>
           &larr; Back
        </button>
        <div>
          <h1 style={{ fontSize: '1.8rem', color: '#f8fafc', margin: 0 }}>{subjectInfo.subjectName} ({subjectInfo.subjectCode})</h1>
          <p style={{ color: '#3b82f6', margin: '4px 0 0 0', fontWeight: 'bold', fontSize: '0.9rem' }}>
            Regulation: MIC-23 &bull; AY: {subjectInfo.academicYear} &bull; Sem: {subjectInfo.semester}
          </p>
        </div>
      </div>

      <Card glow>
        {/* Horizontal Scrollable Tabs */}
        <div style={{ display: 'flex', overflowX: 'auto', gap: '8px', marginBottom: '24px', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
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
                  background: active ? '#3b82f6' : 'transparent',
                  color: active ? '#fff' : (locked ? '#475569' : '#cbd5e1'),
                  border: 'none',
                  borderRadius: '6px',
                  cursor: locked ? 'not-allowed' : 'pointer',
                  fontWeight: active ? 'bold' : 'normal',
                  transition: 'background 0.2s',
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
    <div className="print-only" style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1 style={{ textAlign: 'center', margin: '0 0 10px 0', borderBottom: '2px solid #000', paddingBottom: '10px' }}>Outcome-Based Education Final Report</h1>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
        <div>
          <strong>Subject:</strong> {subjectInfo.subjectName} ({subjectInfo.subjectCode})<br/>
          <strong>Department:</strong> {subjectInfo.department}
        </div>
        <div style={{ textAlign: 'right' }}>
          <strong>Regulation:</strong> MIC-23<br/>
          <strong>Academic Year:</strong> {subjectInfo.academicYear} | <strong>Semester:</strong> {subjectInfo.semester}
        </div>
      </div>

      <h3 style={{ borderBottom: '1px solid #ccc' }}>1. Course Outcomes (COs)</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px', border: '1px solid #000' }}>
        <thead>
          <tr style={{ background: '#eee' }}>
            <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'left' }}>Outcome</th>
            <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'left' }}>Description</th>
          </tr>
        </thead>
        <tbody>
          {cos.map((co: any) => (
            <tr key={co.id}>
              <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>{co.coCode}</td>
              <td style={{ border: '1px solid #000', padding: '8px' }}>{co.description}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 style={{ borderBottom: '1px solid #ccc' }}>2. CO-PO Attainment Matrix</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px', border: '1px solid #000', textAlign: 'center' }}>
        <thead>
          <tr style={{ background: '#eee' }}>
            <th style={{ border: '1px solid #000', padding: '8px' }}>CO</th>
            {Array.from({length: 12}, (_, i) => <th key={i} style={{ border: '1px solid #000', padding: '8px' }}>PO{i+1}</th>)}
            <th style={{ border: '1px solid #000', padding: '8px' }}>PSO1</th>
            <th style={{ border: '1px solid #000', padding: '8px' }}>PSO2</th>
          </tr>
        </thead>
        <tbody>
          {copoMap && ['CO1', 'CO2', 'CO3', 'CO4', 'CO5'].map((co) => (
            <tr key={co}>
              <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>{co}</td>
              {Array.from({length: 12}, (_, i) => (
                <td key={i} style={{ border: '1px solid #000', padding: '8px' }}>{copoMap[co][`PO${i+1}`] || '-'}</td>
              ))}
              <td style={{ border: '1px solid #000', padding: '8px' }}>{copoMap[co]['PSO1'] || '-'}</td>
              <td style={{ border: '1px solid #000', padding: '8px' }}>{copoMap[co]['PSO2'] || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 style={{ borderBottom: '1px solid #ccc' }}>3. Final Overall Assessment</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px', border: '1px solid #000', textAlign: 'center' }}>
        <thead>
          <tr style={{ background: '#eee' }}>
            <th style={{ border: '1px solid #000', padding: '8px' }}>CO</th>
            <th style={{ border: '1px solid #000', padding: '8px' }}>Direct Attainment (60%)</th>
            <th style={{ border: '1px solid #000', padding: '8px' }}>Indirect Attainment (40%)</th>
            <th style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>Final Attainment</th>
          </tr>
        </thead>
        <tbody>
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
              <>
                {combinedDataForPrint.map((row) => (
                   <tr key={row.co}>
                     <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>{row.co}</td>
                     <td style={{ border: '1px solid #000', padding: '8px' }}>{row.dir.toFixed(2)}</td>
                     <td style={{ border: '1px solid #000', padding: '8px' }}>{row.ind.toFixed(2)}</td>
                     <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>{row.final.toFixed(2)}</td>
                   </tr>
                ))}
              </>
            );
          })()}
        </tbody>
      </table>

      <h3 style={{ borderBottom: '1px solid #ccc', marginTop: '40px', pageBreakBefore: 'always' }}>4. Visual Attainment Analysis Graphs</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '40px' }}>
        <div style={{ height: '280px', padding: '16px', borderRadius: '8px', border: '1px solid #ccc', pageBreakInside: 'avoid', display: 'flex', flexDirection: 'column' }}>
          <h4 style={{ textAlign: 'center', margin: '0 0 10px 0' }}>PO Attainment (3-Scale)</h4>
          <div style={{ position: 'relative', flex: 1, width: '100%' }}>
            <AttainmentBarChart 
              labels={Array.from({length: 12}, (_, i) => `PO${i+1}`).concat(['PSO1', 'PSO2'])}
              datasets={[{ label: 'PO Attainment', data: poAttainmentData, backgroundColor: '#3b82f6' }]}
            />
          </div>
        </div>
        <div style={{ height: '280px', padding: '16px', borderRadius: '8px', border: '1px solid #ccc', pageBreakInside: 'avoid', display: 'flex', flexDirection: 'column' }}>
          <h4 style={{ textAlign: 'center', margin: '0 0 10px 0' }}>CO Attainment Summary (3-Scale)</h4>
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
                    { label: 'Direct', data: combinedDataForPrint.map(d => d.dir), backgroundColor: '#ef4444' },
                    { label: 'Indirect', data: combinedDataForPrint.map(d => d.ind), backgroundColor: '#3b82f6' },
                    { label: 'Final', data: combinedDataForPrint.map(d => d.final), backgroundColor: '#10b981' },
                  ]}
                />
              );
            })()}
          </div>
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
