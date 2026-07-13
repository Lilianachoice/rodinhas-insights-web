// ==========================================
// CLUSTERS
// ==========================================

// ==========================================
// FILTROS
// ==========================================

function obterPedidosFiltrados(listaPedidos) {

    const usarShared =
        document.getElementById("shared").checked;

    const usarPrivate =
        document.getElementById("private").checked;

    const valorMinimo =
        Number(document.getElementById("valorMinimo").value);

    return listaPedidos.filter(p => {

        // Shared / Private

        if (p["Transport Type"] === "Shared" && !usarShared)
            return false;

        if (p["Transport Type"] === "Private" && !usarPrivate)
            return false;

        // Valor mínimo

        const mensal =
            Number(p["Monthly Fee"]) || 0;

        if (mensal < valorMinimo)
            return false;

        return true;

    });

}

// ==========================================
// CLUSTERS
// (por coordenadas iguais)
// ==========================================

function criarClusters(listaPedidos) {

    const grupos = {};

    listaPedidos.forEach(pedido => {

        const lat =
            Number(pedido["Pickup Lat"]);

        const lng =
            Number(pedido["Pickup Lng"]);

        if (isNaN(lat) || isNaN(lng))
            return;

        const chave =
            lat.toFixed(5) + "_" +
            lng.toFixed(5);

        if (!grupos[chave]) {

            grupos[chave] = {

                lat: lat,
                lng: lng,

                shared: 0,
                private: 0,

                receita: 0,

                pedidos: []

            };

        }

        grupos[chave].pedidos.push(pedido);

        grupos[chave].receita +=
            Number(pedido["Monthly Fee"]) || 0;

        if (pedido["Transport Type"] === "Shared")
            grupos[chave].shared++;

        if (pedido["Transport Type"] === "Private")
            grupos[chave].private++;

    });

    return Object.values(grupos);

}
