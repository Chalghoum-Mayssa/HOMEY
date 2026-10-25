import { Component, inject, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ROLE_LABELS } from '../../core/models/user';
import { AuthService } from '../../core/services/auth.service';

// 1. On crée une interface pour définir la structure d'un logement
export interface Property {
  title: string;
  location: string;
  price: string;
  image: string;
}

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  auth = inject(AuthService);
  roleLabels = ROLE_LABELS;

  // Le signal pour ouvrir/fermer le menu
  isMenuOpen = signal(false);

  toggleMenu() {
    this.isMenuOpen.update(v => !v);
  }

  avatarSrc = computed(() => this.auth.user()?.avatar ?? null);
  initials = computed(() => {
    const u = this.auth.user();
    return ((u?.first_name?.[0] ?? '') + (u?.last_name?.[0] ?? '')).toUpperCase() || '?';
  });

  // 2. On type le tableau avec l'interface et on ajoute des données
  featuredProperties: Property[] = [
    { 
      title: 'Villa Moderne', 
      location: 'Tunis', 
      price: '1 200 TND', 
      image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80' 
    },
    { 
      title: 'Appartement Cosy', 
      location: 'La Marsa', 
      price: '850 TND', 
      image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80' 
    },
    { 
      title: 'Studio Chic', 
      location: 'Lac 2', 
      price: '600 TND', 
      image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80' 
    }
  ];
}