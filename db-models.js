/**
 * Firebase Comunio Mundial 2026 - Modelos de Datos en Firestore (Referencia JSON)
 * 
 * Este archivo sirve como documentación y registro de esquemas de datos.
 * Define la estructura exacta que almacenaremos en la base de datos de Firestore.
 */

export const FirestoreSchemas = {
  // Colección: config_torneo
  // Documento: global
  config_torneo: {
    fase_actual: "fase_de_grupos",                  // "fase_de_grupos", "dieciseisavos", "octavos", etc.
    presupuesto_base: 100000000,                    // 100M$ (en valor numérico para validaciones)
    incremento_eliminatorias: 5000000,              // +5M$ al empezar la fase eliminatoria
    max_jugadores_por_pais: 3,                      // Limite editable por país
    mercado_abierto: true,                           // Si está permitido realizar fichajes
    fecha_limite_fichajes_ilimitados: "2026-06-11T16:00:00Z", // Fecha de inicio de la Copa del Mundo
    jornada_actual: 1,                              // Número de jornada
    limite_cambios_por_jornada: 3                   // Limite de cambios una vez iniciado el torneo (excepto antes de J1 y 1/16)
  },

  // Colección: users
  // Documento: {uid} (ID de Firebase Auth)
  users: {
    uid: "string",                                  // ID único generado por Auth
    email: "string",                                // Correo electrónico
    nombre_usuario: "string",                       // Nombre del mánager
    nombre_equipo: "string",                        // Nombre de su club fantasy
    fecha_registro: "string (ISO Date)",            // Fecha de alta
    presupuesto_actual: 100000000,                  // Presupuesto actual en dólares (ej: 100M o 105M) [Legacy/Deprecated]
    presupuesto_club: 100000000,                    // [Doble Divisa] Balance en dólares ($) exclusivo para el mercado tradicional de fichajes
    fonda_coins: 10,                                 // [Doble Divisa] Balance en Fonda Coins (FC) para apertura de sobres y apuestas deportivas
    puntos_totales: 0,                              // Suma acumulada de puntos de todas las jornadas
    puntos_jornada_actual: 0,                       // Puntos obtenidos en la jornada actual
    ranking_global: 1                               // Puesto en la clasificación general
  },

  // Colección: user_teams
  // Documento: {uid} (ID de Firebase Auth para mapeo directo 1:1 con el usuario)
  user_teams: {
    uid: "string",
    jugadores_ids: [],                              // Array de exactamente 15 IDs de jugadores
    alineacion: {
      titulares: {
        portero: [],                                // 1 Portero (ID del jugador)
        defensas: [],                               // 3 a 5 Defensas
        mediocampistas: [],                         // 3 a 5 Mediocampistas
        delanteros: []                              // 1 a 3 Delanteros (Total titulares = 11)
      },
      suplentes: {
        portero: [],                                // 1 Portero suplente
        defensas: [],                               // Suplentes para completar los 15 (4 suplentes en total)
        mediocampistas: [],
        delanteros: []
      }
    },
    capitan_id: "string (ID del jugador)",           // Puntos de este jugador se multiplican por 2
    siguiente_alineacion: {                         // Alineación preparada para la próxima jornada (se aplica al cambiar jornada)
      titulares: {},                                // Estructura idéntica a alineacion.titulares
      suplentes: {},                                // Estructura idéntica a alineacion.suplentes
      capitan_id: "string",                         // Capitán seleccionado para la siguiente jornada
      formacion: "string"                           // Formación táctica para la siguiente jornada
    },
    cambios_realizados_jornada: 0,                  // Contador de fichajes en la jornada en curso
    chips: {
      wildcard: {
        disponible: true,
        usado_en_jornada: null                      // Número de jornada si se usó, o null
      },
      jugador_12: {
        disponible: true,
        usado_en_jornada: null,
        jugador_extra_id: null                      // ID del 12º jugador activo en la jornada
      },
      capitan_maximo: {
        disponible: true,
        usado_en_jornada: null                      // Multiplica x3 automáticamente al de mayor puntuación
      },
      super_banquillo: {                            // Potenciador 5: ¡Se suman los puntos de los 4 suplentes!
        disponible: true,
        usado_en_jornada: null
      }
    }
  },

  // Colección: players
  // Documento: {id} (ID del futbolista)
  players: {
    id: "string",                                   // ID único
    nombre: "string",                               // Nombre del futbolista
    posicion: "portero",                            // "portero", "defensa", "mediocampista", "delantero"
    precio: 15000000,                               // Precio fijo (ej: 15M$)
    pais: "España",                                 // País para validación del límite de 3
    porcentaje_seleccionado: 0.0,                   // Frecuencia en las plantillas (para el Scout Bonus)
    puntos_totales: 0,                              // Historial total de puntos
    puntos_por_jornada: {                           // Puntos desglosados
      "1": 0,
      "2": 0
    },
    stats: {                                        // Estadísticas reales del jugador para el cálculo
      minutos_jugados: 0,
      goles: 0,
      goles_encajados: 0,
      asistencias: 0,
      tarjetas_amarillas: 0,
      tarjetas_rojas: 0,
      goles_en_propia: 0,
      penaltis_marcados: 0,
      penaltis_fallados: 0,
      penaltis_parados: 0,
      entradas_exito: 0,
      ocasiones_creadas: 0,
      tiros_a_puerta: 0,
      goles_tiro_libre: 0
    }
  }
};
