import { api } from './apiClient';
import { MetadataOptions, ScriptBundle, FacultyAssignedScript } from '../types/script';

export const scriptService = {
  /**
   * Retrieves filter metadata options
   */
  async getMetadata(): Promise<MetadataOptions> {
    const res = await api.fetch('/scripts/metadata');
    if (!res.ok) throw new Error('Failed to load script metadata');
    return res.json();
  },

  /**
   * Retrieves subjects filtered by department, regulation, semester
   */
  async getSubjects(filters?: {
    departmentId?: string;
    regulationId?: string;
    semesterLevel?: string;
  }): Promise<any[]> {
    const query = new URLSearchParams();
    if (filters?.departmentId) query.append('departmentId', filters.departmentId);
    if (filters?.regulationId) query.append('regulationId', filters.regulationId);
    if (filters?.semesterLevel) query.append('semesterLevel', filters.semesterLevel);

    const res = await api.fetch(`/scripts/subjects?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to load subjects');
    return res.json();
  },

  /**
   * Retrieves faculty linked to the specified subject
   */
  async getSubjectFaculty(subjectId: string): Promise<any[]> {
    const res = await api.fetch(`/scripts/subjects/${subjectId}/faculty`);
    if (!res.ok) throw new Error('Failed to load subject faculty');
    return res.json();
  },

  /**
   * Retrieves branch coordinators for a department
   */
  async getBranchCoordinators(departmentId?: string): Promise<any[]> {
    const query = new URLSearchParams();
    if (departmentId) query.append('departmentId', departmentId);
    const res = await api.fetch(`/scripts/branch-coordinators?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to load branch coordinators');
    return res.json();
  },

  /**
   * Retrieves branch bundles for the Branch Coordinator
   */
  async getBranchBundles(departmentId?: string): Promise<any[]> {
    const query = new URLSearchParams();
    if (departmentId) query.append('departmentId', departmentId);
    const res = await api.fetch(`/scripts/branch/my-bundles?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to load branch script bundles');
    return res.json();
  },

  /**
   * Branch Coordinator delegates bundle to Subject Coordinator
   */
  async assignToSubjectCoordinator(data: {
    bundleId: string;
    facultyId: string;
    visibleFrom: string;
    visibleUntil?: string;
    notes?: string;
  }): Promise<any> {
    const res = await api.fetch('/scripts/branch/assign-subject-coordinator', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to assign to Subject Coordinator');
    }
    return res.json();
  },

  /**
   * Uploads a script bundle with folder hierarchy preservation
   */
  async uploadBundle(formData: FormData): Promise<any> {
    const res = await api.fetch('/scripts/upload', {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const text = await res.text();
      let errMsg = 'Failed to upload script bundle';
      try {
        const parsed = JSON.parse(text);
        errMsg = parsed.error || parsed.message || errMsg;
      } catch {
        if (text && text.length < 200) errMsg = text;
      }
      throw new Error(errMsg);
    }
    return res.json();
  },

  /**
   * Lists script bundles
   */
  async getBundles(filters?: {
    subjectId?: string;
    departmentId?: string;
    academicYearId?: string;
  }): Promise<ScriptBundle[]> {
    const query = new URLSearchParams();
    if (filters?.subjectId) query.append('subjectId', filters.subjectId);
    if (filters?.departmentId) query.append('departmentId', filters.departmentId);
    if (filters?.academicYearId) query.append('academicYearId', filters.academicYearId);

    const res = await api.fetch(`/scripts/bundles?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to load script bundles');
    return res.json();
  },

  /**
   * Gets single bundle details with full folder tree
   */
  async getBundleDetails(bundleId: string): Promise<ScriptBundle> {
    const res = await api.fetch(`/scripts/bundles/${bundleId}`);
    if (!res.ok) throw new Error('Failed to load bundle details');
    return res.json();
  },

  /**
   * Assigns scripts to faculty with scheduled release timestamp
   */
  async assignBundle(data: {
    bundleId: string;
    facultyId: string;
    visibleFrom: string;
    visibleUntil?: string;
    notes?: string;
  }): Promise<any> {
    const res = await api.fetch('/scripts/assign', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to assign script bundle');
    }
    return res.json();
  },

  /**
   * Deassigns faculty from a script bundle
   */
  async deassignBundle(assignmentId: string): Promise<any> {
    const res = await api.fetch(`/scripts/deassign/${assignmentId}`, {
      method: 'POST'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to deassign faculty');
    }
    return res.json();
  },

  /**
   * Retrieves scripts assigned to logged-in faculty
   */
  async getFacultyScripts(): Promise<FacultyAssignedScript[]> {
    const res = await api.fetch('/scripts/faculty/my-scripts');
    if (!res.ok) throw new Error('Failed to load assigned scripts');
    return res.json();
  },

  /**
   * Gets streaming / view-only URL for a file
   */
  getFileViewUrl(fileId: string): string {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
    return `${baseUrl}/scripts/files/${fileId}/view`;
  },

  /**
   * Alias for backward compatibility (serves inline view-only stream)
   */
  getFileDownloadUrl(fileId: string): string {
    return this.getFileViewUrl(fileId);
  }
};
