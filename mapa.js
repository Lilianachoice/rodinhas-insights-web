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
// DESENHAR CLUSTERS
// ==========================================

function desenharPedidos(clusters) {

    marcadores.clearLayers();

    clusters.forEach(cluster => {

        let cor = "#2196F3"; // misto (azul)

        if (cluster.shared > 0 && cluster.private == 0)
            cor = "#F4C400";

        if (cluster.private > 0 && cluster.shared == 0)
            cor = "#444444";

        const total =
            cluster.shared + cluster.private;

        const marcador = L.circleMarker(

            [cluster.lat, cluster.lng],

            {
                radius: 10 + Math.min(total, 10),

                color: cor,
                fillColor: cor,
                fillOpacity: 0.9,
                weight: 2
            }

        ).addTo(marcadores);

        marcador.bindTooltip(

            String(total),

            {
                permanent: true,
                direction: "center",
                className: "clusterLabel"
            }

        );

        marcador.bindPopup(`

            <b>${cluster.pedidos[0]["Pickup Cidade"] || "Sem cidade"}</b>

            <br><br>

            <b>${total}</b> pedidos

            <br><br>

            🟡 Shared: ${cluster.shared}<br>

            ⚫ Private: ${cluster.private}

            <br><br>

            💶 Receita mensal

            <br>

            <b>${cluster.receita.toLocaleString("pt-PT")} €</b>

        `);

    });

}
console.log("Mapa.js carregado");
