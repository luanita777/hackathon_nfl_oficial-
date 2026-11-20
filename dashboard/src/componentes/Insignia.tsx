import { contraste, paletaEquipo } from '../equipos';

interface Props {
  sigla: string | null | undefined;
  tam?: number;
}

/** Insignia en forma de escudo, dibujada con SVG local (sin imágenes ni fuentes externas). */
export function Insignia({ sigla, tam = 40 }: Props) {
  const p = paletaEquipo(sigla);
  // Desconocida o nula: gris con la sigla recibida o 'NFL'.
  const texto = (p.conocido ? p.sigla : p.sigla || 'NFL').slice(0, 3);
  // Texto blanco o casi negro, el que más contraste dé con el relleno.
  const colorTexto = contraste(p.primario, '#ffffff') >= contraste(p.primario, '#0a0e17') ? '#ffffff' : '#0a0e17';
  const fuente = texto.length >= 3 ? 20 : 25;

  return (
    <svg
      role="img"
      aria-label={p.nombre}
      width={tam}
      height={tam}
      viewBox="0 0 100 100"
      className="inline-block shrink-0"
    >
      <title>{p.nombre}</title>
      <path
        d="M50 4 L90 16 V50 C90 72 72 88 50 96 C28 88 10 72 10 50 V16 Z"
        fill={p.primario}
        stroke={p.secundario}
        strokeWidth={6}
        strokeLinejoin="round"
      />
      <path d="M18 30 H82" stroke={p.secundario} strokeWidth={5} opacity={0.9} />
      <text
        x="50"
        y="62"
        textAnchor="middle"
        fontSize={fuente}
        fontWeight={800}
        fill={colorTexto}
        fontFamily="system-ui, sans-serif"
      >
        {texto}
      </text>
    </svg>
  );
}
