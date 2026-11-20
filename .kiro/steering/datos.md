---
inclusion: always
---
# Datos de data/ (hechos medidos)
Fuente: backend/explorar.py. Detalle en EXPLORACION.md y consulta de columnas en EXPLORACION_COLUMNAS.md (no leer completo). Interpretación de columnas: Data.md.

## Archivos
- Usar los 5 tipos: games.csv, plays.csv, players.csv, pffScoutingData.csv y tracking/tracking_<gameId>.csv. Ninguno sobra; no hay archivos externos ni nflverse (medido el 2026-11-20).
- data/ pesa 865.3 MB en 126 CSV; tracking/ son 122 archivos, 849.8 MB, 4.9-9.5 MB cada uno (medido el 2026-11-20).
- Los tracking_*.csv son particiones de una tabla (un juego por archivo). El gameId del nombre coincide con games.csv en 122 de 122 (medido el 2026-11-20).
- Cobertura: temporada 2021, semanas 1-8, 122 juegos (medido el 2026-11-20).

## Qué es una fila y llaves (0 duplicados en todas, medido el 2026-11-20)
- games: 122 filas, un juego. Llave gameId.
- plays: 8,557 filas, una jugada. Llave gameId+playId. playId solo se repite entre juegos (3,762 valores distintos).
- players: 1,679 filas, un jugador. Llave nflId.
- pffScoutingData: 188,254 filas, un jugador en una jugada. Llave gameId+playId+nflId. Siempre 22 filas por jugada y un solo rol 'Pass'.
- tracking: un jugador o el balón en un frame. Llave gameId+playId+nflId+frameId (balón: gameId+playId+frameId). Muestra tracking_2021090900: 92,644 filas, 97 jugadas, 24-177 frames por jugada.
- Uniones con 100% de filas con pareja y 0 huérfanas en ambos sentidos: plays↔games, plays↔pff, pff↔players. Medido el 2026-11-20.
- Solo en un sentido (todas las filas con pareja, 0 huérfanas): pff→games, foulNFLId1-3→players (767 ids; 29.8% de players aparece) y pff_nflIdBlockedPlayer→players (46,526 ids; 39.6% de players aparece). Medido el 2026-11-20.
- tracking↔plays y tracking↔pff: 100% de pareja, probado solo en el juego 2021090900 (medido el 2026-11-20). El resto: sin confirmar.

## Trampas
- plays.csv solo trae jugadas de pase: passResult nulo en 0 de 8,557. No hay carreras (medido el 2026-11-20).
- passResult: C 4620, I 2755, S 543, R 449, IN 190 (medido el 2026-11-20).
- down=0 en 35 jugadas y las 35 son 'TWO-POINT' en playDescription. quarter llega a 5 en 98 jugadas (medido el 2026-11-20).
- yardlineSide nulo en 125 jugadas y las 125 tienen yardlineNumber=50 (medido el 2026-11-20).
- pff_role usa 'Pass Block', 'Pass Route', 'Pass Rush' con mayúscula; Data.md los escribe en minúscula (medido el 2026-11-20).
- pff_hit/hurry/sack son NaN (no 0) para quien no es Coverage o Pass Rush: 100% no nulos en esos dos roles y 0% en los demás. pff_hit: 50% nulos (medido el 2026-11-20).
- pff_sackAllowed y pff_blockType: no nulos en 100% y 99.6% de 'Pass Block', 0% en Coverage y Pass Rush, 5.1% en Pass Route (medido el 2026-11-20).
- 7 de 543 sacks (passResult=S) no tienen pff_sack=1; pff_sack suma 602 en total, más que 543 (medido el 2026-11-20).
- playResult difiere de prePenaltyPlayResult en 616 jugadas; penaltyYards no nulo en 756; foulName2 nulo en 99.6% y foulName3 en 8,556 de 8,557 (medido el 2026-11-20).
- dropBackType nulo en 528 jugadas (6.2%); offenseFormation nulo en 7 (medido el 2026-11-20).
- players: birthDate nulo en 13.8% y collegeName en 13.3% (medido el 2026-11-20).
- tracking.event trae el texto 'None' en 85,997 de 92,644 filas (92.8%) y pandas lo lee como NaN (medido el 2026-11-20).
- tracking.nflId vacío = balón: 4,028 filas, todas con team='football'; ninguna fila de jugador sin nflId. o, dir y jerseyNumber también vacíos solo en el balón (medido el 2026-11-20).
- playDirection no está normalizada: right 62,031 filas, left 30,613. x no se espeja solo (medido el 2026-11-20).
- Con la dirección dada, la ofensiva queda detrás del balón en el snap en 96 de 97 jugadas (medido el 2026-11-20).
- x va de 4.61 a 117.36; y de -0.67 a 53.01, con 11 filas con y<0 o y>53.3 (medido el 2026-11-20).
- absoluteYardlineNumber está en coordenadas x del tracking, no relativa al equipo: mediana de diferencia 0.44 yd con el x del balón en el snap, máx 2.25 yd, y 3.1% coincide con 120-abs (medido el 2026-11-20).
- ball_snap marca 2,231 filas = 97 jugadas x 23 filas de un frame; hay snap (ball_snap o autoevent_ballsnap) en 97 de 97 jugadas (medido el 2026-11-20).
- time tiene resolución de 1 s (0 filas con fracción; mediana 5 valores distintos en 37 frames). Los frames van a 10 por s: dis/s = 0.100 (medido el 2026-11-20).
- El evento 'run' aparece en 2 jugadas, ambas passResult=R (scramble) (medido el 2026-11-20).

## Columnas clave con significado confirmado
- passResult (C, I, S, R, IN), pff_passCoverage (12 valores), pff_passCoverageType (Zone 5,588, Man 2,481, Other 488), ambas sin nulos (medido el 2026-11-20).
- pff_playAction: 1 en 23.8% de las jugadas, sin nulos (medido el 2026-11-20).
- offenseFormation: SHOTGUN 5,481, EMPTY 1,396, SINGLEBACK 1,189, I_FORM 298, PISTOL 154, JUMBO 30, WILDCAT 2 (medido el 2026-11-20).
- pff_role: Coverage 57,765, Pass Block 46,057, Pass Route 39,513, Pass Rush 36,362, Pass 8,557 (medido el 2026-11-20).
- Eventos de tracking: ball_snap, line_set, man_in_motion, play_action, pass_forward, pass_arrived, pass_outcome_caught, pass_outcome_incomplete, qb_sack, fumble, run, más autoevent_ballsnap, autoevent_passforward, autoevent_passinterrupted (muestra, medido el 2026-11-20).

## Qué NO trae el dataset (medido el 2026-11-20)
- Carreras, despejes y goles de campo (ver passResult nulo = 0).
- EPA, probabilidad de victoria, receptor objetivo como id, clima, estadio y marcador final: ninguna de las 32 columnas de plays ni las 7 de games lo contiene. Solo hay preSnapHomeScore y preSnapVisitorScore.
- Otras temporadas, semanas 9 en adelante ni datos de nflverse (solo semanas 1-8 de 2021).

## Carga (macOS, caché caliente, medido el 2026-11-20)
- games+plays+players+pff: 0.09 s y 54.7 MB. Tracking completo: 8,314,178 filas; 3.8 s y 2,534 MB con todas las columnas (RSS pico 2,415 MB); 4.1 s y 374 MB con 14 columnas y float32 (RSS pico 1,033 MB).
