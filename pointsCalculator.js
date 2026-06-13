// Calculador de Puntos Oficial - Comunio Mundial 2026
// Implementa las reglas oficiales de puntuación basadas en valoraciones Sportmonks.
// La "valoracion" es una nota de 0.0 a 10.0 otorgada por el sistema de estadísticas.

/**
 * Convierte la valoración Sportmonks (0.0 - 10.0) a puntos según la tabla oficial.
 * @param {number} rating - Valoración del partido (ej: 7.3)
 * @returns {number} Puntos base por valoración
 */
window.ratingToPoints = function(rating) {
  if (rating === null || rating === undefined || rating < 0) return 0;
  if (rating <= 1.0)  return -6;
  if (rating <= 2.0)  return -5;
  if (rating <= 2.5)  return -4;
  if (rating <= 3.5)  return -3;
  if (rating <= 4.0)  return -2;
  if (rating <= 4.9)  return -1;
  if (rating <= 5.0)  return  0;
  if (rating <= 5.9)  return  1;
  if (rating <= 6.5)  return  2;
  if (rating <= 6.7)  return  3;
  if (rating <= 6.9)  return  4;
  if (rating <= 7.1)  return  5;
  if (rating <= 7.3)  return  6;
  if (rating <= 7.5)  return  7;
  if (rating <= 7.7)  return  8;
  if (rating <= 7.9)  return  9;
  if (rating <= 8.1)  return 10;
  if (rating <= 8.4)  return 11;
  if (rating <= 8.7)  return 12;
  if (rating <= 9.0)  return 13;
  if (rating <= 9.3)  return 14;
  return 15; // 9.4 - 10.0
}

/**
 * Calcula los puntos totales de un jugador en una jornada según sus estadísticas y posición.
 *
 * @param {Object}  stats             - Estadísticas reales del jugador en el partido
 * @param {string}  posicion          - "portero" | "defensa" | "mediocampista" | "delantero"
 * @param {boolean} faseEliminatoria  - Si true, los puntos se duplican
 * @returns {number} Puntuación total calculada
 */
window.calcularPuntosJugador = function(stats = {}, posicion = "delantero", faseEliminatoria = false) {
  let puntos = 0;

  // ─── 1. VALORACIÓN BASE (Sportmonks rating → tabla oficial) ────────────────
  const rating = stats.valoracion ?? null;
  puntos += ratingToPoints(rating);

  // ─── 2. GOLES (dependen de la posición. Porteros no tienen goles de campo) ──
  if (posicion !== "portero") {
    const goles = stats.goles || 0;
    if (goles > 0) {
      const golesPorPos = {
        defensa:       5,
        mediocampista: 4,
        delantero:     3
      };
      puntos += goles * (golesPorPos[posicion] ?? 3);
    }

    // ─── 3. ASISTENCIAS (+1 pt por asistencia, cualquier posición excepto portero) ──
    const asistencias = stats.asistencias || 0;
    puntos += asistencias * 1;
  }

  // ─── 4. EXPULSIONES Y AMARILLAS ────────────────────────────────────────────
  // Amarilla sencilla: -1 pt
  const amarillas = stats.tarjetas_amarillas || 0;
  if (amarillas === 1) {
    puntos += -1;
  }

  // Roja directa: -4 pts | Doble amarilla (roja por doble): -2 pts
  if (stats.tarjetas_rojas_directas > 0)   puntos += stats.tarjetas_rojas_directas  * -4;
  if (stats.tarjetas_rojas_doble_amarilla > 0) puntos += stats.tarjetas_rojas_doble_amarilla * -2;
  // Compatibilidad con campo legacy tarjetas_rojas (asumimos roja directa si se usa)
  if (!stats.tarjetas_rojas_directas && !stats.tarjetas_rojas_doble_amarilla && stats.tarjetas_rojas > 0) {
    puntos += stats.tarjetas_rojas * -4;
  }

  // ─── 5. PENALTIS ────────────────────────────────────────────────────────────
  // Penalti anotado: +3 pts (cualquier posición excepto portero)
  if (posicion !== "portero") {
    const penaltisMarcados = stats.penaltis_marcados || 0;
    puntos += penaltisMarcados * 3;
  }

  // Penalti parado por portero: +3 pts
  if (posicion === "portero") {
    const penaltisParados = stats.penaltis_parados || 0;
    puntos += penaltisParados * 3;
  }

  // ─── 6. PORTERÍA A CERO ────────────────────────────────────────────────────
  // Portero con portería a cero: +4 pts
  if (posicion === "portero") {
    const pCero = stats.porteria_a_cero === true || stats.porteria_a_cero === 1 || stats.porteria_a_cero === "1" || stats.porteria_a_cero === "yes";
    if (pCero) {
      puntos += 4;
    }
  }

  // ─── 7. GOLES EN PROPIA (-2 pts por autogol, cualquier posición) ───────────
  const golesEnPropia = stats.goles_en_propia || 0;
  puntos -= golesEnPropia * 2;

  // ─── 8. FASE ELIMINATORIA: PUNTOS EN DOBLE ──────────────────────────────────
  // "En la fase eliminatoria, serán dados puntos en doble."
  // No se aplican puntos negativos por posiciones vacías en eliminatorias.
  if (faseEliminatoria) {
    puntos = puntos * 2;
  }

  return puntos;
}

