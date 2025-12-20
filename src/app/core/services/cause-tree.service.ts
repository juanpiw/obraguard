import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { CauseNode } from '../models/cause-tree.model';

const API_BASE =
  (globalThis as { AF_API_URL?: string }).AF_API_URL ||
  (import.meta as { env?: Record<string, string> }).env?.['NG_APP_API_URL'] ||
  'https://www.api.thefutureagencyai.com' ||
  (typeof window !== 'undefined' ? window.location.origin : '');

export interface CauseTreeResponse {
  id: number | string;
  hallazgoId?: number | string | null;
  root: CauseNode;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateTreePayload {
  hallazgoId?: number | string | null;
  root: CauseNode;
  meta?: Record<string, any>;
}

export interface UpsertHallazgoPayload {
  root: CauseNode;
  treeId?: number | string | null;
  meta?: Record<string, any>;
}

export interface GenerateAiPayload {
  mode?: 'overwrite' | 'merge';
}

export interface SuggestNodePayload {
  parentText: string;
  parentType: string;
  currentDraft?: { text?: string; type?: string; notes?: string | null } | null;
}

export interface SuggestNodeResponse {
  text: string;
  type: string;
  notes: string | null;
}

export interface DeleteTreeResponse {
  id: number | string;
  deleted: boolean;
}

export interface CreateTreePayload {
  hallazgoId?: number | string | null;
  root: CauseNode;
}

export interface CauseTreeListItem {
  id: number | string;
  hallazgoId?: number | string | null;
  root: CauseNode;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class CauseTreeService {
  private readonly http = inject(HttpClient);

  getTree(id: number | string): Observable<CauseTreeResponse> {
    return this.http
      .get<{ data: CauseTreeResponse }>(`${API_BASE}/api/cause-trees/${id}`)
      .pipe(map((resp) => resp.data));
  }

  getByHallazgo(hallazgoId: number | string): Observable<CauseTreeResponse> {
    return this.http
      .get<{ data: CauseTreeResponse }>(`${API_BASE}/api/cause-trees/hallazgo/${hallazgoId}`)
      .pipe(map((resp) => resp.data));
  }

  createTree(payload: CreateTreePayload): Observable<CauseTreeResponse> {
    return this.http
      .post<{ data: CauseTreeResponse }>(`${API_BASE}/api/cause-trees`, payload)
      .pipe(map((resp) => resp.data));
  }

  updateTree(id: number | string, payload: UpdateTreePayload): Observable<CauseTreeResponse> {
    return this.http
      .patch<{ data: CauseTreeResponse }>(`${API_BASE}/api/cause-trees/${id}`, payload)
      .pipe(map((resp) => resp.data));
  }

  listTrees(params?: { hallazgoId?: number | string; limit?: number }): Observable<CauseTreeListItem[]> {
    const query = new URLSearchParams();
    if (params?.hallazgoId) query.set('hallazgoId', String(params.hallazgoId));
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    const url = qs ? `${API_BASE}/api/cause-trees?${qs}` : `${API_BASE}/api/cause-trees`;
    return this.http
      .get<{ data: CauseTreeListItem[] }>(url)
      .pipe(map((resp) => resp.data));
  }

  upsertForHallazgo(
    hallazgoId: number | string,
    payload: UpsertHallazgoPayload
  ): Observable<CauseTreeResponse> {
    return this.http
      .post<{ data: CauseTreeResponse }>(
        `${API_BASE}/api/cause-trees/hallazgo/${hallazgoId}`,
        payload
      )
      .pipe(map((resp) => resp.data));
  }

  generateAi(id: number | string, payload: GenerateAiPayload = {}): Observable<CauseTreeResponse> {
    return this.http
      .post<{ data: CauseTreeResponse }>(`${API_BASE}/api/cause-trees/${id}/generate`, payload)
      .pipe(map((resp) => resp.data));
  }

  suggestNode(id: number | string, payload: SuggestNodePayload): Observable<SuggestNodeResponse> {
    return this.http
      .post<{ data: SuggestNodeResponse }>(`${API_BASE}/api/cause-trees/${id}/suggest-node`, payload)
      .pipe(map((resp) => resp.data));
  }

  deleteTree(id: number | string): Observable<DeleteTreeResponse> {
    return this.http
      .delete<{ data: DeleteTreeResponse }>(`${API_BASE}/api/cause-trees/${id}`)
      .pipe(map((resp) => resp.data));
  }
}
