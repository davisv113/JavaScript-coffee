import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  viewChild,
  viewChildren,
} from '@angular/core';
import { NgtArgs, beforeRender, extend, injectStore } from 'angular-three';
import {
  AmbientLight,
  BoxGeometry,
  CanvasTexture,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  RepeatWrapping,
  SRGBColorSpace,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CafeService, calcularAcucar, calcularCafe, CAPACIDADE_GARRAFA_ML } from '../cafe.service';

extend({
  AmbientLight,
  BoxGeometry,
  CylinderGeometry,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  SphereGeometry,
  TorusGeometry,
});

// Medidas da garrafa (unidades da cena)
const GARRAFA_BASE = 0.12;
const GARRAFA_ALTURA_LIQUIDO = 1.3;
const COADOR_SAIDA = 1.62;

const PO_MAX = calcularCafe(CAPACIDADE_GARRAFA_ML);
const ACUCAR_MAX = calcularAcucar(CAPACIDADE_GARRAFA_ML);

const ALVO_CAMERA = new Vector3(-0.3, 1.25, 0);

/** Aproxima `atual` de `alvo` de forma suave, independente do FPS. */
function suavizar(atual: number, alvo: number, delta: number, velocidade = 4) {
  return atual + (alvo - atual) * (1 - Math.exp(-delta * velocidade));
}

function criarAzulejo(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#c9c2b6';
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = '#f4f1ea';
  // Azulejo "metrô": duas fileiras com deslocamento
  for (const [x, y, w] of [
    [2, 2, 124],
    [-62, 66, 124],
    [66, 66, 124],
  ]) {
    ctx.fillRect(x, y, w, 60);
  }
  const textura = new CanvasTexture(canvas);
  textura.wrapS = textura.wrapT = RepeatWrapping;
  textura.repeat.set(9, 7);
  textura.colorSpace = SRGBColorSpace;
  return textura;
}

