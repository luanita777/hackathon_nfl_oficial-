# Exploración de data/ (solo lectura)

Medido el 2026-11-20 con Python 3.12.12, pandas 2.2.3, numpy 2.1.3 (Darwin). ENUNCIADO.md: no existe; referencia de interpretación: Data.md. Detalle de columnas: EXPLORACION_COLUMNAS.md.

## 1. Peso y archivos
- data/ pesa 865.3 MB en 126 archivos (126 CSV; otros no CSV: ninguno).
- `tracking/tracking_#.csv`: 122 archivos, 849.8 MB en total, 4.9-9.5 MB por archivo. Mismo esquema: son particiones de una tabla. Solo se analizó `data/tracking/tracking_2021090900.csv`.

## 2. Inventario por archivo
| Archivo | Tipo | MB | Filas | Cols | Carga s | Llave | Dups llave |
|---|---|---|---|---|---|---|---|
| games.csv | juegos | 0.01 | 122 | 7 | 0.001 | gameId | 0 |
| pffScoutingData.csv | scouting | 13.01 | 188,254 | 15 | 0.078 | gameId+playId+nflId | 0 |
| players.csv | jugadores | 0.10 | 1,679 | 7 | 0.002 | nflId | 0 |
| plays.csv | jugadas | 2.35 | 8,557 | 32 | 0.020 | gameId+playId | 0 |
| tracking_2021090900.csv (muestra) | tracking | 9.46 | 92,644 | 16 | 0.039 | gameId+playId+nflId+frameId | 0 (+0 balón) |

Cobertura:
- games.csv: 122 juegos; temporada(s) [2021]; semanas 1-8; fechas 09/09/2021 a 11/01/2021 (orden del archivo).
- pffScoutingData.csv: 122 juegos; 8557 jugadas; filas por jugada mín/máx 22/22.
- players.csv: 1679 jugadores; 19 posiciones; birthDate nulo 13.8%.
- plays.csv: 122 juegos; jugadas por juego mín/mediana/máx 47/70/97.
- tracking_2021090900.csv: gameId [2021090900]; 97 jugadas; frames por jugada mín/mediana/máx 24/37/177.

## 3. Qué representa una fila
- games: un partido (122 filas, gameId único: True).
- plays: una jugada de un juego (8,557 filas, llave gameId+playId con 0 duplicados). playId solo no es único: 3,762 valores distintos en 8,557 filas.
- players: un jugador (1,679 filas, 0 nflId repetidos).
- pffScoutingData: un jugador en una jugada. Filas por jugada (filas: jugadas): {22: 8557}. Roles por jugada: {'Coverage': 57765, 'Pass Block': 46057, 'Pass Route': 39513, 'Pass Rush': 36362, 'Pass': 8557}; un 'Pass' por jugada: {1: 8557}.
- tracking: un jugador o el balón en un frame de una jugada. Jugadores por frame (jugadores: frames): {22: 4028}; balón: 4,028 filas con nflId vacío en todas (True); jugadores sin nflId: 0.

