// ==========================================
// VIABILIDADES PENDENTES (mapa + clusters)
// ==========================================
// Réplica da lógica de Operação Atual (mapa.js), mas para pedidos
// ainda sem NENHUMA decisão de viabilidade — para ajudar a ver
// padrões (ex: 3 pedidos parecidos para a mesma escola) antes de os
// avaliar um a um.

let mapaPendentes;
let marcadoresPendentes;
const marcadoresClustersPendentes = {};
let clustersAtuaisPendentes = [];
let melhorClusterPendente = null;
let miniMapaClusterPendenteInstancia = null;

function iniciarMapaPendentes() {

    if (mapaPendentes)
        return; // já iniciado

    mapaPendentes = L.map("mapPendentes").setView([39.6, -8.0], 7);

    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        { maxZoom: 19, attribution: "© OpenStreetMap" }
    ).addTo(mapaPendentes);

    marcadoresPendentes = L.layerGroup().addTo(mapaPendentes);

}

// ==========================================
// CARREGAR DADOS (endpoint próprio, pedidos pendentes)
// ==========================================

window.pedidosPendentesData = [];

async function carregarPedidosPendentes() {

    try {

        const resposta = await fetch(API_URL + "?recurso=pendentes");

        const dados = await resposta.json();

        window.pedidosPendentesData = Array.isArray(dados) ? dados : [];

    }
    catch (erro) {

        console.error("Não foi possível carregar os Pedidos Pendentes:", erro);
        window.pedidosPendentesData = [];

    }

}

// ==========================================
// ATUALIZAR A PÁGINA (chamada a par de atualizarPaginaRotas)
// ==========================================

function atualizarPaginaPendentes() {

    iniciarMapaPendentes();

    // Reaproveita os mesmos filtros comuns (Shared/Private, valor
    // mínimo, zona, cidade, dias, ano, excluídos) e os filtros de
    // mês próprios desta página
    const pedidosComuns = obterPedidosFiltradosComuns(window.pedidosPendentesData || []);

    const pedidos = aplicarFiltroMeses(
        pedidosComuns, window.filtroMesesInicioRotas, window.filtroMesesFimRotas
    );

    const pedidosComMapa = pedidos.filter(pedidoTemPickupValido);

    const clusters = criarClusters(pedidosComMapa, obterPesosRotas());

    desenharPedidosPendentes(clusters);
    atualizarInsightsPendentes(pedidos, clusters);

}

// ==========================================
// DESENHAR CLUSTERS NO MAPA
// ==========================================

function desenharPedidosPendentes(clusters) {

    clustersAtuaisPendentes = clusters;

    marcadoresPendentes.clearLayers();

    Object.keys(marcadoresClustersPendentes).forEach(id => {
        delete marcadoresClustersPendentes[id];
    });

    clusters.forEach((cluster, indice) => {

        cluster.id = indice;

        let cor = "#8E5EDB"; // roxo — para diferenciar visualmente da Operação Atual

        if (cluster.shared > 0 && cluster.private === 0)
            cor = "#F4C400";

        if (cluster.private > 0 && cluster.shared === 0)
            cor = "#444444";

        const total = cluster.shared + cluster.private;

        const marcador = L.circleMarker(
            [cluster.lat, cluster.lng],
            {
                radius: 10 + Math.min(total, 10),
                color: cor,
                fillColor: cor,
                fillOpacity: 0.85,
                weight: 2
            }
        ).addTo(marcadoresPendentes);

        marcador.bindTooltip(String(total), {
            permanent: true, direction: "center", className: "clusterLabel"
        });

        marcador.bindPopup(
            `<b>${cluster.pedidos[0]["Pickup Cidade"] || "Sem cidade"}</b><br>
            ${total} pedidos pendentes • Índice ${cluster.score}`
        );

        marcador.on("click", () => {
            mostrarDetalheClusterPendente(cluster);
        });

        marcadoresClustersPendentes[cluster.id] = marcador;

    });

}

