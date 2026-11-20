# CLASIFICACION: preguntas.txt contra data/ (hackathon NFL, temporada 2021, semanas 1-8)

Medido con código pandas el 2026-11-20 (scripts desechables, no se guardaron en el repo). ENUNCIADO.md no existe; la interpretación de columnas sale de Data.md y .kiro/steering/datos.md.
Tiempo de trabajo: menos de 20 minutos, no hubo aviso de retraso.

## 0. Hipótesis del material previo, comprobadas con código
| Hipótesis | Resultado |
|---|---|
| Solo jugadas de pase (dropbacks) | Confirmado: plays.csv tiene 8,557 filas y passResult nulo en 0 (C 4,620, I 2,755, S 543, R 449, IN 190). No hay carreras, despejes ni goles de campo. |
| Tracking a 10 cuadros por segundo | Confirmado: dis/s = 0.100 (EXPLORACION.md). 122 archivos, 8,314,178 filas, 100% de las 8,557 jugadas tienen tracking. |
| Columnas PFF y de jugada: pff_hurry, pff_sack, pff_beatenByDefender, pff_passCoverageType, pff_playAction, passResult, defendersInBox, offenseFormation, foulName1, penaltyYards | Las 10 existen (comprobado con `in df.columns`). pff_hurry/hit/sack solo traen valor para Pass Rush y Coverage (50% nulos), pff_beatenByDefender solo para bloqueadores (74.5% nulos). |
| Eventos ball_snap y pass_forward | Existen en el tracking de los 122 juegos. Hay snap (ball_snap o autoevent_ballsnap) en 99.7% de las jugadas (24 sin snap). Hay además qb_sack (451 jugadas), qb_strip_sack (58), fumble (17), tackle (3), pass_arrived (367), penalty_flag (2) y dropped_pass (1). Los eventos de resultado son escasos; los de snap, lanzamiento y sack son completos. |
| Uniones | tracking↔pff: 188,254 pares jugador-jugada, 100% en ambos sentidos, en los 122 juegos (antes solo se había probado un juego). tracking↔plays: 8,557 de 8,557. |

Hallazgos de datos que cambian respuestas:
- **foulName1 incluye castigos declinados y compensados.** De 736 filas con foulName1, 603 son aplicados, 121 declinados y 12 compensados (según el texto de playDescription). Hay que filtrar por texto antes de contar.
- **No existe "False Start" en foulName1-3 ni en playDescription** (0 casos): es falta de balón muerto antes del snap y no genera jugada.
- Los receptores objetivo se obtienen del texto de playDescription ("to X.Apellido" o "intended for X.Apellido"): 7,113 de 7,565 pases (94.0%) se enlazan a un jugador de la jugada por nombre. No hay columna de receptor.
- Defensor responsable de una cobertura: no existe. pff_passCoverageType es por jugada, no por jugador.
- El "tiempo hasta el sack" sale del tracking: frames entre snap y qb_sack/qb_strip_sack, divididos entre 10. 507 de 543 sacks tienen ese dato (media 4.46 s, mediana 4.4 s).

## 1. Interpretaciones sin confirmar (vocabulario de la fan)
- **"perímetro" (L11, L74-L98)**: interpretación sin confirmar. Se lee como defensores de secundaria (CB, FS, SS) porque las preguntas piden pases defendidos, intercepciones y coberturas. Lectura alternativa: los que juegan por fuera de la línea (OLB, DE de borde). Para L11 el resultado cambia por completo: tasa de pass rush por posición de players.csv: CB 1.6%, FS 3.0%, SS 4.4%, ILB 13.7%, MLB 10.9%, OLB 60.6%, DE 96.9%.
- **"blitz" (L11)**: interpretación sin confirmar. El dataset no tiene bandera de blitz. Se usa pff_role = 'Pass Rush' en un defensor que no es de línea (secundaria, o linebacker según la lectura).
- **"centros" (L14-L16)**: interpretación sin confirmar. Opciones: snaps del centro al quarterback (alto/bajo), o centrados de goles de campo. Con cualquiera falta la altura del balón (solo hay x, y) y los goles de campo no existen. No viable en ambos casos.
- **"corredor" (L10)**: se lee como running back. No hay carreras.
- **"castigo" (L4, L5, L7)** = penalización. **"liniero"** = lineman.
- **"capturas" (L94)**: interpretación sin confirmar, se lee como sacks.
- **"presiones permitidas" (L31)**: se define como hit + hurry + sack permitidos (pff_hitAllowed, pff_hurryAllowed, pff_sackAllowed).
- **"eficiencia de bloqueo" (L32) y "pierde su asignación" (L34)**: interpretación sin confirmar. Se usan presión permitida por snap y pff_beatenByDefender. No existe una bandera de asignación fallada.
- **"porcentaje de efectividad en 4to y 1" (L2)**: se calcula como yardas ≥ yardsToGo en pase. No hay bandera de primer down.
- **"★" (encabezado del encargo)**: no aparece marcada en ningún archivo del proyecto (preguntas.txt tampoco). Interpretación sin confirmar: "★ cubiertas" = número de preguntas de preguntas.txt que responde el candidato. Si las ★ son otra cosa, avisar y se recalcula.
- La numeración de preguntas.txt se interrumpe en la 39 y reaparece como "47." en la línea 65. En esta tabla "L#" es el número de línea del archivo; el número original va entre paréntesis cuando existe.

