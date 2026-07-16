// ==========================================
// POTENCIAIS ROTAS (site)
// ==========================================
// Mesma lógica que corre no Apps Script (rotas.gs), para que o que
// se vê aqui seja exatamente o que vai no email diário. Reaproveita
// as funções já existentes em clusters.js (distanciaKm, horaParaMinutos,
// obterDiasPedido, coordenadasValidas).

function obterDepositoMaisProximoSite(pedido, config) {

    const lat = paraNumero(pedido["Pickup Lat"]);
    const lng = paraNumero(pedido["Pickup Lng"]);

    const distPorto = distanciaKm(lat, lng, config.depositos.porto.lat, config.depositos.porto.lng);
    const distLisboa = distanciaKm(lat, lng, config.depositos.lisboa.lat, config.depositos.lisboa.lng);

    return distPorto <= distLisboa
        ? { chave: "porto", distancia: distPorto }
        : { chave: "lisboa", distancia: distLisboa };

}

function duracaoTurnoMinutosSite(turno) {

    const inicio = horaParaMinutos(turno.inicio) || 0;
    const fim = horaParaMinutos(turno.fim) || (24 * 60);

    return Math.max(0, fim - inicio);

}

function construirClustersDepositoSite(pedidosDeposito, config, chaveDeposito) {

    const regras = config.regrasOperacionais;
    const deposito = config.depositos[chaveDeposito];
    const duracaoTurno = duracaoTurnoMinutosSite(config.turno);

    const kmPorTempo = (regras.tempoViatura / 60) * 30;
    const limitePickup = Math.min(regras.pickupKm, kmPorTempo);
    const limiteDropoff = Math.min(regras.dropoffKm, kmPorTempo);

    const clusters = [];

    pedidosDeposito.forEach(pedido => {

        const lat = paraNumero(pedido["Pickup Lat"]);
        const lng = paraNumero(pedido["Pickup Lng"]);
        const latD = paraNumero(pedido["Dropoff Lat"]);
        const lngD = paraNumero(pedido["Dropoff Lng"]);
        const passageiros = Number(pedido["Total Passengers"]) || 1;

        let alvo = null;

        for (const cluster of clusters) {

            if (cluster.totalPassageiros + passageiros > regras.capacidade)
                continue;

            if (distanciaKm(cluster.lat, cluster.lng, lat, lng) > limitePickup)
                continue;

            if (!isNaN(latD) && !isNaN(lngD) && cluster.latD !== null) {

                if (distanciaKm(cluster.latD, cluster.lngD, latD, lngD) > limiteDropoff)
                    continue;

            }

            alvo = cluster;
            break;

        }

        if (!alvo) {

            alvo = {

                deposito: chaveDeposito,
                lat, lng,
                latD: !isNaN(latD) ? latD : null,
                lngD: !isNaN(lngD) ? lngD : null,
                shared: 0,
                private: 0,
                receita: 0,
                totalPassageiros: 0,
                pedidos: []

            };

            clusters.push(alvo);

        }

        alvo.pedidos.push(pedido);
        alvo.receita += Number(pedido["Monthly Fee"]) || 0;
        alvo.totalPassageiros += passageiros;

        if (pedido["Transport Type"] === "Shared") alvo.shared++;
        if (pedido["Transport Type"] === "Private") alvo.private++;

    });

    const TEMPO_SERVICO_POR_PEDIDO_MIN = 5;
    const VELOCIDADE_KMH = 30;

    return clusters.filter(cluster => {

        const distIda = distanciaKm(deposito.lat, deposito.lng, cluster.lat, cluster.lng);
        const minutosViagem = (distIda * 2 / VELOCIDADE_KMH) * 60;
        const minutosServico = cluster.pedidos.length * TEMPO_SERVICO_POR_PEDIDO_MIN;

        cluster.distanciaDeposito = Math.round(distIda * 10) / 10;

        return (minutosViagem + minutosServico) <= duracaoTurno;

    });

}

function pontuarClustersRotas(clusters, pesos) {

    if (!clusters.length)
        return;

    const maxReceita = Math.max(...clusters.map(c => c.receita), 1);
    const maxPedidos = Math.max(...clusters.map(c => c.pedidos.length), 1);
    const maxPassageiros = Math.max(...clusters.map(c => c.totalPassageiros), 1);

    clusters.forEach(cluster => {

        const total = cluster.pedidos.length;

        const minutos = cluster.pedidos
            .map(p => horaParaMinutos(p["Pickup Hora"]))
            .filter(m => m !== null);

        let metricaHorario = 0.5;

        if (minutos.length > 1) {

            const media = minutos.reduce((a, b) => a + b, 0) / minutos.length;
            const desvio = Math.sqrt(minutos.reduce((s, m) => s + Math.pow(m - media, 2), 0) / minutos.length);

            metricaHorario = Math.max(0, 1 - desvio / 120);

        } else if (minutos.length === 1) {

            metricaHorario = 1;

        }

        const contagemDias = {};

        cluster.pedidos.forEach(p => {

            obterDiasPedido(p).forEach(dia => {
                contagemDias[dia] = (contagemDias[dia] || 0) + 1;
            });

        });

        const diasValores = Object.values(contagemDias);
        const metricaDias = diasValores.length ? Math.max(...diasValores) / total : 0.5;

        const somaBruta =
            (cluster.receita / maxReceita) * pesos.receita +
            (total / maxPedidos) * pesos.pedidos +
            (cluster.totalPassageiros / maxPassageiros) * pesos.passageiros +
            (total ? cluster.shared / total : 0) * pesos.shared +
            (total ? cluster.private / total : 0) * pesos.private +
            metricaHorario * pesos.horario +
            metricaDias * pesos.dias;

        const somaPesosPositivos =
            Object.values(pesos)
                .filter(peso => peso > 0)
                .reduce((soma, peso) => soma + peso, 0) || 1;

        const score = (somaBruta / somaPesosPositivos) * 100;

        cluster.score = Math.max(0, Math.min(100, Math.round(score)));

    });

}

