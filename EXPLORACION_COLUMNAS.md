# Detalle de columnas (solo consulta)

Medido el 2026-11-20. Generado por `backend/explorar.py`. No leer completo: buscar la tabla o columna necesaria.
`nulos` = % de NaN tras leer con pandas. `crudo` = textos nulos literales en el CSV (pandas los convierte en NaN).

## data/games.csv (juegos; 122 filas)

| columna | tipo | nulos | crudo | ejemplos |
|---|---|---|---|---|
| gameId | int64 | 0.0% |  | 2021090900, 2021091200, 2021091201 |
| season | int64 | 0.0% |  | 2021 |
| week | int64 | 0.0% |  | 1, 2, 3 |
| gameDate | object | 0.0% |  | 09/09/2021, 09/12/2021, 09/13/2021 |
| gameTimeEastern | object | 0.0% |  | 20:20:00, 13:00:00, 16:25:00 |
| homeTeamAbbr | object | 0.0% |  | TB, ATL, BUF |
| visitorTeamAbbr | object | 0.0% |  | DAL, PHI, PIT |

## data/pffScoutingData.csv (scouting; 188,254 filas)

| columna | tipo | nulos | crudo | ejemplos |
|---|---|---|---|---|
| gameId | int64 | 0.0% |  | 2021090900, 2021091200, 2021091201 |
| playId | int64 | 0.0% |  | 97, 137, 187 |
| nflId | int64 | 0.0% |  | 25511, 35481, 35634 |
| pff_role | object | 0.0% |  | Pass, Pass Route, Pass Block |
| pff_positionLinedUp | object | 0.0% |  | QB, TE-L, LWR |
| pff_hit | float64 | 50.0% | NA:94127 | 0.0, 1.0 |
| pff_hurry | float64 | 50.0% | NA:94127 | 1.0, 0.0 |
| pff_sack | float64 | 50.0% | NA:94127 | 0.0, 1.0 |
| pff_beatenByDefender | float64 | 74.5% | NA:140167 | 0.0, 1.0 |
| pff_hitAllowed | float64 | 74.5% | NA:140167 | 0.0, 1.0 |
| pff_hurryAllowed | float64 | 74.5% | NA:140167 | 0.0, 1.0 |
| pff_sackAllowed | float64 | 74.5% | NA:140167 | 0.0, 1.0 |
| pff_nflIdBlockedPlayer | float64 | 75.3% | NA:141728 | 44955.0, 42403.0, 53441.0 |
| pff_blockType | object | 74.6% | NA:140350 | SW, PP, PT |
| pff_backFieldBlock | float64 | 74.6% | NA:140351 | 0.0, 1.0 |

## data/players.csv (jugadores; 1,679 filas)

| columna | tipo | nulos | crudo | ejemplos |
|---|---|---|---|---|
| nflId | int64 | 0.0% |  | 25511, 28963, 29550 |
| height | object | 0.0% |  | 6-4, 6-5, 6-2 |
| weight | int64 | 0.0% |  | 225, 240, 328 |
| birthDate | object | 13.8% | NA:232 | 1977-08-03, 1982-03-02, 1982-01-22 |
| collegeName | object | 13.3% | NA:224 | Michigan, Miami, O., Arkansas |
| officialPosition | object | 0.0% |  | QB, T, TE |
| displayName | object | 0.0% |  | Tom Brady, Ben Roethlisberger, Jason Peters |

## data/plays.csv (jugadas; 8,557 filas)