Abreviaturas: P = plays.csv, F = pffScoutingData.csv, J = players.csv, G = games.csv, T = tracking/tracking_*.csv. n = filas o jugadas reales usadas.

## 2. Viables y parciales, por tema

### 2.1 Cuarto y tercer down
| Pregunta | Tema | Clase | Archivos y columnas verificados | n real | Qué falta | Riesgos |
|---|---|---|---|---|---|---|
| L1 (1) | Formación en 4º y 1 | Parcial | P: down, yardsToGo, offenseFormation, passResult, prePenaltyPlayResult | 41 jugadas (SHOTGUN 16, SINGLEBACK 11, EMPTY 8, JUMBO 4, I_FORM 2) | Carreras y sneaks, que son la mayoría de los 4º y 1 | n por formación menor a 30. Sesgo de selección: solo se ven los 4º y 1 en que el equipo decidió pasar |
| L2 (2) | Efectividad en 4º y 1 de un equipo | Parcial | P: down, yardsToGo, possessionTeam, passResult, prePenaltyPlayResult | 41 en total, 22 equipos, mediana 1 por equipo (máx. 5) | Carreras. Bandera de primer down | Por equipo no hay muestra. Solo se puede dar el dato de liga (~54% en pase, aproximado) |
| L25 (25) | Conversión en 3er down | Parcial | P: down, yardsToGo, prePenaltyPlayResult, passResult | 2,394 tercer downs de pase; conversión aproximada 37.4% (22.8% con 10+ yardas, 56.2% con 1-2) | Carreras en 3er down. Primer down por castigo automático | Conversión derivada (yardas ≥ yardsToGo y passResult C o R), no medida |

### 2.2 Castigos
| Pregunta | Tema | Clase | Archivos y columnas verificados | n real | Qué falta | Riesgos |
|---|---|---|---|---|---|---|
| L4 (4) | Castigo más común, ofensiva | Parcial | P: foulName1, foulNFLId1, playDescription; F: pff_role del infractor | 209 aplicados de 269 ofensivos con foulName1; Offensive Holding 104, Offensive Pass Interference 31, Intentional Grounding 16 | Castigos en carreras | Declinados en foulName1. El lado (ofensiva/defensa) sale de pff_role del infractor (736 de 736 enlazados) |
| L5 (5) | Castigo más común, defensa | Parcial | Igual que L4 | 394 aplicados de 467 defensivos; Defensive Pass Interference 133, Roughing the Passer 59, Defensive Holding 54 | Castigos en carreras | Igual que L4 |
| L7 (7) | Castigo con más yardaje | Parcial | P: penaltyYards (negativo = contra la ofensiva), foulName1 | Aplicados: Defensive Pass Interference 133 casos, 2,300 yd, 17.3 por caso; Offensive Holding 105 casos, 1,036 yd; Roughing the Passer 59 casos, 800 yd | Castigos en carreras | "Más yardaje" es ambiguo: total o por evento. Horse Collar (n=4) y Face Mask suman 15 por evento |
| L27 (27) | Castigos de liniero ofensivo por temporada | Parcial | P: foulNFLId1; F: pff_positionLinedUp en LT, LG, C, RG, RT | 128 aplicados en 8 semanas (175 con declinados) | Temporada completa. Castigos en carreras | Por jugador n=0 a 3. Solo es útil como total o por posición |
| L28 (28) | Holding por liniero ofensivo | Parcial | Igual que L27, foulName1 = Offensive Holding | 98 aplicados de OL (de 134 con declinados), 273 jugadores con snaps de bloqueo | Holding en carreras (probablemente la mayoría) | Promedio por jugador cercano a 0.4 y sin base completa |
| L30 (30) | "False start" de liniero defensivo | Parcial | P: foulName1 = Defensive Offside | 35 aplicados (de 48), por posición LEO 11, REO 7, LOLB 6, ROLB 5 | False start defensivo no existe como castigo. Interpretación sin confirmar: se usa Defensive Offside | Equivalencia discutible. Son castigos con jugada, no los de balón muerto |
| L33 (33) | Posición de OL con más castigos | Parcial | P: foulNFLId1; F: pff_positionLinedUp | 128 aplicados: LT 37, RT 31, LG 24, RG 20, C 16 | Castigos en carreras | Solo pases: los tackles pueden estar inflados por protección de pase |

