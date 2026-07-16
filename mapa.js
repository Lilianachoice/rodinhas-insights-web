// ==========================================
// MAPA
// ==========================================

let mapa;
let marcadores;

// Guarda todos os marcadores dos clusters
const marcadoresClusters = {};

// Lista dos clusters atualmente desenhados
let clustersAtuais = [];

// Cluster selecionado
let clusterSelecionado = null;

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

    clustersAtuais = clusters;

    marcadores.clearLayers();

    Object.keys(marcadoresClusters).forEach(id => {

        delete marcadoresClusters[id];

    });

    clusters.forEach((cluster, indice) => {

        cluster.id = indice;

        let cor = "#2196F3";

        if (cluster.shared > 0 && cluster.private === 0)
            cor = "#F4C400";

        if (cluster.private > 0 && cluster.shared === 0)
            cor = "#444444";

        const total =
            cluster.shared + cluster.private;

        const marcador = L.circleMarker(

            [

                cluster.lat,

                cluster.lng

            ],

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

        marcador.bindPopup(

            criarPopup(cluster)

        );

        marcador.on("click", () => {

            clusterSelecionado = cluster;
            mostrarDetalheCluster(cluster);

        });

        marcadoresClusters[cluster.id] = marcador;

    });

}

// ==========================================
// POPUP
// ==========================================

function criarPopup(cluster) {

    const cidade =
        cluster.pedidos[0]["Pickup Cidade"] || "Sem cidade";

    const total =
        cluster.pedidos.length;

    let cor = "🔵";
    let tipo = "Misto";

    if (cluster.shared > 0 && cluster.private === 0) {

        cor = "🟡";
        tipo = "Shared";

    }

    if (cluster.private > 0 && cluster.shared === 0) {

        cor = "⚫";
        tipo = "Private";

    }

    const score =
        cluster.score !== undefined ? cluster.score : "--";

    return `

<div class="popupCluster">

    <div class="popupCidade">

        📍 ${cidade}

    </div>

    <div class="popupTipo">

        ${cor} ${tipo}
        <span class="popupScore">Índice ${score}</span>

    </div>

    <hr>

    <div class="popupNumero">

        👥 ${total} pedidos • ${cluster.totalPassageiros || total} passageiros

    </div>

    <div class="popupReceita">

        💶 <b>${cluster.receita.toLocaleString("pt-PT")} € / mês</b>

    </div>

    <hr>

    <div
        class="popupLink"
        onclick="mostrarPedidosCluster(${cluster.id})">

        Ver detalhe do cluster →

    </div>

</div>

`;

}
// ==========================================
// MOSTRAR DETALHE DO CLUSTER
// ==========================================

function mostrarPedidosCluster(id) {

    const cluster =
        clustersAtuais.find(c => c.id === id);

    if (!cluster)
        return;

    mostrarDetalheCluster(cluster);

    document
        .getElementById("detalheCluster")
        .scrollIntoView({

            behavior: "smooth"

        });

}

function formatarHora(hora) {

    if (!hora)
        return "—";

    const minutos = horaParaMinutos(hora);

    if (minutos === null)
        return String(hora);

    const h = String(Math.floor(minutos / 60)).padStart(2, "0");
    const m = String(minutos % 60).padStart(2, "0");

    return `${h}:${m}`;

}

function mostrarDetalheCluster(cluster) {

    const detalhe =
        document.getElementById("detalheCluster");

    if (!detalhe)
        return;

    const total =
        cluster.pedidos.length;

    const score =
        cluster.score !== undefined ? cluster.score : "--";

    let html = `

<div class="clusterHeader">

    <div>

        <div class="clusterTitulo">

            ${cluster.pedidos[0]["Pickup Cidade"] || "Sem cidade"}

        </div>

        <div class="clusterSubtitulo">

            Cluster selecionado • Índice de Oportunidade
            <span class="badgeScore">${score}</span>

        </div>

    </div>

    <div class="clusterReceita">

        ${cluster.receita.toLocaleString("pt-PT")} €

    </div>

</div>

<div class="clusterInfo">

    <div class="infoBox">

        <div class="infoTitulo">

            Pedidos

        </div>

        <div class="infoValor">

            ${total}

        </div>

    </div>

    <div class="infoBox">

        <div class="infoTitulo">

            Passageiros

        </div>

        <div class="infoValor">

            ${cluster.totalPassageiros || total}

        </div>

    </div>

    <div class="infoBox">

        <div class="infoTitulo">

            Shared

        </div>

        <div class="infoValor">

            ${cluster.shared}

        </div>

    </div>

    <div class="infoBox">

        <div class="infoTitulo">

            Private

        </div>

        <div class="infoValor">

            ${cluster.private}

        </div>

    </div>

</div>

<div class="tabelaScrollWrapper">

<table class="tabelaPedidos">

<thead>

<tr>

<th>ID</th>
<th>Tipo</th>
<th>Hora Pickup</th>
<th>Morada Pickup</th>
<th>Morada Dropoff</th>
<th>Dias</th>
<th>Mensalidade</th>

</tr>

</thead>

<tbody>

`;

    cluster.pedidos.forEach(pedido => {

        const tipo =

            pedido["Transport Type"] === "Shared"

                ? '<span class="tipoShared">Shared</span>'

                : '<span class="tipoPrivate">Private</span>';

        const moradaPickup = [
            pedido["Pickup"],
            pedido["Pickup CP"],
            pedido["Pickup Cidade"]
        ].filter(Boolean).join(", ") || "—";

        const moradaDropoff = [
            pedido["Dropoff"],
            pedido["Dropoff Cidade"]
        ].filter(Boolean).join(", ") || "—";

        const dias = obterDiasPedido(pedido).join(", ") || "—";

        html += `

<tr>

<td>${pedido["ID"] || "-"}</td>

<td>${tipo}</td>

<td>${formatarHora(pedido["Pickup Hora"])}</td>

<td>${moradaPickup}</td>

<td>${moradaDropoff}</td>

<td>${dias}</td>

<td>${(Number(pedido["Monthly Fee"]) || 0).toLocaleString("pt-PT")} €</td>

</tr>

`;

    });

    html += `

</tbody>

</table>

</div>

`;

    detalhe.innerHTML = html;

}

// ==========================================
// CENTRAR MAPA NO CLUSTER
// ==========================================

function mostrarCluster(id) {

    const marcador =
        marcadoresClusters[id];

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

    const cluster =
        clustersAtuais.find(c => c.id === id);

    if (cluster)
        mostrarDetalheCluster(cluster);

}

console.log("Mapa.js carregado");
