// ==========================================
// CLUSTERS, FILTROS E ÍNDICE DE OPORTUNIDADE
// ==========================================

// ==========================================
// LIMITES GEOGRÁFICOS DE PORTUGAL
// (usados para detetar geocoding errado:
//  Espanha, Brasil, EUA, coordenadas trocadas, etc.)
// ==========================================

const LIMITES_PT = [

    // Continente
    { latMin: 36.8, latMax: 42.2, lngMin: -9.6, lngMax: -6.0 },

    // Açores
    { latMin: 36.9, latMax: 39.8, lngMin: -31.5, lngMax: -24.7 },

    // Madeira
    { latMin: 32.3, latMax: 33.2, lngMin: -17.3, lngMax: -16.2 }

];

function coordenadasValidas(lat, lng) {

    if (isNaN(lat) || isNaN(lng))
        return false;

    if (lat === 0 && lng === 0)
        return false;

    return LIMITES_PT.some(area =>

        lat >= area.latMin && lat <= area.latMax &&
        lng >= area.lngMin && lng <= area.lngMax

    );

}

// Converte valores vindos da Sheet para número de forma robusta:
// - já numéricos -> devolve tal e qual
// - texto com vírgula decimal (formato PT, ex: "41,137") -> converte
// - espaços/células vazias -> NaN
function paraNumero(valor) {

    if (typeof valor === "number")
        return valor;

    if (valor === null || valor === undefined || valor === "")
        return NaN;

    const texto = String(valor).trim().replace(",", ".");

    return Number(texto);

}

function pedidoTemPickupValido(pedido) {

    return coordenadasValidas(
        paraNumero(pedido["Pickup Lat"]),
        paraNumero(pedido["Pickup Lng"])
    );

}

// "Tem morada" = tem alguma informação de localização (endereço, CP
// ou cidade) — isto é o que define se um pedido é dentro da área de
// atuação (Operação Atual), independentemente de já ter ou não
// coordenadas geocodificadas. Um pedido pode ter morada completa e
// ainda assim não ter Lat/Lng (geocoding pendente ou falhado) — esse
// continua a ser Operação Atual, só não aparece no mapa.
function valorPreenchido(valor) {

    const texto = String(valor || "").trim();

    // A Sheet às vezes tem "-" como placeholder em vez de célula
    // vazia — isso não conta como informação real
    if (!texto || texto === "-" || texto === "--")
        return false;

    return true;

}

function pedidoTemMorada(pedido) {

    return (
        valorPreenchido(pedido["Pickup"]) ||
        valorPreenchido(pedido["Pickup CP"]) ||
        valorPreenchido(pedido["Pickup Cidade"])
    );

}

// ==========================================
// DISTÂNCIA ENTRE DOIS PONTOS (haversine, em km)
// ==========================================

function distanciaKm(lat1, lng1, lat2, lng2) {

    const R = 6371;

    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;

}

// ==========================================
// AUXILIARES DE DADOS
// ==========================================

function obterAno(pedido) {

    const data =
        pedido["Data Pedido"] ||
        pedido["Start Date"];

    if (!data)
        return null;

    const match = String(data).match(/(20\d{2})/);

    return match ? match[1] : null;

}

function horaParaMinutos(hora) {

    if (!hora)
        return null;

    const texto = String(hora).trim();

    // Aceita "09:30", "9:30:00", ou datas completas com hora embutida
    const match = texto.match(/(\d{1,2}):(\d{2})/);

    if (!match)
        return null;

    let minutos = Number(match[1]) * 60 + Number(match[2]);

    // Correção do efeito "LMT" do Google Sheets: células de hora pura
    // são guardadas com a data "zero" de 1899-12-30, e para datas tão
    // antigas o motor de datas usa a Hora Média Local de Lisboa em
    // vez do fuso horário atual — isso desloca a hora exportada em
    // 36 minutos para a frente (ex: 13:30 sai como 14:06).
    if (texto.includes("1899-12-30")) {

        minutos -= 36;

        if (minutos < 0)
            minutos += 24 * 60;

    }

    return minutos;

}

function obterDiasPedido(pedido) {

    const dias = pedido["Dias"];

    if (!dias)
        return [];

    return String(dias)
        .split(/[,/;]/)
        .map(d => d.trim())
        .filter(Boolean);

}

