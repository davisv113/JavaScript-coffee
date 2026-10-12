import { Injectable, computed, signal } from '@angular/core';

/** Gramas de pó de café por ml de água (fórmula original do Guilherme). */
const CAFE_POR_ML = 0.0973;
/** Gramas de açúcar por ml de água. */
const ACUCAR_POR_ML = 0.125;
/** Ajuste da fórmula v2: sempre 15 g a menos de açúcar no resultado. */
const AJUSTE_ACUCAR = 15;

/** Capacidade da garrafa na cena 3D, usada só para a animação de nível. */
export const CAPACIDADE_GARRAFA_ML = 1500;

export function calcularCafe(agua: number): number {
  return agua > 0 ? agua * CAFE_POR_ML : 0;
}

export function calcularAcucar(agua: number): number {
  return agua > 0 ? Math.max(0, agua * ACUCAR_POR_ML - AJUSTE_ACUCAR) : 0;
}

@Injectable({ providedIn: 'root' })
export class CafeService {
  readonly agua = signal(0);
  readonly cafe = computed(() => calcularCafe(this.agua()));
  readonly acucar = computed(() => calcularAcucar(this.agua()));

  /** 0..1 — quanto da garrafa está cheia, para a cena 3D. */
  readonly nivel = computed(() => Math.min(this.agua() / CAPACIDADE_GARRAFA_ML, 1));
  readonly escuro = signal(false);
}
