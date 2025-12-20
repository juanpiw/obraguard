import { Injectable, computed, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  Hallazgo,
  HallazgoEstado,
  HallazgoRiesgo
} from '../models/hallazgo.model';
import { Observable, catchError, map, of, tap } from 'rxjs';
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

export interface AnalyzeResponse {
  descripcion: string;
  riesgo: HallazgoRiesgo;
  mediaUrl: string | null;
  mediaType: string | null;
  mediaId: number | null;
  titulo?: string;
  causas?: string[];
  recomendaciones?: string[];
  analisis_hecho?: {
    es_valido?: boolean;
    correccion_sugerida?: string | null;
    clasificacion_gema?: 'G' | 'E' | 'M' | 'A' | null;
    codigo_miper?: string | null;
    peligro?: string | null;
    riesgo?: string | null;
    danio?: string | null;
    alerta_genero?: string | null;
  };
  riesgo_calculo?: {
    prob?: number | null;
    cons?: number | null;
    vep?: number | null;
    nivel?: string | null;
  };
  controles?: { tipo?: string; descripcion?: string }[];
  causas_sugeridas?: { descripcion?: string; relacion_logica?: string; pregunta_validacion?: string }[];
  aiSuggestion?: {
    peligro: string | null;
    riesgo: string | null;
    danio: string | null;
    prob?: number | null;
    cons?: number | null;
    vep?: number | null;
    nivel?: string | null;
    clasificacion_gema?: 'G' | 'E' | 'M' | 'A' | null;
    codigo_miper?: string | null;
    alerta_genero?: string | null;
    controles?: string[];
    medidaControl?: string | null;
    causas_sugeridas?: { descripcion?: string; relacion_logica?: string; pregunta_validacion?: string }[];
    actividad?: string | null;
    puesto?: string | null;
    lugar?: string | null;
    trabajadores?: string | null;
    factor?: string | null;
    responsable?: string | null;
    plazo?: string | null;
  };
}

export interface HallazgoGetResponse {
  id: number | string;
  estado?: HallazgoEstado | string;
  riesgo: HallazgoRiesgo;
  titulo: string;
  obra_id?: number | string | null;
  reporter?: string | null;
  fecha?: string;
  sector?: string | null;
  descripcion_ai?: string | null;
  media_url?: string | null;
  media_type?: string | null;
  cause_tree_id?: number | string | null;
  iper_file?: string | null;
  iper_url?: string | null;
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
  meta?: 'normal' | 'telefono' | 'arbol' | 'matriz';
  root_json?: CauseNode;
  causeTreeId?: number | string | null;
  obraId?: number | string | null;
  autoApply?: boolean;
  file?: File | null;
}

export interface HallazgoListItemResponse {
  id: number;
  estado?: HallazgoEstado;
  riesgo: HallazgoRiesgo;
  titulo: string;
  obra_id?: number | string | null;
  reporter?: string | null;
  fecha?: string | null;
  sector?: string | null;
  descripcion_ai?: string | null;
  media_url?: string | null;
  media_type?: string | null;
  cause_tree_id?: number | string | null;
  iper_file?: string | null;
  iper_url?: string | null;
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

  getHallazgoById(id: number | string): Observable<HallazgoGetResponse> {
    return this.http
      .get<{ data: HallazgoGetResponse }>(`${API_BASE}/api/hallazgos/${id}`)
      .pipe(map((resp) => resp.data));
  }

  notifyHallazgoSms(id: number | string, to?: string): Observable<{ hallazgoId: number | string; to: string; sid: string; status: string }> {
    return this.http
      .post<{ data: any }>(`${API_BASE}/api/hallazgos/${id}/notify-sms`, { to: to ?? undefined })
      .pipe(map((resp) => resp.data));
  }