// ==========================================
// INSIGHTS + TOP OPORTUNIDADES
// ==========================================

function atualizarInsightsPendentes(pedidos, clusters) {

    const elTotal = document.getElementById("insightPendentesTotal");
    const elClusters = document.getElementById("insightPendentesClusters");

    if (elTotal) elTotal.innerText = pedidos.length;
    if (elClusters) elClusters.innerText = clusters.length;

    melhorClusterPendente = null;

    clusters.forEach(cluster => {

        if (!melhorClusterPendente || (cluster.score || 0) > (melhorClusterPendente.score || 0))
            melhorClusterPendente = cluster;

    });

    const elMelhor = document.getElementById("insightMelhorPendenteValor");

    if (elMelhor) {

        if (melhorClusterPendente) {

            const cidade = melhorClusterPendente.pedidos[0]["Pickup Cidade"] || "Sem cidade";

            elMelhor.innerHTML = `
                ${cidade}<br>
                ${melhorClusterPendente.pedidos.length} pedidos • Índice ${melhorClusterPendente.score}
            `;

        } else {

            elMelhor.innerHTML = "--";

        }

    }

    renderizarTopOportunidadesPendentes(clusters);

}

function renderizarTopOportunidadesPendentes(clusters) {

    const container = document.getElementById("listaTopOportunidadesPendentes");

    if (!container)
        return;

    if (!clusters.length) {

        container.innerHTML = `<div class="clusterVazio" style="padding:10px 0;">Sem clusters para o filtro atual.</div>`;
        return;

    }

    const ordenados = [...clusters].sort((a, b) => (b.score || 0) - (a.score || 0));

    container.innerHTML = ordenados.map((cluster, i) => {

        const cidade = cluster.pedidos[0]["Pickup Cidade"] || "Sem cidade";

        return `
<div class="itemTopOportunidade" data-cluster-id="${cluster.id}">
    <div class="rank">${i + 1}</div>
    <div class="infoTopo">
        <div class="cidadeTopo">${cidade}</div>
        <div class="metaTopo">${cluster.pedidos.length} pedidos • ${cluster.totalPassageiros || cluster.pedidos.length} passageiros</div>
    </div>
    <div class="scoreTopo">${cluster.score}</div>
</div>
`;

    }).join("");

    container.querySelectorAll(".itemTopOportunidade").forEach(item => {

        item.addEventListener("click", () => {

            const id = Number(item.getAttribute("data-cluster-id"));

            mostrarClusterPendente(id);

        });

    });

}

document.addEventListener("DOMContentLoaded", () => {

    const cartaoMelhor = document.getElementById("insightMelhorPendente");

    if (cartaoMelhor) {

        cartaoMelhor.addEventListener("click", () => {

            if (melhorClusterPendente)
                mostrarClusterPendente(melhorClusterPendente.id);

        });

    }

});

// ==========================================
// CENTRAR MAPA + ABRIR DETALHE
// ==========================================

function mostrarClusterPendente(id) {

    const marcador = marcadoresClustersPendentes[id];

    if (!marcador)
        return;

    const mapaEl = document.getElementById("mapPendentes");

    if (mapaEl)
        mapaEl.scrollIntoView({ behavior: "smooth", block: "center" });

    mapaPendentes.flyTo(marcador.getLatLng(), 11, { animate: true, duration: 1.2 });

    setTimeout(() => { marcador.openPopup(); }, 900);

    const cluster = clustersAtuaisPendentes.find(c => c.id === id);

    if (cluster)
        mostrarDetalheClusterPendente(cluster);

}

// ==========================================
// DETALHE DO CLUSTER (tabela + mini-mapa)
// ==========================================

