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

// "Direction" muda o que a "Pickup Hora" significa:
// "to"   (casa -> escola) = hora a que a criança deve estar na escola
// "from" (escola -> casa) = hora a que a criança é recolhida na escola
// Sem "Direction" (dados antigos, ainda por preencher via backfill),
// assume-se o significado tradicional (hora de recolha).
function descreverHorario(pedido) {

    return formatarHora(pedido["Pickup Hora"]);

}

function descreverHorarioVolta(pedido) {

    return formatarHora(pedido["Return Pickup Hora"]);

}

function obterViaturasNecessarias(cluster) {

    const capacidadeEl = document.getElementById("capacidade");

    const capacidade = capacidadeEl ? Number(capacidadeEl.value) || 7 : 7;

    const passageiros = cluster.totalPassageiros || cluster.pedidos.length;

    return Math.ceil(passageiros / capacidade);

}

function formatarData(data) {

    if (!data)
        return "—";

    const d = new Date(data);

    if (isNaN(d.getTime()))
        return String(data);

    return d.toLocaleDateString("pt-PT");

}

const TRADUCOES_REJECT_REASON = {

    "UnavailableVehicle": "Viatura Indisponível",
    "UnavailablePlace": "Localidade Indisponível",
    "UnviableRoute": "Rota Inviável",
    "FullRoute": "Rota Lotada",
    "Other": "Outro"

};

function traduzirMotivoRejeicao(motivo) {

    if (!motivo)
        return "—";

    return TRADUCOES_REJECT_REASON[motivo] || motivo;

}

function formatarPassageiros(pedido) {

    const total = Number(pedido["Total Passengers"]) || 0;
    const criancas = Number(pedido["Total Children"]) || 0;
    const adultos = Number(pedido["Total Adults"]) || 0;

    // A Sheet às vezes interpreta valores tipo "6-10" como se fossem
    // uma data (ex: 10 de junho) e guarda-os como data em vez de
    // texto — se isso acontecer, ignoramos o valor em vez de
    // mostrar uma data/hora sem sentido
    let faixa = pedido["Children Age Range"] || pedido["Children Ages"];

    if (faixa && /^\d{4}-\d{2}-\d{2}T/.test(String(faixa)))
        faixa = null;

    if (!criancas && !adultos)
        return total || "—";

    const partes = [];

    if (criancas)
        partes.push(`${criancas} criança${criancas > 1 ? "s" : ""}${faixa ? " (" + faixa + ")" : ""}`);

    if (adultos)
        partes.push(`${adultos} adulto${adultos > 1 ? "s" : ""}`);

    return `${total} — ${partes.join(", ")}`;

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

    // Ordena pela hora de pickup — pedidos sem hora ficam no fim
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

    <div class="infoBox">

        <div class="infoTitulo">

            Viaturas Necessárias

        </div>

        <div class="infoValor">

            ${obterViaturasNecessarias(cluster)}

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
<th>Hora Volta</th>
<th>Dias</th>
<th>Data Início</th>
<th>Data Fim</th>
<th>Passageiros</th>
<th>Motivo Rejeição</th>
<th>Mensalidade</th>

</tr>

</thead>

<tbody>

`;

    pedidosOrdenados.forEach(pedido => {

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

        const dias = traduzirDias(obterDiasPedido(pedido)) || "—";

        // A volta faz o percurso inverso (Dropoff -> Pickup), só
        // muda a hora — por isso não repetimos a morada, só a hora
        const horaVolta = pedidoTemVolta(pedido)
            ? descreverHorarioVolta(pedido)
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

<td>${traduzirMotivoRejeicao(pedido["Reject Reason"])}</td>

<td>${(Number(pedido["Monthly Fee"]) || 0).toLocaleString("pt-PT")} €</td>

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
        </span>
    </h4>

    <div id="miniMapaCluster"></div>

</div>

`;

    detalhe.innerHTML = html;

    renderizarMiniMapaCluster(cluster);

}

// ==========================================
// MINI-MAPA DO CLUSTER (Pickup a amarelo, Dropoff a vermelho)
// ==========================================

let miniMapaClusterInstancia = null;

