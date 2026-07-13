// ==========================================
// CLUSTERS
// ==========================================

function obterPedidosFiltrados(listaPedidos) {

    const usarShared = document.getElementById("shared").checked;
    const usarPrivate = document.getElementById("private").checked;

    return listaPedidos.filter(p => {

        if (p["Transport Type"] === "Shared" && !usarShared)
            return false;

        if (p["Transport Type"] === "Private" && !usarPrivate)
            return false;

        return true;

    });

}

// ==========================================

function criarClusters(listaPedidos) {

    const grupos = {};

    listaPedidos.forEach(p => {

        if (!p["Pickup Lat"] || !p["Pickup Lng"])
            return;

        const chave =
            Number(p["Pickup Lat"]).toFixed(5) + "_" +
            Number(p["Pickup Lng"]).toFixed(5);

        if (!grupos[chave]) {

            grupos[chave] = {

                lat: Number(p["Pickup Lat"]),
                lng: Number(p["Pickup Lng"]),

                shared: 0,
                private: 0,

                receita: 0,

                pedidos: []

            };

        }

        grupos[chave].pedidos.push(p);

        grupos[chave].receita += Number(p["Monthly Fee"]) || 0;

        if (p["Transport Type"] === "Shared")
            grupos[chave].shared++;

        if (p["Transport Type"] === "Private")
            grupos[chave].private++;

    });

    return Object.values(grupos);

}