## 4. Relaciones entre tablas de distinto tipo (izq → der)
| Unión | Filas izq | % izq con pareja | Huérfanas izq | Claves der | % claves der con pareja | Huérfanas der |
|---|---|---|---|---|---|---|
| plays → games (gameId) | 8,557 | 100.00% | 0 | 122 | 100.00% | 0 |
| games → plays (gameId) | 122 | 100.00% | 0 | 122 | 100.00% | 0 |
| pff → plays (gameId, playId) | 188,254 | 100.00% | 0 | 8,557 | 100.00% | 0 |
| plays → pff (gameId, playId) | 8,557 | 100.00% | 0 | 8,557 | 100.00% | 0 |
| pff → players (nflId) | 188,254 | 100.00% | 0 | 1,679 | 100.00% | 0 |
| players → pff (nflId) | 1,679 | 100.00% | 0 | 1,679 | 100.00% | 0 |
| pff → games (gameId) | 188,254 | 100.00% | 0 | 122 | 100.00% | 0 |
| plays.foulNFLId1-3 → players (nflId) | 767 | 100.00% | 0 | 1,679 | 29.78% | 1,179 |
| pff.pff_nflIdBlockedPlayer → players | 46,526 | 100.00% | 0 | 1,679 | 39.61% | 1,014 |
| tracking(muestra) → plays, mismo juego | 92,644 | 100.00% | 0 | 97 | 100.00% | 0 |
| plays, mismo juego → tracking(muestra) | 97 | 100.00% | 0 | 97 | 100.00% | 0 |
| tracking(muestra) jugadores → pff, mismo juego | 88,616 | 100.00% | 0 | 2,134 | 100.00% | 0 |
| pff, mismo juego → tracking(muestra) jugadores | 2,134 | 100.00% | 0 | 2,134 | 100.00% | 0 |
| tracking(muestra) jugadores → players (nflId) | 88,616 | 100.00% | 0 | 1,679 | 4.11% | 1,610 |
| tracking: gameId del nombre de archivo → games | 122 | 100.00% | 0 | 122 | 100.00% | 0 |
| games → tracking: gameId del nombre de archivo | 122 | 100.00% | 0 | 122 | 100.00% | 0 |
- Tracking: las uniones con jugadas y scouting se probaron solo en el juego de la muestra (2021090900); los otros archivos de tracking no se abrieron.
- nflverse: no hay archivos externos en data/. Llaves esperadas gameId=old_game_id, playId=play_id: sin confirmar (nada que probar).

## 5. Tipo de jugada (plays.csv, 8,557 jugadas)
- passResult nulo: 0 de 8,557. Distribución: C=4620 (54.0%); I=2755 (32.2%); S=543 (6.3%); R=449 (5.2%); IN=190 (2.2%).
- dropBackType: TRADITIONAL=6542 (76.5%); SCRAMBLE=899 (10.5%); NaN=528 (6.2%); DESIGNED_ROLLOUT_RIGHT=285 (3.3%); DESIGNED_ROLLOUT_LEFT=149 (1.7%); SCRAMBLE_ROLLOUT_RIGHT=125 (1.5%); SCRAMBLE_ROLLOUT_LEFT=23 (0.3%); DESIGNED_RUN=5 (0.1%); UNKNOWN=1 (0.0%).
- pff_passCoverageType: Zone=5588 (65.3%); Man=2481 (29.0%); Other=488 (5.7%); play action (pff_playAction=1): 23.8%.
- offenseFormation: SHOTGUN=5481 (64.1%); EMPTY=1396 (16.3%); SINGLEBACK=1189 (13.9%); I_FORM=298 (3.5%); PISTOL=154 (1.8%); JUMBO=30 (0.4%); NaN=7 (0.1%); WILDCAT=2 (0.0%).
- Descripciones sin 'pass', 'sack' ni 'scramble': 0. down=0: 35 filas, de ellas 35 con 'TWO-POINT' en la descripción. quarter=5 (tiempo extra): 98 jugadas.

