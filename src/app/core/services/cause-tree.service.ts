import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { CauseNode } from '../models/cause-tree.model';

const ENV_API_URL = (import.meta as { env?: Record<string, string> }).env?.['NG_APP_API_URL'];
const isLocalhost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const LOCAL_FALLBACK = isLocalhost ? `http://${window.location.hostname}:4000` : null;
const API_BASE =
  (globalThis as { AF_API_URL?: string }).AF_API_URL ||
  ENV_API_URL ||
  LOCAL_FALLBACK ||
  'https://www.api.thefutureagencyai.com';

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

export interface CauseTreeReportResponse {
  id: number | string | null;
  causeTreeId: number | string;
  hallazgoId?: number | string | null;
  ficha: Record<string, any> | null;
  relato: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface UpsertReportPayload {
  hallazgoId?: number | string | null;
  ficha?: Record<string, any> | null;
  relato?: string | null;
}

export interface MeasureItem {
  id: number | string;
  causeTreeId: number | string;
  causeNodeId: string | null;
  causaRaiz: string | null;
  medidaCorrectiva: string;
  responsable: string | null;
  fechaCompromiso: string | null;
  estado: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateMeasurePayload {
  causeNodeId?: string | null;
  causaRaiz?: string | null;
  medidaCorrectiva: string;
  responsable?: string | null;
  fechaCompromiso?: string | null;
  estado?: string | null;
}

export type UpdateMeasurePayload = Partial<CreateMeasurePayload>;

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
  private log(op: string, meta?: Record<string, any>): void {
    // Consola ligera para depurar cuelgues de llamadas.
    // Evita loguear payloads enormes; solo metadatos.
    console.log(`[CauseTree][front] ${op}`, {
      ...(meta || {})
    });
  }

  getTree(id: number | string): Observable<CauseTreeResponse> {
    this.log('getTree -> start', { id });
    return this.http
      .get<{ data: CauseTreeResponse }>(`${API_BASE}/api/cause-trees/${id}`)
      .pipe(
        map((resp) => {
          this.log('getTree -> ok', { id });
          return resp.data;
        })
      );
  }

  getByHallazgo(hallazgoId: number | string): Observable<CauseTreeResponse> {
    this.log('getByHallazgo -> start', { hallazgoId });
    return this.http
      .get<{ data: CauseTreeResponse }>(`${API_BASE}/api/cause-trees/hallazgo/${hallazgoId}`)
      .pipe(
        map((resp) => {
          this.log('getByHallazgo -> ok', { hallazgoId });
          return resp.data;
        })
      );
  }

  createTree(payload: CreateTreePayload): Observable<CauseTreeResponse> {
    this.log('createTree -> start', {
      hallazgoId: payload?.hallazgoId ?? null,
      hasRoot: !!payload?.root
    });
    return this.http
      .post<{ data: CauseTreeResponse }>(`${API_BASE}/api/cause-trees`, payload)
      .pipe(
        map((resp) => {
          this.log('createTree -> ok', {
            hallazgoId: payload?.hallazgoId ?? null,
            id: resp?.data?.id
          });
          return resp.data;
        })
      );
  }

  updateTree(id: number | string, payload: UpdateTreePayload): Observable<CauseTreeResponse> {
    this.log('updateTree -> start', {
      id,
      hallazgoId: payload?.hallazgoId ?? null,
      hasRoot: !!payload?.root
    });
    return this.http
      .patch<{ data: CauseTreeResponse }>(`${API_BASE}/api/cause-trees/${id}`, payload)
      .pipe(
        map((resp) => {
          this.log('updateTree -> ok', { id });
          return resp.data;
        })
      );
  }

  listTrees(params?: { hallazgoId?: number | string; limit?: number }): Observable<CauseTreeListItem[]> {
    this.log('listTrees -> start', { hallazgoId: params?.hallazgoId ?? null, limit: params?.limit ?? null });
    const query = new URLSearchParams();
    if (params?.hallazgoId) query.set('hallazgoId', String(params.hallazgoId));
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    const url = qs ? `${API_BASE}/api/cause-trees?${qs}` : `${API_BASE}/api/cause-trees`;
    return this.http
      .get<{ data: CauseTreeListItem[] }>(url)
      .pipe(
        map((resp) => {
          this.log('listTrees -> ok', { count: resp?.data?.length ?? 0 });
          return resp.data;
        })
      );
  }

