import { Component, Input } from '@angular/core';

/**
 * Décor commun à toutes les pages d'authentification :
 * photo plein écran + carte « verre dépoli » (le formulaire est projeté dans <ng-content>)
 * + petite carte de slogan en bas à gauche.
 */
@Component({
  selector: 'app-auth-layout',
  templateUrl: './auth-layout.component.html',
  styleUrl: './auth-layout.component.scss',
})
export class AuthLayoutComponent {
  @Input() captionTitle = 'Parce qu’un logement doit vous ressembler';
  @Input() captionText = 'Trouvez le logement et les colocataires qui vous correspondent.';
}
