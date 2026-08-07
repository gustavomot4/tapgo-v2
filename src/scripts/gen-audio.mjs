/**
 * M7 — gera os três efeitos de áudio do jogo, do zero.
 *
 * Existe para que a linha de procedência de [[licenciamento]] seja **verificável**, e não uma
 * afirmação: nenhum sample de terceiro entra aqui, nenhuma amostra é baixada, e cada arquivo é
 * uma soma de senoides e de ruído gerado por um LCG com semente fixa. Rodar de novo produz
 * bytes idênticos — é isso que deixa o dono conferir a origem por hash em vez de por confiança.
 *
 * Uso:  node src/scripts/gen-audio.mjs
 *
 * NÃO roda no `npm run build`: os arquivos são versionados. Um asset que só existe depois de um
 * passo extra de build é um asset que falta no dia em que alguém clona o repositório.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DESTINO = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'audio');

/** 22.05 kHz mono: metade dos bytes de 44.1 kHz e nenhuma diferença audível num bipe de 0,3 s. */
const TAXA = 22_050;

/** Pico alvo, em amplitude linear. -1,5 dBFS: longe do ceifamento em qualquer alto-falante. */
const PICO = 0.84;

/**
 * Ruído determinístico (LCG de Numerical Recipes).
 *
 * O gerador nativo do JavaScript tornaria o arquivo diferente a cada execução, e a procedência
 * "gerado por este script" deixaria de ser conferível por hash. O nome dele não é escrito aqui
 * nem em comentário: a checagem de camada de E-1 conta ocorrências por texto em `src/`, e exigir
 * que ela entenda comentário seria afrouxar o portão para caber uma frase.
 */
function criarRuido(semente) {
  let estado = semente >>> 0;
  return () => {
    estado = (estado * 1_664_525 + 1_013_904_223) >>> 0;
    return (estado / 0x1_00_00_00_00) * 2 - 1;
  };
}

const segundos = (s) => Math.round(s * TAXA);
const decaiExp = (i, tau) => Math.exp(-i / TAXA / tau);

/** Senoide com varredura linear de frequência, em fase contínua. */
function varredura(buf, { de, ate, dur, tau, ganho = 1, inicio = 0 }) {
  const n = segundos(dur);
  let fase = 0;
  for (let i = 0; i < n; i += 1) {
    const f = de + (ate - de) * (i / n);
    fase += (2 * Math.PI * f) / TAXA;
    const alvo = inicio + i;
    if (alvo < buf.length) buf[alvo] += Math.sin(fase) * decaiExp(i, tau) * ganho;
  }
}

/** Rajada de ruído com média móvel — a média corta o agudo e dá corpo de "pancada". */
function rajada(buf, { dur, tau, ganho = 1, suavizacao = 1, semente = 1, inicio = 0 }) {
  const n = segundos(dur);
  const proximo = criarRuido(semente);
  const janela = [];
  for (let i = 0; i < n; i += 1) {
    janela.push(proximo());
    if (janela.length > suavizacao) janela.shift();
    const media = janela.reduce((a, b) => a + b, 0) / janela.length;
    const alvo = inicio + i;
    if (alvo < buf.length) buf[alvo] += media * decaiExp(i, tau) * ganho;
  }
}

/** Nota com ataque curto e cauda exponencial. Ataque de 0 quebraria em clique. */
function nota(buf, { hz, dur, tau, ganho = 1, inicio = 0 }) {
  const n = segundos(dur);
  const ataque = segundos(0.006);
  for (let i = 0; i < n; i += 1) {
    const env = Math.min(1, i / ataque) * decaiExp(i, tau);
    // Terceiro harmônico fraco: sem ele a senoide pura soa apagada em alto-falante de celular.
    const onda = Math.sin((2 * Math.PI * hz * i) / TAXA) + 0.18 * Math.sin((6 * Math.PI * hz * i) / TAXA);
    const alvo = inicio + i;
    if (alvo < buf.length) buf[alvo] += onda * env * ganho;
  }
}

