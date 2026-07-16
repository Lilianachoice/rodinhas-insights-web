// ==========================================
// Rodinhas Insights
// ==========================================

// URL da API Apps Script
const API_URL =
    "https://script.google.com/macros/s/AKfycbyfBmAp0s12vIg3XGkylR-s0KnotKEvg6PZWWXy9EskviN7VKWp_1NDDU9gQ5HRn90K/exec";

let pedidos = [];

// Guarda o melhor cluster encontrado
let melhorCluster = null;

// Guarda a lista de oportunidades de expansão atual (para a IA e cliques na tabela)
let oportunidadesAtuais = [];

// ==========================================
// Excluir pedido de teste (rápido, a partir de qualquer tabela)
// ==========================================

async function excluirPedidoTeste(id) {

    if (!confirm(`Marcar o pedido ${id} como teste e escondê-lo em todo o site?`))
        return;

    const config = window.configPartilhada || {};

    const atuais = (config.idsExcluidos || []).map(String);

    if (!atuais.includes(String(id)))
        atuais.push(String(id));

    const ok = await guardarConfigPartilhadaNoBackend({ idsExcluidos: atuais });

    if (!ok) {

        alert("Não foi possível guardar. Tenta novamente.");
        return;

    }

    if (typeof preencherCampoIdsExcluidos === "function")
        preencherCampoIdsExcluidos();

    atualizarTudo();

    if (typeof atualizarPaginaRotas === "function")
        atualizarPaginaRotas();

}

const NOMES_MESES = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

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

        // Valores por omissão: ano atual + mês atual, por página
        definirFiltrosDataPorOmissao();

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

    const pedidosComuns =
        obterPedidosFiltradosComuns(pedidos);

    // Operação Atual = tem morada (dentro da área de atuação),
    // mesmo que ainda não tenha coordenadas exatas.
    // Potencial de Expansão = não tem morada nenhuma (fora da área).
    const pedidosOperacaoBase = pedidosComuns.filter(pedidoTemMorada);
    const pedidosExpansaoBase = pedidosComuns.filter(p => !pedidoTemMorada(p));

    // Mês Início/Fim de Serviço — independente por página
    const pedidosOperacao = aplicarFiltroMeses(
        pedidosOperacaoBase, window.filtroMesesInicioOp, window.filtroMesesFimOp
    );

    const pedidosExpansao = aplicarFiltroMeses(
        pedidosExpansaoBase, window.filtroMesesInicioExp, window.filtroMesesFimExp
    );

    // Dentro da Operação Atual, só quem já tem coordenadas válidas
    // é que aparece no mapa e entra nos clusters
    const pedidosMapa = pedidosOperacao.filter(pedidoTemPickupValido);
    const pedidosPendentes = pedidosOperacao.filter(p => !pedidoTemPickupValido(p));

    const clusters = criarClusters(pedidosMapa);

    atualizarResumoMapa(
        pedidosMapa,
        clusters
    );

    atualizarNotaPendentes(pedidosPendentes);

    atualizarInsights(
        pedidosOperacao,
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
        "Operação Atual:", pedidosOperacao.length,
        "(mapa:", pedidosMapa.length, "/ pendentes de geocoding:", pedidosPendentes.length, ")",
        "| Expansão:", pedidosExpansao.length
    );

}

const atualizarTudoComDebounce = debounce(atualizarTudo, 200);

// ==========================================
// Nota: pedidos com morada mas ainda sem coordenadas
// ==========================================

let pedidosPendentesAtuais = [];function atualizarNotaPendentes(lista) {

    pedidosPendentesAtuais = lista;

    let nota = document.getElementById("notaPendentes");

    if (!nota) {

        nota = document.createElement("div");
        nota.id = "notaPendentes";
        nota.className = "notaPendentes";

        const resumo = document.querySelector(".resumoMapa");

        if (resumo)
            resumo.appendChild(nota);

    }

    if (!lista.length) {

        nota.style.display = "none";
        return;

    }

    nota.style.display = "block";

    nota.innerHTML =
        `⏳ +${lista.length} pedido(s) desta operação com morada mas ainda sem coordenadas exatas ` +
        `(geocoding pendente) — não aparecem no mapa. <span class="notaPendentesLink" onclick="mostrarPedidosPendentes()">Ver lista</span>`;

}

function mostrarPedidosPendentes() {

    const painel = document.getElementById("detalheCluster");

    if (!painel || !pedidosPendentesAtuais.length)
        return;

    let html = `
        <div class="clusterHeader">
            <div>
                <div class="clusterTitulo">Pendentes de geocodificação</div>
                <div class="clusterSubtitulo">${pedidosPendentesAtuais.length} pedidos com morada, ainda sem coordenadas exatas</div>
            </div>
        </div>

        <table class="tabelaPedidos">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Tipo</th>
                    <th>Morada Pickup</th>
                    <th>Mensalidade</th>
                </tr>
            </thead>
            <tbody>
    `;

    pedidosPendentesAtuais.forEach(p => {

        const tipo =
            p["Transport Type"] === "Shared"
                ? '<span class="tipoShared">Shared</span>'
                : '<span class="tipoPrivate">Private</span>';

        const morada = [p["Pickup"], p["Pickup CP"], p["Pickup Cidade"]]
            .filter(Boolean).join(", ") || "—";

        html += `
            <tr>
                <td>${p["ID"] || "-"}</td>
                <td>${tipo}</td>
                <td>${morada}</td>
                <td>${(Number(p["Monthly Fee"]) || 0).toLocaleString("pt-PT")} €</td>
            </tr>
        `;

    });

    html += `</tbody></table>`;

    painel.innerHTML = html;
    painel.scrollIntoView({ behavior: "smooth" });

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
        el.addEventListener("change", () => {

            atualizarTudo();

            if (typeof atualizarPaginaRotas === "function")
                atualizarPaginaRotas();

        });

});

