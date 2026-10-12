import { Injectable, computed, signal } from '@angular/core';

/** Pó de café: 10% da água. */
const CAFE_POR_ML = 0.1;
/** Açúcar: 8% da água. */
const ACUCAR_POR_ML = 0.08;

/** Capacidade da garrafa na cena 3D, usada só para a animação de nível. */
export const CAPACIDADE_GARRAFA_ML = 1500;

export function calcularCafe(agua: number): number {
  return agua > 0 ? agua * CAFE_POR_ML : 0;
}

export function calcularAcucar(agua: number): number {
  return agua > 0 ? agua * ACUCAR_POR_ML : 0;
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
