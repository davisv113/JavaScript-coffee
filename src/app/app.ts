import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { CafeService } from './cafe.service';
import { CozinhaCanvas } from './cozinha/cozinha-canvas';

const CHAVE_TEMA = 'cafe-perfeito:tema';
const formatador = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function lerTema(): 'claro' | 'escuro' | null {
  try {
    const salvo = localStorage.getItem(CHAVE_TEMA);
    return salvo === 'claro' || salvo === 'escuro' ? salvo : null;
  } catch {
    return null;
  }
}

function suportaWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
  imports: [CozinhaCanvas],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly documento = inject(DOCUMENT);
  protected readonly cafe = inject(CafeService);
  protected readonly webgl = suportaWebGL();
  protected readonly aviso = signal('');

  constructor() {
    const salvo = lerTema();
    this.cafe.escuro.set(
      salvo ? salvo === 'escuro' : matchMedia('(prefers-color-scheme: dark)').matches,
    );

    effect(() => {
      const tema = this.cafe.escuro() ? 'dark' : 'light';
      this.documento.documentElement.dataset['theme'] = tema;
      this.documento
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', tema === 'dark' ? '#1a1310' : '#f6efe6');
    });
  }

  protected formatar(gramas: number): string {
    return formatador.format(gramas);
  }

  protected mudarAgua(valor: string) {
    const agua = Number(valor.replace(',', '.'));
    this.cafe.agua.set(Number.isFinite(agua) && agua > 0 ? agua : 0);
  }

  protected alternarTema() {
    const escuro = !this.cafe.escuro();
    this.cafe.escuro.set(escuro);
    try {
      localStorage.setItem(CHAVE_TEMA, escuro ? 'escuro' : 'claro');
    } catch {
      // Sem armazenamento (aba anônima etc.): o tema só não fica salvo
    }
  }

  protected async compartilhar() {
    const agua = this.cafe.agua();
    const url = location.href;
    const texto =
      agua > 0
        ? `☕ Pra ${this.formatar(agua)} ml de água: ${this.formatar(this.cafe.cafe())} g de pó e ${this.formatar(this.cafe.acucar())} g de açúcar.`
        : '☕ A fórmula do café perfeito do Guilherme.';

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Café Perfeito', text: texto, url });
      } catch {
        // Usuário cancelou o compartilhamento
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(`${texto}\n${url}`);
      this.mostrarAviso('Copiado! É só colar onde quiser.');
    } catch {
      this.mostrarAviso('Não consegui copiar :(');
    }
  }

  private mostrarAviso(mensagem: string) {
    this.aviso.set(mensagem);
    setTimeout(() => this.aviso.set(''), 2500);
  }
}