// ==========================================
// Filtros de Mês Início / Mês Fim de Serviço
// (multi-seleção por checkboxes — um Set vazio = "Todos")
// Independentes por página: Operação Atual, Potencial de Expansão
// e Potenciais Rotas.
// ==========================================

// Cada entrada liga os IDs do HTML ao Set de estado correspondente
// e diz o que atualizar quando o filtro dessa página muda.
const PAGINAS_FILTRO_MES = [

    {
        sufixo: "Op",
        setInicio: () => window.filtroMesesInicioOp,
        setFim: () => window.filtroMesesFimOp,
        aoMudar: () => atualizarTudo()
    },
    {
        sufixo: "Exp",
        setInicio: () => window.filtroMesesInicioExp,
        setFim: () => window.filtroMesesFimExp,
        aoMudar: () => atualizarTudo()
    },
    {
        sufixo: "Rotas",
        setInicio: () => window.filtroMesesInicioRotas,
        setFim: () => window.filtroMesesFimRotas,
        aoMudar: () => { if (typeof atualizarPaginaRotas === "function") atualizarPaginaRotas(); }
    }

];

function construirDropdownMeses(idBotao, idPainel, estadoRef, aoMudar) {

    const botao = document.getElementById(idBotao);
    const painel = document.getElementById(idPainel);

    if (!botao || !painel)
        return;

    painel.innerHTML = "";

    NOMES_MESES.forEach((nome, indice) => {

        const numero = indice + 1;

        const label = document.createElement("label");
        label.className = "mesOpcao";

        label.innerHTML =
            `<input type="checkbox" value="${numero}"> ${nome}`;

        const checkbox = label.querySelector("input");

        checkbox.checked = estadoRef.set.has(numero);

        checkbox.addEventListener("change", () => {

            if (checkbox.checked)
                estadoRef.set.add(numero);
            else
                estadoRef.set.delete(numero);

            atualizarBotaoMeses(botao, estadoRef.set);

            if (aoMudar)
                aoMudar();

        });

        painel.appendChild(label);

    });

    atualizarBotaoMeses(botao, estadoRef.set);

    // Sem isto, chamar esta função mais do que uma vez para o mesmo
    // botão (acontece ao arrancar + quando os pedidos carregam) colava
    // um 2º listener de clique, e cada clique abria e fechava o painel
    // no mesmo instante (parecia que "não fazia nada")
    if (botao.dataset.dropdownLigado)
        return;

    botao.dataset.dropdownLigado = "1";

    botao.addEventListener("click", (evento) => {

        evento.stopPropagation();

        document.querySelectorAll(".mesDropdownPainel").forEach(p => {

            if (p !== painel)
                p.classList.remove("aberto");

        });

        painel.classList.toggle("aberto");

    });

}

function atualizarBotaoMeses(botao, set) {

    if (!set.size) {

        botao.innerText = "Todos";
        return;

    }

    if (set.size === 1) {

        botao.innerText = NOMES_MESES[[...set][0] - 1];
        return;

    }

    botao.innerText = `${set.size} meses`;

}

document.addEventListener("click", (evento) => {

    if (!evento.target.closest(".mesDropdown"))
        document.querySelectorAll(".mesDropdownPainel").forEach(p => p.classList.remove("aberto"));

});

function construirTodosDropdownsMeses() {

    PAGINAS_FILTRO_MES.forEach(pagina => {

        construirDropdownMeses(
            `botaoMesInicio${pagina.sufixo}`, `painelMesInicio${pagina.sufixo}`,
            { set: pagina.setInicio() },
            () => {

                pagina.aoMudar();
                atualizarInfoFiltroData(pagina.sufixo);

            }
        );

        construirDropdownMeses(
            `botaoMesFim${pagina.sufixo}`, `painelMesFim${pagina.sufixo}`,
            { set: pagina.setFim() },
            () => {

                pagina.aoMudar();
                atualizarInfoFiltroData(pagina.sufixo);

            }
        );

    });

}

construirTodosDropdownsMeses();

// ==========================================
// Filtros de data — valores por omissão e texto informativo
// ==========================================

