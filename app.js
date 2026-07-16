// ==========================================
// Rodinhas Insights
// ==========================================

// URL da API Apps Script
const API_URL =
    "https://script.google.com/macros/s/AKfycbxreg3S8D7k7JAUCN3Ti-i8YU09kj7Djxd-ZN8fAgj2Lt-VKQEEMwYYnb5ZfDJ1JZGS/exec";

let pedidos = [];

// Guarda o melhor cluster encontrado
let melhorCluster = null;

// Guarda a lista de oportunidades de expansão atual (para a IA e cliques na tabela)
let oportunidadesAtuais = [];

console.log("Leaflet:", typeof L);

// ==========================================
// Última atualização
// ==========================================

document.getElementById("ultimaAtualizacao").innerHTML =
    new Date().toLocaleString("pt-PT");

// ==========================================
// DEBOUNCE (performance)
// ==========================================

function debounce(fn, atraso) {

    let temporizador = null;

    return function (...args) {

        clearTimeout(temporizador);

        temporizador = setTimeout(() => fn(...args), atraso);

    };

}

// ==========================================
// Carregar pedidos
// ==========================================

async function carregarPedidos() {

    try {

        const response = await fetch(API_URL);

        pedidos = await response.json();

        // Preenche Zona / Localidade / Ano a partir dos dados reais
        popularListasDinamicas(pedidos);

        atualizarTudo();

    }
    catch (erro) {

        console.error(erro);

        document.getElementById("textoResumo").innerText =
            "Não foi possível carregar os pedidos. Verifica a ligação à API.";

    }

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
        `Dropoff ≤ ${document.getElementById("dropoffKm").value} km`
    );

    filtros.push(
        `Lotação ≤ ${document.getElementById("capacidade").value}`
    );

    filtros.push(
        `Valor ≥ ${document.getElementById("valorMinimo").value} €`
    );

    const zona = document.getElementById("zona").value;
    const cidade = document.getElementById("cidade").value;
    const dias = document.getElementById("dias").value;
    const ano = document.getElementById("ano").value;

    if (zona) filtros.push(`Zona: ${zona}`);
    if (cidade) filtros.push(`Localidade: ${cidade}`);
    if (dias && dias !== "Todos") filtros.push(`Dia: ${dias}`);
    if (ano) filtros.push(`Ano: ${ano}`);

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

    // Viaturas necessárias: soma, por cluster, das viaturas
    // necessárias para cobrir os passageiros desse cluster
    const capacidade =
        Number(document.getElementById("capacidade").value) || 7;

    const viaturas = clusters.reduce(

        (total, cluster) =>
            total + Math.ceil((cluster.totalPassageiros || cluster.pedidos.length) / capacidade),

        0

    );

    document.getElementById("insightViaturas").innerText =
        clusters.length ? viaturas : "--";

    // Melhor cluster = maior Índice de Oportunidade
    melhorCluster = null;

    clusters.forEach(cluster => {

        if (!melhorCluster)
            melhorCluster = cluster;

        else if ((cluster.score || 0) > (melhorCluster.score || 0))
            melhorCluster = cluster;

    });

    const elMelhor = document.getElementById("insightMelhorValor");

    if (melhorCluster) {

        const cidade =
            melhorCluster.pedidos[0]["Pickup Cidade"] || "Sem cidade";

        elMelhor.innerHTML =
            `
            ${cidade}<br>
            ${melhorCluster.pedidos.length} pedidos • Índice ${melhorCluster.score}
            `;

    }
    else {

        elMelhor.innerHTML = "--";

    }

}

// ==========================================
// Atualizar tudo
// ==========================================

function atualizarTudo() {

    const pedidosFiltrados =
        obterPedidosFiltrados(pedidos);

    // Apenas pedidos com localização válida (dentro de Portugal)
    const pedidosMapa = pedidosFiltrados.filter(pedidoTemPickupValido);

    // Todos os restantes (sem coordenadas válidas) alimentam
    // a página de Potencial de Expansão
    const pedidosExpansao = pedidosFiltrados.filter(p => !pedidoTemPickupValido(p));

    const clusters = criarClusters(pedidosMapa);

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

    oportunidadesAtuais =
        obterOportunidadesExpansao(pedidosExpansao);

    atualizarTabelaExpansao(oportunidadesAtuais);
    atualizarStatsExpansao(oportunidadesAtuais);

    console.log(
        "Mapa:",
        pedidosMapa.length,
        "| Expansão:",
        pedidosExpansao.length
    );

}