// Verifica se o pedido tem viagem de volta (Return = true) — quando
// um cliente é aceite, aceitam-se sempre os dois sentidos (ida e volta)
function pedidoTemVolta(pedido) {

    const valor = pedido["Return"];

    return valor === true || valor === "TRUE" || valor === "true" || valor === 1 || valor === "1";

}

// ==========================================
// LISTAS DINÂMICAS (Zona, Cidade, Ano)
// ==========================================

function popularListasDinamicas(listaPedidos) {

    popularSelect(
        "zona",
        [...new Set(
            listaPedidos
                .map(p => p["Zone"])
                .filter(Boolean)
        )].sort(),
        "Todas"
    );

    popularSelect(
        "cidade",
        [...new Set(
            listaPedidos
                .map(p => p["Pickup Cidade"])
                .filter(Boolean)
        )].sort(),
        "Todas"
    );

    const anos = [...new Set(
        listaPedidos
            .map(obterAno)
            .filter(Boolean)
    )].sort();

    // Garante que aparece sempre o próximo ano,
    // mesmo antes de existirem pedidos nesse ano
    let anoSeguinte = new Date().getFullYear();

    if (anos.length)
        anoSeguinte = Math.max(...anos.map(Number)) + 1;
    else
        anoSeguinte = anoSeguinte + 1;

    if (!anos.includes(String(anoSeguinte)))
        anos.push(String(anoSeguinte));

    popularSelect("ano", anos.sort(), "Todos");

}

function popularSelect(idSelect, valores, textoTodos) {

    const select = document.getElementById(idSelect);

    if (!select)
        return;

    const valorAtual = select.value;

    select.innerHTML = `<option value="">${textoTodos}</option>`;

    valores.forEach(valor => {

        const option = document.createElement("option");

        option.value = valor;
        option.textContent = valor;

        select.appendChild(option);

    });

    // Mantém a seleção do utilizador se ainda existir
    if ([...select.options].some(o => o.value === valorAtual))
        select.value = valorAtual;

}

// ==========================================
// FILTROS
// ==========================================

// Extrai o período de serviço (Start Date / End Date) como objetos
// Date reais. Devolve null nos campos que não conseguir interpretar.
function obterPeriodoPedido(pedido) {

    const inicioTexto = pedido["Start Date"];
    const fimTexto = pedido["End Date"];

    const inicio = inicioTexto ? new Date(inicioTexto) : null;
    const fim = fimTexto ? new Date(fimTexto) : null;

    return {
        inicio: (inicio && !isNaN(inicio.getTime())) ? inicio : null,
        fim: (fim && !isNaN(fim.getTime())) ? fim : null
    };

}

// Estado dos filtros de mês — agora independente por página
// (Operação Atual / Potencial de Expansão / Potenciais Rotas).
// Um Set vazio significa "Todos" (sem restrição nesse filtro).
window.filtroMesesInicioOp = new Set();
window.filtroMesesFimOp = new Set();
window.filtroMesesInicioExp = new Set();
window.filtroMesesFimExp = new Set();
window.filtroMesesInicioRotas = new Set();
window.filtroMesesFimRotas = new Set();

// Filtros comuns a todas as páginas: Shared/Private, valor mínimo,
// zona, cidade, dias e ano. NÃO inclui o filtro de mês (esse é
// aplicado depois, de forma independente, por cada página — ver
// aplicarFiltroMeses).
// Verifica se um pedido foi marcado manualmente como excluído
// (ex: pedidos de teste) na configuração partilhada
function pedidoExcluido(pedido) {

    const excluidos =
        (window.configPartilhada && window.configPartilhada.idsExcluidos) || [];

    return excluidos.map(String).includes(String(pedido["ID"]));

}

