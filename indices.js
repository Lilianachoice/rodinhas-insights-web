// ==========================================
// CONFIGURAÇÃO DOS ÍNDICES DE OPORTUNIDADE
// (gera os sliders dinamicamente e guarda
//  os pesos em localStorage)
// ==========================================

const METRICAS_OPERACAO = [

    {
        key: "receita",
        label: "Receita Mensal",
        tooltip: "Mede o peso da receita mensal do cluster no índice global. Clusters com mensalidades mais altas pontuam mais.",
        min: 0, max: 50
    },
    {
        key: "pedidos",
        label: "Nº de Pedidos",
        tooltip: "Quanto mais pedidos um cluster agregar, maior a eficiência da rota e da viatura.",
        min: 0, max: 50
    },
    {
        key: "passageiros",
        label: "Passageiros",
        tooltip: "Considera o total de passageiros transportados no cluster.",
        min: 0, max: 50
    },
    {
        key: "shared",
        label: "Shared",
        tooltip: "Quanto maior a percentagem de pedidos Shared, maior a facilidade de agregação em rotas existentes.",
        min: 0, max: 50
    },
    {
        key: "private",
        label: "Private (penalização)",
        tooltip: "Serviços Private são mais difíceis de agregar. Um peso negativo penaliza clusters com muitos pedidos Private.",
        min: -30, max: 30
    },
    {
        key: "horario",
        label: "Compatibilidade Horária",
        tooltip: "Mede o quão próximos são os horários de pickup. Quanto menor a diferença entre pedidos, maior a probabilidade de serem servidos pela mesma viatura.",
        min: 0, max: 50
    },
    {
        key: "dias",
        label: "Compatibilidade dos Dias",
        tooltip: "Mede quantos pedidos do cluster partilham os mesmos dias de serviço.",
        min: 0, max: 50
    },
    {
        key: "distanciaPickups",
        label: "Distância entre Pickups",
        tooltip: "Mede a proximidade geográfica entre os pontos de recolha do cluster. Distâncias menores pontuam mais.",
        min: 0, max: 50
    },
    {
        key: "duracaoServico",
        label: "Duração do Serviço",
        tooltip: "Contratos mais longos representam maior estabilidade de receita.",
        min: 0, max: 50
    },
    {
        key: "servicosAtivos",
        label: "Serviços Ativos",
        tooltip: "Percentagem de pedidos do cluster que ainda estão ativos (dentro do período contratado).",
        min: 0, max: 50
    }

];

const METRICAS_EXPANSAO = [

    {
        key: "pedidos",
        label: "Nº de Pedidos",
        tooltip: "Quanto mais pedidos existirem numa localidade, maior o potencial de abrir ali uma operação.",
        min: 0, max: 60
    },
    {
        key: "passageiros",
        label: "Passageiros",
        tooltip: "Considera o total de passageiros identificados nessa localidade.",
        min: 0, max: 60
    },
    {
        key: "shared",
        label: "Shared",
        tooltip: "Mais pedidos Shared indicam maior facilidade de agregação numa futura operação.",
        min: 0, max: 60
    },
    {
        key: "private",
        label: "Private (penalização)",
        tooltip: "Um peso negativo penaliza localidades onde predominam pedidos Private, mais difíceis de agregar.",
        min: -30, max: 30
    }

];

function construirSliders(containerId, metricas, pesosAtuais) {

    const container = document.getElementById(containerId);

    if (!container)
        return;

    container.innerHTML = "";

    metricas.forEach(metrica => {

        const valor =
            pesosAtuais[metrica.key] !== undefined ?
                pesosAtuais[metrica.key] :
                0;

        const linha = document.createElement("div");

        linha.className = "linhaSlider";

        linha.innerHTML = `

            <div class="labelSlider">

                <span>${metrica.label}</span>

                <span class="tooltipMetrica" data-tooltip="${metrica.tooltip}">?</span>

                <span class="valorSliderMetrica" id="valor_${containerId}_${metrica.key}">${valor}%</span>

            </div>

            <input
                type="range"
                min="${metrica.min}"
                max="${metrica.max}"
                value="${valor}"
                id="slider_${containerId}_${metrica.key}"
                data-key="${metrica.key}">

        `;

        container.appendChild(linha);

        const slider = linha.querySelector("input[type=range]");
        const texto = linha.querySelector(".valorSliderMetrica");

        slider.addEventListener("input", () => {

            texto.textContent = slider.value + "%";

        });

    });

}

