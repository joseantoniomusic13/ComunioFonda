const https = require('https');

function getJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  try {
    const team = await getJSON('https://mundial-fonda-default-rtdb.europe-west1.firebasedatabase.app/leagues/FF-FONDA/users/joseantonio13/team.json');
    const players = await getJSON('https://mundial-fonda-default-rtdb.europe-west1.firebasedatabase.app/players.json');
    
    const activeJornada = 'Jornada 2';
    const titulares = team.alineacion?.titulares || {};
    const suplentes = team.alineacion?.suplentes || {};
    const capitanId = team.capitan_id || "";
    
    const chips = team.chips || {};
    const hasSuperBanquillo = chips.super_banquillo?.usado_en_jornada === activeJornada;
    const hasJugador12 = chips.jugador_12?.usado_en_jornada === activeJornada;
    const extraPlayerId = chips.jugador_12?.jugador_extra_id;
    const hasCapitanMaximo = chips.capitan_maximo?.usado_en_jornada === activeJornada;
    const motivacionMap = team.motivacion_plus || {};
    
    console.log('hasCapitanMaximo in Jornada 2:', hasCapitanMaximo);
    
    const titularesIds = [
      ...(titulares.portero || []),
      ...(titulares.defensas || []),
      ...(titulares.mediocampistas || []),
      ...(titulares.delanteros || [])
    ];
    
    let maxPointsPlayerId = "";
    let maxPointsVal = -999;
    
    console.log('\n--- TITULARES ---');
    titularesIds.forEach(id => {
      const p = players[id];
      if (p) {
        const pts = p.puntos_jornadas?.[activeJornada] || 0;
        console.log(`${p.nombre} (${id}): ${pts} pts`);
        if (pts > maxPointsVal) {
          maxPointsVal = pts;
          maxPointsPlayerId = id;
        }
      } else {
        console.log(`Player ${id} not found in players!`);
      }
    });
    
    console.log(`\nMax points player in titulares: ${maxPointsPlayerId} (${maxPointsVal} pts)`);
    
    let puntosJornada = 0;
    titularesIds.forEach(id => {
      const p = players[id];
      if (p) {
        let pts = p.puntos_jornadas?.[activeJornada] || 0;
        let base = pts;
        let bonus = '';
        if (motivacionMap[id]) {
          pts += 2;
          bonus += ' + 2 (motivacion)';
        }
        if (hasCapitanMaximo) {
          if (id === maxPointsPlayerId) {
            pts = pts * 3;
            bonus += ' x 3 (Capitan Maximo)';
          }
        } else {
          if (id === capitanId) {
            pts = pts * 2;
            bonus += ' x 2 (Capitan)';
          }
        }
        puntosJornada += pts;
        console.log(`${p.nombre}: base=${base}, final=${pts} (${bonus})`);
      }
    });
    
    console.log('\n--- SUPLENTES ---');
    const suplentesIds = [
      ...(suplentes.portero || []),
      ...(suplentes.defensas || []),
      ...(suplentes.mediocampistas || []),
      ...(suplentes.delanteros || [])
    ];
    const suplentesConPuntos = [];
    suplentesIds.forEach(id => {
      const p = players[id];
      if (p) {
        const pts = p.puntos_jornadas?.[activeJornada] || 0;
        suplentesConPuntos.push({ id, name: p.nombre, puntos: pts });
      }
    });
    
    suplentesConPuntos.sort((a, b) => b.puntos - a.puntos);
    const mejoresSuplentes = suplentesConPuntos.slice(0, 2);
    mejoresSuplentes.forEach(item => {
      let pts = item.puntos;
      let finalPts = hasSuperBanquillo ? pts : Math.round((pts / 2) * 10) / 10;
      puntosJornada += finalPts;
      console.log(`${item.name} (${item.id}): base=${pts}, final=${finalPts} (suplente)`);
    });
    
    // 12o jugador extra
    if (hasJugador12 && extraPlayerId) {
      const pExtra = players[extraPlayerId];
      if (pExtra) {
        const ptsExtra = pExtra.puntos_jornadas?.[activeJornada] || 0;
        puntosJornada += ptsExtra;
        console.log(`\n--- 12º JUGADOR ---`);
        console.log(`${pExtra.nombre} (${extraPlayerId}): base=${ptsExtra}, final=${ptsExtra} (12º Jugador)`);
      }
    }
    
    console.log('\nTotal calculated points for Jornada 2:', puntosJornada);
    console.log('Saved in database for Jornada 2:', team.puntos_por_jornada?.['Jornada 2']);
  } catch (e) {
    console.error(e);
  }
}

main();