function definirFiltrosDataPorOmissao() {

    const anoEl = document.getElementById("ano");

    const anoAtual = String(new Date().getFullYear());

    // Só define o valor por omissão se a opção existir na lista
    // (populada a partir dos dados reais)
    if (anoEl && [...anoEl.options].some(o => o.value === anoAtual))
        anoEl.value = anoAtual;

    // Mês Início de Serviço abre no mês atual, em CADA página,
    // de forma independente; Mês Fim fica em "Todos" — um serviço
    // que já começou antes e só termina daqui a meses continua a
    // ser relevante agora
    const mesAtual = new Date().getMonth() + 1;

    window.filtroMesesInicioOp = new Set([mesAtual]);
    window.filtroMesesFimOp = new Set();
    window.filtroMesesInicioExp = new Set([mesAtual]);
    window.filtroMesesFimExp = new Set();
    window.filtroMesesInicioRotas = new Set([mesAtual]);
    window.filtroMesesFimRotas = new Set();

    construirTodosDropdownsMeses();

    PAGINAS_FILTRO_MES.forEach(pagina => atualizarInfoFiltroData(pagina.sufixo));

}

function atualizarInfoFiltroData(sufixo) {

    const info = document.getElementById(`filtroDataInfo${sufixo}`);

    if (!info)
        return;

    const pagina = PAGINAS_FILTRO_MES.find(p => p.sufixo === sufixo);

    if (!pagina)
        return;

    const mesesInicio = pagina.setInicio();
    const mesesFim = pagina.setFim();

    const partes = [];

    if (mesesInicio && mesesInicio.size) {

        const nomes = [...mesesInicio].sort((a, b) => a - b).map(m => NOMES_MESES[m - 1]);
        partes.push(`início em ${nomes.join(", ")}`);

    }

    if (mesesFim && mesesFim.size) {

        const nomes = [...mesesFim].sort((a, b) => a - b).map(m => NOMES_MESES[m - 1]);
        partes.push(`fim em ${nomes.join(", ")}`);

    }

    info.innerText = partes.length
        ? "A mostrar: " + partes.join(" · ")
        : "A mostrar todos os meses";

}

// Esconde a barra de Ano na página de Configuração
// (não faz sentido lá — não filtra nenhuma tabela)
function atualizarVisibilidadeBarraFiltrosData(paginaAtiva) {

    const barra = document.getElementById("barraFiltrosData");

    if (barra)
        barra.style.display = paginaAtiva === "paginaIndices" ? "none" : "flex";

}

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

    // A configuração partilhada nunca deve impedir o resto do site de
    // arrancar — se falhar ou vier mal formada, cai para valores por
    // omissão (ver indices.js) em vez de travar aqui.
    await carregarConfigPartilhada();

    try {

        iniciarPaginaIndices();

    }
    catch (erro) {

        console.error("Erro ao iniciar a página de Configuração dos Índices:", erro);

    }

    await carregarPedidos();

    try {

        if (typeof atualizarPaginaRotas === "function")
            atualizarPaginaRotas();

    }
    catch (erro) {

        console.error("Erro ao construir a página de Potenciais Rotas:", erro);

    }

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

    atualizarVisibilidadeBarraFiltrosData(paginaAtiva);

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

    if (paginaAtiva === "paginaRotas" && typeof atualizarPaginaRotas === "function") {

        try {

            atualizarPaginaRotas();

        }
        catch (erro) {

            console.error("Erro ao atualizar a página de Potenciais Rotas:", erro);

        }

    }

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

function cpValido(cp) {

    // Um código postal português válido tem pelo menos 4 dígitos.
    // Isto exclui células vazias, "-", "N/A" e outros placeholders
    // que às vezes aparecem na Sheet em vez de ficarem em branco.
    return /^\d{4}/.test(cp);

}

function obterOportunidadesExpansao(listaPedidos) {

    const grupos = {};

    listaPedidos.forEach(p => {

        // String(...) primeiro: a Sheet por vezes devolve o CP como
        // número (ex: 2691 em vez de "2691-000"), o que fazia esta
        // função rebentar ao chamar .trim() diretamente num número.
        const cpCompleto = String(p["Pickup CP"] || "").trim();

        // Sem CP válido -> não desaparece, entra num grupo "catch-all"
        // (não pode ser localizado num mapa, mas continua a contar
        // nos totais e na lista de pedidos por analisar)
        const cp = cpValido(cpCompleto) ? cpCompleto.substring(0, 4) : "SEM_CP";

        if (!grupos[cp]) {

            grupos[cp] = {

                cp: cp === "SEM_CP" ? "—" : cp,
                cidade: cp === "SEM_CP" ? "Sem localização identificada" : (p["Pickup Cidade"] || "-"),
                pedidos: 0,
                shared: 0,
                private: 0,
                passageiros: 0,
                score: 0,
                semLocalizacao: cp === "SEM_CP",
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

        const somaBruta =
            metricaPedidos * pesos.pedidos +
            metricaPassageiros * pesos.passageiros +
            metricaShared * pesos.shared +
            metricaPrivate * pesos.private;

        const somaPesosPositivos =
            Object.values(pesos)
                .filter(peso => peso > 0)
                .reduce((soma, peso) => soma + peso, 0) || 1;

        const score = (somaBruta / somaPesosPositivos) * 100;

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
