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

    listaPedidos.forEach(p => {

        if (!p["Pickup Lat"])
            return;

        const cor =
            p["Transport Type"] === "Shared"
                ? "#F4C400"
                : "#333333";

        L.circleMarker(
            [
                Number(p["Pickup Lat"]),
                Number(p["Pickup Lng"])
            ],
            {
                radius: 7,
                color: cor,
                fillColor: cor,
                fillOpacity: 0.9
            }
        )
        .bindPopup(`
            <b>${p["Pickup Cidade"] || "Sem cidade"}</b><br>

            💶 ${(Number(p["Monthly Fee"]) || 0).toLocaleString("pt-PT")} €<br>

            👥 ${p["Transport Type"]}<br>

            📅 ${p["Dias"]}
        `)
        .addTo(marcadores);

    });

}