function obterPedidosFiltradosComuns(listaPedidos) {

    const usarShared =
        document.getElementById("shared").checked;

    const usarPrivate =
        document.getElementById("private").checked;

    const valorMinimo =
        Number(document.getElementById("valorMinimo").value);

    const zona =
        document.getElementById("zona").value;

    const cidade =
        document.getElementById("cidade").value;

    const dia =
        document.getElementById("dias").value;

    const ano =
        document.getElementById("ano") ?
            document.getElementById("ano").value : "";

    return listaPedidos.filter(p => {

        // Excluídos manualmente (ex: pedidos de teste)
        if (pedidoExcluido(p))
            return false;

        // Shared / Private
        if (p["Transport Type"] === "Shared" && !usarShared)
            return false;

        if (p["Transport Type"] === "Private" && !usarPrivate)
            return false;

        // Valor mínimo
        const mensal = Number(p["Monthly Fee"]) || 0;

        if (mensal < valorMinimo)
            return false;

        // Zona
        if (zona && p["Zone"] !== zona)
            return false;

        // Cidade
        if (cidade && p["Pickup Cidade"] !== cidade)
            return false;

        // Dias
        if (dia && dia !== "Todos") {

            const diasPedido = obterDiasPedido(p);

            if (!diasPedido.includes(dia))
                return false;

        }

        // Ano (partilhado entre todas as páginas)
        if (ano && obterAno(p) !== ano)
            return false;

        return true;

    });

}

// Aplica o filtro de Mês Início / Mês Fim de Serviço a uma lista já
// filtrada pelos filtros comuns. Cada página passa os seus próprios
// Sets, para que a seleção seja independente entre páginas.
function aplicarFiltroMeses(listaPedidos, mesesInicio, mesesFim) {

    if (!mesesInicio) mesesInicio = new Set();
    if (!mesesFim) mesesFim = new Set();

    if (!mesesInicio.size && !mesesFim.size)
        return listaPedidos;

    return listaPedidos.filter(p => {

        const periodo = obterPeriodoPedido(p);

        if (mesesInicio.size && periodo.inicio) {

            if (!mesesInicio.has(periodo.inicio.getMonth() + 1))
                return false;

        }

        if (mesesFim.size && periodo.fim) {

            if (!mesesFim.has(periodo.fim.getMonth() + 1))
                return false;

        }

        return true;

    });

}

// Mantido por compatibilidade: filtros comuns + filtro de mês da
// Operação Atual, para quem ainda chame a função "antiga" com um
// único argumento.
function obterPedidosFiltrados(listaPedidos) {

    const comuns = obterPedidosFiltradosComuns(listaPedidos);

    return aplicarFiltroMeses(comuns, window.filtroMesesInicioOp, window.filtroMesesFimOp);

}

// ==========================================
// CLUSTERS
// (agrupa pedidos próximos, respeitando
//  capacidade, distância pickup/dropoff e tempo)
// ==========================================

function criarClusters(listaPedidos) {

    const capacidade =
        Number(document.getElementById("capacidade").value) || 7;

    const tempoMax =
        Number(document.getElementById("tempoViatura").value) || 90;

    const pickupKmMax =
        Number(document.getElementById("pickupKm").value) || 10;

    const dropoffKmMax =
        Number(document.getElementById("dropoffKm").value) || 10;

    // O tempo máximo na viatura limita, na prática, a dispersão
    // geográfica possível (assume-se uma velocidade média urbana).
    const kmPorTempo = (tempoMax / 60) * 30;

    const limitePickup = Math.min(pickupKmMax, kmPorTempo);
    const limiteDropoff = Math.min(dropoffKmMax, kmPorTempo);

    const validos = listaPedidos.filter(pedidoTemPickupValido);

    const clusters = [];

    validos.forEach(pedido => {

        const lat = paraNumero(pedido["Pickup Lat"]);
        const lng = paraNumero(pedido["Pickup Lng"]);

        const latD = paraNumero(pedido["Dropoff Lat"]);
        const lngD = paraNumero(pedido["Dropoff Lng"]);

        const passageiros =
            Number(pedido["Total Passengers"]) || 1;

        // Procura um cluster compatível já existente
        let clusterAlvo = null;

        for (const cluster of clusters) {

            if (cluster.totalPassageiros + passageiros > capacidade)
                continue;

            const distPickup = distanciaKm(
                cluster.lat, cluster.lng, lat, lng
            );

            if (distPickup > limitePickup)
                continue;

            if (!isNaN(latD) && !isNaN(lngD) && cluster.lngD !== null) {

                const distDropoff = distanciaKm(
                    cluster.latD, cluster.lngD, latD, lngD
                );

                if (distDropoff > limiteDropoff)
                    continue;

            }

            clusterAlvo = cluster;
            break;

        }

        if (!clusterAlvo) {

            clusterAlvo = {

                lat: lat,
                lng: lng,

                latD: !isNaN(latD) ? latD : null,
                lngD: !isNaN(lngD) ? lngD : null,

                shared: 0,
                private: 0,

                receita: 0,
                totalPassageiros: 0,

                pedidos: []

            };

            clusters.push(clusterAlvo);

        }

        clusterAlvo.pedidos.push(pedido);

        clusterAlvo.receita +=
            Number(pedido["Monthly Fee"]) || 0;

        clusterAlvo.totalPassageiros += passageiros;

        if (pedido["Transport Type"] === "Shared")
            clusterAlvo.shared++;

        if (pedido["Transport Type"] === "Private")
            clusterAlvo.private++;

    });

    // Calcula o Índice de Oportunidade de cada cluster
    // depois de todos estarem formados (precisa dos máximos globais)
    calcularIndicesOperacao(clusters);

    return clusters;

}