### 2.3 Sacks, presión y línea ofensiva
| Pregunta | Tema | Clase | Archivos y columnas verificados | n real | Qué falta | Riesgos |
|---|---|---|---|---|---|---|
| L6 (6) | Segundos para capturar al QB | Viable | T: frameId, event (ball_snap, autoevent_ballsnap, qb_sack, qb_strip_sack); P: passResult = S | 507 de 543 sacks con tiempo: media 4.46 s, mediana 4.4 s (4.93 s si se usa el último frame, n=542) | 36 sacks sin evento qb_sack | La etiqueta de sack puede llegar tarde frente al contacto real. Elegir y declarar la definición |
| L11 (11) | Probabilidad de blitz de un jugador de perímetro | Viable (interpretación sin confirmar) | F: pff_role = 'Pass Rush', pff_positionLinedUp; J: officialPosition | 975 jugadas con al menos un defensor de secundaria al pass rush (11.4% de 8,557); 1,096 filas de 43,267 snaps de CB/FS/SS = 2.5% (CB 1.6%, FS 3.0%, SS 4.4%) | Bandera oficial de blitz | Depende del significado de "perímetro" (ver sección 1). "Pass Rush" también incluye rushers de línea |
| L19 (19) | Sacks por partido de un jugador | Viable | F: pff_sack por nflId; G | 602 créditos de sack, 278 jugadores con al menos 1 (máx. 12.0) | Nada | pff_sack suma 602 y passResult S da 543 (sacks compartidos). 7 sacks sin pff_sack |
| L20 (20) | Sacks por temporada | Parcial | F: pff_sack; G | Solo 8 semanas de 2021 | Temporada completa | Extrapolar sería inventar. Se reporta "en 8 semanas" |
| L21 (21) | Cuarto con más sacks | Viable | P: quarter, passResult = S | 543 sacks: Q1 110, Q2 154, Q3 120, Q4 152, OT 7 | Dropbacks por cuarto para tasa | Conteo bruto. Falta dividir entre dropbacks para no confundir volumen con riesgo |
| L22 (22) | Down con más sacks | Viable | P: down, passResult = S | 543 sacks: 1º 148, 2º 146, 3º 222, 4º 26, 1 de 2 puntos. Tasa por dropback: 1º 4.8%, 2º 5.2%, 3º 9.3%, 4º 11.3% | Nada | Ninguno relevante |
| L23 (23) | Sacks por partido al QB | Viable | P: passResult = S, possessionTeam; G | 543 sacks en 244 partidos-equipo = 2.23 por partido por equipo | Nada | Solo semanas 1-8 |
| L26 (26) | Snaps de liniero ofensivo por partido | Parcial | F: pff_role = 'Pass Block', pff_positionLinedUp | 31.1 snaps de bloqueo de pase por liniero por partido (n=1,375 pares jugador-partido) | Snaps de carrera | Subestima los snaps reales |
| L31 (31) | Presiones permitidas por 100 snaps de OL | Viable | F: pff_hitAllowed, pff_hurryAllowed, pff_sackAllowed | 42,782 snaps de OL, 6.23 por 100; 273 OL, 181 con 100 o más snaps | Nada | Definición de presión (sección 1). Por posición: C 4.1, LG 5.6, RG 6.5, LT 7.3, RT 7.7 |
| L32 (32) | Peso contra eficiencia de bloqueo | Viable (interpretación sin confirmar) | J: weight; F: presión permitida | 181 OL con 100 o más snaps, peso 260-350 lb; correlación con tasa de presión permitida 0.10 | Nada | Rango de peso estrecho. Correlación débil |
| L34 (34) | Frecuencia de perder la asignación | Viable (interpretación sin confirmar) | F: pff_beatenByDefender | 4.15% de 42,782 snaps de OL | Bandera de asignación fallada | Beaten no es lo mismo que asignación fallada |

### 2.4 QB, fumbles y marcadores
| Pregunta | Tema | Clase | Archivos y columnas verificados | n real | Qué falta | Riesgos |
|---|---|---|---|---|---|---|
| L9 (9) | Yardas por lanzamiento del QB | Parcial | P: playResult, prePenaltyPlayResult, passResult | 7,565 intentos (C, I, IN): 7.40 yd por intento y 12.1 por completo, yardas netas con YAC | Yardas de aire. Con T solo hay pass_arrived en 367 jugadas | No son yardas lanzadas. Si se usa T, la muestra es 5% de las jugadas |
| L12 (12) | Puntos por equipo por partido | Parcial | P: preSnapHomeScore, preSnapVisitorScore; G | 122 partidos (244 equipo-partido); máximo marcador previo promedio 22.9 | Marcador final | Cota inferior: no cuenta las anotaciones tras la última jugada de pase |
| L17 (17) | Fumbles por juego | Parcial | P: playDescription contiene 'FUMBLES' | 151 jugadas con fumble en dropbacks = 1.24 por partido (92 de 122 partidos con alguno) | Fumbles de carrera | T tiene el evento fumble en solo 17 jugadas; no sirve como fuente |
| L18 (18) | Posición que más fumblea | Parcial | P: playDescription; J: officialPosition | 151 jugadas; nombre extraído en 97.4% | Fumbles de carrera, RB y TE | Casi todo será QB. Texto sin identificador |