function mostrarDetalheClusterPendente(cluster) {

    const detalhe = document.getElementById("detalheClusterPendente");

    if (!detalhe)
        return;

    const total = cluster.pedidos.length;
    const score = cluster.score !== undefined ? cluster.score : "--";

    const pedidosOrdenados = [...cluster.pedidos].sort((a, b) => {

        const horaA = horaParaMinutos(a["Pickup Hora"]);
        const horaB = horaParaMinutos(b["Pickup Hora"]);

        if (horaA === null && horaB === null) return 0;
        if (horaA === null) return 1;
        if (horaB === null) return -1;

        return horaA - horaB;

    });

    let html = `
<div class="clusterHeader">
    <div>
        <div class="clusterTitulo">${cluster.pedidos[0]["Pickup Cidade"] || "Sem cidade"}</div>
        <div class="clusterSubtitulo">
            Cluster pendente selecionado • Índice de Oportunidade
            <span class="badgeScore">${score}</span>
        </div>
    </div>
    <div class="clusterReceita">${cluster.receita.toLocaleString("pt-PT")} €</div>
</div>

<div class="clusterInfo">
    <div class="infoBox"><div class="infoTitulo">Pedidos</div><div class="infoValor">${total}</div></div>
    <div class="infoBox"><div class="infoTitulo">Passageiros</div><div class="infoValor">${cluster.totalPassageiros || total}</div></div>
    <div class="infoBox"><div class="infoTitulo">Shared</div><div class="infoValor">${cluster.shared}</div></div>
    <div class="infoBox"><div class="infoTitulo">Private</div><div class="infoValor">${cluster.private}</div></div>
    <div class="infoBox"><div class="infoTitulo">Viaturas Necessárias</div><div class="infoValor">${obterViaturasNecessarias(cluster)}</div></div>
</div>

<div class="tabelaScrollWrapper">
<table class="tabelaPedidos">
<thead>
<tr>
<th>ID</th><th>Tipo</th><th>Hora Pickup</th><th>Morada Pickup</th><th>Morada Dropoff</th>
<th>Hora Volta</th><th>Dias</th><th>Data Início</th><th>Data Fim</th><th>Passageiros</th>
</tr>
</thead>
<tbody>
`;

    pedidosOrdenados.forEach(pedido => {

        const tipo = pedido["Transport Type"] === "Shared"
            ? '<span class="tipoShared">Shared</span>'
            : '<span class="tipoPrivate">Private</span>';

        const moradaPickup = [pedido["Pickup"], pedido["Pickup CP"], pedido["Pickup Cidade"]]
            .filter(Boolean).join(", ") || "—";

        const moradaDropoff = [pedido["Dropoff"], pedido["Dropoff Cidade"]]
            .filter(Boolean).join(", ") || "—";

        const dias = traduzirDias(obterDiasPedido(pedido)) || "—";

        const horaVolta = pedidoTemVolta(pedido)
            ? formatarHora(pedido["Return Pickup Hora"])
            : "—";

        const passageiros = formatarPassageiros(pedido);

        html += `
<tr>
<td>${pedido["ID"] || "-"}</td>
<td>${tipo}</td>
<td>${descreverHorario(pedido)}</td>
<td>${moradaPickup}</td>
<td>${moradaDropoff}</td>
<td>${horaVolta}</td>
<td>${dias}</td>
<td>${formatarData(pedido["Start Date"])}</td>
<td>${formatarData(pedido["End Date"])}</td>
<td>${passageiros}</td>
</tr>
`;

    });

    html += `
</tbody>
</table>
</div>

<div class="miniMapaClusterWrapper">
    <h4>
        Mapa do cluster
        <span class="legendaMiniMapa">
            <span><span class="pontoLegenda" style="background:#F5C518;"></span> Pickup</span>
            <span><span class="pontoLegenda" style="background:#E03131;"></span> Dropoff</span>
            <span><span class="linhaLegenda" style="background:#999;"></span> Pickup → Dropoff (mesma viagem)</span>
            <span><span class="linhaLegenda" style="background:#3B5BDB;"></span> Sequência sugerida (por hora)</span>
        </span>
    </h4>
    <div id="miniMapaClusterPendente"></div>
</div>
`;

    detalhe.innerHTML = html;

    renderizarMiniMapaClusterPendente(cluster);

}