// ==========================================
// ÍNDICE DE OPORTUNIDADE — OPERAÇÃO ATUAL
// ==========================================

function calcularIndicesOperacao(clusters) {

    if (!clusters.length)
        return;

    const pesos = obterPesosOperacao();

    const maxReceita = Math.max(...clusters.map(c => c.receita), 1);
    const maxPedidos = Math.max(...clusters.map(c => c.pedidos.length), 1);
    const maxPassageiros = Math.max(...clusters.map(c => c.totalPassageiros), 1);

    clusters.forEach(cluster => {

        const total = cluster.pedidos.length;

        const metricas = {};

        metricas.receita = cluster.receita / maxReceita;

        metricas.pedidos = total / maxPedidos;

        metricas.passageiros = cluster.totalPassageiros / maxPassageiros;

        metricas.shared = total ? cluster.shared / total : 0;

        metricas.private = total ? cluster.private / total : 0;

        // Compatibilidade horária: quanto menor a dispersão dos
        // horários de pickup, maior a compatibilidade
        const minutos = cluster.pedidos
            .map(p => horaParaMinutos(p["Pickup Hora"]))
            .filter(m => m !== null);

        if (minutos.length > 1) {

            const media = minutos.reduce((a, b) => a + b, 0) / minutos.length;

            const desvio = Math.sqrt(
                minutos.reduce((soma, m) => soma + Math.pow(m - media, 2), 0) /
                minutos.length
            );

            // 0 min de desvio => 1 (ótimo) | 120+ min => 0
            metricas.horario = Math.max(0, 1 - desvio / 120);

        } else {

            metricas.horario = minutos.length === 1 ? 1 : 0.5;

        }

        // Compatibilidade de dias: fração de pedidos que partilha
        // pelo menos um dia com o conjunto mais comum do cluster
        const contagemDias = {};

        cluster.pedidos.forEach(p => {

            obterDiasPedido(p).forEach(dia => {

                contagemDias[dia] = (contagemDias[dia] || 0) + 1;

            });

        });

        const diasValores = Object.values(contagemDias);

        metricas.dias = diasValores.length
            ? Math.max(...diasValores) / total
            : 0.5;

        // Distância média entre pickups do cluster (quanto menor, melhor)
        let somaDist = 0;
        let pares = 0;

        for (let i = 0; i < cluster.pedidos.length; i++) {

            for (let j = i + 1; j < cluster.pedidos.length; j++) {

                somaDist += distanciaKm(

                    paraNumero(cluster.pedidos[i]["Pickup Lat"]),
                    paraNumero(cluster.pedidos[i]["Pickup Lng"]),
                    paraNumero(cluster.pedidos[j]["Pickup Lat"]),
                    paraNumero(cluster.pedidos[j]["Pickup Lng"])

                );

                pares++;

            }

        }

        const distMedia = pares ? somaDist / pares : 0;

        metricas.distancia = Math.max(0, 1 - distMedia / 15);

        // Duração média do serviço (campo já calculado no backend)
        const duracoes = cluster.pedidos
            .map(p => Number(p["Duração"]) || 0)
            .filter(d => d > 0);

        const duracaoMedia = duracoes.length
            ? duracoes.reduce((a, b) => a + b, 0) / duracoes.length
            : 0;

        metricas.duracao = Math.min(1, duracaoMedia / 365);

        // Serviços ativos
        const ativos = cluster.pedidos.filter(p =>
            p["Ativo"] === true || p["Ativo"] === "TRUE" || p["Ativo"] === "true"
        ).length;

        metricas.servicosAtivos = total ? ativos / total : 0;

        cluster.metricas = metricas;

        const somaBruta =
            metricas.receita * pesos.receita +
            metricas.pedidos * pesos.pedidos +
            metricas.passageiros * pesos.passageiros +
            metricas.shared * pesos.shared +
            metricas.private * pesos.private +
            metricas.horario * pesos.horario +
            metricas.dias * pesos.dias +
            metricas.distancia * pesos.distanciaPickups +
            metricas.duracao * pesos.duracaoServico +
            metricas.servicosAtivos * pesos.servicosAtivos;

        // Normaliza pela soma dos pesos positivos (o máximo teórico
        // que um cluster "perfeito" atingiria com estes pesos).
        // Sem isto, se os pesos configurados somarem mais de 100%
        // (é fácil de acontecer, cada slider vai até 50%), qualquer
        // cluster razoavelmente bom bate no teto de 100 e vários
        // clusters bem diferentes entre si ficam todos com o mesmo
        // score — o que escondia, por exemplo, um cluster com 3
        // pedidos a aparecer empatado com um de só 1 pedido.
        const somaPesosPositivos =
            Object.values(pesos)
                .filter(peso => peso > 0)
                .reduce((soma, peso) => soma + peso, 0) || 1;

        const score = (somaBruta / somaPesosPositivos) * 100;

        cluster.score = Math.max(0, Math.min(100, Math.round(score)));

    });

}