## 6. Coherencias medidas
- passResult='S': 543 jugadas; con algún pff_sack=1: 536; jugadas con pff_sack=1 que no son 'S': 0; suma de pff_sack: 602.
- playResult distinto de prePenaltyPlayResult en 616 jugadas; penaltyYards no nulo en 756.
- yardlineSide nulo en 125 jugadas; de ellas yardlineNumber=50 en 125 (línea de mitad de campo).
- Tracking x/y: x en 4.61..117.36 (0 filas fuera de 0-120); y en -0.67..53.01 (11 filas fuera de 0-53.3).
- playDirection no está normalizada: {'right': 62031, 'left': 30613} filas. En el snap, la ofensiva está detrás del balón según la dirección en 96 de 97 jugadas.
- absoluteYardlineNumber vs x del balón en el snap: diferencia mediana 0.44 yd, máxima 2.25 yd (97 jugadas); coincide con 120-abs (±2.5 yd) en 3.1%. Está en coordenadas x del tracking.
- Jugadas con evento de snap (ball_snap o autoevent_ballsnap): 97 de 97. Eventos (filas): {'ball_snap': 2231, 'pass_forward': 2116, 'autoevent_passforward': 851, 'autoevent_ballsnap': 667, 'play_action': 345, 'line_set': 115, 'pass_arrived': 69, 'autoevent_passinterrupted': 69, 'run': 46, 'fumble': 23, 'fumble_offense_recovered': 23, 'qb_sack': 23, 'man_in_motion': 23, 'pass_outcome_caught': 23, 'pass_outcome_incomplete': 23}. Texto 'None' crudo en event: {'None': 85997} (pandas lo lee como NaN).
- o y dir nulos solo en filas del balón: True. Mediana dis/s con s>2: 0.100 s por frame. time: mediana de 5 valores distintos por jugada con 37 frames; 0 filas con fracción de segundo.
- Evento 'run' en tracking: 2 jugadas; su passResult en plays: {'R': 2} (el evento aparece aunque todas son dropbacks).

## 7. Qué SÍ aporta
- Contexto de 8,557 jugadas de pase (dropbacks) con down, distancia, formación, personal y marcador previo; coverage PFF presente en 100.0% de las jugadas.
- Roles y resultados por jugador en cada jugada (188,254 filas): hits, hurries, sacks, bloqueos, tipo de bloqueo.
- Trayectorias de 22 jugadores y balón por frame con x, y, s, a, dis, o, dir; cadencia ≈10 frames/s (dis/s=0.100).
- Eventos que marcan fases de la jugada: ball_snap, pass_forward, autoevent_passforward, autoevent_ballsnap, play_action, line_set, pass_arrived, autoevent_passinterrupted, run, fumble, fumble_offense_recovered, qb_sack, man_in_motion, pass_outcome_caught, pass_outcome_incomplete.

## 8. Qué NO aporta
- Jugadas de carrera, despejes y goles de campo: passResult nulo en 0 jugadas y 0 descripciones sin pase/sack/scramble.
- Columnas inexistentes en plays.csv (32 columnas): epa, wp, wpa, targetNflId, receiverId, playType, air_yards, weather, defensiveTeamScore. Receptor objetivo solo aparece como texto en playDescription.
- Solo 122 juegos, temporada [2021], semanas 1-8; games.csv tiene 7 columnas (sin clima, estadio ni marcador final).
- Marcador final, EPA y probabilidad de victoria: ninguna columna con ese contenido (solo preSnapHomeScore y preSnapVisitorScore).

## 9. Carga para una API que calcula al arrancar
- Tiempos con caché de disco caliente del sistema operativo (el primer arranque en frío puede tardar más). MB = 1e6 bytes.
- Tablas pequeñas (games+plays+players+pff, completas): 0.10 s, 54.7 MB en DataFrames.
- Un archivo de tracking (muestra): 0.039 s, 28.2 MB.
- RSS pico de este análisis: 255 MB.
- Tracking, todos los archivos, todas las columnas, tipos por defecto: 122 archivos, 8,314,178 filas x 16 cols, 3.8 s, 2534 MB en DataFrame, RSS pico 2415 MB (proceso aparte).
- Tracking, todos los archivos, ligero: 122 archivos, 8,314,178 filas x 14 cols, 4.1 s, 374 MB en DataFrame, RSS pico 1033 MB (proceso aparte).
- 'ligero' = 14 columnas (sin time ni jerseyNumber), float32/int32 y texto como category. Es una medición, no una recomendación de diseño.

## 10. Sin confirmar
- Las llaves con nflverse (gameId=old_game_id, playId=play_id): no hay datos de nflverse en data/.
- Uniones tracking↔jugadas y tracking↔pff en los otros archivos de tracking: solo se midió el juego de la muestra.
- Significado de pff_role, pff_blockType y pff_passCoverage: se toma de Data.md; los conteos solo confirman que los valores existen.