### 2.5 Lesiones (solo lo que menciona playDescription)
| Pregunta | Tema | Clase | Archivos y columnas verificados | n real | Qué falta | Riesgos |
|---|---|---|---|---|---|---|
| L38 (38) | Posición con más lesiones | Parcial | P: playDescription con "was injured during the play"; J | 207 menciones, 99.5% enlazadas a un jugador: CB 50, WR 26, DE 15, OLB 14, QB 13, ILB 13, T 12, DT 12, G 11 | Tipo de lesión, entrenamientos, otras temporadas | Solo lesiones en jugadas de pase de partido. Falta exposición por posición |
| L41 | Posiciones con más lesiones | Parcial | Igual que L38 | 207 | Igual | Igual |
| L49 | Contacto contra habilidad | Parcial | Igual que L38 | 207 | Igual | Sin tasa por snap validada |
| L52 | Dropbacks y lesiones del QB | Parcial | Igual que L38, filtrando QB | 13 lesiones de QB en 8,557 dropbacks | Nada | n menor a 30, no sirve para un hallazgo |

### 2.6 Receptores
Objetivo del pase enlazado en 7,113 de 7,565 pases (94.0%). Receptores con 30 o más objetivos: 81. Recepciones atribuidas: 4,523 de 4,620.
| Pregunta | Tema | Clase | Archivos y columnas verificados | n real | Qué falta | Riesgos |
|---|---|---|---|---|---|---|
| L54 | Recepciones por partido | Parcial | P: playDescription, passResult = C; F | 4,523 recepciones | Objetivo oficial | Enlace por nombre; 6% sin objetivo |
| L55 | Yardas recibidas por partido | Parcial | P: prePenaltyPlayResult (incluye YAC) | 4,523 | Yardas por recepción oficiales | Yardas de la jugada, no del receptor |
| L56 | TD por recepción | Parcial | P: playDescription con TOUCHDOWN | 366 TD de pase | Nada | Hay TD de 2 puntos |
| L57 | Recepciones que son primer down | Parcial | P: prePenaltyPlayResult ≥ yardsToGo | 4,523 | Bandera de primer down | Derivado |
| L58 | % de pases dirigidos que terminan en recepción | Viable | P: passResult; enlace objetivo | 7,113 objetivos (WR 4,323, TE 1,559, RB 1,168). Por alineación: RB 77.1%, TE 70.6%, slot 64.3%, WR exterior 56.9% | Nada | 6% sin enlace |
| L60 | Recepciones de más de 20 yardas | Parcial | P: prePenaltyPlayResult | 749 de 4,523 (16.6%) | Yardas de aire | Incluye YAC |
| L61 | % de jugadas que disputa | Parcial | F: pff_role = 'Pass Route' por jugador | 39,513 filas de ruta; 173 jugadores con 100 o más rutas | Snaps de carrera | Base es dropbacks |
| L62 | Rutas por partido | Viable | F: pff_role = 'Pass Route' | 173 jugadores con 100 o más rutas | Nada | Solo dropbacks |
| L63 | Oportunidades por ruta | Parcial | F + objetivo enlazado | 173 jugadores | Objetivo oficial | Enlace de 94% |
| L64 | Snaps por recepción | Parcial | Igual | Igual | Snaps de carrera | Subestima snaps |
| L65 (47) | Producción alta con pocas oportunidades | Parcial | Igual | 81 con 30 o más objetivos | "Producción" sin definir | n por jugador pequeño |
| L66 | WR contra slot | Viable | F: pff_positionLinedUp (SLWR, SRWR, SLiWR, SLoWR, SRoWR, SRiWR contra LWR, RWR) | slot 2,223 objetivos (64.3% recepción, 8.2 yd por objetivo); exterior 3,105 (56.9%, 8.0) | Nada | Alineación al snap, no la ruta |
| L67 | Tipo de receptor con más yardas por recepción | Viable | Igual | Por alineación, 4,523 recepciones | Nada | Incluye YAC |
| L68 | Tipo con mayor % de recepción | Viable | Igual | 7,113 objetivos | Nada | Ninguno relevante |
| L69 | Mejores en rutas profundas | Parcial | P: playDescription 'deep' | 1,552 objetivos profundos (40.7% recepción, 11.9 yd por objetivo); 0 receptores con 30 o más, 26 con 15 o más | Yardas de aire | Profundidad es texto, no yardas |
| L71 | Más efectivos contra cobertura individual | Parcial | P: pff_passCoverageType | Man 2,048 objetivos (55.5% recepción); solo 1 receptor con 30 o más | Asignación defensor-receptor | Por receptor no hay muestra; por alineación sí |
| L72 | Más efectivos contra zona | Parcial | Igual | Zone 4,694 (67.7%); 33 receptores con 30 o más | Igual | Igual |
| L73 | Velocidad y yardas recibidas | Parcial | T: s (velocidad); F; P | 173 jugadores con 100 o más rutas | Velocidad de juego sin definir | Velocidad máxima de ruta, no 40 yardas |

