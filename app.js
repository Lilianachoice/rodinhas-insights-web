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
// FILTRO POR ANO
// ==========================================

function filtrarAno(listaPedidos, ano) {

    return listaPedidos.filter(p => {

        const data =
            p["Start Date"] ||
            p["Data Pedido"];

        if (!data)
            return false;

        return String(data).includes(ano);

    });

}
// ==========================================
// Atualizar tudo
// ==========================================

function atualizarTudo() {

const pedidos2026 =
    filtrarAno(
        obterPedidosFiltrados(pedidos),
        "2026"
    );

// Apenas pedidos com localização válida
const pedidosMapa = pedidos2026.filter(p => {

    const lat = Number(p["Pickup Lat"]);
    const lng = Number(p["Pickup Lng"]);

    return (
        !isNaN(lat) &&
        !isNaN(lng) &&
        lat !== 0 &&
        lng !== 0
    );

});

// Guardamos estes para a futura janela de expansão
const pedidosExpansao = pedidos2026.filter(p => !pedidosMapa.includes(p));

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
const oportunidades =
    obterOportunidadesExpansao(pedidos2026);

atualizarTabelaExpansao(oportunidades);
    
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

// ==========================================
// ABAS
// ==========================================

const abaOperacao =
    document.getElementById("abaOperacao");

const abaExpansao =
    document.getElementById("abaExpansao");

abaOperacao.addEventListener("click", ()=>{

    document.getElementById("paginaOperacao").style.display="block";

    document.getElementById("paginaExpansao").style.display="none";

    abaOperacao.classList.add("ativa");

    abaExpansao.classList.remove("ativa");

});

abaExpansao.addEventListener("click", ()=>{

    document.getElementById("paginaOperacao").style.display="none";

    document.getElementById("paginaExpansao").style.display="block";

    abaOperacao.classList.remove("ativa");

    abaExpansao.classList.add("ativa");

});

console.log("App.js carregado");
// ==========================================
// OPORTUNIDADES DE EXPANSÃO
// ==========================================

function obterOportunidadesExpansao(listaPedidos) {

    const grupos = {};

    listaPedidos.forEach(p => {

        // Apenas pedidos sem localização
        const lat = Number(p["Pickup Lat"]);

        if (!isNaN(lat) && lat !== 0)
            return;

        const cpCompleto = (p["Pickup CP"] || "").trim();

        if (!cpCompleto)
            return;

        const cp = cpCompleto.substring(0,4);

        if (!grupos[cp]) {

            grupos[cp] = {

    cp,

    cidade: p["Pickup Cidade"] || "-",

    pedidos: 0,

    shared: 0,

    private: 0,

    passageiros: 0,

    score: 0

};

        }

        grupos[cp].pedidos++;

        if (p["Transport Type"] === "Shared")
            grupos[cp].shared++;

        else if (p["Transport Type"] === "Private")
            grupos[cp].private++;

        grupos[cp].passageiros +=
            Number(p["Total Passengers"]) || 0;
    
        grupos[cp].score =
        grupos[cp].pedidos * 10 +
        grupos[cp].shared * 5 +
        grupos[cp].passageiros * 2 -
        grupos[cp].private * 3;

    });

    return Object.values(grupos)
    .sort((a,b)=>b.score-a.score);

}

function atualizarTabelaExpansao(lista){

    const tbody =
        document.getElementById("tabelaExpansao");

    if(!tbody)
        return;

    tbody.innerHTML="";

    lista.forEach(linha=>{

        tbody.innerHTML += `
            <tr>

                <td>${linha.cp}</td>

                <td>${linha.cidade}</td>

                <td>${linha.pedidos}</td>

                <td>${linha.shared}</td>

                <td>${linha.private}</td>

                <td>${linha.passageiros}</td>

            </tr>
        `;

    });

}