function lerPesosDoFormulario(containerId, metricas) {

    const pesos = {};

    metricas.forEach(metrica => {

        const slider =
            document.getElementById(`slider_${containerId}_${metrica.key}`);

        pesos[metrica.key] = slider ? Number(slider.value) : 0;

    });

    return pesos;

}

function mostrarConfirmacao(idSpan) {

    const span = document.getElementById(idSpan);

    if (!span)
        return;

    span.textContent = "✔ Guardado";

    setTimeout(() => {

        span.textContent = "";

    }, 2000);

}

// ==========================================
// CONFIGURAÇÃO PARTILHADA (backend / Apps Script)
// ==========================================
// Mesma chave que está em CONFIG.FRONTEND_KEY no config.gs.
// Muda os dois valores juntos se quiseres uma chave só tua.
const FRONTEND_KEY = "rodinhas-config-2026";

// Usado sempre que a API ainda não tem o endpoint de configuração
// (Apps Script antigo, ainda não publicado) ou devolve algo inesperado —
// assim a página nunca fica presa/rebentada, mesmo que o backend
// ainda não tenha sido atualizado.
const CONFIG_PARTILHADA_FALLBACK = {

    pesosOperacao: { ...PESOS_OPERACAO_DEFAULT },
    pesosExpansao: { ...PESOS_EXPANSAO_DEFAULT },

    regrasOperacionais: {
        capacidade: 7, tempoViatura: 90, pickupKm: 10, dropoffKm: 10, valorMinimo: 0
    },

    turno: { inicio: "07:00", fim: "20:00" },

    depositos: {

        porto: {
            nome: "Lake Towers",
            morada: "Rua Daciano Baptista Marques 245, 4400-617 Vila Nova de Gaia",
            lat: 41.132, lng: -8.633, viaturas: 1
        },

        lisboa: {
            nome: "Prior Velho",
            morada: "Prior Velho, 2685 Loures",
            lat: 38.796, lng: -9.110, viaturas: 1
        }

    },

    criterioRota: { ativo: false, minPedidos: 3 },

    emailDestino: "",

    // IDs de pedidos marcados manualmente como excluídos (ex: testes)
    idsExcluidos: []

};

// Confirma que o objeto tem mesmo forma de configuração (e não,
// por exemplo, a lista de pedidos — o que acontece se o Apps Script
// ainda não tiver sido atualizado com o endpoint ?recurso=config)
function pareceConfigValida(objeto) {

    return !!(

        objeto &&
        typeof objeto === "object" &&
        !Array.isArray(objeto) &&
        objeto.turno &&
        objeto.depositos &&
        objeto.depositos.porto &&
        objeto.depositos.lisboa

    );

}

async function carregarConfigPartilhada() {

    try {

        const resposta = await fetch(API_URL + "?recurso=config");

        const dados = await resposta.json();

        if (pareceConfigValida(dados)) {

            window.configPartilhada = dados;

        }
        else {

            console.warn(
                "A API devolveu algo que não parece a configuração partilhada " +
                "(o Apps Script pode ainda não ter o código novo publicado — " +
                "config.gs / configStore.gs / web.gs / rotas.gs). " +
                "A usar valores por omissão até isso ser corrigido."
            );

            window.configPartilhada = CONFIG_PARTILHADA_FALLBACK;

        }

    }
    catch (erro) {

        console.error("Não foi possível carregar a configuração partilhada:", erro);

        window.configPartilhada = CONFIG_PARTILHADA_FALLBACK;

    }

}

async function guardarConfigPartilhadaNoBackend(patch) {

    try {

        const resposta = await fetch(API_URL, {

            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ chave: FRONTEND_KEY, config: patch })

        });

        const dados = await resposta.json();

        if (dados.ok) {

            window.configPartilhada = dados.config;
            return true;

        }

        console.error("Erro ao guardar configuração partilhada:", dados.erro);
        return false;

    }
    catch (erro) {

        console.error("Erro ao guardar configuração partilhada:", erro);
        return false;

    }

}

function preencherCamposRotas() {

    const config = window.configPartilhada;

    if (!config)
        return;

    const set = (id, valor) => {

        const el = document.getElementById(id);

        if (el) el.value = valor;

    };

    set("turnoInicio", config.turno.inicio);
    set("turnoFim", config.turno.fim);
    set("viaturasPorto", config.depositos.porto.viaturas);
    set("viaturasLisboa", config.depositos.lisboa.viaturas);
    set("emailDestino", config.emailDestino);

    const criterio = config.criterioRota || { ativo: false, minPedidos: 3 };

    const radioSim = document.querySelector('input[name="minimoPedidosAtivo"][value="sim"]');
    const radioNao = document.querySelector('input[name="minimoPedidosAtivo"][value="nao"]');
    const linhaValor = document.getElementById("linhaMinimoPedidosValor");
    const campoValor = document.getElementById("minimoPedidosValor");

    if (radioSim && radioNao) {

        radioSim.checked = !!criterio.ativo;
        radioNao.checked = !criterio.ativo;

    }

    if (campoValor)
        campoValor.value = criterio.minPedidos || 3;

    if (linhaValor)
        linhaValor.style.display = criterio.ativo ? "flex" : "none";

}