### 2.7 Defensa del perímetro (secundaria, interpretación en sección 1)
| Pregunta | Tema | Clase | Archivos y columnas verificados | n real | Qué falta | Riesgos |
|---|---|---|---|---|---|---|
| L74 | Tackles por partido | Parcial | P: nombre entre paréntesis al final de playDescription | 3,651 de 5,069 completos o scrambles (72%) con tacleador | Tackles en carrera. Solo y asistido | "(A; B)" no distingue solo de asistido |
| L76 | Intercepciones por temporada | Parcial | P: passResult = IN, playDescription | 190 INT, intérprete nombrado en 97.4% | Temporada completa | 8 semanas; por jugador pocos casos |
| L77 | Tackles individuales por partido | Parcial | Igual que L74 | 3,651 | Solo contra asistido | Igual |
| L78 | Balones sueltos forzados | Parcial | P: playDescription 'FUMBLES (X.Apellido)' | 128 jugadas con quien lo forzó | Nada | Casi todos son pass rushers; secundaria n pequeña |
| L79 | TD defensivos | Parcial | P: INT con TOUCHDOWN | 14 | Fumbles recuperados | n menor a 30 |
| L80 | Frecuencia de intercepción | Parcial | P: passResult | 190 de 7,565 intentos = 2.5% | Intentos hacia cada defensor | Tasa de liga, no individual |
| L81 | Mayor producción defensiva | Parcial | F: pff_hit, pff_hurry, pff_sack; P | 1,096 filas de pass rush de secundaria | "Producción" sin definir | Peso arbitrario |
| L82 | Más intercepciones por temporada | Parcial | Igual que L76 | 190 | Igual | Igual |
| L83 | Intercepciones por partido | Viable | P: passResult = IN; G | 190 en 122 partidos = 1.56 por partido (0.78 por equipo) | Nada | Todo INT es de pase |
| L84 | % de pases hacia su zona que son INT | Parcial | T posición del balón; F | 190 INT | Zona del defensor | Sin confirmar |
| L85 | Cornerbacks contra safeties | Parcial | F + J (officialPosition) | Filas Coverage/Pass Rush: CB 23,913, FS 10,108, SS 9,160 | Pases defendidos, tackles detallados | Solo tasas de blitz, INT y tackles |
| L86 | Posición con más tackles por partido | Parcial | Igual que L74 | 3,651 | Tackles en carrera | Sesgo |
| L88 | Posición con más cobertura individual | Parcial | P: pff_passCoverageType (Man 2,481 jugadas, 29.0%); F: pff_role = 'Coverage' | Man en 2,481 jugadas | Asignación individual | Man es por jugada, no por jugador |
| L90 | FS contra SS | Parcial | J: officialPosition FS/SS; F | FS 10,108 filas, SS 9,160 | Pases defendidos, yardas | Igual que L85 |
| L92 | Posición con más balones forzados | Parcial | Igual que L78 | 128 | Nada | n por posición pequeña |
| L93 | Velocidad y efectividad en cobertura | Parcial | T: s | Sin medir | "Efectividad" sin definir | Sin asignación defensor-receptor |
| L94 | "Capturas" por temporada | Parcial (interpretación sin confirmar) | Igual que L20 | 602 créditos de sack | Temporada completa | 8 semanas |
| L95 | Efectividad en tercer down | Parcial | P: down = 3 | 2,394 tercer downs, sin atribuir defensor | Defensor responsable | Solo equipo |
| L96 | Efectividad en cuarto down | Parcial | P: down = 4 | 231 | Defensor responsable | n por jugador menor a 30 |
| L98 | Impacto sin intercepciones | Parcial | F: hit, hurry, sack | 1,096 filas de secundaria | Definición de impacto | Subjetivo |

## 3. No viables (al final, una línea de motivo)
| Pregunta | Motivo |
|---|---|
| L3 (3) | Sin despejes, goles de campo ni decisiones de no ir por el down |
| L8 (8) | Sin goles de campo |
| L10 (10) | Sin carreras (solo 449 scrambles de QB, promedio 7.7 yd) |
| L13 (13), L24 (24) | Sin playoffs, solo semanas 1-8 de temporada regular |
| L14, L15, L16 | "Centros" ambiguo (sección 1); sin altura del balón ni goles de campo |
| L29 (29) | Cero false starts en foulName1-3 y en playDescription |
| L35 (35) | Sin historial de equipos por jugador |
| L36, L37, L47 | Sin tipo de lesión: solo "was injured during the play" |
| L39 | Sin registro de lesiones por temporada (solo 207 menciones en 8 semanas) |
| L42 | Cobertura de dos meses (sep. a 1 nov.) |
| L43, L44, L45 | Solo hay partidos de temporada regular: sin entrenamientos ni pretemporada |
| L46, L48 | Sin tipo de lesión ni cirugía |
| L50, L51 | Sin historial médico ni de edad en la lesión |
| L53 | Es una pregunta de reglas, no de datos |
| L59 | Sin bandera de balones caídos (dropped_pass aparece en 1 jugada) |
| L70 | Sin tipo de ruta |
| L75, L91 | Sin pases defendidos: 5 menciones de 'defended' en playDescription |
| L87, L97 | Sin asignación defensor-receptor ni defensor objetivo |
| L89 | Sin carreras |
| L99-L114 (16 preguntas) | Pateadores: sin goles de campo, puntos extra, clima, viento, lluvia, altitud ni estadio |

