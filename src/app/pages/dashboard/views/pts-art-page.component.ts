import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';

interface NavLink {
  id: string;
  label: string;
}

@Component({
  selector: 'app-pts-art-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pts-art-page.component.html',
  styleUrl: './pts-art-page.component.scss'
})
export class PtsArtPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);

  protected readonly mobileMenuOpen = signal(false);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly mode = signal<'pts' | 'art' | null>(null);
  protected readonly obraId = signal<string | number | null>(null);
  protected readonly file = signal<string | null>(null);
  protected readonly iperRows = signal<
    { fila: number; titulo: string; sector: string; peligro: string; riesgo: string; danio: string; prob: number | null; cons: number | null; control: string; responsable: string; plazo: string }[]
  >([]);

  protected readonly navLinks: NavLink[] = [
    { id: 'intro', label: 'Fundamentos' },
    { id: 'pts', label: 'El PTS' },
    { id: 'art', label: 'El ART / AST' },
    { id: 'legal', label: 'Marco Legal' },
    { id: 'comparativa', label: 'Comparativa' },
    { id: 'digital', label: 'Digitalización' },
    { id: 'conclusion', label: 'Conclusión' }
  ];

  protected readonly hasData = computed(() => this.iperRows().length > 0);

  protected ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const mode = (params.get('mode') as 'pts' | 'art') || null;
      const file = params.get('file');
      const obraId = params.get('obraId');
      this.mode.set(mode);
      this.file.set(file);
      this.obraId.set(obraId);
      if (file) {
        this.loadIper(file);
      }
    });
  }

  private loadIper(file: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.http.get<{ data: { file: string; rows: any[] } }>(`/api/iper/file/${encodeURIComponent(file)}`).subscribe({
      next: (resp) => {
        this.iperRows.set(resp?.data?.rows || []);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.error || 'No se pudo cargar el IPER.');
        this.loading.set(false);
      }
    });
  }

  protected toggleMobileMenu(): void {
    this.mobileMenuOpen.update((v) => !v);
  }

  protected closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }
}