| columna | tipo | nulos | crudo | ejemplos |
|---|---|---|---|---|
| gameId | int64 | 0.0% |  | 2021090900, 2021091200, 2021091201 |
| playId | int64 | 0.0% |  | 97, 137, 187 |
| playDescription | object | 0.0% |  | (13:33) (Shotgun) T.Brady pass incomp…, (13:18) (Shotgun) D.Prescott pass dee…, (12:23) (Shotgun) D.Prescott pass sho… |
| quarter | int64 | 0.0% |  | 1, 2, 3 |
| down | int64 | 0.0% |  | 3, 1, 2 |
| yardsToGo | int64 | 0.0% |  | 2, 10, 6 |
| possessionTeam | object | 0.0% |  | TB, DAL, ATL |
| defensiveTeam | object | 0.0% |  | DAL, TB, PHI |
| yardlineSide | object | 1.5% | :125 | TB, DAL, ATL |
| yardlineNumber | int64 | 0.0% |  | 33, 2, 34 |
| gameClock | object | 0.0% |  | 13:33, 13:18, 12:23 |
| preSnapHomeScore | int64 | 0.0% |  | 0, 7, 14 |
| preSnapVisitorScore | int64 | 0.0% |  | 0, 7, 13 |
| passResult | object | 0.0% |  | I, C, S |
| penaltyYards | float64 | 91.2% | NA:7801 | 0.0, 14.0, 5.0 |
| prePenaltyPlayResult | int64 | 0.0% |  | 0, 28, 5 |
| playResult | int64 | 0.0% |  | 0, 28, 5 |
| foulName1 | object | 91.4% | NA:7821 | Illegal Use of Hands, Taunting, Defensive Pass Interference |
| foulNFLId1 | float64 | 91.4% | NA:7821 | 52459.0, 40151.0, 46132.0 |
| foulName2 | object | 99.6% | NA:8527 | Unnecessary Roughness, Face Mask (15 Yards), Tripping |
| foulNFLId2 | float64 | 99.6% | NA:8527 | 44955.0, 47877.0, 47911.0 |
| foulName3 | object | 100.0% | NA:8556 | Illegal Contact |
| foulNFLId3 | float64 | 100.0% | NA:8556 | 46190.0 |
| absoluteYardlineNumber | float64 | 0.0% | NA:1 | 43.0, 108.0, 76.0 |
| offenseFormation | object | 0.1% | NA:7 | SHOTGUN, EMPTY, SINGLEBACK |
| personnelO | object | 0.0% | NA:1 | 1 RB, 1 TE, 3 WR, 1 RB, 2 TE, 2 WR, 0 RB, 2 TE, 3 WR |
| defendersInBox | float64 | 0.1% | NA:7 | 6.0, 7.0, 5.0 |
| personnelD | object | 0.0% | NA:1 | 4 DL, 2 LB, 5 DB, 4 DL, 4 LB, 3 DB, 3 DL, 3 LB, 5 DB |
| dropBackType | object | 6.2% | NA:528 | TRADITIONAL, SCRAMBLE_ROLLOUT_RIGHT, DESIGNED_ROLLOUT_RIGHT |
| pff_playAction | int64 | 0.0% |  | 0, 1 |
| pff_passCoverage | object | 0.0% |  | Cover-1, Cover-3, Cover-6 |
| pff_passCoverageType | object | 0.0% |  | Man, Zone, Other |

## data/tracking/tracking_2021090900.csv (tracking; 92,644 filas) [una partición de varias]

| columna | tipo | nulos | crudo | ejemplos |
|---|---|---|---|---|
| gameId | int64 | 0.0% |  | 2021090900 |
| playId | int64 | 0.0% |  | 97, 137, 187 |
| nflId | float64 | 4.3% | NA:4028 | 25511.0, 35481.0, 35634.0 |
| frameId | int64 | 0.0% |  | 1, 2, 3 |
| time | object | 0.0% |  | 2021-09-10T00:26:31Z, 2021-09-10T00:26:32Z, 2021-09-10T00:26:33Z |
| jerseyNumber | float64 | 4.3% | NA:4028 | 12.0, 87.0, 81.0 |
| team | object | 0.0% |  | TB, DAL, football |
| playDirection | object | 0.0% |  | right, left |
| x | float64 | 0.0% |  | 37.77, 37.78, 37.73 |
| y | float64 | 0.0% |  | 24.22, 24.24, 24.25 |
| s | float64 | 0.0% |  | 0.29, 0.23, 0.16 |
| a | float64 | 0.0% |  | 0.3, 0.11, 0.1 |
| dis | float64 | 0.0% |  | 0.03, 0.02, 0.01 |
| o | float64 | 4.3% | NA:4028 | 165.16, 164.33, 160.24 |
| dir | float64 | 4.3% | NA:4028 | 84.99, 92.87, 68.55 |
| event | object | 92.8% | None:85997 | ball_snap, autoevent_passforward, pass_forward |
