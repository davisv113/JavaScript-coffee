import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgtCanvas } from 'angular-three/dom';
import { Cozinha } from './cozinha';

/** Canvas WebGL da cena. Carregado via @defer para não atrasar o formulário. */
@Component({
  selector: 'app-cozinha-canvas',
  template: `
    <ngt-canvas
      [shadows]="true"
      [dpr]="[1, 1.75]"
      [camera]="{ position: [0.8, 3.4, 6.2], fov: 40 }"
      [gl]="{ antialias: true, alpha: true, powerPreference: 'low-power' }"
    >
      <app-cozinha *canvasContent />
    </ngt-canvas>
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
  `,
  imports: [NgtCanvas, Cozinha],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CozinhaCanvas {}
