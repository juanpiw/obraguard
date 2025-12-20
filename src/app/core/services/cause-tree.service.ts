import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { CauseNode } from '../models/cause-tree.model';

const API_BASE =
  'https://www.api.thefutureagencyai.com' ||
  (globalThis as { AF_API_URL?: string }).AF_API_URL ||
  (import.meta as { env?: Record<string, string> }).env?.['NG_APP_API_URL'] ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000');

export interface CauseTreeResponse {
  id: number | string;
  hallazgoId?: number | string | null;
  root: CauseNode;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpsertHallazgoPayload {
  root: CauseNode;
  treeId?: number | string | null;
  meta?: Record<string, any>;
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
}
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import {
  CauseNode,
  CauseNodeType,
  CreateCausePayload,
  UpdateCausePayload
} from '../models/cause-tree.model';

const API_BASE =
  (globalThis as { AF_API_URL?: string }).AF_API_URL ||
  (import.meta as { env?: Record<string, string> }).env?.['NG_APP_API_URL'] ||
  'http://localhost:4000';

interface TreeResponse {
  data?: { tree?: CauseNode } | CauseNode;
  tree?: CauseNode;
}

@Injectable({ providedIn: 'root' })
export class CauseTreeService {
  private readonly http = inject(HttpClient);

  getTree(investigationId: number | string): Observable<CauseNode> {
    return this.http
      .get<TreeResponse>(`${API_BASE}/api/investigations/${investigationId}/cause-tree`)
      .pipe(map((resp) => this.unwrapTree(resp)));
  }

  addNode(
    investigationId: number | string,
    parentId: number | string,
    payload: CreateCausePayload
  ): Observable<CauseNode> {
    return this.http
      .post<TreeResponse>(
        `${API_BASE}/api/investigations/${investigationId}/cause-tree/nodes`,
        { parentId, ...payload }
      )
      .pipe(map((resp) => this.unwrapTree(resp)));
  }

  updateNode(
    investigationId: number | string,
    nodeId: number | string,
    payload: UpdateCausePayload
  ): Observable<CauseNode> {
    return this.http
      .patch<TreeResponse>(
        `${API_BASE}/api/investigations/${investigationId}/cause-tree/nodes/${nodeId}`,
        payload
      )
      .pipe(map((resp) => this.unwrapTree(resp)));
  }

  resetTree(investigationId: number | string): Observable<CauseNode> {
    return this.http
      .post<TreeResponse>(
        `${API_BASE}/api/investigations/${investigationId}/cause-tree/reset`,
        {}
      )
      .pipe(map((resp) => this.unwrapTree(resp)));
  }

  generateAiTree(investigationId: number | string): Observable<CauseNode> {
    return this.http
      .post<TreeResponse>(
        `${API_BASE}/api/investigations/${investigationId}/cause-tree/generate-ai`,
        {}
      )
      .pipe(map((resp) => this.unwrapTree(resp)));
  }

  private unwrapTree(resp: TreeResponse): CauseNode {
    return (
      resp.tree ||
      (resp.data as { tree?: CauseNode })?.tree ||
      (resp.data as CauseNode) ||
      {
        id: 0,
        text: 'Sin datos',
        type: 'Accidente' as CauseNodeType,
        children: []
      }
    );
  }
}
