export type CauseNodeType = 'Accidente' | 'Hecho' | 'Gestión' | 'Condición' | 'Acción';
export type CauseChildrenLogic = 'AND' | 'OR';

export interface CauseNode {
  id: number | string;
  text: string;
  type: CauseNodeType;
  children: CauseNode[];
  /**
   * Relación lógica entre los hijos para explicar este hecho (Etapa 4).
   * - AND: se requirieron varios hechos simultáneamente (conjunción).
   * - OR: cualquiera de los hechos puede explicar/causar este hecho (disyunción).
   *
   * Nota: cadena (secuencial) se expresa naturalmente cuando hay 1 hijo.
   */
  childrenLogic?: CauseChildrenLogic;
  /**
   * Notas separadas del hecho (Etapas 2–3): interpretaciones/juicios que NO deben
   * quedar en `text` (solo hechos probados).
   */
  notes?: string | null;
  /**
   * Metadatos libres para trazabilidad (fuente, timestamps, etc.)
   */
  meta?: Record<string, any>;
}

export interface InvestigationSummary {
  id: number | string;
  title?: string;
  severity?: 'Leve' | 'Medio' | 'Grave';
  status?: string;
  location?: string;
}

export interface CreateCausePayload {
  text: string;
  type: CauseNodeType;
}

export interface UpdateCausePayload {
  text: string;
  type: CauseNodeType;
}



