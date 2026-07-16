// ==========================================
// IA — RESPOSTAS BASEADAS NOS DADOS
// (gera respostas em linguagem natural a partir
//  dos clusters, pedidos e pesos configurados —
//  não depende de nenhuma API externa)
// ==========================================

function faixaHorarios(pedidos) {

    const minutos = pedidos
        .map(p => horaParaMinutos(p["Pickup Hora"]))
        .filter(m => m !== null)
        .sort((a, b) => a - b);

    if (!minutos.length)
        return null;

    const paraHora = m =>
        `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

    return `${paraHora(minutos[0])} e as ${paraHora(minutos[minutos.length - 1])}`;

}

// ==========================================
// OPERAÇÃO ATUAL
// ==========================================

function responderIaOperacao(pergunta, clusters, capacidade) {

    if (!clusters || !clusters.length)
        return "Ainda não há dados suficientes com os filtros atuais para gerar uma resposta.";

    const ordenados = [...clusters].sort((a, b) => (b.score || 0) - (a.score || 0));

    const melhor = ordenados[0];

    if (pergunta === "reforcar" || pergunta === "porque") {

        const cidade = melhor.pedidos[0]["Pickup Cidade"] || "esta zona";
        const crianças = melhor.totalPassageiros || melhor.pedidos.length;
        const ocupacao = Math.round(
            (melhor.totalPassageiros / (capacidade || 7)) * 100
        );
        const faixa = faixaHorarios(melhor.pedidos);

        let texto =
            `Com base nos dados e nos parâmetros atuais, a melhor zona para reforçar a operação é ` +
            `<b>${cidade}</b>, porque concentra ${melhor.pedidos.length} pedidos com ${crianças} passageiros` +
            (ocupacao > 0 ? `, preenchendo cerca de ${ocupacao}% da capacidade de uma viatura` : "") +
            (faixa ? `. Os horários concentram-se entre as ${faixa}` : "") +
            `. Índice de Oportunidade: ${melhor.score}/100.`;

        if (ordenados.length > 1) {

            const segunda = ordenados[1];

            texto += ` A segunda melhor opção é ${segunda.pedidos[0]["Pickup Cidade"] || "outra zona"} ` +
                `(Índice ${segunda.score}), com ${segunda.pedidos.length} pedidos.`;

        }

        return texto;

    }

    if (pergunta === "horario") {

        const contagem = {};

        clusters.forEach(cluster => {

            cluster.pedidos.forEach(p => {

                const min = horaParaMinutos(p["Pickup Hora"]);

                if (min === null)
                    return;

                const slot = Math.floor(min / 30) * 30;

                contagem[slot] = (contagem[slot] || 0) + 1;

            });

        });

        const slots = Object.entries(contagem).sort((a, b) => b[1] - a[1]);

        if (!slots.length)
            return "Não existem horários de pickup suficientes nos dados para identificar o período mais crítico.";

        const [slotMin, total] = slots[0];

        const inicio = Number(slotMin);

        const paraHora = m =>
            `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

        return `O horário mais crítico é entre as ${paraHora(inicio)} e as ${paraHora(inicio + 30)}, ` +
            `com ${total} pedidos concentrados nesse período. Vale a pena garantir cobertura reforçada nesta faixa.`;

    }

    if (pergunta === "viaturas") {

        const cap = capacidade || 7;

        const total = clusters.reduce(
            (soma, c) => soma + Math.ceil(c.totalPassageiros / cap), 0
        );

        return `Com a lotação máxima definida em ${cap} lugares, seriam necessárias aproximadamente ` +
            `<b>${total} viaturas</b> para cobrir os ${clusters.length} clusters identificados nos filtros atuais.`;

    }

    return "Ainda não sei responder a esta pergunta.";

}

// ==========================================
// POTENCIAL DE EXPANSÃO
// ==========================================

function responderIaExpansao(pergunta, oportunidades) {

    if (!oportunidades || !oportunidades.length)
        return "Ainda não há pedidos suficientes fora da operação atual para gerar uma resposta.";

    const ordenados = [...oportunidades].sort((a, b) => (b.score || 0) - (a.score || 0));

    const melhor = ordenados[0];

    if (pergunta === "nova-zona" || pergunta === "franchising") {

        const concorrencia = melhor.pedidos <= 3 ? "pouca concorrência instalada" : "procura já consolidada";

        let texto =
            `A localidade com maior potencial ${pergunta === "franchising" ? "para um franchising" : "para uma nova operação"} ` +
            `é <b>${melhor.cidade}</b> (CP ${melhor.cp}), com ${melhor.pedidos} pedidos e ${melhor.passageiros} passageiros ` +
            `identificados, ${concorrencia}. Índice de Oportunidade: ${melhor.score}.`;

        if (ordenados.length > 1) {

            texto += ` Em segundo lugar surge ${ordenados[1].cidade} (CP ${ordenados[1].cp}), com ${ordenados[1].pedidos} pedidos.`;

        }

        return texto;

    }

    if (pergunta === "cp") {

        const top3 = ordenados.slice(0, 3)
            .map(o => `${o.cp} (${o.cidade}) — ${o.pedidos} pedidos`)
            .join("; ");

        return `Os códigos postais com maior concentração de pedidos são: ${top3}.`;

    }

    return "Ainda não sei responder a esta pergunta.";

}

console.log("Ia.js carregado");