function renderizarMiniMapaCluster(cluster) {

    const container = document.getElementById("miniMapaCluster");

    if (!container)
        return;

    // Leaflet não permite reinicializar o mesmo elemento — destrói a
    // instância anterior antes de criar uma nova
    if (miniMapaClusterInstancia) {

        miniMapaClusterInstancia.remove();
        miniMapaClusterInstancia = null;

    }

    miniMapaClusterInstancia = L.map("miniMapaCluster", {
        scrollWheelZoom: true
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap"
    }).addTo(miniMapaClusterInstancia);

    const pontos = [];

    // Ordena os pedidos pela hora de pickup, para conseguir numerar
    // a sequência sugerida da rota (1º, 2º, 3º...) — como não temos
    // a hora real de chegada ao dropoff, cada dropoff assume o
    // número a seguir ao do seu próprio pickup. É uma aproximação
    // simples à sequência real, não um cálculo de rota otimizado.
    const pedidosOrdenados = [...cluster.pedidos].sort((a, b) => {

        const horaA = horaParaMinutos(a["Pickup Hora"]);
        const horaB = horaParaMinutos(b["Pickup Hora"]);

        if (horaA === null && horaB === null) return 0;
        if (horaA === null) return 1;
        if (horaB === null) return -1;

        return horaA - horaB;

    });

    let indicePedido = 0;

    pedidosOrdenados.forEach(pedido => {

        indicePedido++;

        const pickupLat = paraNumero(pedido["Pickup Lat"]);
        const pickupLng = paraNumero(pedido["Pickup Lng"]);
        const dropoffLat = paraNumero(pedido["Dropoff Lat"]);
        const dropoffLng = paraNumero(pedido["Dropoff Lng"]);

        const moradaPickup = [pedido["Pickup"], pedido["Pickup Cidade"]]
            .filter(Boolean).join(", ") || "Pickup";

        const moradaDropoff = [pedido["Dropoff"], pedido["Dropoff Cidade"]]
            .filter(Boolean).join(", ") || "Dropoff";

        const horaPickup = descreverHorario(pedido);

        const temPickup = pickupLat && pickupLng;
        const temDropoff = dropoffLat && dropoffLng;

        // O pickup e o dropoff DO MESMO pedido partilham o mesmo
        // número (em vez de uma contagem contínua 1,2,3,4...) — mais
        // fácil de ver quais bolas pertencem à mesma viagem, lendo
        // em conjunto com a linha cinza que os liga
        if (temPickup) {

            L.circleMarker([pickupLat, pickupLng], {
                radius: 15,
                color: "#B8860B",
                fillColor: "#F5C518",
                fillOpacity: 0.95,
                weight: 1.5
            })
            .bindTooltip(String(indicePedido), { permanent: true, direction: "center", className: "numeroSequencia" })
            .bindPopup(`<b>${pedido["ID"] || ""}</b><br>Pickup (${horaPickup}) — ${moradaPickup}`)
            .addTo(miniMapaClusterInstancia);

            pontos.push([pickupLat, pickupLng]);

        }

        if (temDropoff) {

            L.circleMarker([dropoffLat, dropoffLng], {
                radius: 15,
                color: "#9C1F1F",
                fillColor: "#E03131",
                fillOpacity: 0.95,
                weight: 1.5
            })
            .bindTooltip(String(indicePedido), { permanent: true, direction: "center", className: "numeroSequenciaClaro" })
            .bindPopup(`<b>${pedido["ID"] || ""}</b><br>Dropoff — ${moradaDropoff}`)
            .addTo(miniMapaClusterInstancia);

            pontos.push([dropoffLat, dropoffLng]);

        }

        // Linha fina a ligar o pickup ao dropoff DESTE pedido — para
        // ficar claro que bolas pertencem à mesma viagem
        if (temPickup && temDropoff) {

            L.polyline(
                [[pickupLat, pickupLng], [dropoffLat, dropoffLng]],
                { color: "#999", weight: 1.5, dashArray: "4,5", opacity: 0.7 }
            ).addTo(miniMapaClusterInstancia);

        }

    });

    if (pontos.length) {

        miniMapaClusterInstancia.fitBounds(pontos, { padding: [30, 30] });

    }
    else {

        // Sem coordenadas nenhumas — mostra Portugal genérico em vez
        // de um mapa em branco
        miniMapaClusterInstancia.setView([39.5, -8], 6);

    }

}

// ==========================================
// CENTRAR MAPA NO CLUSTER
// ==========================================

function mostrarCluster(id) {

    const marcador =
        marcadoresClusters[id];

    if (!marcador)
        return;

    // Garante que o mapa grande fica visível no ecrã antes de voar
    // até lá — sem isto, quem clica na lista de Top Oportunidades
    // não vê nada acontecer se o mapa estiver fora da vista atual
    const mapaEl = document.getElementById("map");

    if (mapaEl)
        mapaEl.scrollIntoView({ behavior: "smooth", block: "center" });

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
