// Motor de Reglas y Validaciones en Tiempo Real - Fonda Fanegas Comunio Mundial
// Valida todas las acciones antes de registrar compras en Firestore.

window.validarPresupuesto = function(presupuestoActual, precioJugador, maxCreditoDescubierto = -5000000) {
  if (presupuestoActual - precioJugador < maxCreditoDescubierto) {
    const limiteM = Math.abs(maxCreditoDescubierto / 1000000);
    return {
      isValid: false,
      error: `Presupuesto insuficiente. Tu saldo neto no puede ser inferior a -${limiteM}M$ (límite de crédito de descubierto de la liga).`
    };
  }
  return { isValid: true, error: null };
}

/**
 * Valida que no se supere el límite de 3 jugadores de un mismo país.
 * @param {Array} jugadoresActuales - Lista de objetos de jugadores que ya posee
 * @param {string} paisNuevoJugador - Nombre del país del jugador que desea comprar
 * @param {number} maxPorPais - Límite configurable (por defecto 3)
 * @returns {{isValid: boolean, error: string|null}}
 */
window.validarLímitePais = function(jugadoresActuales, paisNuevoJugador, maxPorPais = 3) {
  const count = jugadoresActuales.filter(p => p.pais === paisNuevoJugador).length;
  if (count >= maxPorPais) {
    return {
      isValid: false,
      error: `Límite por país superado. Ya tienes ${count} jugadores de ${paisNuevoJugador} en tu plantilla (Máximo permitido: ${maxPorPais}).`
    };
  }
  return { isValid: true, error: null };
}

/**
 * Valida que no se superen los cupos específicos por posición para la plantilla de 15:
 * 2 Porteros, 5 Defensas, 5 Mediocampistas, 3 Delanteros.
 * @param {Array} jugadoresActuales - Lista de objetos de jugadores que ya posee
 * @param {string} posicionNueva - "portero", "defensa", "mediocampista", "delantero"
 * @returns {{isValid: boolean, error: string|null}}
 */
window.validarLímitePosicion = function(jugadoresActuales, posicionNueva) {
  const LIMITES = {
    portero: 2,
    defensa: 5,
    mediocampista: 5,
    delantero: 3
  };

  const count = jugadoresActuales.filter(p => p.posicion === posicionNueva).length;
  const limite = LIMITES[posicionNueva];

  if (count >= limite) {
    const posNombre = posicionNueva === "portero" ? "Porteros" : 
                      posicionNueva === "defensa" ? "Defensas" :
                      posicionNueva === "mediocampista" ? "Mediocampistas" : "Delanteros";
    return {
      isValid: false,
      error: `Cupo de posición completo. Ya tienes el máximo de ${limite} ${posNombre} permitidos en tu plantilla de 15.`
    };
  }
  return { isValid: true, error: null };
}

/**
 * Valida si la formación táctica de titulares elegida es reglamentaria.
 * @param {Object} titulares - Objeto que contiene las listas de IDs titulares: { portero: [], defensas: [], mediocampistas: [], delanteros: [] }
 * @returns {{isValid: boolean, error: string|null}}
 */
window.validarFormacionTitulares = function(titulares) {
  const numGk = (titulares.portero || []).length;
  const numDf = (titulares.defensas || []).length;
  const numMf = (titulares.mediocampistas || []).length;
  const numFw = (titulares.delanteros || []).length;

  const totalTitulares = numGk + numDf + numMf + numFw;

  if (totalTitulares !== 11) {
    return { isValid: false, error: `Tu once titular debe tener exactamente 11 jugadores activos (tienes ${totalTitulares}).` };
  }

  if (numGk !== 1) {
    return { isValid: false, error: "Debes alinear exactamente a 1 Portero en el once titular." };
  }

  if (numDf < 3 || numDf > 5) {
    return { isValid: false, error: `Formación no reglamentaria. Debes alinear entre 3 y 5 Defensas titulares (tienes ${numDf}).` };
  }

  if (numMf < 3 || numMf > 5) {
    return { isValid: false, error: `Formación no reglamentaria. Debes alinear entre 3 y 5 Mediocampistas titulares (tienes ${numMf}).` };
  }

  if (numFw < 1 || numFw > 3) {
    return { isValid: false, error: `Formación no reglamentaria. Debes alinear entre 1 y 3 Delanteros titulares (tienes ${numFw}).` };
  }

  return { isValid: true, error: null };
}
