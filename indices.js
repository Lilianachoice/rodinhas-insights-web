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

function iniciarPaginaIndices() {

    construirSliders("slidersOperacao", METRICAS_OPERACAO, obterPesosOperacao());
    construirSliders("slidersExpansao", METRICAS_EXPANSAO, obterPesosExpansao());

    const botaoOperacao = document.getElementById("guardarPesosOperacao");
    const botaoExpansao = document.getElementById("guardarPesosExpansao");

    if (botaoOperacao) {

        botaoOperacao.addEventListener("click", () => {

            const pesos = lerPesosDoFormulario("slidersOperacao", METRICAS_OPERACAO);

            guardarPesosOperacao(pesos);
            mostrarConfirmacao("confirmacaoOperacao");

            if (typeof atualizarTudo === "function")
                atualizarTudo();

        });

    }

    if (botaoExpansao) {

        botaoExpansao.addEventListener("click", () => {

            const pesos = lerPesosDoFormulario("slidersExpansao", METRICAS_EXPANSAO);

            guardarPesosExpansao(pesos);
            mostrarConfirmacao("confirmacaoExpansao");

            if (typeof atualizarTudo === "function")
                atualizarTudo();

        });

    }

}

console.log("Indices.js carregado");