  createHallazgo(payload: CreateHallazgoPayload): Observable<Hallazgo> {
    const form = new FormData();
    form.append('titulo', payload.titulo);
    form.append('riesgo', payload.riesgo);
    if (payload.sector) form.append('sector', payload.sector);
    if (payload.descripcion_ai) form.append('descripcion_ai', payload.descripcion_ai);
    if (payload.reporter) form.append('reporter', payload.reporter);
    if (payload.anonimo) form.append('anonimo', String(payload.anonimo));
    if (payload.mediaId) form.append('mediaId', String(payload.mediaId));
    if (payload.meta) form.append('meta', payload.meta);
    if (payload.root_json) form.append('root_json', JSON.stringify(payload.root_json));
    if (payload.causeTreeId) form.append('causeTreeId', String(payload.causeTreeId));
    if (payload.causas && payload.causas.length) {
      form.append('causas', JSON.stringify(payload.causas));
    }
    if (payload.obraId) form.append('obraId', String(payload.obraId));
    if (payload.autoApply) form.append('autoApply', 'true');
    if (payload.file) form.append('file', payload.file);

    return this.http.post<{ data: any }>(`${API_BASE}/api/hallazgos`, form).pipe(
      map((resp) => {
        const iperFile = resp.data?.iper?.fileName ?? resp.data?.iper?.iperFile ?? resp.data?.iperFile ?? null;
        const iperUrl = resp.data?.iper_url || (iperFile ? `${API_BASE}/exports/${iperFile}` : null);
        const h: Hallazgo = {
          id: resp.data?.id ?? Date.now(),
          estado: (resp.data?.estado as HallazgoEstado) || 'Abierto',
          riesgo: payload.riesgo,
          titulo: payload.titulo,
          obraId: (resp.data?.obraId as any) ?? payload.obraId ?? null,
          reportero: payload.anonimo ? 'Anónimo' : payload.reporter || 'Anónimo',
          fecha: new Date().toISOString().split('T')[0],
          sector: payload.sector || '',
          descripcion_ai: payload.descripcion_ai ?? null,
          media_url: resp.data?.mediaUrl ?? null,
          media_type: resp.data?.mediaType ?? null,
          causeTreeId: resp.data?.causeTreeId ?? null,
          iper_file: iperFile,
          iper_url: iperUrl
        };
        this.hallazgosSignal.update((current) => [...current, h]);
        return h;
      })
    );
  }

  confirmHallazgo(id: number | string, body: any): Observable<any> {
    return this.http
      .post<{ data: any }>(`${API_BASE}/api/hallazgos/${id}/confirm`, body)
      .pipe(map((resp) => resp.data));
  }

  exportIper(obraId: number | string): Observable<{ iperFile: string; iperUrl?: string | null; rows: number }> {
    return this.http
      .get<{ data: { iperFile: string; iperUrl?: string | null; rows: number } }>(`${API_BASE}/api/iper/${obraId}/export`)
      .pipe(
        map((resp) => {
          const data = resp.data;
          return {
            ...data,
            iperUrl: data?.iperUrl || (data?.iperFile ? `${API_BASE}/exports/${data.iperFile}` : null)
          };
        })
      );
  }

  private mapHallazgo(row: HallazgoListItemResponse): Hallazgo {
    const iperFile = row.iper_file || null;
    return {
      id: Number(row.id),
      estado: (row.estado as HallazgoEstado) || 'Abierto',
      riesgo: row.riesgo,
      titulo: row.titulo,
      obraId: (row as any).obra_id ?? (row as any).obraId ?? null,
      reportero: row.reporter || 'Anónimo',
      fecha: row.fecha || new Date().toISOString().split('T')[0],
      sector: row.sector || '',
      descripcion_ai: row.descripcion_ai ?? null,
      media_url: row.media_url ?? null,
      media_type: row.media_type ?? null,
      causeTreeId: row.cause_tree_id ?? null,
      iper_file: iperFile,
      iper_url: (row as any).iper_url || (iperFile ? `${API_BASE}/exports/${iperFile}` : null)
    };
  }
}