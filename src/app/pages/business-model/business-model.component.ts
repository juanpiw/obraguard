import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

type TierFeature = { label: string; available: boolean };

@Component({
  selector: 'app-business-model',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './business-model.component.html',
  styleUrls: ['./business-model.component.scss']
})
export class BusinessModelComponent {
  private readonly defaultValues = {
    photos: 3000,
    audioMinutes: 1000,
    reports: 600
  };

  private readonly unitCosts = {
    visionToken: 0.049 / 1_000_000,
    tokensPerImage: 2_500,
    audioPerMinute: 0.04 / 60,
    textToken: 0.4 / 1_000_000,
    tokensPerReport: 1_000
  };

  readonly photoCount = signal(this.defaultValues.photos);
  readonly audioMinutes = signal(this.defaultValues.audioMinutes);
  readonly reportCount = signal(this.defaultValues.reports);

  readonly topNavLinks = [
    { label: 'Estrategia', href: '#strategy' },
    { label: 'Economía Unitaria', href: '#economics' },
    { label: 'Precios', href: '#pricing' },
    { label: 'Arquitectura', href: '#architecture' }
  ];

  readonly unitStrategyCards = [
    {
      title: 'SaaS por Usuario',
      subtitle: 'Ej: Autodesk, iAuditor',
      description:
        'Cobra por cada "asiento". Incentiva a las empresas a comprar pocas licencias solo para jefes.',
      icon: 'person_off',
      badge: 'Modelo tradicional',
      classes: 'bg-white border-slate-200 text-slate-900',
      iconClasses: 'bg-red-100 text-red-600',
      highlights: [
        { text: 'Excluye subcontratos', positive: false },
        { text: 'Cuentas compartidas (riesgo audit)', positive: false }
      ]
    },
    {
      title: 'Modelo "Caja Negra"',
      subtitle: 'Ej: Procore',
      description:
        'Cobro por Volumen de Construcción. Usuarios ilimitados, pero precios opacos y altísimos.',
      icon: 'domain',
      badge: 'Procore Style',
      classes: 'bg-white border-slate-200 text-slate-900',
      iconClasses: 'bg-blue-100 text-blue-600',
      highlights: [
        { text: 'Colaboración real', positive: true },
        { text: 'Impredecible para PYMEs', positive: false }
      ]
    },
    {
      title: 'Híbrido por Proyecto',
      subtitle: 'Vigía.AI',
      description:
        'Tarifa fija mensual por obra activa. Usuarios ilimitados + IA incluida con "Fair Use Policy".',
      icon: 'verified_user',
      badge: 'Recomendado',
      classes: 'bg-slate-900 border-orange-500/30 text-white',
      iconClasses: 'bg-orange-500 text-white',
      highlights: [
        { text: 'Previsibilidad (UF fija)', positive: true },
        { text: 'Viralidad (Subcontratos gratis)', positive: true },
        { text: 'IA Ilimitada percibida', positive: true }
      ]
    }
  ];

  readonly pricingTiers = [
    {
      name: 'Plan Esencial',
      subtitle: 'Digitalización básica',
      price: '3.5 UF',
      per: '/mes',
      hint: '≈ $130.000 CLP',
      buttonLabel: 'Para PYMEs',
      highlight: false,
      features: [
        { label: 'Usuarios ilimitados', available: true },
        { label: 'Gestión documental', available: true },
        { label: 'Dictado por voz (Whisper)', available: true },
        { label: 'Análisis de visión IA', available: false }
      ] satisfies TierFeature[]
    },
    {
      name: 'Plan Pro',
      subtitle: 'Inteligencia activa',
      price: '9.5 UF',
      per: '/mes',
      hint: '≈ $360.000 CLP',
      buttonLabel: 'Empezar ahora',
      highlight: true,
      features: [
        { label: 'Todo lo del Plan Esencial', available: true },
        { label: '3,000 análisis visión IA', available: true },
        { label: 'Reportes automáticos', available: true },
        { label: 'Soporte prioritario', available: true }
      ] satisfies TierFeature[]
    },
    {
      name: 'Enterprise',
      subtitle: 'Control total',
      price: 'Cotizar',
      per: '',
      hint: '≥ 25 UF por obra',
      buttonLabel: 'Contactar ventas',
      highlight: false,
      features: [
        { label: 'IA ilimitada (FUP extendido)', available: true },
        { label: 'Integraciones API / ERP', available: true },
        { label: 'Dashboard cross-obra', available: true },
        { label: 'Custom fine-tuning', available: true }
      ] satisfies TierFeature[]
    }
  ];

  readonly architectureSteps = [
    {
      title: 'App móvil',
      description: 'Captura y compresión en el borde (1024px)',
      emoji: '📱'
    },
    {
      title: 'Edge filter',
      description: 'Filtro local descarta fotos malas. Costo $0.',
      emoji: '⚖️'
    },
    {
      title: 'AI Gateway',
      description: 'Enrutamiento inteligente & caché semántico',
      emoji: '🧠',
      featured: true
    },
    {
      title: 'Inferencia',
      description: 'DeepInfra (visión) + Groq (audio)',
      emoji: '☁️'
    },
    {
      title: 'Reporte',
      description: 'Entrega inmediata al dashboard',
      emoji: '📊'
    }
  ];

  readonly architectureTiles = [
    {
      title: 'Visión Artificial (Llama 3.2)',
      description:
        'Detecta EPP faltantes y riesgos de caída. Optimizado para consumir solo ~2.5k tokens por imagen.',
      image:
        'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=600&q=80'
    },
    {
      title: 'Dictado a reporte (Whisper)',
      description:
        'Convierte 2 minutos de jerga chilena en un reporte formal estructurado en segundos.',
      image:
        'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=600&q=80'
    }
  ];

  readonly visionCost = computed(() =>
    this.photoCount() * this.unitCosts.tokensPerImage * this.unitCosts.visionToken
  );
  readonly audioCost = computed(() => this.audioMinutes() * this.unitCosts.audioPerMinute);
  readonly textCost = computed(() =>
    this.reportCount() * this.unitCosts.tokensPerReport * this.unitCosts.textToken
  );
  readonly totalCost = computed(() => this.visionCost() + this.audioCost() + this.textCost());

  onSliderInput(kind: 'photos' | 'audio' | 'reports', value: number): void {
    if (Number.isNaN(value)) {
      return;
    }

    switch (kind) {
      case 'photos':
        this.photoCount.set(Math.max(0, value));
        break;
      case 'audio':
        this.audioMinutes.set(Math.max(0, value));
        break;
      case 'reports':
        this.reportCount.set(Math.max(0, value));
        break;
    }
  }

  formatNumber(value: number): string {
    return value.toLocaleString('es-CL');
  }

  formatCurrency(value: number): string {
    return `$${value.toFixed(2)}`;
  }
}