const atualizarTudoComDebounce = debounce(atualizarTudo, 200);

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

    function atualizarTexto() {

        texto.innerText =
            slider.value + sufixo;

    }

    atualizarTexto();

    slider.addEventListener("input", () => {

        atualizarTexto();
        atualizarTudoComDebounce();

    });

}

ligarSlider("capacidade", "valorCapacidade", " lugares");
ligarSlider("tempoViatura", "valorTempo", " minutos");
ligarSlider("pickupKm", "valorPickup", " km");
ligarSlider("dropoffKm", "valorDropoff", " km");
ligarSlider("valorMinimo", "valorMensal", " €");

// ==========================================
// Eventos — filtros
// ==========================================

["shared", "private", "zona", "cidade", "dias", "ano"].forEach(id => {

    const el = document.getElementById(id);

    if (el)
        el.addEventListener("change", atualizarTudo);

});

// Clique no cartão "Melhor oportunidade"
document
    .getElementById("insightMelhor")
    .addEventListener("click", () => {

        if (melhorCluster)
            mostrarCluster(melhorCluster.id);

    });

// ==========================================
// IA — Operação Atual
// ==========================================

document.querySelectorAll(".iaBotao").forEach(botao => {

    botao.addEventListener("click", () => {

        const capacidade =
            Number(document.getElementById("capacidade").value) || 7;

        const resposta = responderIaOperacao(
            botao.dataset.pergunta,
            clustersAtuais,
            capacidade
        );

        const caixa = document.getElementById("iaOperacaoResposta");

        caixa.style.display = "block";
        caixa.innerHTML = resposta;

    });

});

// ==========================================
// IA — Potencial de Expansão
// ==========================================

document.querySelectorAll(".iaBotaoExpansao").forEach(botao => {

    botao.addEventListener("click", () => {

        const resposta = responderIaExpansao(
            botao.dataset.pergunta,
            oportunidadesAtuais
        );

        const caixa = document.getElementById("iaExpansaoResposta");

        caixa.style.display = "block";
        caixa.innerHTML = resposta;

    });

});

// ==========================================
// Arranque
// ==========================================

async function iniciar() {

    iniciarMapa();

    // A configuração partilhada (pesos, regras, turnos, depósitos, email)
    // tem de estar disponível antes de calcular scores e rotas
    await carregarConfigPartilhada();

    iniciarPaginaIndices();

    await carregarPedidos();

    if (typeof atualizarPaginaRotas === "function")
        atualizarPaginaRotas();

}

iniciar();

// ==========================================
// ABAS
// ==========================================

const abaOperacao =
    document.getElementById("abaOperacao");

const abaExpansao =
    document.getElementById("abaExpansao");

const abaRotas =
    document.getElementById("abaRotas");

const abaIndices =
    document.getElementById("abaIndices");

function trocarAba(paginaAtiva, abaAtiva) {

    ["paginaOperacao", "paginaExpansao", "paginaRotas", "paginaIndices"].forEach(id => {

        document.getElementById(id).style.display =
            id === paginaAtiva ? "block" : "none";

    });

    [abaOperacao, abaExpansao, abaRotas, abaIndices].forEach(aba => {

        aba.classList.toggle("ativa", aba === abaAtiva);

    });

    // O mapa do Leaflet precisa de recalcular o tamanho
    // quando a aba volta a ficar visível
    if (paginaAtiva === "paginaOperacao" && mapa)
        setTimeout(() => mapa.invalidateSize(), 50);

    if (paginaAtiva === "paginaRotas" && typeof atualizarPaginaRotas === "function")
        atualizarPaginaRotas();

}

abaOperacao.addEventListener("click", () =>
    trocarAba("paginaOperacao", abaOperacao));

abaExpansao.addEventListener("click", () =>
    trocarAba("paginaExpansao", abaExpansao));

abaRotas.addEventListener("click", () =>
    trocarAba("paginaRotas", abaRotas));

abaIndices.addEventListener("click", () =>
    trocarAba("paginaIndices", abaIndices));

console.log("App.js carregado");

// ==========================================
// OPORTUNIDADES DE EXPANSÃO
// ==========================================

