// ==========================================
// Rodinhas Insights
// ==========================================

// URL da API Apps Script
const API_URL =
    "https://script.google.com/macros/s/AKfycbxreg3S8D7k7JAUCN3Ti-i8YU09kj7Djxd-ZN8fAgj2Lt-VKQEEMwYYnb5ZfDJ1JZGS/exec";

let pedidos = [];

// Guarda o melhor cluster encontrado
let melhorCluster = null;

console.log("Leaflet:", typeof L);

// ==========================================
// Última atualização
// ==========================================

document.getElementById("ultimaAtualizacao").innerHTML =
    new Date().toLocaleString("pt-PT");

// ==========================================
// Carregar pedidos
// ==========================================

async function carregarPedidos() {

    try {

        const response = await fetch(API_URL);

        pedidos = await response.json();

        atualizarTudo();

    }
    catch (erro) {

        console.error(erro);

    }

}

// ==========================================
// Dashboard (mantido por compatibilidade)
// ==========================================

function atualizarDashboard(listaPedidos) {

    const receita = listaPedidos.reduce(

        (total, pedido) =>
            total + (Number(pedido["Monthly Fee"]) || 0),

        0

    );

    const pedidosEl = document.getElementById("pedidos");
    const receitaEl = document.getElementById("receita");
    const oportunidadesEl = document.getElementById("oportunidades");

    if (pedidosEl)
        pedidosEl.innerText = listaPedidos.length;

    if (receitaEl)
        receitaEl.innerText =
            receita.toLocaleString("pt-PT") + " €";

    if (oportunidadesEl)
        oportunidadesEl.innerText = "...";

}

// ==========================================
// Resumo do mapa
// ==========================================

function atualizarResumoMapa(listaPedidos, clusters) {

    document.getElementById("textoResumo").innerText =
        `A mostrar ${listaPedidos.length} pedidos em ${clusters.length} localizações.`;

    const filtros = [];

    const shared =
        document.getElementById("shared").checked;

    const priv =
        document.getElementById("private").checked;

    if (shared && priv)
        filtros.push("Shared + Private");
    else if (shared)
        filtros.push("Shared");
    else if (priv)
        filtros.push("Private");

    filtros.push(
        `Pickup ≤ ${document.getElementById("pickupKm").value} km`
    );

    filtros.push(
        `Valor ≥ ${document.getElementById("valorMinimo").value} €`
    );

    document.getElementById("textoFiltros").innerText =
        "Filtros ativos: " + filtros.join(" • ");

}

// ==========================================
// INSIGHTS
// ==========================================

function atualizarInsights(listaPedidos, clusters) {

    document.getElementById("insightOportunidades").innerText =
        clusters.length;

    const receita = listaPedidos.reduce(

        (total, pedido) =>
            total + (Number(pedido["Monthly Fee"]) || 0),

        0

    );

    document.getElementById("insightReceita").innerText =
        receita.toLocaleString("pt-PT") + " €";

    document.getElementById("insightViaturas").innerText =
        "--";

    // Procurar melhor cluster
    melhorCluster = null;

    clusters.forEach(cluster => {

        if (!melhorCluster)
            melhorCluster = cluster;

        else if (cluster.receita > melhorCluster.receita)
            melhorCluster = cluster;

    });

    if (melhorCluster) {

        const cidade =
            melhorCluster.pedidos[0]["Pickup Cidade"] || "Sem cidade";

        document.getElementById("insightMelhor").innerHTML =
            `
            ${cidade}<br>
            ${melhorCluster.pedidos.length} pedidos<br>
            ${melhorCluster.receita.toLocaleString("pt-PT")} €
            `;

    }
    else {

        document.getElementById("insightMelhor").innerHTML = "--";

    }

}

// ==========================================
// Atualizar tudo
// ==========================================

function atualizarTudo() {

    const pedidosFiltrados =
    obterPedidosFiltrados(pedidos);

// Apenas pedidos com localização válida
const pedidosMapa = pedidosFiltrados.filter(p => {

    const lat = Number(p.Latitude);
    const lng = Number(p.Longitude);

    return (
        !isNaN(lat) &&
        !isNaN(lng) &&
        lat !== 0 &&
        lng !== 0 &&
        p["Pickup Cidade"] &&
        p["Pickup Cidade"].trim() !== ""
    );

});

// Guardamos estes para a futura janela de expansão
const pedidosExpansao = pedidosFiltrados.filter(p => !pedidosMapa.includes(p));

clustersAtuais =
    criarClusters(pedidosMapa);

const clusters =
    clustersAtuais;

atualizarDashboard(
    pedidosMapa
);

atualizarResumoMapa(
    pedidosMapa,
    clusters
);

atualizarInsights(
    pedidosMapa,
    clusters
);

desenharPedidos(
    clusters
);

// Apenas para já, para confirmar que a separação funciona
console.log(
    "Mapa:",
    pedidosMapa.length,
    "| Expansão:",
    pedidosExpansao.length
);

}

// ==========================================
// Sliders
// ==========================================

function ligarSlider(idSlider, idTexto, sufixo) {

    const slider =
        document.getElementById(idSlider);

    const texto =
        document.getElementById(idTexto);

    if (!slider || !texto)
        return;

    function atualizar() {

        texto.innerText =
            slider.value + sufixo;

        if (mapa)
            atualizarTudo();

    }

    texto.innerText =
        slider.value + sufixo;

    slider.addEventListener(
        "input",
        atualizar
    );

}

ligarSlider("capacidade", "valorCapacidade", " lugares");
ligarSlider("tempoViatura", "valorTempo", " minutos");
ligarSlider("pickupKm", "valorPickup", " km");
ligarSlider("dropoffKm", "valorDropoff", " km");
ligarSlider("valorMinimo", "valorMensal", " €");

// ==========================================
// Eventos
// ==========================================

document
    .getElementById("shared")
    .addEventListener("change", atualizarTudo);

document
    .getElementById("private")
    .addEventListener("change", atualizarTudo);

// Clique no cartão "Melhor oportunidade"
document
    .getElementById("insightMelhor")
    .addEventListener("click", () => {

        if (melhorCluster)
            mostrarCluster(melhorCluster.id);

    });

// ==========================================
// Arranque
// ==========================================

iniciarMapa();

carregarPedidos();

console.log("App.js carregado");
