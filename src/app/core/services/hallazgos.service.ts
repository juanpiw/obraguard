import { Injectable, computed, signal } from '@angular/core';
import {
  Hallazgo,
  HallazgoEstado,
  HallazgoRiesgo
} from '../models/hallazgo.model';

interface RiesgoSuggestion {
  riesgo: HallazgoRiesgo;
  justification: string;
}

const INITIAL_HALLAZGOS: Hallazgo[] = [
  {
    id: 1,
    estado: 'Abierto',
    riesgo: 'Alto',
    titulo: 'Andamio mal afianzado',
    reportero: 'Carolina Vega',
    fecha: '2025-11-05',
    sector: 'Torre A, Piso 5'
  },
  {
    id: 2,
    estado: 'Abierto',
    riesgo: 'Medio',
    titulo: 'Cable pelado en pasillo',
    reportero: 'José Pérez',
    fecha: '2025-11-05',
    sector: 'Sector B, Piso 2'
  },
  {
    id: 3,
    estado: 'Cerrado',
    riesgo: 'Bajo',
    titulo: 'Falta de orden en bodega',
    reportero: 'Carolina Vega',
    fecha: '2025-11-04',
    sector: 'Bodega Central'
  },
  {
    id: 4,
    estado: 'En Proceso',
    riesgo: 'Medio',
    titulo: 'Falta EPP (guantes) en cuadrilla',
    reportero: 'Anónimo',
    fecha: '2025-11-03',
    sector: 'Frente Poniente'
  }
];

@Injectable({ providedIn: 'root' })
export class HallazgosService {
  private readonly hallazgosSignal = signal<Hallazgo[]>(INITIAL_HALLAZGOS);

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

  addHallazgo(payload: {
    titulo: string;
    riesgo: HallazgoRiesgo;
    sector: string;
    reportero: string;
    estado?: HallazgoEstado;
  }): Hallazgo {
    const hallazgo: Hallazgo = {
      id: this.hallazgosSignal().length + 1,
      estado: payload.estado ?? 'Abierto',
      riesgo: payload.riesgo,
      titulo: payload.titulo,
      reportero: payload.reportero,
      fecha: new Date().toISOString().split('T')[0],
      sector: payload.sector
    };

    this.hallazgosSignal.update((current) => [...current, hallazgo]);
    return hallazgo;
  }

  analyzeRisk(text: string): RiesgoSuggestion {
    const normalized = text.toLowerCase();

    if (
      /andamio|ca[ií]da|arn[eé]s|altura|piso\s?(4|5)/.test(normalized) ||
      /cable|eléctrico|tablero|corriente/.test(normalized)
    ) {
      return {
        riesgo: 'Alto',
        justification:
          "Sugerencia: 'Alto'. Palabras clave detectadas relacionadas a altura o electricidad."
      };
    }

    if (/orden|aseo|despejado|basura/.test(normalized)) {
      return {
        riesgo: 'Bajo',
        justification:
          "Sugerencia: 'Bajo'. Se detectaron términos asociados a orden y limpieza."
      };
    }

    if (/epp|guantes|casco|maquinaria/.test(normalized)) {
      return {
        riesgo: 'Medio',
        justification:
          "Sugerencia: 'Medio'. Se detectaron términos asociados a EPP o maquinaria."
      };
    }

    return {
      riesgo: 'Medio',
      justification:
        "Sugerencia: 'Medio'. No se detectaron palabras clave de alto riesgo."
    };
  }
}





