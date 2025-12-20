import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';

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
  protected readonly mobileMenuOpen = signal(false);

  protected readonly navLinks: NavLink[] = [
    { id: 'intro', label: 'Fundamentos' },
    { id: 'pts', label: 'El PTS' },
    { id: 'art', label: 'El ART / AST' },
    { id: 'legal', label: 'Marco Legal' },
    { id: 'comparativa', label: 'Comparativa' },
    { id: 'digital', label: 'Digitalización' },
    { id: 'conclusion', label: 'Conclusión' }
  ];

  protected toggleMobileMenu(): void {
    this.mobileMenuOpen.update((v) => !v);
  }

  protected closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }
}
