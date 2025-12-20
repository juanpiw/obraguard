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
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000');

export interface AnalyzeResponse {
  descripcion: string;
  riesgo: HallazgoRiesgo;
  mediaUrl: string | null;
  mediaType: string | null;
  mediaId: number | null;
  causas?: string[];
  recomendaciones?: string[];
}

export interface CreateHallazgoPayload {
  titulo: string;
  riesgo: HallazgoRiesgo;
  sector?: string;
  descripcion_ai?: string;
  causas?: string[];
  reportero?: string;
  anonimo?: boolean;
  mediaId?: number | null;
  meta?: 'normal' | 'telefono' | 'arbol';
  root_json?: CauseNode;
  causeTreeId?: number | string | null;
}

@Injectable({ providedIn: 'root' })
export class HallazgosService {
  private readonly http = inject(HttpClient);

  // Datos locales para UI mientras no hay endpoint GET
  private readonly hallazgosSignal = signal<Hallazgo[]>([]);

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
            reportero: payload.anonimo ? 'Anónimo' : payload.reportero || 'Anónimo',
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
}