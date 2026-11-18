'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Dropzone } from '@/components/ui/Dropzone';
import { scriptService } from '@/services/script.service';
import { adminService } from '@/services/admin.service';
import { MetadataOptions, ScriptBundle, FileTreeNode } from '@/types/script';
import { FolderTreeViewer } from '@/components/scripts/FolderTreeViewer';
import { ScriptViewerModal } from '@/components/scripts/ScriptViewerModal';
import { DatabaseManagerView } from '@/components/obe/DatabaseManagerView';
import { toast } from 'react-hot-toast';
import {
  IconLayers,
  IconSend,
  IconClock,
  IconBook,
  IconUsers,
  IconUpload,
  IconFolder,
  IconFolderOpen,
  IconCheck,
  IconRefresh,
  IconFileText,
  IconArchive,
  IconShield,
  IconUser,
  IconInfo,
  IconX
} from '@/components/ui/Icons';

function ObeDashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get('tab');

  // Direct reactive tab resolution derived from URL query parameters
  const activeTab: 'dashboard' | 'upload' | 'assign' | 'staff' | 'bundles' | 'database' = (() => {
    if (tabParam === 'database') return 'database';
    if (tabParam === 'staff') return 'staff';
    if (tabParam === 'upload') return 'upload';
    if (tabParam === 'assign') return 'assign';
    if (tabParam === 'bundles') return 'bundles';
    if (tabParam === 'dashboard') return 'dashboard';
    return 'dashboard';
  })();

  const switchTab = (tab: 'dashboard' | 'upload' | 'assign' | 'staff' | 'bundles' | 'database') => {
    if (tab === 'dashboard') {
      router.push('/obe/dashboard');
    } else {
      router.push(`/obe/dashboard?tab=${tab}`);
    }
  };

  // Metadata & Options
  const [metadata, setMetadata] = useState<MetadataOptions | null>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [bundles, setBundles] = useState<ScriptBundle[]>([]);

  // Selection / Filter State
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('');
  const [selectedRegulation, setSelectedRegulation] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedYearLevel, setSelectedYearLevel] = useState('III');
  const [selectedSemesterLevel, setSelectedSemesterLevel] = useState('3-1');
  const [selectedMonth, setSelectedMonth] = useState('November');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');

  // Uploader State (ZIP Archive & Folder)
  const [uploadMode, setUploadMode] = useState<'zip' | 'folder'>('zip');
  const [bundleName, setBundleName] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<{ file: File; relativePath: string }[]>([]);
  const [selectedZipFile, setSelectedZipFile] = useState<File | null>(null);
  const [previewTree, setPreviewTree] = useState<FileTreeNode[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState('');
  const [uploadErrorMessage, setUploadErrorMessage] = useState('');
  const folderInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  // Assignment to Branch Coordinator State (Tier 1)
  const [assignBundleId, setAssignBundleId] = useState('');
  const [branchCoordinators, setBranchCoordinators] = useState<any[]>([]);
  const [selectedCoordinatorId, setSelectedCoordinatorId] = useState('');
  const [assignNotes, setAssignNotes] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignMessage, setAssignMessage] = useState('');
  const [inspectBundle, setInspectBundle] = useState<ScriptBundle | null>(null);
  const [activeScriptFile, setActiveScriptFile] = useState<FileTreeNode | null>(null);

  const handleFilePreview = (node: FileTreeNode) => {
    if (!node.fileId && !node.path) return;
    setActiveScriptFile(node);
  };

  // Staff Onboarding State (Centralized under OBE In-charge)
  const [staffFile, setStaffFile] = useState<File | null>(null);
  const [isStaffProcessing, setIsStaffProcessing] = useState(false);
  const [staffPreviewData, setStaffPreviewData] = useState<any>(null);
  const [staffUploadError, setStaffUploadError] = useState<string | null>(null);
  const [isStaffConfirming, setIsStaffConfirming] = useState(false);

  // Load Initial Metadata & Bundles
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [meta, bundleList] = await Promise.all([
        scriptService.getMetadata(),
        scriptService.getBundles()
      ]);
      setMetadata(meta);
      setBundles(bundleList);

      if (meta.academicYears?.length) setSelectedAcademicYear(meta.academicYears[0].id);
      if (meta.regulations?.length) setSelectedRegulation(meta.regulations[0].id);
      if (meta.departments?.length) setSelectedDepartment(meta.departments[0].id);
    } catch (err: any) {
      console.error('Failed to load initial metadata:', err);
    }
  };

  // Re-fetch database subjects whenever filters change
  useEffect(() => {
    async function fetchSubjects() {
      try {
        const list = await scriptService.getSubjects({
          departmentId: selectedDepartment,
          regulationId: selectedRegulation,
          semesterLevel: selectedSemesterLevel
        });
        setSubjects(list);
        if (list.length > 0) {
          setSelectedSubjectId(list[0].id);
        } else {
          setSelectedSubjectId('');
        }
      } catch (err) {
        console.error('Failed to fetch subjects:', err);
      }
    }
    fetchSubjects();
  }, [selectedDepartment, selectedRegulation, selectedSemesterLevel]);

  // When a bundle is selected in Assign tab, fetch Branch Coordinators for that department
  useEffect(() => {
    async function fetchCoordinatorsForBundle() {
      if (!assignBundleId) {
        setBranchCoordinators([]);
        return;
      }
      const bundle = bundles.find(b => b.id === assignBundleId);
      if (bundle && bundle.department) {
        try {
          const coords = await scriptService.getBranchCoordinators(bundle.department.id, bundle.subject?.id);
          setBranchCoordinators(coords);
          if (coords.length > 0) setSelectedCoordinatorId(coords[0].id);
        } catch (err) {
          console.error('Failed to fetch branch coordinators:', err);
        }
      }
    }
    fetchCoordinatorsForBundle();
  }, [assignBundleId, bundles]);

  // Handle ZIP Archive Selection
  const handleZipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setUploadErrorMessage('Please select a valid .zip compressed archive file.');
      return;
    }
    setSelectedZipFile(file);
    setUploadErrorMessage('');

    // Auto-fill bundle name from zip filename if empty
    if (!bundleName) {
      const baseName = file.name.replace(/\.zip$/i, '');
      setBundleName(`${baseName} - Scripts`);
    }
  };

  // Handle Folder Upload Selection
  const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const fileList = Array.from(e.target.files);
    const parsedFiles = fileList.map(file => ({
      file,
      relativePath: (file as any).webkitRelativePath || file.name
    }));

    setSelectedFiles(parsedFiles);

    // Auto-fill bundle name from top-level directory name if empty
    if (!bundleName && parsedFiles[0].relativePath.includes('/')) {
      const topDir = parsedFiles[0].relativePath.split('/')[0];
      setBundleName(`${topDir} - Scripts`);
    }

    // Build live client-side tree for preview
    buildClientPreviewTree(parsedFiles);
  };

  const buildClientPreviewTree = (files: { file: File; relativePath: string }[]) => {
    const root: FileTreeNode = { name: 'root', path: '', isDirectory: true, children: [] };

    files.forEach(({ file, relativePath }) => {
      const parts = relativePath.split('/');
      let currentLevel = root.children!;

      parts.forEach((part, index) => {
        const isFile = index === parts.length - 1;
        const currentPath = parts.slice(0, index + 1).join('/');
        let existingNode = currentLevel.find(n => n.name === part);

        if (!existingNode) {
          const newNode: FileTreeNode = {
            name: part,
            path: currentPath,
            isDirectory: !isFile,
            ...(isFile ? { size: file.size, mimeType: file.type } : { children: [] })
          };
          currentLevel.push(newNode);
          if (!isFile) currentLevel = newNode.children!;
        } else if (!isFile) {
          if (!existingNode.children) existingNode.children = [];
          currentLevel = existingNode.children;
        }
      });
    });

    setPreviewTree(root.children || []);
  };

  // Submit Script Bundle Upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubjectId) {
      alert('Please select a subject from the database first.');
      return;
    }

    if (uploadMode === 'zip' && !selectedZipFile) {
      alert('Please select a ZIP compressed folder to upload.');
      return;
    }

    if (uploadMode === 'folder' && selectedFiles.length === 0) {
      alert('Please select a folder with script files to upload.');
      return;
    }

    if (!bundleName) {
      alert('Please enter a name for this script bundle.');
      return;
    }

    setIsUploading(true);
    setUploadErrorMessage('');
    setUploadSuccessMessage('');

    try {
      const chosenSub = subjects.find(s => s.id === selectedSubjectId);
      const effectiveDeptId = chosenSub?.departmentId || selectedDepartment;

      const formData = new FormData();
      formData.append('bundleName', bundleName);
      formData.append('academicYearId', selectedAcademicYear);
      if (selectedRegulation) formData.append('regulationId', selectedRegulation);
      formData.append('departmentId', effectiveDeptId);
      formData.append('yearLevel', selectedYearLevel);
      formData.append('semesterLevel', selectedSemesterLevel);
      formData.append('month', selectedMonth);
      formData.append('subjectId', selectedSubjectId);

      if (uploadMode === 'zip' && selectedZipFile) {
        formData.append('isZip', 'true');
        formData.append('files', selectedZipFile);
      } else {
        const relativePaths = selectedFiles.map(f => f.relativePath);
        formData.append('filePaths', JSON.stringify(relativePaths));
        selectedFiles.forEach(f => {
          formData.append('files', f.file);
        });
      }

      const res = await scriptService.uploadBundle(formData);
      setUploadSuccessMessage(
        res.message ||
        `Successfully uploaded "${bundleName}" (${uploadMode === 'zip' ? 'ZIP archive extracted & indexed' : `${selectedFiles.length} files organized`}).`
      );

      // Reset upload inputs
      setBundleName('');
      setSelectedZipFile(null);
      setSelectedFiles([]);
      setPreviewTree([]);
      if (zipInputRef.current) zipInputRef.current.value = '';
      if (folderInputRef.current) folderInputRef.current.value = '';

      // Refresh bundles
      const updatedBundles = await scriptService.getBundles();
      setBundles(updatedBundles);
    } catch (err: any) {
      setUploadErrorMessage(err.message || 'Failed to upload script bundle');
    } finally {
      setIsUploading(false);
    }
  };

  // Tier 1 Allocation: OBE In-charge allocates bundle to Branch Coordinator
  const handleAssignToBranchCoordinator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignBundleId || !selectedCoordinatorId) {
      toast.error('Please select both a script bundle and a Branch Coordinator.');
      return;
    }

    setIsAssigning(true);
    setAssignMessage('');

    try {
      // Tier 1 Allocation: Immediate visibility so Branch Coordinator can inspect and delegate
      const res = await scriptService.assignBundle({
        bundleId: assignBundleId,
        facultyId: selectedCoordinatorId,
        visibleFrom: new Date().toISOString(),
        notes: assignNotes || 'Allocated by OBE In-charge for branch verification and subject coordinator delegation.'
      });

      setAssignMessage(res.message || 'Script bundle successfully allocated to Branch Coordinator!');
      toast.success('Script bundle successfully allocated to Branch Coordinator!');
      setAssignNotes('');

      // Refresh bundles list
      const updated = await scriptService.getBundles();
      setBundles(updated);
    } catch (err: any) {
      toast.error(err.message || 'Failed to allocate script bundle');
    } finally {
      setIsAssigning(false);
    }
  };

  // Handle Deassignment
  const handleDeassign = async (assignmentId: string, recipientName: string) => {
    if (!confirm(`Are you sure you want to deassign scripts from ${recipientName}? Their access will be revoked immediately.`)) {
      return;
    }

    try {
      await scriptService.deassignBundle(assignmentId);
      toast.success(`Deassigned successfully from ${recipientName}`);
      const updated = await scriptService.getBundles();
      setBundles(updated);
    } catch (err: any) {
      toast.error(err.message || 'Failed to deassign');
    }
  };

  // Staff Onboarding Handlers (Centralized under OBE In-charge)
  const handleStaffFileSelect = async (file: File) => {
    setStaffFile(file);
    setStaffUploadError(null);
    setStaffPreviewData(null);
    setIsStaffProcessing(true);

    try {
      const result = await adminService.previewStaff(file);
      setStaffPreviewData(result);
      toast.success('Staff roster parsed successfully!');
    } catch (err: any) {
      setStaffUploadError(err.message || 'Failed to parse staff file.');
      toast.error('Failed to parse staff file.');
    } finally {
      setIsStaffProcessing(false);
    }
  };

  const handleConfirmStaff = async () => {
    if (!staffPreviewData) return;
    setIsStaffConfirming(true);
    try {
      const payload = staffPreviewData.batchId ? staffPreviewData : (staffPreviewData.data || staffPreviewData);
      const validIds = (payload.validRecords || []).map((r: any) => r.employeeId);
      const res = await adminService.confirmStaff({
        ...payload,
        batchId: payload.batchId,
        validEmployeeIds: validIds
      });
      toast.success(res.message || 'Staff members onboarded successfully with assigned roles!');
      setStaffPreviewData(null);
      setStaffFile(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to confirm staff onboarding.');
    } finally {
      setIsStaffConfirming(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
            {activeTab === 'dashboard' && 'OBE In-charge Dashboard'}
            {activeTab === 'database' && 'Master Database Management Hub'}
            {activeTab === 'upload' && 'Upload Script Bundles'}
            {activeTab === 'assign' && 'Allocate Scripts to Branch Coordinator'}
            {activeTab === 'staff' && 'Central Staff Onboarding'}
            {activeTab === 'bundles' && 'Script Bundles Repository'}
          </h1>
          <p style={{ color: '#64748B', fontSize: '0.92rem', margin: '4px 0 0 0' }}>
            {activeTab === 'dashboard' && 'Central institutional authority for examination script ingestion, branch coordinator allocation, and staff onboarding.'}
            {activeTab === 'database' && 'Direct full-access database console — Add, edit, or delete records across all institutional tables.'}
            {activeTab === 'upload' && 'Select examination subject and ingest scripts via ZIP compressed archive or folder hierarchy.'}
            {activeTab === 'assign' && 'Allocate uploaded examination script bundles to the corresponding Branch Coordinator.'}
            {activeTab === 'staff' && 'Onboard faculty members and designate Branch Coordinators vs Teaching Faculty.'}
            {activeTab === 'bundles' && 'Inspect all uploaded examination bundles, file trees, and delegation statuses.'}
          </p>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 0: OBE IN-CHARGE DASHBOARD OVERVIEW */}
      {/* ======================================================== */}
      {activeTab === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Institutional Metrics Overview */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <Card glow style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Ingested Bundles</span>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#EFF6FF', border: '1px solid #DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconLayers size={18} color="#2563EB" />
                </div>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>{bundles.length}</div>
              <div style={{ fontSize: '0.8rem', color: '#10B981', fontWeight: 600, marginTop: '4px' }}>Examination batches</div>
            </Card>

            <Card glow style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Allocated to HOD/Coord</span>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#F0FDF4', border: '1px solid #DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconSend size={18} color="#16A34A" />
                </div>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#16A34A', letterSpacing: '-0.02em' }}>
                {bundles.filter(b => (b as any).branchCoordinatorAssignment || (b as any).assignedToCoordinatorId).length}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '4px' }}>Tier-1 delegated</div>
            </Card>

            <Card glow style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pending Allocation</span>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#FEF3C7', border: '1px solid #FDE68A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconClock size={18} color="#D97706" />
                </div>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#D97706', letterSpacing: '-0.02em' }}>
                {bundles.filter(b => !(b as any).branchCoordinatorAssignment && !(b as any).assignedToCoordinatorId).length}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#D97706', fontWeight: 600, marginTop: '4px' }}>Requires allocation</div>
            </Card>

            <Card glow style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Active Subjects</span>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#F5F3FF', border: '1px solid #EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconBook size={18} color="#7C3AED" />
                </div>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>{subjects.length}</div>
              <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '4px' }}>Current department/term</div>
            </Card>
          </div>

          {/* Institutional Workflow Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
            <Card glow style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#EFF6FF', border: '1px solid #DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                  <IconUsers size={22} color="#2563EB" />
                </div>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', fontWeight: 700, color: '#0F172A' }}>Staff Onboarding</h3>
                <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: '#64748B', lineHeight: '1.5' }}>
                  Upload Excel/CSV staff rosters to onboard faculty members and designate Branch Coordinators vs Teaching Faculty.
                </p>
              </div>
              <Button
                type="button"
                variant="primary"
                onClick={() => switchTab('staff')}
                style={{ width: '100%', fontSize: '0.88rem' }}
              >
                Open Staff Onboarding &rarr;
              </Button>
            </Card>

            <Card glow style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#F0FDF4', border: '1px solid #DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                  <IconUpload size={22} color="#16A34A" />
                </div>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', fontWeight: 700, color: '#0F172A' }}>Upload Scripts</h3>
                <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: '#64748B', lineHeight: '1.5' }}>
                  Ingest examination scripts via ZIP compressed archive (.zip) or folder directory preserving question hierarchies.
                </p>
              </div>
              <Button
                type="button"
                variant="primary"
                onClick={() => switchTab('upload')}
                style={{ width: '100%', fontSize: '0.88rem' }}
              >
                Upload Script Bundles &rarr;
              </Button>
            </Card>

            <Card glow style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#FEF3C7', border: '1px solid #FDE68A', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                  <IconSend size={22} color="#D97706" />
                </div>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', fontWeight: 700, color: '#0F172A' }}>Assign to Branch Coordinator</h3>
                <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: '#64748B', lineHeight: '1.5' }}>
                  Allocate uploaded script bundles to Branch Coordinators for departmental verification and Tier-2 delegation.
                </p>
              </div>
              <Button
                type="button"
                variant="primary"
                onClick={() => switchTab('assign')}
                style={{ width: '100%', fontSize: '0.88rem' }}
              >
                Allocate Scripts &rarr;
              </Button>
            </Card>

            <Card glow style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#F5F3FF', border: '1px solid #EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                  <IconFolder size={22} color="#7C3AED" />
                </div>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', fontWeight: 700, color: '#0F172A' }}>Script Bundles Repository</h3>
                <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: '#64748B', lineHeight: '1.5' }}>
                  Browse directory structures, inspect scanned files, and check multi-tier coordinator delegation statuses.
                </p>
              </div>
              <Button
                type="button"
                variant="primary"
                onClick={() => switchTab('bundles')}
                style={{ width: '100%', fontSize: '0.88rem' }}
              >
                View Script Bundles &rarr;
              </Button>
            </Card>
          </div>

          {/* Recent Bundles Quick Activity */}
          <Card glow>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0F172A' }}>
                Recent Script Bundles
              </h3>
              <Button
                type="button"
                variant="secondary"
                onClick={() => switchTab('bundles')}
                style={{ fontSize: '0.82rem', padding: '6px 12px' }}
              >
                View All ({bundles.length}) &rarr;
              </Button>
            </div>

            {bundles.length === 0 ? (
              <p style={{ color: '#64748B', fontSize: '0.9rem', margin: 0, padding: '16px 0', textAlign: 'center' }}>
                No script bundles created yet. Click "Upload Scripts" above to upload your first bundle.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1.5px solid #E2E8F0', background: '#F8FAFC' }}>
                      <th style={{ padding: '10px 14px', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Bundle Title</th>
                      <th style={{ padding: '10px 14px', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Subject & Dept</th>
                      <th style={{ padding: '10px 14px', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Files</th>
                      <th style={{ padding: '10px 14px', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Allocation Status</th>
                      <th style={{ padding: '10px 14px', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bundles.slice(0, 5).map((b) => {
                      const isAllocated = !!((b as any).branchCoordinatorAssignment || (b as any).assignedToCoordinatorId);
                      return (
                        <tr key={b.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0F172A', fontSize: '0.9rem' }}>
                            {b.bundleName}
                          </td>
                          <td style={{ padding: '12px 14px', fontSize: '0.85rem', color: '#475569' }}>
                            <span style={{ fontWeight: 600, color: '#2563EB' }}>[{b.subject.subjectCode}]</span> {b.subject.subjectName}
                          </td>
                          <td style={{ padding: '12px 14px', fontSize: '0.85rem', color: '#64748B' }}>
                            {b.totalFiles} files
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            {isAllocated ? (
                              <span style={{ padding: '3px 8px', borderRadius: '4px', background: '#DCFCE7', color: '#15803D', fontWeight: 700, fontSize: '0.75rem' }}>
                                ✓ Allocated
                              </span>
                            ) : (
                              <span style={{ padding: '3px 8px', borderRadius: '4px', background: '#FEF3C7', color: '#D97706', fontWeight: 700, fontSize: '0.75rem' }}>
                                ⏳ Pending Allocation
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                            <Button
                              type="button"
                              variant="secondary"
                              style={{ fontSize: '0.78rem', padding: '4px 10px' }}
                              onClick={() => {
                                setAssignBundleId(b.id);
                                switchTab('assign');
                              }}
                            >
                              Allocate
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 1: SCRIPT BUNDLE UPLOAD (ZIP & FOLDER) */}
      {/* ======================================================== */}
      {activeTab === 'upload' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Metadata Filter Panel */}
          <Card glow>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IconFileText size={18} color="#2563EB" /> Step 1: Select Subject & Metadata
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              {/* Academic Year */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Academic Year
                </label>
                <select
                  value={selectedAcademicYear}
                  onChange={(e) => setSelectedAcademicYear(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', background: '#F8FAFC', border: '1.5px solid #CBD5E1', borderRadius: '8px', fontSize: '0.9rem', color: '#0F172A', outline: 'none' }}
                >
                  {metadata?.academicYears?.map(ay => (
                    <option key={ay.id} value={ay.id}>{ay.year}</option>
                  ))}
                </select>
              </div>

              {/* Regulation */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Regulation
                </label>
                <select
                  value={selectedRegulation}
                  onChange={(e) => setSelectedRegulation(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', background: '#F8FAFC', border: '1.5px solid #CBD5E1', borderRadius: '8px', fontSize: '0.9rem', color: '#0F172A', outline: 'none' }}
                >
                  {metadata?.regulations?.map(reg => (
                    <option key={reg.id} value={reg.id}>{reg.name}</option>
                  ))}
                </select>
              </div>

              {/* Branch / Department */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Branch / Department
                </label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', background: '#F8FAFC', border: '1.5px solid #CBD5E1', borderRadius: '8px', fontSize: '0.9rem', color: '#0F172A', outline: 'none' }}
                >
                  {metadata?.departments?.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.departmentName}</option>
                  ))}
                </select>
              </div>

              {/* Year Level */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Year
                </label>
                <select
                  value={selectedYearLevel}
                  onChange={(e) => setSelectedYearLevel(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', background: '#F8FAFC', border: '1.5px solid #CBD5E1', borderRadius: '8px', fontSize: '0.9rem', color: '#0F172A', outline: 'none' }}
                >
                  {metadata?.yearLevels?.map(y => (
                    <option key={y} value={y}>Year {y}</option>
                  ))}
                </select>
              </div>

              {/* Semester Level */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Semester
                </label>
                <select
                  value={selectedSemesterLevel}
                  onChange={(e) => setSelectedSemesterLevel(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', background: '#F8FAFC', border: '1.5px solid #CBD5E1', borderRadius: '8px', fontSize: '0.9rem', color: '#0F172A', outline: 'none' }}
                >
                  {metadata?.semesterLevels?.map(s => (
                    <option key={s} value={s}>Semester {s}</option>
                  ))}
                </select>
              </div>

              {/* Month */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Exam Session Month
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', background: '#F8FAFC', border: '1.5px solid #CBD5E1', borderRadius: '8px', fontSize: '0.9rem', color: '#0F172A', outline: 'none' }}
                >
                  {metadata?.months?.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Subject Dropdown directly synced with Database */}
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #E2E8F0' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#1E293B', textTransform: 'uppercase', marginBottom: '8px' }}>
                Subject (Reflected from Database)
              </label>
              {subjects.length === 0 ? (
                <div style={{ padding: '12px 16px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', color: '#B45309', fontSize: '0.88rem' }}>
                  ⚠️ No subjects found matching this branch and semester in the database. Try changing the Department or Semester above.
                </div>
              ) : (
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: '#FFFFFF',
                    border: '2px solid #3B82F6',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: '#0F172A',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      [{sub.subjectCode}] {sub.subjectName} &bull; {sub.department?.departmentName}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </Card>

          {/* Folder & Files Ingestion Card */}
          <Card glow>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IconUpload size={18} color="#2563EB" /> Step 2: Upload Script Archive / Folders
              </h3>

              {/* Upload Mode Selector */}
              <div style={{ display: 'flex', background: '#F1F5F9', padding: '4px', borderRadius: '8px', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => setUploadMode('zip')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    background: uploadMode === 'zip' ? '#2563EB' : 'transparent',
                    color: uploadMode === 'zip' ? '#FFFFFF' : '#475569',
                    boxShadow: uploadMode === 'zip' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.15s ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <IconArchive size={14} color={uploadMode === 'zip' ? '#FFFFFF' : '#64748B'} />
                  ZIP Compressed Folder (.zip) [Recommended]
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMode('folder')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    background: uploadMode === 'folder' ? '#2563EB' : 'transparent',
                    color: uploadMode === 'folder' ? '#FFFFFF' : '#475569',
                    boxShadow: uploadMode === 'folder' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.15s ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <IconFolder size={14} color={uploadMode === 'folder' ? '#FFFFFF' : '#64748B'} />
                  Browser Folder Structure
                </button>
              </div>
            </div>

            {uploadErrorMessage && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', padding: '12px 16px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600, marginBottom: '16px' }}>
                ⚠️ {uploadErrorMessage}
              </div>
            )}

            {uploadSuccessMessage && (
              <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#15803D', padding: '12px 16px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600, marginBottom: '16px' }}>
                ✓ {uploadSuccessMessage}
              </div>
            )}

            <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Bundle / Batch Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mid-1 Evaluation Scripts - Mechanical"
                  value={bundleName}
                  onChange={(e) => setBundleName(e.target.value)}
                  required
                  style={{ width: '100%', padding: '12px 14px', background: '#F8FAFC', border: '1.5px solid #CBD5E1', borderRadius: '8px', fontSize: '0.95rem', color: '#0F172A', outline: 'none' }}
                />
              </div>

              {/* MODE A: ZIP Compressed Folder */}
              {uploadMode === 'zip' && (
                <div style={{ border: '2px dashed #93C5FD', background: '#EFF6FF', borderRadius: '12px', padding: '36px 20px', textAlign: 'center' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
                    <IconArchive size={24} color="#1D4ED8" />
                  </div>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '1.05rem', fontWeight: 700, color: '#1E40AF' }}>
                    Select ZIP Compressed Archive (.zip)
                  </h4>
                  <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: '#3B82F6', maxWidth: '520px', marginLeft: 'auto', marginRight: 'auto' }}>
                    Compress your script folder into a <strong>.zip file</strong>. Subfolders (e.g. Sets, Questions, Sections) and all script images/scans will be automatically extracted and organized.
                  </p>

                  <input
                    ref={zipInputRef}
                    type="file"
                    accept=".zip,application/zip,application/x-zip-compressed"
                    onChange={handleZipChange}
                    style={{ display: 'none' }}
                  />

                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => zipInputRef.current?.click()}
                    style={{ background: '#FFFFFF', border: '1.5px solid #BFDBFE', color: '#1D4ED8', fontWeight: 700 }}
                  >
                    {selectedZipFile ? 'Change Selected ZIP...' : 'Browse .ZIP File...'}
                  </Button>

                  {selectedZipFile && (
                    <div style={{ marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#FFFFFF', padding: '8px 16px', borderRadius: '8px', border: '1px solid #BFDBFE' }}>
                      <IconFileText size={18} color="#2563EB" />
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1E293B' }}>{selectedZipFile.name}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748B' }}>{(selectedZipFile.size / (1024 * 1024)).toFixed(2)} MB</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedZipFile(null)}
                        style={{ background: 'none', border: 'none', color: '#EF4444', fontWeight: 700, cursor: 'pointer', marginLeft: '8px', display: 'flex', alignItems: 'center' }}
                      >
                        <IconX size={16} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* MODE B: Direct Folder Directory Ingestion */}
              {uploadMode === 'folder' && (
                <div style={{ border: '2px dashed #CBD5E1', background: '#F8FAFC', borderRadius: '12px', padding: '36px 20px', textAlign: 'center' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
                    <IconFolder size={24} color="#475569" />
                  </div>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '1.05rem', fontWeight: 700, color: '#0F172A' }}>
                    Click to Select Folder with Script Structure
                  </h4>
                  <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: '#64748B', maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto' }}>
                    Supports full directory structures, subfolders (e.g. Sets, Questions, Sections), and script files (PDF, PNG, JPG).
                  </p>

                  <input
                    ref={folderInputRef}
                    type="file"
                    {...({ webkitdirectory: '', directory: '', multiple: true } as any)}
                    onChange={handleFolderChange}
                    style={{ display: 'none' }}
                  />

                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => folderInputRef.current?.click()}
                    style={{ background: '#FFFFFF', border: '1px solid #CBD5E1' }}
                  >
                    Browse Folder...
                  </Button>
                </div>
              )}

              {/* Preview Folder Tree for Multi-File Selection */}
              {uploadMode === 'folder' && previewTree.length > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                      Folder Structure Preview ({selectedFiles.length} files detected)
                    </span>
                    <button
                      type="button"
                      onClick={() => { setSelectedFiles([]); setPreviewTree([]); }}
                      style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Clear All
                    </button>
                  </div>
                  <FolderTreeViewer nodes={previewTree} />
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                disabled={isUploading || (!selectedZipFile && selectedFiles.length === 0)}
                style={{ padding: '14px', fontSize: '1rem', fontWeight: 700, marginTop: '8px' }}
              >
                {isUploading ? 'Uploading & Extracting Bundle...' : 'Upload Script Bundle'}
              </Button>
            </form>
          </Card>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: ASSIGN TO BRANCH COORDINATOR (TIER 1) */}
      {/* ======================================================== */}
      {activeTab === 'assign' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Assignment Control Card */}
          <Card glow>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IconSend size={18} color="#2563EB" /> Tier 1: Allocate Script Bundle to Branch Coordinator
            </h3>

            <p style={{ color: '#475569', fontSize: '0.9rem', margin: '0 0 20px 0', lineHeight: '1.5' }}>
              As OBE In-charge, allocate examination script bundles to the corresponding <strong>Branch Coordinator</strong>. 
              The Branch Coordinator will inspect the scripts and delegate them to the appropriate <strong>Subject Coordinator</strong> with scheduled time locks.
            </p>

            {assignMessage && (
              <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#15803D', padding: '12px 16px', borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem', marginBottom: '16px' }}>
                ✓ {assignMessage}
              </div>
            )}

            <form onSubmit={handleAssignToBranchCoordinator} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
              {/* Select Bundle */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Select Uploaded Script Bundle
                </label>
                {bundles.length === 0 ? (
                  <p style={{ color: '#64748B', fontSize: '0.9rem' }}>No script bundles uploaded yet. Upload one in the "Upload Scripts" tab first.</p>
                ) : (
                  <select
                    value={assignBundleId}
                    onChange={(e) => setAssignBundleId(e.target.value)}
                    required
                    style={{ width: '100%', padding: '12px 14px', background: '#F8FAFC', border: '1.5px solid #CBD5E1', borderRadius: '8px', fontSize: '0.95rem', color: '#0F172A', outline: 'none', fontWeight: 600 }}
                  >
                    <option value="">-- Choose a Script Bundle --</option>
                    {bundles.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.bundleName} &bull; [{b.subject.subjectCode}] {b.subject.subjectName} &bull; {b.department?.departmentName} ({b.totalFiles} files)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Select Branch Coordinator */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Assign to Branch Coordinator *
                </label>
                {branchCoordinators.length === 0 ? (
                  <div style={{ padding: '12px 14px', background: '#F1F5F9', borderRadius: '8px', fontSize: '0.88rem', color: '#64748B' }}>
                    {assignBundleId ? 'No Branch Coordinator found for this department. Onboard one in the Staff Onboarding tab.' : 'Select a script bundle above to load branch coordinators.'}
                  </div>
                ) : (
                  <select
                    value={selectedCoordinatorId}
                    onChange={(e) => setSelectedCoordinatorId(e.target.value)}
                    required
                    style={{ width: '100%', padding: '11px 14px', background: '#EFF6FF', border: '2px solid #3B82F6', borderRadius: '8px', fontSize: '0.92rem', color: '#0F172A', outline: 'none', fontWeight: 600 }}
                  >
                    {branchCoordinators.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} &bull; {c.role?.roleName || 'COORDINATOR'} ({c.email})
                      </option>
                    ))}
                  </select>
                )}
                <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'block', marginTop: '4px' }}>
                  Branch Coordinators have access to the Branch Scripts delegation portal (/admin/scripts).
                </span>
              </div>

              {/* Instructions / Allocation Notes */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Instructions / Notes for Coordinator
                </label>
                <input
                  type="text"
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  placeholder="e.g. Verify scans and delegate to Subject Coordinator for evaluation"
                  style={{ width: '100%', padding: '11px 14px', background: '#F8FAFC', border: '1.5px solid #CBD5E1', borderRadius: '8px', fontSize: '0.92rem', color: '#0F172A', outline: 'none' }}
                />
              </div>

              {/* Submit Allocation */}
              <div style={{ gridColumn: '1 / -1', marginTop: '8px' }}>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isAssigning || !assignBundleId || !selectedCoordinatorId}
                  style={{ width: '100%', padding: '13px', fontSize: '1rem', fontWeight: 700 }}
                >
                  {isAssigning ? 'Allocating to Branch Coordinator...' : 'Allocate Script Bundle to Branch Coordinator'}
                </Button>
              </div>
            </form>
          </Card>

          {/* Active Assignments Matrix */}
          <Card glow>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', fontWeight: 700, color: '#0F172A' }}>
              Script Allocation & Delegation Pipeline
            </h3>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1.5px solid #E2E8F0', background: '#F8FAFC' }}>
                    <th style={{ padding: '12px 14px', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Subject & Bundle</th>
                    <th style={{ padding: '12px 14px', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Branch Coordinator (Tier 1)</th>
                    <th style={{ padding: '12px 14px', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Subject Coordinator (Tier 2)</th>
                    <th style={{ padding: '12px 14px', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {bundles.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '32px 16px', textAlign: 'center', color: '#64748B', fontSize: '0.9rem' }}>
                        No script bundles available. Upload bundles in the "Upload Scripts" tab.
                      </td>
                    </tr>
                  ) : (
                    bundles.map(bundle => {
                      const branchCoord = (bundle as any).branchCoordinatorAssignment;
                      const subjectCoord = (bundle as any).subjectCoordinatorAssignment;

                      return (
                        <tr key={bundle.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '14px' }}>
                            <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.92rem' }}>{bundle.bundleName}</div>
                            <div style={{ fontSize: '0.78rem', color: '#2563EB', fontWeight: 600 }}>
                              [{bundle.subject.subjectCode}] {bundle.subject.subjectName} &bull; {bundle.department?.departmentName}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: '#64748B' }}>{bundle.totalFiles} files</div>
                          </td>

                          {/* Branch Coordinator Tier 1 */}
                          <td style={{ padding: '14px' }}>
                            {branchCoord ? (
                              <div>
                                <span style={{ padding: '3px 8px', borderRadius: '4px', background: '#DCFCE7', color: '#15803D', fontWeight: 700, fontSize: '0.75rem', display: 'inline-block', marginBottom: '4px' }}>
                                  ✓ Allocated
                                </span>
                                <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '0.88rem' }}>{branchCoord.coordinatorName}</div>
                              </div>
                            ) : (
                              <span style={{ padding: '3px 8px', borderRadius: '4px', background: '#FEF3C7', color: '#D97706', fontWeight: 700, fontSize: '0.75rem' }}>
                                ⏳ Pending Allocation
                              </span>
                            )}
                          </td>

                          {/* Subject Coordinator Tier 2 */}
                          <td style={{ padding: '14px' }}>
                            {subjectCoord ? (
                              <div>
                                <span style={{ padding: '3px 8px', borderRadius: '4px', background: '#DBEAFE', color: '#1D4ED8', fontWeight: 700, fontSize: '0.75rem', display: 'inline-block', marginBottom: '4px' }}>
                                  ✓ Delegated
                                </span>
                                <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '0.88rem' }}>{subjectCoord.facultyName}</div>
                                <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                                  Release: {new Date(subjectCoord.visibleFrom).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                                </div>
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
                                Awaiting Branch Coordinator
                              </span>
                            )}
                          </td>

                          {/* Action */}
                          <td style={{ padding: '14px', textAlign: 'right' }}>
                            {branchCoord && (
                              <button
                                type="button"
                                onClick={() => handleDeassign(branchCoord.id, branchCoord.coordinatorName)}
                                style={{
                                  background: '#FEF2F2',
                                  border: '1px solid #FECACA',
                                  color: '#DC2626',
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  fontSize: '0.8rem',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                Revoke
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: STAFF ONBOARDING (CENTRALIZED UNDER OBE IN-CHARGE) */}
      {/* ======================================================== */}
      {activeTab === 'staff' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <Card glow>
            <div style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: '16px', marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IconUsers size={22} color="#2563EB" /> Central Staff Onboarding
              </h3>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748B', lineHeight: '1.5' }}>
                As the central institutional authority, the OBE In-charge onboards staff and specifies their institutional roles.
                Upload an Excel or CSV file containing staff details. Supported institutional roles are:
                <strong> HOD (Admin)</strong>, <strong>Branch Coordinator</strong>, <strong>Faculty</strong>, and <strong>OBE In-charge</strong>.
              </p>
            </div>

            {/* Template & Guidelines Alert */}
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '14px 18px', marginBottom: '20px', fontSize: '0.88rem', color: '#334155' }}>
              <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <IconFileText size={16} color="#475569" /> Supported Excel/CSV Columns:
              </div>
              <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px', lineHeight: '1.6' }}>
                <li><strong>Employee ID</strong>: Unique staff identifier (e.g., <code>FAC001</code>, <code>HOD-MECH-01</code>)</li>
                <li><strong>Name</strong>: Full staff / faculty member name</li>
                <li><strong>Email</strong>: Institutional email address (used for login)</li>
                <li><strong>Department</strong>: Department code or name (e.g., <code>MECH</code>, <code>CSE</code>, <code>ECE</code>)</li>
                <li>
                  <strong>Role / Designation</strong>: 
                  <span style={{ background: '#EFF6FF', color: '#1D4ED8', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, marginLeft: '6px', marginRight: '4px' }}>HOD / Admin</span>,
                  <span style={{ background: '#DCFCE7', color: '#15803D', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, marginLeft: '4px', marginRight: '4px' }}>Branch Coordinator</span>,
                  <span style={{ background: '#F1F5F9', color: '#334155', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, marginLeft: '4px', marginRight: '4px' }}>Faculty</span>, or
                  <span style={{ background: '#FEF3C7', color: '#B45309', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, marginLeft: '4px' }}>OBE In-charge</span>
                </li>
              </ul>
              <div style={{ marginTop: '10px', padding: '8px 12px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '6px', fontSize: '0.82rem', color: '#1E40AF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IconInfo size={16} color="#2563EB" style={{ flexShrink: 0 }} />
                <div>
                  <strong>Note on Subject Coordinators:</strong> There is no separate &quot;Subject Coordinator&quot; role in the staff roster. A faculty member becomes a Subject Coordinator dynamically when the Branch Coordinator delegates that subject&apos;s examination script bundle to them.
                </div>
              </div>
            </div>

            {staffUploadError && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', padding: '12px 16px', borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem', marginBottom: '16px' }}>
                ⚠️ {staffUploadError}
              </div>
            )}

            {/* Dropzone */}
            {!staffPreviewData && (
              <Dropzone
                onFileSelect={(file) => handleStaffFileSelect(file)}
                selectedFile={staffFile}
                onClear={() => { setStaffFile(null); setStaffPreviewData(null); }}
                accept=".xlsx, .xls, .csv"
                title="Drag & Drop Staff Roster Excel/CSV Here"
                subtitle="Upload staff workbook containing Employee ID, Name, Email, Department, and Role"
              />
            )}

            {/* Preview & Confirmation Section */}
            {staffPreviewData && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0F172A' }}>
                      Staff Roster Preview
                    </h4>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748B' }}>
                      File: {staffFile?.name} &bull; {(staffPreviewData.validRecords || staffPreviewData.data?.validRecords || []).length} valid records ready
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => { setStaffPreviewData(null); setStaffFile(null); }}
                      style={{ fontSize: '0.85rem' }}
                    >
                      Cancel / Re-upload
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={handleConfirmStaff}
                      disabled={isStaffConfirming}
                      style={{ fontSize: '0.85rem', fontWeight: 700 }}
                    >
                      {isStaffConfirming ? 'Onboarding Staff...' : 'Confirm & Onboard Staff'}
                    </Button>
                  </div>
                </div>

                {/* Table of Parsed Records */}
                <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                        <th style={{ padding: '10px 14px', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Employee ID</th>
                        <th style={{ padding: '10px 14px', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Name</th>
                        <th style={{ padding: '10px 14px', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Email</th>
                        <th style={{ padding: '10px 14px', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Department</th>
                        <th style={{ padding: '10px 14px', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Assigned Role</th>
                        <th style={{ padding: '10px 14px', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {((staffPreviewData.validRecords || staffPreviewData.data?.validRecords || []) as any[]).map((r: any, idx: number) => {
                        const isCoordinator = r.roleName === 'COORDINATOR' || (r.roleRaw && r.roleRaw.toLowerCase().includes('coord'));
                        const isHod = r.roleName === 'ADMIN' || (r.roleRaw && r.roleRaw.toLowerCase().includes('hod'));
                        const isObe = r.roleName === 'OBE_INCHARGE' || (r.roleRaw && r.roleRaw.toLowerCase().includes('obe'));

                        let badgeBg = '#F1F5F9';
                        let badgeColor = '#334155';
                        let badgeLabel = 'Faculty';
                        let badgeIcon = <IconUser size={13} color="#2563EB" />;

                        if (isObe) {
                          badgeBg = '#FEF3C7';
                          badgeColor = '#B45309';
                          badgeLabel = 'OBE In-charge';
                          badgeIcon = <IconShield size={13} color="#B45309" />;
                        } else if (isHod) {
                          badgeBg = '#EFF6FF';
                          badgeColor = '#1D4ED8';
                          badgeLabel = 'HOD (Admin)';
                          badgeIcon = <IconShield size={13} color="#1D4ED8" />;
                        } else if (isCoordinator) {
                          badgeBg = '#DCFCE7';
                          badgeColor = '#15803D';
                          badgeLabel = 'Branch Coordinator';
                          badgeIcon = <IconShield size={13} color="#15803D" />;
                        }

                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0F172A', fontSize: '0.88rem' }}>{r.employeeId}</td>
                            <td style={{ padding: '12px 14px', fontWeight: 600, color: '#1E293B', fontSize: '0.88rem' }}>{r.name || r.facultyName}</td>
                            <td style={{ padding: '12px 14px', color: '#64748B', fontSize: '0.85rem' }}>{r.email}</td>
                            <td style={{ padding: '12px 14px', color: '#334155', fontSize: '0.85rem' }}>{r.department || r.canonicalDepartmentCode || 'Assigned'}</td>
                            <td style={{ padding: '12px 14px' }}>
                              <span
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  background: badgeBg,
                                  color: badgeColor,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px'
                                }}
                              >
                                {badgeIcon}
                                <span>{badgeLabel}</span>
                              </span>
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              <span style={{ color: '#16A34A', fontWeight: 600, fontSize: '0.82rem' }}>✓ Ready</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: SCRIPT BUNDLES EXPLORER & TREE VIEW */}
      {/* ======================================================== */}
      {activeTab === 'bundles' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
            {bundles.length === 0 ? (
              <Card>
                <p style={{ color: '#64748B', textAlign: 'center', padding: '24px' }}>
                  No script bundles created yet. Use the "Upload Scripts" tab to create your first bundle.
                </p>
              </Card>
            ) : (
              bundles.map((bundle) => {
                const assignedCount = bundle.assignments?.length || 0;
                return (
                  <Card key={bundle.id} glow>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <span style={{ background: '#EFF6FF', color: '#2563EB', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700 }}>
                        {bundle.subject.subjectCode}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 500 }}>
                        {new Date(bundle.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', fontWeight: 700, color: '#0F172A' }}>
                      {bundle.bundleName}
                    </h3>
                    <p style={{ margin: '0 0 14px 0', fontSize: '0.88rem', color: '#475569', fontWeight: 500 }}>
                      {bundle.subject.subjectName} &bull; {bundle.department?.departmentName}
                    </p>

                    <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', fontSize: '0.82rem', color: '#334155', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                      <div>Regulation: <strong>{bundle.regulation?.name || 'MIC23'}</strong></div>
                      <div>Academic Year: <strong>{bundle.academicYear.year}</strong></div>
                      <div>Total Files: <strong>{bundle.totalFiles}</strong></div>
                      <div>Assigned Faculty: <strong>{assignedCount}</strong></div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Button
                        type="button"
                        variant="secondary"
                        style={{ flex: 1, fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                        onClick={async () => {
                          const detailed = await scriptService.getBundleDetails(bundle.id);
                          setInspectBundle(detailed);
                        }}
                      >
                        <IconFolderOpen size={15} color="#475569" />
                        <span>Browse Folder Tree</span>
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        style={{ fontSize: '0.85rem' }}
                        onClick={() => {
                          setAssignBundleId(bundle.id);
                          switchTab('assign');
                        }}
                      >
                        Allocate
                      </Button>
                    </div>
                  </Card>
                );
              })
            )}
          </div>

          {/* Modal / Card to inspect bundle folder hierarchy */}
          {inspectBundle && (
            <Card glow>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
                    Bundle Hierarchy: {inspectBundle.bundleName}
                  </h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748B' }}>
                    [{inspectBundle.subject.subjectCode}] {inspectBundle.subject.subjectName} &bull; {inspectBundle.totalFiles} files
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectBundle(null)}
                  style={{ background: 'none', border: 'none', padding: '4px', color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <IconX size={18} color="#64748B" />
                </button>
              </div>

              <FolderTreeViewer
                nodes={inspectBundle.fileTree || []}
                onFileSelect={handleFilePreview}
              />
            </Card>
          )}

          {/* View-Only Script Inspection Modal with Forward/Backward & Arrow Key Navigation */}
          {activeScriptFile && inspectBundle && (
            <ScriptViewerModal
              files={inspectBundle.fileTree || []}
              activeFile={activeScriptFile}
              onSelectFile={setActiveScriptFile}
              onClose={() => setActiveScriptFile(null)}
              bundleTitle={inspectBundle.bundleName}
            />
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 5: MASTER DATABASE MANAGER VIEW                      */}
      {/* ======================================================== */}
      {activeTab === 'database' && (
        <DatabaseManagerView />
      )}
    </div>
  );
}

export default function ObeDashboardPage() {
  return (
    <Suspense fallback={<div style={{ padding: '32px', color: '#64748B', fontWeight: 600 }}>Loading OBE In-charge Portal...</div>}>
      <ObeDashboardContent />
    </Suspense>
  );
}