/** Normaliza ao pico alvo e aplica esmaecimento final — corte seco vira estalo. */
function finalizar(buf) {
  let maior = 0;
  for (const v of buf) maior = Math.max(maior, Math.abs(v));
  const escala = maior > 0 ? PICO / maior : 0;

  const cauda = Math.min(segundos(0.012), buf.length);
  for (let i = 0; i < buf.length; i += 1) {
    const restante = buf.length - i;
    const esmaece = restante < cauda ? restante / cauda : 1;
    buf[i] = buf[i] * escala * esmaece;
  }
  return buf;
}

/** WAV PCM 16 bits, mono. Cabeçalho de 44 bytes escrito à mão: nenhuma dependência a mais. */
function paraWav(amostras) {
  const dados = Buffer.alloc(amostras.length * 2);
  for (let i = 0; i < amostras.length; i += 1) {
    const v = Math.max(-1, Math.min(1, amostras[i]));
    dados.writeInt16LE(Math.round(v * 32_767), i * 2);
  }

  const cab = Buffer.alloc(44);
  cab.write('RIFF', 0);
  cab.writeUInt32LE(36 + dados.length, 4);
  cab.write('WAVE', 8);
  cab.write('fmt ', 12);
  cab.writeUInt32LE(16, 16); // tamanho do bloco fmt
  cab.writeUInt16LE(1, 20); // 1 = PCM
  cab.writeUInt16LE(1, 22); // mono
  cab.writeUInt32LE(TAXA, 24);
  cab.writeUInt32LE(TAXA * 2, 28); // bytes por segundo
  cab.writeUInt16LE(2, 32); // alinhamento de bloco
  cab.writeUInt16LE(16, 34); // bits por amostra
  cab.write('data', 36);
  cab.writeUInt32LE(dados.length, 40);

  return Buffer.concat([cab, dados]);
}

const vazio = (dur) => new Float64Array(segundos(dur));

/** Chute: pancada grave curta com um estalo de contato por cima. */
function chute() {
  const buf = vazio(0.16);
  varredura(buf, { de: 190, ate: 62, dur: 0.16, tau: 0.038, ganho: 1 });
  rajada(buf, { dur: 0.02, tau: 0.006, ganho: 0.55, suavizacao: 2, semente: 101 });
  return finalizar(buf);
}

/** Gol: tríade ascendente (dó–mi–sol), a única coisa alegre do conjunto. */
function gol() {
  const buf = vazio(0.62);
  const tons = [523.25, 659.25, 783.99];
  tons.forEach((hz, i) => {
    nota(buf, { hz, dur: 0.42, tau: 0.13, ganho: 0.8, inicio: segundos(i * 0.085) });
  });
  nota(buf, { hz: 1046.5, dur: 0.3, tau: 0.1, ganho: 0.3, inicio: segundos(0.17) });
  return finalizar(buf);
}

/** Defesa: tapa de luva — ruído abafado e um tom que despenca. */
function defesa() {
  const buf = vazio(0.3);
  rajada(buf, { dur: 0.09, tau: 0.022, ganho: 1, suavizacao: 9, semente: 202 });
  varredura(buf, { de: 320, ate: 128, dur: 0.26, tau: 0.055, ganho: 0.7 });
  return finalizar(buf);
}

mkdirSync(DESTINO, { recursive: true });

for (const [nome, gerar] of [
  ['chute', chute],
  ['gol', gol],
  ['defesa', defesa],
]) {
  const wav = paraWav(gerar());
  const caminho = join(DESTINO, `${nome}.wav`);
  writeFileSync(caminho, wav);
  console.log(`   ${String(wav.length).padStart(7)} B  assets/audio/${nome}.wav`);
}

console.log('\nGerados do zero. Toda linha de procedência de licenciamento.md aponta para este script.\n');
