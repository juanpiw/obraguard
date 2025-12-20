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
