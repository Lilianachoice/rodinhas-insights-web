// ==========================================
// MAPA
// ==========================================

let mapa;
let marcadores;

// Marcadores dos clusters
const marcadoresClusters = {};

// Cluster atualmente selecionado
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

        marcador.bindPopup(
            criarPopup(cluster)
        );

        marcador.on("click", () => {

            clusterSelecionado = cluster;

        });

        marcadoresClusters[cluster.id] = marcador;

    });

}

// ==========================================
// CRIAR POPUP
// ==========================================

function criarPopup(cluster) {

    const cidade =
        cluster.pedidos[0]["Pickup Cidade"] || "Sem cidade";

    const total =
        cluster.pedidos.length;

    let tipo = "";
    let resumo = "";

    if (cluster.shared > 0 && cluster.private === 0) {

        tipo = "🟡 Shared";

        resumo = `
            <div class="popupNumero">
                👥 ${total} pedidos
            </div>
        `;

    }

    else if (cluster.private > 0 && cluster.shared === 0) {

        tipo = "⚫ Private";

        resumo = `
            <div class="popupNumero">
                👥 ${total} pedidos
            </div>
        `;

    }

    else {

        tipo = "🔵 Cluster Misto";

        resumo = `
            <div class="popupNumero">
                👥 ${total} pedidos
            </div>

            <div class="popupTipos">

                🟡 Shared: ${cluster.shared}

                <br>

                ⚫ Private: ${cluster.private}

            </div>
        `;

    }

    return `

        <div class="popupCluster">

            <div class="popupCidade">

                📍 ${cidade}

            </div>

            <div class="popupTipo">

                ${tipo}

            </div>

            <hr>

            ${resumo}

            <div class="popupReceita">

                💶 <b>${cluster.receita.toLocaleString("pt-PT")} € / mês</b>

            </div>

            <hr>

            ${criarListaPedidos(cluster)}

            <hr>

            <div
                class="popupLink"
                onclick="mostrarPedidosCluster(${cluster.id})">

                Ver todos os pedidos →

            </div>

        </div>

    `;

}
// ==========================================
// LISTA DOS PEDIDOS DO CLUSTER
// ==========================================

function criarListaPedidos(cluster) {

    const limite = 5;

    let html = `
        <div class="popupListaTitulo">
            Pedidos do cluster
        </div>
    `;

    cluster.pedidos
        .slice(0, limite)
        .forEach(pedido => {

            const tipo =
                pedido["Transport Type"] === "Private"
                    ? "⚫"
                    : "🟡";

            const id =
                pedido["ID"] || "-";

            const valor =
                Number(pedido["Monthly Fee"]) || 0;

            html += `

                <div class="popupPedido">

                    <span>

                        ${tipo}
                        #${id}

                    </span>

                    <span>

                        ${valor.toLocaleString("pt-PT")} €

                    </span>

                </div>

            `;

        });

    if (cluster.pedidos.length > limite) {

        html += `

            <div class="popupMais">

                ... e mais ${cluster.pedidos.length - limite} pedidos

            </div>

        `;

    }

    return html;

}

// ==========================================
// MOSTRAR TODOS OS PEDIDOS
// ==========================================

function mostrarPedidosCluster(id) {

    const marcador =
        marcadoresClusters[id];

    if (!marcador)
        return;

    clusterSelecionado = null;

    marcador.closePopup();

    // procura novamente o cluster

    Object.values(marcadoresClusters).forEach(m => {

        if (m === marcador)
            return;

    });

    // procura na lista desenhada

    if (typeof clustersAtuais !== "undefined") {

        clusterSelecionado =
            clustersAtuais.find(c => c.id === id);

    }

    if (!clusterSelecionado)
        return;

    const lista =
        document.getElementById("lista");

    if (!lista)
        return;

    let html = `

        <h3>

            Cluster de
            ${clusterSelecionado.pedidos[0]["Pickup Cidade"] || "Sem cidade"}

        </h3>

        <br>

        <b>${clusterSelecionado.pedidos.length}</b> pedidos

        <br><br>

        <table class="tabelaPedidos">

            <tr>

                <th>ID</th>

                <th>Tipo</th>

                <th>Mensalidade</th>

            </tr>

    `;

    clusterSelecionado.pedidos.forEach(p => {

        html += `

            <tr>

                <td>

                    ${p["ID"]}

                </td>

                <td>

                    ${p["Transport Type"]}

                </td>

                <td>

                    ${(Number(p["Monthly Fee"]) || 0).toLocaleString("pt-PT")} €

                </td>

            </tr>

        `;

    });

    html += "</table>";

    lista.innerHTML = html;

    lista.scrollIntoView({

        behavior: "smooth"

    });

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

}

console.log("Mapa.js carregado");
function mostrarDetalheCluster(cluster){

    let html = `

        <div class="clusterHeader">

            <div>

                <div class="clusterTitulo">

                    ${cluster.pedidos[0]["Pickup Cidade"] || "Sem cidade"}

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
                    ${cluster.pedidos.length}
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

        <table class="tabelaPedidos">

            <thead>

                <tr>

                    <th>ID</th>

                    <th>Tipo</th>

                    <th>Mensalidade</th>

                </tr>

            </thead>

            <tbody>
    `;

    cluster.pedidos.forEach(pedido=>{

        html += `

            <tr>

                <td>${pedido.ID}</td>

                <td>${pedido["Transport Type"]}</td>

                <td>${Number(pedido["Monthly Fee"]||0).toLocaleString("pt-PT")} €</td>

            </tr>

        `;

    });

    html += `

            </tbody>

        </table>

    `;

    document.getElementById("detalheCluster").innerHTML = html;

}