Resumen: 15 Viables, 52 Parciales, 46 No viables (113 preguntas con texto).

## 4. Paso 2: candidatos de hallazgo (n ≥ 30 por grupo)
Escala 1-5. Esfuerzo: 5 = más trabajo para 2 personas. Total = Insight + Técnica + Comunicación + Originalidad + (6 − Esfuerzo). Originalidad está **sin confirmar** (viene de lo que sé de memoria).

| ID | Candidato (contraste y decisión) | Preguntas (★) | Insight | Técnica | Comunic. | Original. | Esfuerzo | Total |
|---|---|---|---|---|---|---|---|---|
| C1 | **Reloj del sack:** el sack tardío (más de 5.5 s) no es de la línea. Línea cargada: 77% hasta 4.5 s contra 26% después de 5.5 s. Decisión del coach ofensivo: arreglar la línea o la lectura del QB | L6, L21, L22, L23 (4) | 4 | 4 | 5 | 4 | 3 | 20 |
| C3 | **Castigos del pase profundo:** DPI en 4.7% de pases profundos contra 1.1% de cortos, y un DPI vale 17 yd contra 10 del holding. Decisión: cuándo tirar profundo | L4, L5, L7, L33 (4) | 3 | 5 | 4 | 2 | 1 | 19 |
| C2 | **Blitz de secundaria:** presión 46% con un defensor de secundaria contra 36% sin él, pero con el mismo número de rushers la diferencia baja a 3 puntos. Decisión: contar rushers, no quién | L11, L85, L90, L95 (4) | 3 | 5 | 3 | 3 | 2 | 18 |
| C7 | **Profundo contra corto:** 40.7% de recepción y 11.9 yd por objetivo contra 70.1% y 6.6 | L60, L67, L68, L69 (4) | 3 | 4 | 4 | 2 | 2 | 17 |
| C4 | **Tercer down:** conversión por distancia (56% con 1-2 yd, 23% con 10+). Man 40.6% contra Zone 34.7% (n=1,046 y 1,177) | L25 (1) | 3 | 5 | 3 | 1 | 1 | 17 |
| C5 | **Línea ofensiva (para scout):** presión permitida por 100 snaps y peso (correlación 0.10) | L26, L31, L32, L34 (4) | 4 | 4 | 3 | 2 | 3 | 16 |
| C6 | **Receptor y cobertura:** Man 55.5% contra Zone 67.7% de recepción, por alineación | L58, L66, L71, L72 (4) | 4 | 4 | 4 | 2 | 4 | 16 |
| C9 | **Producción por ruta:** objetivos y yardas por ruta | L47 (L65), L62, L63, L64 (4) | 3 | 4 | 3 | 1 | 3 | 14 |

Descartados por no ser contraste o por n < 30: promedios sueltos (L9, L12, L17, L19, L23 por sí solo), 4º y 1 (L1, L2: n=41, con menos de 30 por formación), lesiones (L52: 13 QB), L79 (n=14).

**Empates.**
- C4 y C7 (17): gana C7 porque cubre 4 preguntas y tiene mayor originalidad que C4 (1).
- C5 y C6 (16): empatan en ★ y total. C5 va primero por menor riesgo técnico (no depende de analizar texto de playDescription). Si el equipo valora más el tema receptores, C6 es igual de defendible.
- C1 y C2: no empatan en total (20 y 18). C3 queda segundo con 19 pese a tener Originalidad 2, porque cuesta poco y no tiene riesgo de datos más allá de filtrar declinados.

**Originalidad (todo sin confirmar), qué buscar:**
- C1: "time to sack" o "sack time" en Next Gen Stats (nextgenstats.nfl.com), PFF (pff.com), ESPN Pass Block Win Rate; ¿alguien clasifica sacks de línea frente a sacks de cobertura por tiempo desde el snap? También "coverage sack" en artículos de análisis.
- C2: tasa de blitz de DB en PFF y en Pro Football Reference (stathead), "DB blitz pressure rate".
- C3: nflpenalties.com y Pro Football Reference (penalty splits), "DPI rate by pass depth".
- C6: PFF "yards per route run vs man/zone"; NGS receiving; FTN Data (ftndata.com).
- N1 (paso 5 abajo): NGS (coverage man/zone), PFF coverage scheme, FTN charting, Sumer Sports, competiciones previas de Big Data Bowl en Kaggle.

## 5. Paso 3: top 3