function obterOportunidadesExpansao(listaPedidos) {

    const grupos = {};

    listaPedidos.forEach(p => {

        const cpCompleto = (p["Pickup CP"] || "").trim();

        if (!cpCompleto)
            return;

        const cp = cpCompleto.substring(0, 4);

        if (!grupos[cp]) {

            grupos[cp] = {

                cp,
                cidade: p["Pickup Cidade"] || "-",
                pedidos: 0,
                shared: 0,
                private: 0,
                passageiros: 0,
                score: 0,
                listaPedidos: []

            };

        }

        grupos[cp].pedidos++;
        grupos[cp].listaPedidos.push(p);

        if (p["Transport Type"] === "Shared")
            grupos[cp].shared++;

        else if (p["Transport Type"] === "Private")
            grupos[cp].private++;

        grupos[cp].passageiros +=
            Number(p["Total Passengers"]) || 0;

    });

    const lista = Object.values(grupos);

    const pesos = obterPesosExpansao();

    const maxPedidos = Math.max(...lista.map(g => g.pedidos), 1);
    const maxPassageiros = Math.max(...lista.map(g => g.passageiros), 1);

    lista.forEach(grupo => {

        const metricaPedidos = grupo.pedidos / maxPedidos;
        const metricaPassageiros = grupo.passageiros / maxPassageiros;
        const metricaShared = grupo.pedidos ? grupo.shared / grupo.pedidos : 0;
        const metricaPrivate = grupo.pedidos ? grupo.private / grupo.pedidos : 0;

        const score =
            metricaPedidos * pesos.pedidos +
            metricaPassageiros * pesos.passageiros +
            metricaShared * pesos.shared +
            metricaPrivate * pesos.private;

        grupo.score = Math.max(0, Math.min(100, Math.round(score)));

    });

    return lista.sort((a, b) => b.score - a.score);

}

function atualizarTabelaExpansao(lista) {

    const tbody =
        document.getElementById("tabelaExpansao");

    if (!tbody)
        return;

    tbody.innerHTML = "";

    lista.forEach((linha, indice) => {

        const tr = document.createElement("tr");

        tr.innerHTML = `

            <td><strong>${linha.score}</strong></td>
            <td>${linha.cp}</td>
            <td>${linha.cidade}</td>
            <td>${linha.pedidos}</td>
            <td>${linha.shared}</td>
            <td>${linha.private}</td>
            <td>${linha.passageiros}</td>

        `;

        tr.addEventListener("click", () => mostrarPedidosExpansao(indice));

        tbody.appendChild(tr);

    });

}

function mostrarPedidosExpansao(indice) {

    const grupo = oportunidadesAtuais[indice];

    const painel = document.getElementById("detalheExpansao");

    if (!grupo || !painel)
        return;

    let html = `

        <div class="clusterHeader">

            <div>

                <div class="clusterTitulo">CP ${grupo.cp} — ${grupo.cidade}</div>
                <div class="clusterSubtitulo">Índice de Oportunidade: ${grupo.score}</div>

            </div>

        </div>

        <table class="tabelaPedidos">

            <thead>

                <tr>

                    <th>ID</th>
                    <th>Tipo</th>
                    <th>Passageiros</th>
                    <th>Mensalidade</th>

                </tr>

            </thead>

            <tbody>

    `;

    grupo.listaPedidos.forEach(p => {

        const tipo =
            p["Transport Type"] === "Shared"
                ? '<span class="tipoShared">Shared</span>'
                : '<span class="tipoPrivate">Private</span>';

        html += `

            <tr>

                <td>${p["ID"] || "-"}</td>
                <td>${tipo}</td>
                <td>${p["Total Passengers"] || "-"}</td>
                <td>${(Number(p["Monthly Fee"]) || 0).toLocaleString("pt-PT")} €</td>

            </tr>

        `;

    });

    html += `</tbody></table>`;

    painel.style.display = "block";
    painel.innerHTML = html;

    painel.scrollIntoView({ behavior: "smooth" });

}

function atualizarStatsExpansao(lista) {

    const locais = lista.length;
    const pedidosTotal = lista.reduce((s, g) => s + g.pedidos, 0);
    const passageirosTotal = lista.reduce((s, g) => s + g.passageiros, 0);
    const scoreMedio = locais
        ? Math.round(lista.reduce((s, g) => s + g.score, 0) / locais)
        : 0;

    const set = (id, valor) => {

        const el = document.getElementById(id);

        if (el) el.innerText = valor;

    };

    set("expLocais", locais);
    set("expPedidos", pedidosTotal);
    set("expPassageiros", passageirosTotal);
    set("expScoreMedio", locais ? scoreMedio : "--");

}