// ==========================================
// PESOS — PERSISTÊNCIA (localStorage)
// ==========================================

const PESOS_OPERACAO_DEFAULT = {

    receita: 25,
    pedidos: 15,
    passageiros: 20,
    shared: 10,
    private: -5,
    horario: 30,
    dias: 15,
    distanciaPickups: 10,
    duracaoServico: 5,
    servicosAtivos: 10

};

const PESOS_EXPANSAO_DEFAULT = {

    pedidos: 40,
    passageiros: 30,
    shared: 20,
    private: -10

};

const PESOS_ROTAS_DEFAULT = {

    receita: 20,
    pedidos: 25,
    passageiros: 20,
    shared: 15,
    private: -10,
    horario: 25,
    dias: 15

};

function obterPesosOperacao() {

    // Prioridade: configuração partilhada (backend, vinda da Sheet) >
    // cache local (localStorage) > valores por omissão
    if (window.configPartilhada && window.configPartilhada.pesosOperacao)
        return { ...PESOS_OPERACAO_DEFAULT, ...window.configPartilhada.pesosOperacao };

    try {

        const guardado = localStorage.getItem("pesosOperacao");

        if (guardado)
            return { ...PESOS_OPERACAO_DEFAULT, ...JSON.parse(guardado) };

    } catch (e) { }

    return { ...PESOS_OPERACAO_DEFAULT };

}

function obterPesosExpansao() {

    if (window.configPartilhada && window.configPartilhada.pesosExpansao)
        return { ...PESOS_EXPANSAO_DEFAULT, ...window.configPartilhada.pesosExpansao };

    try {

        const guardado = localStorage.getItem("pesosExpansao");

        if (guardado)
            return { ...PESOS_EXPANSAO_DEFAULT, ...JSON.parse(guardado) };

    } catch (e) { }

    return { ...PESOS_EXPANSAO_DEFAULT };

}

function obterPesosRotas() {

    if (window.configPartilhada && window.configPartilhada.pesosRotas)
        return { ...PESOS_ROTAS_DEFAULT, ...window.configPartilhada.pesosRotas };

    try {

        const guardado = localStorage.getItem("pesosRotas");

        if (guardado)
            return { ...PESOS_ROTAS_DEFAULT, ...JSON.parse(guardado) };

    } catch (e) { }

    return { ...PESOS_ROTAS_DEFAULT };

}

function guardarPesosOperacao(pesos) {

    localStorage.setItem("pesosOperacao", JSON.stringify(pesos));

}

function guardarPesosExpansao(pesos) {

    localStorage.setItem("pesosExpansao", JSON.stringify(pesos));

}

function guardarPesosRotas(pesos) {

    localStorage.setItem("pesosRotas", JSON.stringify(pesos));

}

console.log("Clusters.js carregado");