/**
 * Calcula la penalización por posiciones vacías en la alineación de un mánager.
 * Regla: -4 PTS por cada posición titular vacía no cubierta por suplente.
 * Excepción: Si TODAS las posiciones están vacías → 0 penalización.
 * En fase eliminatoria → 0 penalización.
 *
 * Formación base: 1 POR, 4 DFC, 4 MC, 2 DEL = 11 titulares
 *
 * @param {Object}  alineacion        - { titulares: {...}, suplentes: {...} }
 * @param {boolean} faseEliminatoria  - Si true, no hay penalización
 * @returns {number} Puntos negativos (0 o negativo)
 */
window.calcularPenalizacionPosicionesVacias = function(alineacion = {}, faseEliminatoria = false) {
  if (faseEliminatoria) return 0;

  const titulares = alineacion.titulares || {};
  const suplentes = alineacion.suplentes || {};

  // Cupo esperado por posición (4-4-2)
  const cuposEsperados = {
    portero:        1,
    defensas:       4,
    mediocampistas: 4,
    delanteros:     2
  };

  // Contar total de titulares
  let totalTitulares = 0;
  Object.values(cuposEsperados).forEach(cupo => { totalTitulares += cupo; });

  const ocupadosTitulares = [
    ...(titulares.portero        || []),
    ...(titulares.defensas       || []),
    ...(titulares.mediocampistas || []),
    ...(titulares.delanteros     || [])
  ].length;

  // Si TODAS las posiciones están vacías → sin penalización
  if (ocupadosTitulares === 0) return 0;

  let penalizacion = 0;

  // Para cada posición, calcular huecos y verificar si el banco los cubre
  for (const [pos, cupo] of Object.entries(cuposEsperados)) {
    const ocupadosTit = (titulares[pos] || []).length;
    const huecosTit   = cupo - ocupadosTit;

    if (huecosTit > 0) {
      // ¿Hay suplentes disponibles en esa posición?
      const disponiblesBanco = (suplentes[pos] || []).length;
      // Cada hueco cubierto por el banco evita la penalización
      const huecosSinCubrir = Math.max(0, huecosTit - disponiblesBanco);
      penalizacion += huecosSinCubrir * -4;
    }
  }

  return penalizacion;
}

/**
 * Calcula los puntos de apuesta de un mánager según el resultado real.
 * Reglas:
 *   - Pronóstico exacto:              +3 PTS
 *   - Diferencia de goles correcta:   +2 PTS
 *   - Tendencia correcta (ganador):   +1 PT
 *   - Empate acertado (no exacto):    +1 PT
 *
 * @param {{ local: number, visitante: number }} pronostico - Predicción del mánager
 * @param {{ local: number, visitante: number }} resultado  - Resultado real
 * @returns {number} Puntos ganados (0-3)
 */
window.calcularPuntosApuesta = function(pronostico, resultado) {
  if (!pronostico || !resultado) return 0;

  const pL = pronostico.local;
  const pV = pronostico.visitante;
  const rL = resultado.local;
  const rV = resultado.visitante;

  // Resultado exacto
  if (pL === rL && pV === rV) return 3;

  // Diferencia de goles correcta (ej: 2-0 vs 3-1, ambos +2)
  if (pL - pV === rL - rV && rL !== rV) return 2;

  // Tendencia correcta: mismo ganador o empate
  const tendenciaProno   = Math.sign(pL - pV);
  const tendenciaResult  = Math.sign(rL - rV);

  if (tendenciaProno === tendenciaResult) {
    // Empate acertado pero no exacto → ya no puede llegar aquí (exacto se captura arriba)
    return 1;
  }

  return 0;
}
