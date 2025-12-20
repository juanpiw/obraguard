export type CauseNodeType = 'Accidente' | 'Hecho' | 'Gestión' | 'Condición' | 'Acción';

export interface CauseNode {
  id: number | string;
  text: string;
  type: CauseNodeType;
  children: CauseNode[];
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
