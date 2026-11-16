import { api } from './apiClient';

export interface FieldDefinition {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'boolean' | 'password';
  optionsKey?: string;
  required?: boolean;
  editable?: boolean;
  creatable?: boolean;
  showInTable?: boolean;
}

export interface EntityDefinition {
  key: string;
  label: string;
  singularLabel: string;
  description: string;
  icon: string;
  fields: FieldDefinition[];
  searchableColumns: string[];
}

export interface LookupOption {
  value: string;
  label: string;
  [key: string]: any;
}

export interface MetadataResponse {
  entities: EntityDefinition[];
  lookups: Record<string, LookupOption[]>;
}

export interface RecordsResponse {
  entity: string;
  data: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const obeDatabaseService = {
  async getMetadata(): Promise<MetadataResponse> {
    const res = await api.get('/obe/database/metadata');
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch database metadata');
    }
    return res.json();
  },

  async getRecords(
    entity: string,
    params: {
      page?: number;
      limit?: number;
      search?: string;
      filterKey?: string;
      filterValue?: string;
    } = {}
  ): Promise<RecordsResponse> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.search) query.set('search', params.search);
    if (params.filterKey && params.filterValue) {
      query.set('filterKey', params.filterKey);
      query.set('filterValue', params.filterValue);
    }
    const res = await api.get(`/obe/database/${entity}?${query.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch entity records');
    }
    return res.json();
  },

  async createRecord(entity: string, data: any): Promise<any> {
    const res = await api.post(`/obe/database/${entity}`, data);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create record');
    }
    return res.json();
  },

  async updateRecord(entity: string, id: string, data: any): Promise<any> {
    const res = await api.put(`/obe/database/${entity}/${id}`, data);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update record');
    }
    return res.json();
  },

  async deleteRecord(entity: string, id: string, force = false): Promise<any> {
    const res = await api.delete(`/obe/database/${entity}/${id}${force ? '?force=true' : ''}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete record');
    }
    return res.json();
  },

  async seedMasterData(): Promise<any> {
    const res = await api.post('/obe/database/seed/master', {});
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to seed master database');
    }
    return res.json();
  }
};
