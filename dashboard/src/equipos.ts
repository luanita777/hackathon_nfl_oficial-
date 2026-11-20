// Los datos del backend no traen colores de equipo, por eso este mapa es local y fijo.
// Los colores son aproximados a la marca (sin logos). Siglas = las que usa la API.

export interface PaletaEquipo {
  sigla: string;
  nombre: string;
  primario: string;
  secundario: string;
  conocido: boolean;
}

type Entrada = [nombre: string, primario: string, secundario: string];

const EQUIPOS: Record<string, Entrada> = {
  ARI: ['Arizona Cardinals', '#97233f', '#ffb612'],
  ATL: ['Atlanta Falcons', '#a71930', '#000000'],
  BAL: ['Baltimore Ravens', '#241773', '#9e7c0c'],
  BUF: ['Buffalo Bills', '#00338d', '#c60c30'],
  CAR: ['Carolina Panthers', '#0085ca', '#101820'],
  CHI: ['Chicago Bears', '#0b162a', '#c83803'],
  CIN: ['Cincinnati Bengals', '#fb4f14', '#000000'],
  CLE: ['Cleveland Browns', '#311d00', '#ff3c00'],
  DAL: ['Dallas Cowboys', '#003594', '#869397'],
  DEN: ['Denver Broncos', '#fb4f14', '#002244'],
  DET: ['Detroit Lions', '#0076b6', '#b0b7bc'],
  GB: ['Green Bay Packers', '#203731', '#ffb612'],
  HOU: ['Houston Texans', '#03202f', '#a71930'],
  IND: ['Indianapolis Colts', '#002c5f', '#a2aaad'],
  JAX: ['Jacksonville Jaguars', '#006778', '#d7a22a'],
  KC: ['Kansas City Chiefs', '#e31837', '#ffb81c'],
  LA: ['Los Angeles Rams', '#003594', '#ffa300'],
  LAC: ['Los Angeles Chargers', '#0080c6', '#ffc20e'],
  LV: ['Las Vegas Raiders', '#000000', '#a5acaf'],
  MIA: ['Miami Dolphins', '#008e97', '#fc4c02'],
  MIN: ['Minnesota Vikings', '#4f2683', '#ffc62f'],
  NE: ['New England Patriots', '#002244', '#c60c30'],
  NO: ['New Orleans Saints', '#d3bc8d', '#101820'],
  NYG: ['New York Giants', '#0b2265', '#a71930'],
  NYJ: ['New York Jets', '#125740', '#000000'],
  PHI: ['Philadelphia Eagles', '#004c54', '#a5acaf'],
  PIT: ['Pittsburgh Steelers', '#101820', '#ffb612'],
  SEA: ['Seattle Seahawks', '#002244', '#69be28'],
  SF: ['San Francisco 49ers', '#aa0000', '#b3995d'],
  TB: ['Tampa Bay Buccaneers', '#d50a0a', '#34302b'],
  TEN: ['Tennessee Titans', '#0c2340', '#4b92db'],
  WAS: ['Washington Commanders', '#5a1414', '#ffb612'],
};

const GRIS_PRIMARIO = '#64748b';
const GRIS_SECUNDARIO = '#94a3b8';
const FONDO_OSCURO = '#0a0e17';

/** Paleta del equipo; si la sigla no existe devuelve gris con conocido=false. */
export function paletaEquipo(sigla: string | null | undefined): PaletaEquipo {
  const clave = (sigla ?? '').trim().toUpperCase();
  const e = Object.prototype.hasOwnProperty.call(EQUIPOS, clave) ? EQUIPOS[clave] : undefined;
  if (!e) {
    return {
      sigla: clave,
      nombre: clave || 'Liga',
      primario: GRIS_PRIMARIO,
      secundario: GRIS_SECUNDARIO,
      conocido: false,
    };
  }
  return { sigla: clave, nombre: e[0], primario: e[1], secundario: e[2], conocido: true };
}

/** Convierte '#rrggbb' en [r,g,b] (0-255). */
function hexARgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

function aHex(rgb: number[]): string {
  return '#' + rgb.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('');
}

/** Luminancia relativa WCAG (0 = negro, 1 = blanco). */
export function luminancia(hex: string): number {
  const [r, g, b] = hexARgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Razón de contraste WCAG entre dos colores hex (1 a 21). */
export function contraste(a: string, b: string): number {
  const la = luminancia(a);
  const lb = luminancia(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Mezcla un color con blanco en la proporción t (0 a 1). */
function aclarar(hex: string, t: number): string {
  return aHex(hexARgb(hex).map((v) => v + (255 - v) * t));
}

/**
 * Color de acento legible sobre el fondo oscuro #0a0e17.
 * Regla: se exige contraste WCAG >= 3 contra el fondo (suficiente para texto grande y gráficos).
 * 1) Si el primario cumple, se usa. 2) Si no, y el secundario cumple, se usa el secundario.
 * 3) Si ninguno cumple, se aclara el primario mezclándolo con blanco hasta cumplir.
 * Sigla nula o desconocida: gris de respaldo (ya contrasta).
 */
export function colorAcento(sigla: string | null | undefined): string {
  const MIN = 3;
  const p = paletaEquipo(sigla);
  if (contraste(p.primario, FONDO_OSCURO) >= MIN) return p.primario;
  if (contraste(p.secundario, FONDO_OSCURO) >= MIN) return p.secundario;
  for (let t = 0.1; t <= 1; t += 0.1) {
    const c = aclarar(p.primario, t);
    if (contraste(c, FONDO_OSCURO) >= MIN) return c;
  }
  return '#ffffff';
}
