// ==========================================
// MAPA
// ==========================================

let mapa;
let marcadores;

function iniciarMapa() {

    mapa = L.map("map").setView([39.6, -8.0], 7);

    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 19,
            attribution: "© OpenStreetMap"
        }
    ).addTo(mapa);

    marcadores = L.layerGroup().addTo(mapa);

}

// ==========================================
// DESENHAR PEDIDOS
// ==========================================

function desenharPedidos(listaPedidos) {

    marcadores.clearLayers();

    listaPedidos.forEach((p, indice) => {

        if (!p["Pickup Lat"] || !p["Pickup Lng"])
            return;

        let lat = Number(p["Pickup Lat"]);
        let lng = Number(p["Pickup Lng"]);

        // Pequeno deslocamento para evitar sobreposição
        const deslocamento = 0.00008 * indice;

        if (p["Transport Type"] === "Shared") {
            lat += deslocamento;
            lng += deslocamento;
        } else {
            lat -= deslocamento;
            lng -= deslocamento;
        }

        const cor =
            p["Transport Type"] === "Shared"
                ? "#F4C400"
                : "#444444";

        L.circleMarker(
            [lat, lng],
            {
                radius: 7,
                color: cor,
                fillColor: cor,
                fillOpacity: 0.9,
                weight: 2
            }
        )
        .bindPopup(`
            <b>${p["Pickup Cidade"] || "Sem cidade"}</b><br>

            💶 ${(Number(p["Monthly Fee"]) || 0).toLocaleString("pt-PT")} €<br>

            👥 ${p["Transport Type"]}<br>

            📅 ${p["Dias"]}<br>

            📍 ${p["Pickup"] || ""}
        `)
        .addTo(marcadores);

    });

}
console.log("Mapa.js carregado");