### Top 1: C1 "Reloj del sack"
- **Punto de vista:** coach ofensivo (también sirve al broadcaster). Decisión: si el sack llega pasados ~5 s, trabajar tiempos de ruta y lecturas del QB; si llega antes de 4.5 s, trabajar protección.
- **Hallazgo (frase de la app):** "Los sacks que caen antes de [X] s se le cargan a la línea en [X]% de los casos; los que caen después de [X] s, solo en [X]% (n=[X])."
- **Medido:** 507 sacks con tiempo. Línea cargada (pff_sackAllowed > 0): 2.5-3.5 s 80% (n=96), 3.5-4.5 s 77% (n=194), 4.5-5.5 s 63% (n=131), más de 5.5 s 26% (n=76). Diferencia 51 puntos, intervalo bootstrap 95% [40, 62].
- **Archivos, columnas y uniones:** T (gameId, playId, frameId, event: ball_snap/autoevent_ballsnap, qb_sack/qb_strip_sack, pass_forward/autoevent_passforward); P (gameId, playId, passResult, down, quarter, possessionTeam, pff_passCoverageType, pff_playAction); F (gameId, playId, nflId, pff_role, pff_sackAllowed, pff_sack, pff_positionLinedUp). Uniones: (gameId, playId) entre T, P y F, 100% de pareja; (gameId, playId, nflId) T↔F 100%.
- **Pantalla principal en 3 líneas:** (1) línea de tiempo 0-8 s con la mediana de lanzamiento (2.7 s) y la mediana de sack (4.4 s); (2) barras "cargado a la línea" por tramo de tiempo; (3) tabla de los sacks de cada equipo por tramo, con filtro de down y cobertura.
- **3 mayores riesgos y cómo verificarlos en 20 minutos:**
  1. Sacks sin evento (36 de 543, 7%): comparar con el tiempo por último frame (4.93 s, n=542). Si el patrón se mantiene con ambos relojes, está resuelto.
  2. pff_sackAllowed incluye casos compartidos y 7 sacks sin pff_sack: repetir el contraste excluyendo esos 7 y los sacks de scramble (SCRAMBLE aparece en 30 de los 76 tardíos).
  3. Condicionamos a que hubo sack (no hay sacks de jugadas donde el QB lanzó): contrastar con el tiempo de lanzamiento de las 7,541 jugadas lanzadas (media 2.96 s) y declararlo en la pantalla.
- **Se deja fuera:** predecir sacks, ranking de linieros, EPA, por jugador, tackles.
- **Confirmación en otra muestra:** mitades por semana medidas: semanas 1-4, línea cargada 69% hasta 5.5 s contra 25% después de 5.5 s (n=234 y 40); semanas 5-8, 79% contra 28% (n=197 y 36). Otra temporada: no hay tracking ni PFF en data/. nflverse trae jugadas pero no tiempo de sack (sin confirmar).

### Top 2: C3 "Castigos del pase profundo"
- **Punto de vista:** coach ofensivo. Decisión: valor de tirar profundo considerando la bandera.
- **Hallazgo (frase):** "Un pase profundo termina en pase defensivo ilegal el [X]% de las veces, contra [X]% del corto, y esa bandera vale [X] yardas contra [X] de un holding ofensivo."
- **Medido (con declinados, hay que filtrar):** DPI 4.7% de 1,651 profundos contra 1.1% de 5,876 cortos; yardas por intento con castigo 12.2 contra 6.2; aplicados: DPI 133, 17.3 yd por caso; Offensive Holding 105, 9.9 yd perdidos.
- **Archivos y columnas:** P (foulName1, foulNFLId1, penaltyYards, playDescription para 'deep'/'short' y 'declined', passResult, pff_passCoverageType); F (pff_role, pff_positionLinedUp para el lado del infractor). Uniones: P↔F por (gameId, playId, nflId) 100%.
- **Pantalla en 3 líneas:** (1) barras DPI por profundidad; (2) yardas por intento con y sin castigo; (3) tabla de castigos más caros, filtro Man/Zone.
- **Riesgos:** (1) declinados dentro de foulName1: filtrar por texto, 10 minutos; (2) profundidad es texto y no yardas: medir con el balón en T solo cubre 367 jugadas, declararlo; (3) Man 5.6% contra Zone 4.3% de DPI no es concluyente (n=538 y 1,082): calcular intervalo antes de afirmarlo.
- **Fuera:** castigos de carrera, EPA, árbitros.
- **Confirmación:** semanas 1-4 contra 5-8: DPI 80 contra 65 y Offensive Holding 72 contra 72. Otras temporadas: nflverse trae foulName en jugadas (sin confirmar), por lo que este hallazgo es el más replicable fuera del dataset.

