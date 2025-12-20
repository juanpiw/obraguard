export type HallazgoEstado = 'Abierto' | 'En Proceso' | 'Cerrado';
export type HallazgoRiesgo = 'Alto' | 'Medio' | 'Bajo';

export interface Hallazgo {
  id: number;
  estado: HallazgoEstado;
  riesgo: HallazgoRiesgo;
  titulo: string;
  reportero: string;
  fecha: string;
  sector: string;
  descripcion_ai?: string | null;
  media_url?: string | null;
  media_type?: string | null;
  causeTreeId?: number | string | null;
  iper_file?: string | null;
  iper_url?: string | null;
}





