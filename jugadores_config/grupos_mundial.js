// Grupos del Mundial 2026 - Fonda Fanegas Comunio
// 48 selecciones distribuidas en 12 grupos de 4 equipos cada uno.

window.GRUPOS_MUNDIAL = [
  {
    id: "A",
    nombre: "Grupo A",
    equipos: ["México", "Corea del Sur", "República Checa", "Sudáfrica"]
  },
  {
    id: "B",
    nombre: "Grupo B",
    equipos: ["Suiza", "Canadá", "Catar", "Bosnia y Herzegovina"]
  },
  {
    id: "C",
    nombre: "Grupo C",
    equipos: ["Brasil", "Marruecos", "Escocia", "Haití"]
  },
  {
    id: "D",
    nombre: "Grupo D",
    equipos: ["Estados Unidos", "Turquía", "Australia", "Paraguay"]
  },
  {
    id: "E",
    nombre: "Grupo E",
    equipos: ["Alemania", "Ecuador", "Costa de Marfil", "Curazao"]
  },
  {
    id: "F",
    nombre: "Grupo F",
    equipos: ["Países Bajos", "Japón", "Suecia", "Túnez"]
  },
  {
    id: "G",
    nombre: "Grupo G",
    equipos: ["Bélgica", "Irán", "Egipto", "Nueva Zelanda"]
  },
  {
    id: "H",
    nombre: "Grupo H",
    equipos: ["España", "Uruguay", "Arabia Saudita", "Cabo Verde"]
  },
  {
    id: "I",
    nombre: "Grupo I",
    equipos: ["Francia", "Senegal", "Noruega", "Irak"]
  },
  {
    id: "J",
    nombre: "Grupo J",
    equipos: ["Argentina", "Austria", "Argelia", "Jordania"]
  },
  {
    id: "K",
    nombre: "Grupo K",
    equipos: ["Portugal", "Colombia", "R.D. del Congo", "Uzbekistán"]
  },
  {
    id: "L",
    nombre: "Grupo L",
    equipos: ["Inglaterra", "Croacia", "Panamá", "Ghana"]
  }
];

// Mapa rápido: nombre de selección → ID de grupo
window.PAIS_A_GRUPO = window.GRUPOS_MUNDIAL.reduce((acc, grupo) => {
  grupo.equipos.forEach(equipo => {
    acc[equipo] = grupo.id;
  });
  return acc;
}, {});

// Obtiene el grupo completo de un país dado
window.getGrupoDePais = function(pais) {
  const grupoId = window.PAIS_A_GRUPO[pais];
  return window.GRUPOS_MUNDIAL.find(g => g.id === grupoId) ?? null;
}

// Obtiene los rivales de un país en su grupo
window.getRivalesDePais = function(pais) {
  const grupo = window.getGrupoDePais(pais);
  if (!grupo) return [];
  return grupo.equipos.filter(e => e !== pais);
}
