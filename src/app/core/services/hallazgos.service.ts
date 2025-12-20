import { Injectable, computed, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  Hallazgo,
  HallazgoEstado,
  HallazgoRiesgo
} from '../models/hallazgo.model';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { CauseNode } from '../models/cause-tree.model';

const API_BASE =
  (globalThis as { AF_API_URL?: string }).AF_API_URL ||
  (import.meta as { env?: Record<string, string> }).env?.['NG_APP_API_URL'] ||
  'https://www.api.thefutureagencyai.com' ||
  (typeof window !== 'undefined' ? window.location.origin : '');

export interface AnalyzeResponse {
  descripcion: string;
  riesgo: HallazgoRiesgo;
  mediaUrl: string | null;
  mediaType: string | null;
  mediaId: number | null;
  titulo?: string;
  causas?: string[];
  recomendaciones?: string[];
}

export interface CreateHallazgoPayload {
  titulo: string;
  riesgo: HallazgoRiesgo;
  sector?: string;
  descripcion_ai?: string;
  causas?: string[];
  reporter?: string;
  anonimo?: boolean;
  mediaId?: number | null;
  meta?: 'normal' | 'telefono' | 'arbol';
  root_json?: CauseNode;
  causeTreeId?: number | string | null;
}

export interface HallazgoListItemResponse {
  id: number;
  estado?: HallazgoEstado;
  riesgo: HallazgoRiesgo;
  titulo: string;
  reporter?: string | null;
  fecha?: string | null;
  sector?: string | null;
  descripcion_ai?: string | null;
  media_url?: string | null;
  media_type?: string | null;
  cause_tree_id?: number | string | null;
}

export interface HallazgoStatsResponse {
  openCount: number;
  closedLast7Days: number;
  avgCloseDays: number | null;
  newVsPrevWeek: number | null;
  riskLevel: HallazgoRiesgo | null;
}

@Injectable({ providedIn: 'root' })
export class HallazgosService {
  private readonly http = inject(HttpClient);

  // Datos locales para UI + carga desde backend
  private readonly hallazgosSignal = signal<Hallazgo[]>([]);
  private readonly statsSignal = signal<HallazgoStatsResponse | null>(null);

  readonly hallazgos = computed(() =>
    [...this.hallazgosSignal()].sort((a, b) => b.id - a.id)
  );

  readonly abiertosCount = computed(
    () => this.hallazgosSignal().filter((h) => h.estado === 'Abierto').length
  );

  readonly cerradosUltimos7Dias = computed(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 7
    );
    return this.hallazgosSignal().filter((hallazgo) => {
      const fecha = new Date(hallazgo.fecha);
      return hallazgo.estado === 'Cerrado' && fecha >= sevenDaysAgo;
    }).length;
  });

  readonly stats = computed(() => this.statsSignal());

  analyzeEvidence(formData: FormData): Observable<AnalyzeResponse> {
    return this.http
      .post<{ data: AnalyzeResponse }>(`${API_BASE}/api/hallazgos/analyze`, formData)
      .pipe(
        map((resp) => resp.data),
        catchError(() =>
          of({
            descripcion: 'No se pudo analizar la evidencia. Intenta nuevamente.',
            riesgo: 'Medio' as HallazgoRiesgo,
            mediaUrl: null,
            mediaType: null,
            mediaId: null
          })
        )
      );
  }

  loadHallazgos(limit = 50): Observable<Hallazgo[]> {
    return this.http
      .get<{ data: HallazgoListItemResponse[] }>(`${API_BASE}/api/hallazgos?limit=${limit}`)
      .pipe(
        map((resp) => (resp.data || []).map((row) => this.mapHallazgo(row))),
        tap((items) => this.hallazgosSignal.set(items)),
        catchError((err) => {
          console.error('[Hallazgos][UI] loadHallazgos error', err);
          return of(this.hallazgosSignal());
        })
      );
  }

  loadStats(): Observable<HallazgoStatsResponse | null> {
    return this.http.get<{ data: HallazgoStatsResponse }>(`${API_BASE}/api/hallazgos/stats`).pipe(
      map((resp) => resp.data),
      tap((data) => this.statsSignal.set(data)),
      catchError((err) => {
        console.error('[Hallazgos][UI] loadStats error', err);
        this.statsSignal.set(null);
        return of(null);
      })
    );
  }

  createHallazgo(payload: CreateHallazgoPayload): Observable<Hallazgo> {
    return this.http
      .post<{ data: any }>(`${API_BASE}/api/hallazgos`, payload)
      .pipe(
        map((resp) => {
          const h: Hallazgo = {
            id: resp.data?.id ?? Date.now(),
            estado: 'Abierto',
            riesgo: payload.riesgo,
            titulo: payload.titulo,
            reportero: payload.anonimo ? 'Anónimo' : payload.reporter || 'Anónimo',
            fecha: new Date().toISOString().split('T')[0],
            sector: payload.sector || '',
            descripcion_ai: payload.descripcion_ai ?? null,
            media_url: resp.data?.mediaUrl ?? null,
            media_type: resp.data?.mediaType ?? null,
            causeTreeId: resp.data?.causeTreeId ?? null
          };
          this.hallazgosSignal.update((current) => [...current, h]);
          return h;
        })
      );
  }

  private mapHallazgo(row: HallazgoListItemResponse): Hallazgo {
    return {
      id: Number(row.id),
      estado: (row.estado as HallazgoEstado) || 'Abierto',
      riesgo: row.riesgo,
      titulo: row.titulo,
      reportero: row.reporter || 'Anónimo',
      fecha: row.fecha || new Date().toISOString().split('T')[0],
      sector: row.sector || '',
      descripcion_ai: row.descripcion_ai ?? null,
      media_url: row.media_url ?? null,
      media_type: row.media_type ?? null,
      causeTreeId: row.cause_tree_id ?? null
    };
  }
}