  upsertForHallazgo(
    hallazgoId: number | string,
    payload: UpsertHallazgoPayload
  ): Observable<CauseTreeResponse> {
    this.log('upsertForHallazgo -> start', {
      hallazgoId,
      mode: payload?.treeId ? 'update' : 'create',
      hasRoot: !!payload?.root
    });
    return this.http
      .post<{ data: CauseTreeResponse }>(
        `${API_BASE}/api/cause-trees/hallazgo/${hallazgoId}`,
        payload
      )
      .pipe(
        map((resp) => {
          this.log('upsertForHallazgo -> ok', { hallazgoId, id: resp?.data?.id });
          return resp.data;
        })
      );
  }

  generateAi(id: number | string, payload: GenerateAiPayload = {}): Observable<CauseTreeResponse> {
    this.log('generateAi -> start', { id, mode: payload?.mode ?? 'overwrite' });
    return this.http
      .post<{ data: CauseTreeResponse }>(`${API_BASE}/api/cause-trees/${id}/generate`, payload)
      .pipe(
        map((resp) => {
          this.log('generateAi -> ok', { id });
          return resp.data;
        })
      );
  }

  suggestNode(id: number | string, payload: SuggestNodePayload): Observable<SuggestNodeResponse> {
    this.log('suggestNode -> start', {
      id,
      parentTextLen: payload?.parentText ? payload.parentText.length : 0
    });
    return this.http
      .post<{ data: SuggestNodeResponse }>(`${API_BASE}/api/cause-trees/${id}/suggest-node`, payload)
      .pipe(
        map((resp) => {
          this.log('suggestNode -> ok', { id });
          return resp.data;
        })
      );
  }

  deleteTree(id: number | string): Observable<DeleteTreeResponse> {
    this.log('deleteTree -> start', { id });
    return this.http
      .delete<{ data: DeleteTreeResponse }>(`${API_BASE}/api/cause-trees/${id}`)
      .pipe(
        map((resp) => {
          this.log('deleteTree -> ok', { id });
          return resp.data;
        })
      );
  }

  getReport(id: number | string): Observable<CauseTreeReportResponse> {
    this.log('getReport -> start', { id });
    return this.http
      .get<{ data: CauseTreeReportResponse }>(`${API_BASE}/api/cause-trees/${id}/report`)
      .pipe(
        map((resp) => {
          this.log('getReport -> ok', { id });
          return resp.data;
        })
      );
  }

  upsertReport(id: number | string, payload: UpsertReportPayload): Observable<CauseTreeReportResponse> {
    this.log('upsertReport -> start', {
      id,
      hasFicha: !!payload?.ficha,
      hasRelato: !!payload?.relato
    });
    return this.http
      .put<{ data: CauseTreeReportResponse }>(`${API_BASE}/api/cause-trees/${id}/report`, payload)
      .pipe(
        map((resp) => {
          this.log('upsertReport -> ok', { id });
          return resp.data;
        })
      );
  }

  listMeasures(id: number | string): Observable<MeasureItem[]> {
    this.log('listMeasures -> start', { id });
    return this.http
      .get<{ data: MeasureItem[] }>(`${API_BASE}/api/cause-trees/${id}/measures`)
      .pipe(
        map((resp) => {
          this.log('listMeasures -> ok', { id, count: resp?.data?.length ?? 0 });
          return resp.data;
        })
      );
  }

  createMeasure(id: number | string, payload: CreateMeasurePayload): Observable<MeasureItem> {
    this.log('createMeasure -> start', { id, hasCausaRaiz: !!payload?.causaRaiz });
    return this.http
      .post<{ data: MeasureItem }>(`${API_BASE}/api/cause-trees/${id}/measures`, payload)
      .pipe(
        map((resp) => {
          this.log('createMeasure -> ok', { id, measureId: resp?.data?.id });
          return resp.data;
        })
      );
  }

  updateMeasure(id: number | string, measureId: number | string, payload: UpdateMeasurePayload): Observable<MeasureItem> {
    this.log('updateMeasure -> start', { id, measureId });
    return this.http
      .patch<{ data: MeasureItem }>(`${API_BASE}/api/cause-trees/${id}/measures/${measureId}`, payload)
      .pipe(
        map((resp) => {
          this.log('updateMeasure -> ok', { id, measureId });
          return resp.data;
        })
      );
  }

  deleteMeasure(id: number | string, measureId: number | string): Observable<{ id: number | string; deleted: boolean }> {
    this.log('deleteMeasure -> start', { id, measureId });
    return this.http
      .delete<{ data: { id: number | string; deleted: boolean } }>(
        `${API_BASE}/api/cause-trees/${id}/measures/${measureId}`
      )
      .pipe(
        map((resp) => {
          this.log('deleteMeasure -> ok', { id, measureId });
          return resp.data;
        })
      );
  }
}

