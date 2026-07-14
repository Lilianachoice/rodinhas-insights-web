// ==========================================
// MAPA
// ==========================================

let mapa;
let marcadores;

// Guarda todos os marcadores dos clusters
const marcadoresClusters = {};

// ==========================================
// INICIAR MAPA
// ==========================================

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

    // Limpa a lista dos marcadores anteriores
    Object.keys(marcadoresClusters).forEach(id => {
        delete marcadoresClusters[id];
    });

    clusters.forEach((cluster, indice) => {

        // ID interno do cluster
        cluster.id = indice;

        let cor = "#2196F3";

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

        // Guarda o marcador
        marcadoresClusters[cluster.id] = marcador;

    });

}

// ==========================================
// MOSTRAR UM CLUSTER NO MAPA
// ==========================================

function mostrarCluster(id) {

    const marcador = marcadoresClusters[id];

    if (!marcador)
        return;

    mapa.flyTo(
        marcador.getLatLng(),
        11,
        {
            animate: true,
            duration: 1.2
        }
    );

    setTimeout(() => {

        marcador.openPopup();

    }, 900);

}

console.log("MAPA NOVO 14 JULHO");
