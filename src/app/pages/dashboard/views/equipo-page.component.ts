import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';

interface TeamMember {
  name: string;
  role: string;
  avatar: string;
  badgeColor: string;
  status: 'Activo' | 'Ausente';
  compliance: number;
  location: string;
  lastSeen: string;
  alerts: string[];
  contact: string;
}

const TEAM_MEMBERS: TeamMember[] = [
  {
    name: 'José Pérez',
    role: 'Maestro Carpintero',
    avatar: 'JP',
    badgeColor: 'badge--blue',
    status: 'Activo',
    compliance: 100,
    location: 'Torre A · Piso 5',
    lastSeen: '09:30 · Hoy',
    alerts: [],
    contact: '+56 9 5555 0001'
  },
  {
    name: 'María González',
    role: 'Jornal',
    avatar: 'MG',
    badgeColor: 'badge--purple',
    status: 'Activo',
    compliance: 85,
    location: 'Bodega Central',
    lastSeen: '08:15 · Hoy',
    alerts: ['EPP casco por vencer'],
    contact: '+56 9 5555 0002'
  },
  {
    name: 'Carlos Ruiz',
    role: 'Eléctrico',
    avatar: 'CR',
    badgeColor: 'badge--yellow',
    status: 'Ausente',
    compliance: 60,
    location: 'Torre B · Piso 12',
    lastSeen: 'Ayer · 17:40',
    alerts: ['Curso altura vencido'],
    contact: '+56 9 5555 0003'
  },
  {
    name: 'Ana López',
    role: 'Capataz',
    avatar: 'AL',
    badgeColor: 'badge--green',
    status: 'Activo',
    compliance: 100,
    location: 'Perímetro Norte',
    lastSeen: '10:05 · Hoy',
    alerts: [],
    contact: '+56 9 5555 0004'
  },
  {
    name: 'Pedro Maza',
    role: 'Enfierrador',
    avatar: 'PM',
    badgeColor: 'badge--orange',
    status: 'Activo',
    compliance: 40,
    location: 'Torre C · Piso 3',
    lastSeen: '07:55 · Hoy',
    alerts: ['Sin inducción', 'Falta EPP guantes'],
    contact: '+56 9 5555 0005'
  },
  {
    name: 'Luisa Tapia',
    role: 'Aseo Industrial',
    avatar: 'LT',
    badgeColor: 'badge--pink',
    status: 'Activo',
    compliance: 100,
    location: 'Zona de Servicios',
    lastSeen: '09:10 · Hoy',
    alerts: [],
    contact: '+56 9 5555 0006'
  }
];

type FilterId = 'all' | 'active' | 'alerts' | 'lowCompliance';

@Component({
  selector: 'app-equipo-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './equipo-page.component.html',
  styleUrl: './equipo-page.component.scss'
})
export class EquipoPageComponent {
  protected readonly filters: { id: FilterId; label: string }[] = [
    { id: 'all', label: 'Todos' },
    { id: 'active', label: 'Activos' },
    { id: 'alerts', label: 'Con alertas' },
    { id: 'lowCompliance', label: 'Cumplimiento &lt; 80%' }
  ];

  private readonly members = signal<TeamMember[]>(TEAM_MEMBERS);
  protected readonly searchTerm = signal('');
  protected readonly selectedFilter = signal<FilterId>('all');

  protected readonly filteredMembers = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const filter = this.selectedFilter();

    return this.members().filter((member) => {
      const matchesTerm =
        term.length === 0 ||
        member.name.toLowerCase().includes(term) ||
        member.role.toLowerCase().includes(term) ||
        member.location.toLowerCase().includes(term);

      if (!matchesTerm) {
        return false;
      }

      switch (filter) {
        case 'active':
          return member.status === 'Activo';
        case 'alerts':
          return member.alerts.length > 0;
        case 'lowCompliance':
          return member.compliance < 80;
        default:
          return true;
      }
    });
  });

  protected selectFilter(filter: FilterId): void {
    this.selectedFilter.set(filter);
  }

  protected updateSearch(term: string): void {
    this.searchTerm.set(term.trim().toLowerCase());
  }

  protected complianceClass(value: number): string {
    if (value >= 90) {
      return 'progress--green';
    }
    if (value >= 70) {
      return 'progress--yellow';
    }
    return 'progress--red';
  }
}