### Top 3: C2 "Blitz de secundaria"
- **Punto de vista:** coach defensivo. Decisión: no sumar un defensor de secundaria al blitz esperando más presión; contar rushers.
- **Hallazgo (frase):** "Con un defensor de secundaria al blitz la presión sube [X] puntos, pero con el mismo número de rushers solo [X]."
- **Medido (hasta 5 rushers):** presión (hit+hurry+sack) 46.2% con DB (n=733) contra 35.9% sin DB (n=7,406); con 4 rushers 37.8% (n=156) contra 35.0% (n=5,855); con 5 rushers 48.7% (n=571) contra 45.7% (n=1,118). Yardas por jugada 6.60 contra 6.57. Blitz de DB en 3er down 14.2%, 4º 16.0%.
- **Archivos y columnas:** F (pff_role = 'Pass Rush', pff_positionLinedUp, pff_hit, pff_hurry, pff_sack), J (officialPosition), P (playResult, passResult, down, pff_passCoverage). Uniones: F↔J por nflId 100%; F↔P 100%.
- **Pantalla:** (1) presión con y sin DB; (2) la misma comparación a igual número de rushers; (3) tasa de blitz por posición y down.
- **Riesgos:** (1) definición de "perímetro": probar con OLB como alternativa; (2) efecto de yardas cambia por mitad (6.34 contra 6.92 en DB blitz, semanas 1-4 y 5-8): declararlo ruido; (3) la presión es etiqueta PFF, no medida: contrastar con la tasa de sack (9.4% con DB contra 6.0% sin DB, hasta 5 rushers).
- **Fuera:** causalidad, EPA, ranking de equipos.
- **Confirmación:** mitades: presión 48.6% contra 36.2% (semanas 1-4) y 43.4% contra 35.6% (5-8). Otra temporada: no hay datos en data/.

### Una recomendación
Hacer **C1 "Reloj del sack"**. Es el único con contraste grande (51 puntos, estable en las dos mitades), usa lo que otros hallazgos no pueden (tracking con eventos de snap y sack) y se comunica con una línea de tiempo. Riesgo principal: los 36 sacks sin evento, que se verifica en minutos.

## 6. Paso 4: originalidad. Dónde ya existe y qué proponer

**Qué sitios revisar antes de afirmar que no existe (todo sin confirmar, de memoria):**
| Hallazgo | Revisar |
|---|---|
| C1 Reloj del sack | Next Gen Stats (nextgenstats.nfl.com, tiempo de lanzamiento y presión), PFF (pff.com, tiempo en la bolsa), ESPN (Pass Block Win Rate). Lo probable: existen el tiempo de lanzamiento y la presión; la división "sack de línea contra sack de cobertura por segundo" no la he visto, hay que comprobarlo |
| C3 Castigos | nflpenalties.com y Pro Football Reference. Probable que existan conteos por castigo; no he visto DPI por profundidad |
| C2 Blitz de secundaria | PFF y Pro Football Reference ofrecen tasas de blitz por equipo; no he visto la comparación a igual número de rushers |
| C6 Receptores | PFF (yardas por ruta contra man/zone), NGS, FTN Data: existe, originalidad baja |

**Propuesta nueva (N1): "Qué tanto delata la defensa su cobertura antes del snap"** (lectura pre-snap contra disfraz).
- **Pregunta:** ¿qué alineación al snap predice Man o Zone, y qué defensas la disfrazan?
- **Dato real, sin inventar:** T en el frame del snap (x, y, playDirection, balón → profundidad respecto a la línea de golpeo), F (pff_positionLinedUp, pff_role) y P (pff_passCoverageType, etiqueta de PFF). Carga: un frame por jugada (196,259 filas) en menos de 4 s.
- **Medido:** profundidad media de los dos CB al snap: hasta 2 yd, 61% Man (n=1,275); más de 8 yd, 11% (n=928). Safeties a 8 yd o más: 0 profundos, 45% Man (n=538); 2 profundos, 19% (n=3,811). Con una tabla (profundidad CB × safeties profundos) entrenada en semanas pares y probada en impares, la correlación con Man es 0.43. Hay 868 jugadas (10.8%) donde la alineación dice una cosa y la cobertura es la contraria: recepción 49.5% contra 55.2% en el resto. La diferencia de yardas (+0.29) no es concluyente y no se afirma.
- **Contraste por equipo:** error medio de la lectura 0.235 (LA, el más legible) a 0.453 (NE, el que más disfraza). La correlación entre semanas 1-4 y 5-8 es 0.63: es una característica del equipo, no ruido. Con 211-318 jugadas por equipo; hay que declarar el intervalo.
- **Decisión que habilita:** coach ofensivo y QB: qué tanto confiar en la lectura pre-snap contra cada rival. Broadcaster: "esta defensa engaña [X]% de las veces".
- **Stack:** tabla de búsqueda con pandas y numpy, sin librerías de aprendizaje automático.
- **Riesgos:** (1) PFF etiqueta la cobertura con criterio propio: las "Man" mezclan Cover-1 y Cover-0; (2) la profundidad respecto al balón se probó en 8,040 jugadas (Man y Zone con CB alineados); faltan 517 (Other y sin CB); (3) intervalo por equipo grande: ranking solo en extremos.
- **No se puede confirmar:** no existe otra temporada con tracking en data/.
