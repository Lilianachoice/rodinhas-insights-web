// ==========================================
// Rodinhas Insights
// ==========================================

// URL da API Apps Script
const API_URL =
  "https://script.google.com/macros/s/AKfycbxreg3S8D7k7JAUCN3Ti-i8YU09kj7Djxd-ZN8fAgj2Lt-VKQEEMwYYnb5ZfDJ1JZGS/exec";

let pedidos = [];

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

    } catch (erro) {

        console.error(erro);

    }

}

// ==========================================
// Dashboard
// ==========================================

function atualizarDashboard(listaPedidos) {

    document.getElementById("pedidos").innerText =
        listaPedidos.length;

    const receita = listaPedidos.reduce(

        (total, pedido) =>
            total + (Number(pedido["Monthly Fee"]) || 0),

        0

    );

    document.getElementById("receita").innerText =
        receita.toLocaleString("pt-PT") + " €";

    document.getElementById("oportunidades").innerText = "...";

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
// Insights
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

    document.getElementById("insightMelhor").innerText =
        "--";

}

// ==========================================
// Atualizar tudo
// ==========================================

function atualizarTudo() {

    const pedidosFiltrados =
        obterPedidosFiltrados(pedidos);

    const clusters =
        criarClusters(pedidosFiltrados);

    atualizarDashboard(pedidosFiltrados);

    atualizarResumoMapa(
        pedidosFiltrados,
        clusters
    );

    atualizarInsights(
        pedidosFiltrados,
        clusters
    );

    desenharPedidos(clusters);

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

ligarSlider(
    "capacidade",
    "valorCapacidade",
    " lugares"
);

ligarSlider(
    "tempoViatura",
    "valorTempo",
    " minutos"
);

ligarSlider(
    "pickupKm",
    "valorPickup",
    " km"
);

ligarSlider(
    "dropoffKm",
    "valorDropoff",
    " km"
);

ligarSlider(
    "valorMinimo",
    "valorMensal",
    " €"
);

// ==========================================
// Eventos
// ==========================================

document
    .getElementById("shared")
    .addEventListener("change", atualizarTudo);

document
    .getElementById("private")
    .addEventListener("change", atualizarTudo);

// ==========================================
// Arranque
// ==========================================

iniciarMapa();

carregarPedidos();

console.log("App.js carregado");