function iniciarPaginaIndices() {

    construirSliders("slidersOperacao", METRICAS_OPERACAO, obterPesosOperacao());
    construirSliders("slidersExpansao", METRICAS_EXPANSAO, obterPesosExpansao());

    preencherCamposRotas();
    preencherCampoIdsExcluidos();

    const botaoOperacao = document.getElementById("guardarPesosOperacao");
    const botaoExpansao = document.getElementById("guardarPesosExpansao");
    const botaoRotas = document.getElementById("guardarConfigRotas");
    const botaoExcluidos = document.getElementById("guardarIdsExcluidos");

    if (botaoOperacao) {

        botaoOperacao.addEventListener("click", async () => {

            const pesos = lerPesosDoFormulario("slidersOperacao", METRICAS_OPERACAO);

            guardarPesosOperacao(pesos);
            await guardarConfigPartilhadaNoBackend({ pesosOperacao: pesos });
            mostrarConfirmacao("confirmacaoOperacao");

            if (typeof atualizarTudo === "function")
                atualizarTudo();

            if (typeof atualizarPaginaRotas === "function")
                atualizarPaginaRotas();

        });

    }

    if (botaoExpansao) {

        botaoExpansao.addEventListener("click", async () => {

            const pesos = lerPesosDoFormulario("slidersExpansao", METRICAS_EXPANSAO);

            guardarPesosExpansao(pesos);
            await guardarConfigPartilhadaNoBackend({ pesosExpansao: pesos });
            mostrarConfirmacao("confirmacaoExpansao");

            if (typeof atualizarTudo === "function")
                atualizarTudo();

        });

    }

    if (botaoRotas) {

        botaoRotas.addEventListener("click", async () => {

            const minimoAtivo =
                document.querySelector('input[name="minimoPedidosAtivo"][value="sim"]').checked;

            const patch = {

                turno: {
                    inicio: document.getElementById("turnoInicio").value || "07:00",
                    fim: document.getElementById("turnoFim").value || "20:00"
                },

                depositos: {

                    porto: {
                        viaturas: Number(document.getElementById("viaturasPorto").value) || 0
                    },

                    lisboa: {
                        viaturas: Number(document.getElementById("viaturasLisboa").value) || 0
                    }

                },

                emailDestino: document.getElementById("emailDestino").value || "",

                criterioRota: {
                    ativo: minimoAtivo,
                    minPedidos: Number(document.getElementById("minimoPedidosValor").value) || 3
                }

            };

            const ok = await guardarConfigPartilhadaNoBackend(patch);

            mostrarConfirmacao("confirmacaoRotas");

            if (ok && typeof atualizarPaginaRotas === "function")
                atualizarPaginaRotas();

        });

        // Mostra/esconde o campo do nº mínimo consoante o Sim/Não
        document.querySelectorAll('input[name="minimoPedidosAtivo"]').forEach(radio => {

            radio.addEventListener("change", () => {

                const linhaValor = document.getElementById("linhaMinimoPedidosValor");
                const ativo = document.querySelector('input[name="minimoPedidosAtivo"][value="sim"]').checked;

                if (linhaValor)
                    linhaValor.style.display = ativo ? "flex" : "none";

            });

        });

    }

    if (botaoExcluidos) {

        botaoExcluidos.addEventListener("click", async () => {

            const texto = document.getElementById("idsExcluidos").value || "";

            const ids = texto
                .split(",")
                .map(t => t.trim())
                .filter(Boolean);

            const ok = await guardarConfigPartilhadaNoBackend({ idsExcluidos: ids });

            mostrarConfirmacao("confirmacaoExcluidos");

            if (ok) {

                if (typeof atualizarTudo === "function")
                    atualizarTudo();

                if (typeof atualizarPaginaRotas === "function")
                    atualizarPaginaRotas();

            }

        });

    }

}

function preencherCampoIdsExcluidos() {

    const campo = document.getElementById("idsExcluidos");

    if (!campo || !window.configPartilhada)
        return;

    campo.value = (window.configPartilhada.idsExcluidos || []).join(", ");

}

console.log("Indices.js carregado");