function renderizarMiniMapaClusterPendente(cluster) {

    const container = document.getElementById("miniMapaClusterPendente");

    if (!container)
        return;

    if (miniMapaClusterPendenteInstancia) {

        miniMapaClusterPendenteInstancia.remove();
        miniMapaClusterPendenteInstancia = null;

    }

    miniMapaClusterPendenteInstancia = L.map("miniMapaClusterPendente", { scrollWheelZoom: false });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap"
    }).addTo(miniMapaClusterPendenteInstancia);

    const pontos = [];
    const pontosRota = [];

    const pedidosOrdenados = [...cluster.pedidos].sort((a, b) => {

        const horaA = horaParaMinutos(a["Pickup Hora"]);
        const horaB = horaParaMinutos(b["Pickup Hora"]);

        if (horaA === null && horaB === null) return 0;
        if (horaA === null) return 1;
        if (horaB === null) return -1;

        return horaA - horaB;

    });

    let sequencia = 0;

    pedidosOrdenados.forEach(pedido => {

        const pickupLat = paraNumero(pedido["Pickup Lat"]);
        const pickupLng = paraNumero(pedido["Pickup Lng"]);
        const dropoffLat = paraNumero(pedido["Dropoff Lat"]);
        const dropoffLng = paraNumero(pedido["Dropoff Lng"]);

        const moradaPickup = [pedido["Pickup"], pedido["Pickup Cidade"]].filter(Boolean).join(", ") || "Pickup";
        const moradaDropoff = [pedido["Dropoff"], pedido["Dropoff Cidade"]].filter(Boolean).join(", ") || "Dropoff";
        const horaPickup = descreverHorario(pedido);

        const temPickup = pickupLat && pickupLng;
        const temDropoff = dropoffLat && dropoffLng;

        if (temPickup) {

            sequencia++;

            L.circleMarker([pickupLat, pickupLng], {
                radius: 8, color: "#B8860B", fillColor: "#F5C518", fillOpacity: 0.95, weight: 1.5
            })
            .bindTooltip(String(sequencia), { permanent: true, direction: "center", className: "numeroSequencia" })
            .bindPopup(`<b>${pedido["ID"] || ""}</b><br>Pickup (${horaPickup}) — ${moradaPickup}`)
            .addTo(miniMapaClusterPendenteInstancia);

            pontos.push([pickupLat, pickupLng]);
            pontosRota.push([pickupLat, pickupLng]);

        }

        if (temDropoff) {

            sequencia++;

            L.circleMarker([dropoffLat, dropoffLng], {
                radius: 8, color: "#9C1F1F", fillColor: "#E03131", fillOpacity: 0.95, weight: 1.5
            })
            .bindTooltip(String(sequencia), { permanent: true, direction: "center", className: "numeroSequencia" })
            .bindPopup(`<b>${pedido["ID"] || ""}</b><br>Dropoff — ${moradaDropoff}`)
            .addTo(miniMapaClusterPendenteInstancia);

            pontos.push([dropoffLat, dropoffLng]);
            pontosRota.push([dropoffLat, dropoffLng]);

        }

        if (temPickup && temDropoff) {

            L.polyline(
                [[pickupLat, pickupLng], [dropoffLat, dropoffLng]],
                { color: "#999", weight: 1.5, dashArray: "4,5", opacity: 0.7 }
            ).addTo(miniMapaClusterPendenteInstancia);

        }

    });

    if (pontosRota.length > 1) {

        L.polyline(pontosRota, { color: "#3B5BDB", weight: 2.5, opacity: 0.55 })
            .addTo(miniMapaClusterPendenteInstancia);

    }

    if (pontos.length) {

        miniMapaClusterPendenteInstancia.fitBounds(pontos, { padding: [30, 30] });

    } else {

        miniMapaClusterPendenteInstancia.setView([39.5, -8], 6);

    }

}

console.log("Pendentes.js carregado");
