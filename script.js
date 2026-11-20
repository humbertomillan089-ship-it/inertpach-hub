// Base de datos de endpoints dividida para evitar recortes al copiar
const HOST_ESPN = "site.api.espn.com";
const RUTA_BASE = "/apis/site/v2/sports/soccer/";
const RUTA_TABLA = "/apis/v2/sports/soccer/";

let ligaSeleccionada = "uefa.champions";

window.onload = () => {
    actualizarTodo();
    setInterval(actualizarTodo, 30000);
};

function cambiarLiga() {
    const selector = document.getElementById('selector-liga');
    ligaSeleccionada = selector.value;
    document.getElementById('nombre-liga-actual').textContent = selector.options.item(selector.selectedIndex).text;
    actualizarTodo();
}

function mostrarVista(nombre) {
    document.querySelectorAll('.vista').forEach(v => v.classList.remove('activa'));
    document.getElementById('vista-' + nombre).classList.add('activa');

    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + nombre).classList.add('active');
}

async function actualizarTodo() {
    const etiquetaHora = document.getElementById('ultima-actualizacion');
    etiquetaHora.textContent = "Actualizando datos...";

    await Promise.all([
        cargarMarcadores(),
        cargarTablaPosiciones(),
        cargarNoticiasLiga()
    ]);

    const ahora = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    etiquetaHora.textContent = `Actualizado: ${ahora}`;
}

// 1. Marcadores en vivo, resultados y próximos partidos
async function cargarMarcadores() {
    const contResultados = document.getElementById('grid-resultados');
    const contProximos = document.getElementById('grid-proximos');
    const url = "https://" + HOST_ESPN + RUTA_BASE + ligaSeleccionada + "/scoreboard";

    try {
        const res = await fetch(url);
        const data = await res.json();
        const eventos = data.events || [];

        let htmlResultados = "";
        let htmlProximos = "";

        eventos.forEach(ev => {
            const comp = ev.competitions.at(0);
            const local = comp.competitors.find(c => c.homeAway === "home");
            const visita = comp.competitors.find(c => c.homeAway === "away");
            const estado = ev.status.type.state;
            const detalle = ev.status.type.shortDetail;
            const estadio = comp.venue ? comp.venue.fullName : "Sede oficial";
            const fecha = new Date(ev.date).toLocaleString('es-MX', {
                weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
            });

            if (estado === "pre") {
                htmlProximos += `
                    <div class="match-card">
                        <div class="match-header">
                            <span>${fecha}</span>
                            <span class="badge-estado">Programado</span>
                        </div>
                        <div class="match-body">
                            <div class="club-col">
                                <img src="${local.team.logo || ''}" alt="${local.team.shortDisplayName}">
                                <span>${local.team.shortDisplayName}</span>
                            </div>
                            <div class="score-box" style="font-size:1.2em; color:#94a3b8;">VS</div>
                            <div class="club-col">
                                <img src="${visita.team.logo || ''}" alt="${visita.team.shortDisplayName}">
                                <span>${visita.team.shortDisplayName}</span>
                            </div>
                        </div>
                        <div class="match-footer">${estadio}</div>
                    </div>
                `;
            } else {
                const claseVivo = estado === "in" ? "badge-estado badge-vivo" : "badge-estado";
                htmlResultados += `
                    <div class="match-card">
                        <div class="match-header">
                            <span>${fecha}</span>
                            <span class="${claseVivo}">${detalle}</span>
                        </div>
                        <div class="match-body">
                            <div class="club-col">
                                <img src="${local.team.logo || ''}" alt="${local.team.shortDisplayName}">
                                <span>${local.team.shortDisplayName}</span>
                            </div>
                            <div class="score-box">${local.score} - ${visita.score}</div>
                            <div class="club-col">
                                <img src="${visita.team.logo || ''}" alt="${visita.team.shortDisplayName}">
                                <span>${visita.team.shortDisplayName}</span>
                            </div>
                        </div>
                        <div class="match-footer">${estadio}</div>
                    </div>
                `;
            }
        });

        contResultados.innerHTML = htmlResultados || "<p style='color:#94a3b8;'>No hay partidos en curso o finalizados en esta jornada.</p>";
        contProximos.innerHTML = htmlProximos || "<p style='color:#94a3b8;'>No hay próximos partidos programados por el momento.</p>";

    } catch (error) {
        contResultados.innerHTML = `<p>Error al cargar marcadores: ${error.message}</p>`;
    }
}

// 2. Tabla de posiciones de la competición elegida
async function cargarTablaPosiciones() {
    const tbody = document.getElementById('tbody-tabla');
    const url = "https://" + HOST_ESPN + RUTA_TABLA + ligaSeleccionada + "/standings";

    try {
        const res = await fetch(url);
        const data = await res.json();
        const grupo = data.children.at(0);
        const entradas = grupo.standings.entries;

        tbody.innerHTML = entradas.map((item, idx) => {
            const equipo = item.team.displayName;
            const primerLogo = item.team.logos ? item.team.logos.at(0) : null;
            const logo = primerLogo ? primerLogo.href : "";
            const stats = {};
            item.stats.forEach(s => stats[s.name] = s.displayValue);
            const claseZona = idx < 4 ? "zona-champions" : (idx >= entradas.length - 3 ? "zona-descenso" : "");

            return `
                <tr class="${claseZona}">
                    <td><strong>${idx + 1}</strong></td>
                    <td>
                        <div class="celda-club">
                            <img src="${logo}" alt="${equipo}">
                            <strong>${equipo}</strong>
                        </div>
                    </td>
                    <td>${stats.gamesPlayed || 0}</td>
                    <td>${stats.wins || 0}</td>
                    <td>${stats.ties || 0}</td>
                    <td>${stats.losses || 0}</td>
                    <td>${stats.pointDifferential || 0}</td>
                    <td style="color:#f59e0b; font-weight:bold;">${stats.points || 0}</td>
                </tr>
            `;
        }).join('');

    } catch (error) {
        tbody.innerHTML = "<tr><td colspan='8'>Tabla de clasificación no disponible en este momento para este torneo.</td></tr>";
    }
}

// 3. Noticias de la liga internacional
async function cargarNoticiasLiga() {
    const contenedor = document.getElementById('grid-noticias');
    const url = "https://" + HOST_ESPN + RUTA_BASE + ligaSeleccionada + "/news";

    try {
        const res = await fetch(url);
        const data = await res.json();
        const articulos = data.articles || [];

        if (articulos.length > 0) {
            contenedor.innerHTML = articulos.slice(0, 6).map(art => {
                const imgObj = art.images && art.images.length > 0 ? art.images.at(0) : null;
                const imgHtml = imgObj ? `<img src="${imgObj.url}" alt="Noticia">` : "";
                const link = art.links && art.links.web ? art.links.web.href : "#";

                return `
                    <div class="news-card">
                        ${imgHtml}
                        <div class="news-content">
                            <h3>${art.headline}</h3>
                            <p>${art.description || ''}</p>
                            <a href="${link}" target="_blank">Leer artículo completo →</a>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            contenedor.innerHTML = "<p style='color:#94a3b8;'>No hay noticias disponibles para esta competición.</p>";
        }
    } catch (error) {
        contenedor.innerHTML = "<p style='color:#94a3b8;'>No se pudieron cargar las noticias en este momento.</p>";
    }
}