@Component({
  selector: 'app-cozinha',
  templateUrl: './cozinha.html',
  imports: [NgtArgs],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Cozinha {
  private readonly cafe = inject(CafeService);
  private readonly store = injectStore();

  protected readonly DoubleSide = DoubleSide;
  protected readonly PI = Math.PI;
  protected readonly azulejo = criarAzulejo();
  protected readonly vapores = [0, 1, 2, 3, 4, 5, 6];
  protected readonly gotas = [0, 1, 2];

  protected readonly escuro = this.cafe.escuro;
  protected readonly ceu = computed(() => (this.escuro() ? '#1d2747' : '#bfe3f5'));
  protected readonly luzSol = computed(() => (this.escuro() ? 0.35 : 2.4));
  protected readonly luzAmbiente = computed(() => (this.escuro() ? 0.35 : 0.9));
  protected readonly luzLampada = computed(() => (this.escuro() ? 6 : 0));

  private readonly liquido = viewChild.required<ElementRef<Group>>('liquido');
  private readonly po = viewChild.required<ElementRef<Group>>('po');
  private readonly acucar = viewChild.required<ElementRef<Mesh>>('acucar');
  private readonly sol = viewChild.required<ElementRef<DirectionalLight>>('sol');
  private readonly gotasRef = viewChildren<ElementRef<Mesh>>('gota');
  private readonly vaporesRef = viewChildren<ElementRef<Mesh<SphereGeometry, MeshStandardMaterial>>>('vapor');

  // Valores animados (perseguem os valores reais da fórmula)
  private nivel = 0;
  private quantidadePo = 0;
  private quantidadeAcucar = 0;
  private passando = 0;
  private tempo = 0;

  constructor() {
    effect(() => {
      const sol = this.sol().nativeElement;
      sol.shadow.mapSize.set(1024, 1024);
      sol.shadow.camera.left = sol.shadow.camera.bottom = -4;
      sol.shadow.camera.right = sol.shadow.camera.top = 4;
      sol.shadow.bias = -0.0005;
    });

    this.criarControles();

    beforeRender(({ delta }) => {
      const d = Math.min(delta, 0.1);
      this.tempo += d;
      const agua = this.cafe.agua();

      this.nivel = suavizar(this.nivel, this.cafe.nivel(), d, 2.5);
      this.quantidadePo = suavizar(this.quantidadePo, Math.min(this.cafe.cafe() / PO_MAX, 1), d);
      this.quantidadeAcucar = suavizar(
        this.quantidadeAcucar,
        Math.min(this.cafe.acucar() / ACUCAR_MAX, 1),
        d,
      );
      this.passando = suavizar(this.passando, agua > 0 ? 1 : 0, d, 3);

      // Café na garrafa
      this.liquido().nativeElement.scale.y = Math.max(this.nivel, 0.0001);
      this.liquido().nativeElement.visible = this.nivel > 0.002;

      // Montinho de pó no filtro
      const po = this.po().nativeElement;
      po.scale.setScalar(0.62 + 0.36 * this.quantidadePo);
      po.visible = this.quantidadePo > 0.01;

      // Montinho de açúcar
      const acucar = this.acucar().nativeElement;
      const a = 0.4 + 0.6 * this.quantidadeAcucar;
      acucar.scale.set(a, 0.15 + 0.6 * this.quantidadeAcucar, a);
      acucar.position.y = 0.32 + 0.08 * this.quantidadeAcucar;
      acucar.visible = this.quantidadeAcucar > 0.01;

      // Gotas pingando do coador até a superfície do café
      const superficie = GARRAFA_BASE + GARRAFA_ALTURA_LIQUIDO * this.nivel;
      this.gotasRef().forEach((ref, i) => {
        const gota = ref.nativeElement;
        const t = (this.tempo * 1.4 + i / this.gotasRef().length) % 1;
        gota.position.y = COADOR_SAIDA - (COADOR_SAIDA - superficie) * t * t;
        gota.visible = this.passando > 0.5;
      });

      // Fumacinha subindo do filtro
      this.vaporesRef().forEach((ref, i) => {
        const vapor = ref.nativeElement;
        const t = (this.tempo * 0.22 + i / this.vaporesRef().length) % 1;
        vapor.position.set(
          -0.4 + Math.sin(this.tempo * 1.3 + i * 2.1) * 0.25 * t,
          2.15 + t * 1.5,
          0.15 + Math.cos(this.tempo * 1.1 + i) * 0.2 * t,
        );
        vapor.scale.setScalar(0.1 + t * 0.3);
        vapor.material.opacity = Math.sin(t * Math.PI) * 0.22 * this.passando;
        vapor.visible = this.passando > 0.01;
      });
    });
  }

  private criarControles() {
    let controles: OrbitControls | undefined;
    let sentido = 1;

    effect((onCleanup) => {
      const camera = this.store.camera();
      const gl = this.store.gl();
      if (!camera || !gl) return;

      const c = new OrbitControls(camera, gl.domElement);
      c.target.copy(ALVO_CAMERA);
      c.enablePan = false;
      c.enableZoom = false;
      c.enableDamping = true;
      c.minAzimuthAngle = -0.75;
      c.maxAzimuthAngle = 0.75;
      c.minPolarAngle = 0.8;
      c.maxPolarAngle = 1.3;
      c.autoRotate = true;
      c.autoRotateSpeed = 0.35;
      c.update();
      controles = c;
      onCleanup(() => c.dispose());
    });

    // Afasta a câmera em telas estreitas (celular em pé) para caber a cena
    effect(() => {
      const { width, height } = this.store.size();
      const camera = this.store.camera();
      if (!width || !height || !camera) return;
      const aspecto = width / height;
      const distancia = 6.8 / Math.min(1, Math.pow(aspecto / 1.2, 0.85));
      const direcao = camera.position.clone().sub(ALVO_CAMERA).setLength(Math.min(distancia, 10));
      camera.position.copy(ALVO_CAMERA).add(direcao);
    });

    beforeRender(() => {
      if (!controles) return;
      // Vai e volta devagar entre os limites de rotação
      const angulo = controles.getAzimuthalAngle();
      if (angulo >= controles.maxAzimuthAngle - 0.01) sentido = -1;
      if (angulo <= controles.minAzimuthAngle + 0.01) sentido = 1;
      controles.autoRotateSpeed = 0.35 * sentido;
      controles.update();
    });

    inject(DestroyRef).onDestroy(() => this.azulejo.dispose());
  }
}