function construirRotasPotenciaisSite() {

    if (!window.configPartilhada || !pedidos.length)
        return { porto: [], lisboa: [] };

    const config = window.configPartilhada;

    // Filtros comuns (Shared/Private, zona, cidade, dias, ano) +
    // filtro de mês próprio desta página (independente de Operação
    // Atual e Potencial de Expansão)
    const pedidosComuns = obterPedidosFiltradosComuns(pedidos);

    const pedidosComFiltros = aplicarFiltroMeses(
        pedidosComuns, window.filtroMesesInicioRotas, window.filtroMesesFimRotas
    );

    const pedidosValidos = pedidosComFiltros
        .filter(pedidoTemMorada)
        .filter(pedidoTemPickupValido);

    const porDeposito = { porto: [], lisboa: [] };

    pedidosValidos.forEach(pedido => {

        const { chave } = obterDepositoMaisProximoSite(pedido, config);

        porDeposito[chave].push(pedido);

    });

    const resultado = {};

    ["porto", "lisboa"].forEach(chave => {

        const clusters = construirClustersDepositoSite(porDeposito[chave], config, chave);

        pontuarClustersRotas(clusters, config.pesosOperacao);

        clusters.sort((a, b) => b.score - a.score);

        // Mostra todos os clusters formados (sem mínimo de pedidos
        // nem de score), até ao nº de viaturas disponíveis no depósito
        resultado[chave] = clusters.slice(0, config.depositos[chave].viaturas);

    });

    return resultado;

}

// ==========================================
// RENDERIZAR PÁGINA
// ==========================================

let rotasAtuais = [];

function atualizarPaginaRotas() {

    if (!window.configPartilhada)
        return;

    if (typeof preencherCamposRotas === "function")
        preencherCamposRotas();

    const config = window.configPartilhada;
    const resultado = construirRotasPotenciaisSite();

    rotasAtuais = [];

    // Cartões de depósito
    const gridDepositos = document.getElementById("depositosGrid");

    if (gridDepositos) {

        gridDepositos.innerHTML = ["porto", "lisboa"].map(chave => {

            const deposito = config.depositos[chave];
            const nRotas = resultado[chave].length;

            return `
                <div class="depositoCard">
                    <div class="depositoNome">${deposito.nome}</div>
                    <div class="depositoMorada">${deposito.morada}</div>
                    <div class="depositoInfo">
                        🚐 ${deposito.viaturas} viatura(s) • ${nRotas} rota(s) com potencial hoje
                    </div>
                    <div class="depositoTurno">
                        Turno: ${config.turno.inicio} – ${config.turno.fim}
                    </div>
                </div>
            `;

        }).join("");

    }

    // Lista de rotas
    const lista = document.getElementById("rotasPotenciaisLista");

    if (!lista)
        return;

    let html = "";

    ["porto", "lisboa"].forEach(chave => {

        resultado[chave].forEach(cluster => {

            const indice = rotasAtuais.length;

            rotasAtuais.push(cluster);

            const cidade = cluster.pedidos[0]["Pickup Cidade"] || "Sem cidade";
            const nomeDeposito = config.depositos[chave].nome;

            html += `
                <div class="rotaCard" onclick="mostrarDetalheRota(${indice})">
                    <div class="rotaHeader">
                        <div>
                            <div class="rotaTitulo">${cidade}</div>
                            <div class="rotaSubtitulo">A partir de ${nomeDeposito} • ${cluster.distanciaDeposito} km</div>
                        </div>
                        <div class="badgeScore">${cluster.score}</div>
                    </div>
                    <div class="rotaStats">
                        ${cluster.pedidos.length} pedidos • ${cluster.totalPassageiros} passageiros •
                        ${cluster.receita.toLocaleString("pt-PT")} € / mês
                    </div>
                </div>
            `;

        });

    });

    lista.innerHTML = html || `<div class="clusterVazio">Sem rotas com potencial nos critérios atuais.</div>`;

}

function mostrarDetalheRota(indice) {

    const cluster = rotasAtuais[indice];
    const painel = document.getElementById("detalheRota");

    if (!cluster || !painel)
        return;

    let html = `
        <div class="clusterHeader">
            <div>
                <div class="clusterTitulo">${cluster.pedidos[0]["Pickup Cidade"] || "Sem cidade"}</div>
                <div class="clusterSubtitulo">Índice de Oportunidade: ${cluster.score}</div>
            </div>
            <div class="clusterReceita">${cluster.receita.toLocaleString("pt-PT")} €</div>
        </div>

        <table class="tabelaPedidos">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Hora Pickup</th>
                    <th>Morada Pickup</th>
                    <th>Dias</th>
                </tr>
            </thead>
            <tbody>
    `;

    cluster.pedidos.forEach(pedido => {

        const morada = [pedido["Pickup"], pedido["Pickup CP"], pedido["Pickup Cidade"]]
            .filter(Boolean).join(", ") || "—";

        html += `
            <tr>
                <td>${pedido["ID"] || "-"}</td>
                <td>${formatarHora(pedido["Pickup Hora"])}</td>
                <td>${morada}</td>
                <td>${obterDiasPedido(pedido).join(", ") || "—"}</td>
            </tr>
        `;

    });

    html += `</tbody></table>`;

    painel.style.display = "block";
    painel.innerHTML = html;
    painel.scrollIntoView({ behavior: "smooth" });

}

console.log("Rotas.js carregado");
