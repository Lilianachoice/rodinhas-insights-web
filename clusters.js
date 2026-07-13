// ==========================================
// CLUSTERS
// ==========================================

function obterPedidosFiltrados(listaPedidos) {

    const mostrarShared =
        document.getElementById("shared").checked;

    const mostrarPrivate =
        document.getElementById("private").checked;

    return listaPedidos.filter(p => {

        if (
            p["Transport Type"] === "Shared" &&
            !mostrarShared
        )
            return false;

        if (
            p["Transport Type"] === "Private" &&
            !mostrarPrivate
        )
            return false;

        return true;

    });

}

// ==========================================
// Agrupar pedidos com mesmas coordenadas
// ==========================================

function criarGrupos(listaPedidos) {

    const grupos = {};

    listaPedidos.forEach(p => {

        if (!p["Pickup Lat"])
            return;

        const chave =
            Number(p["Pickup Lat"]).toFixed(5) +
            "_" +
            Number(p["Pickup Lng"]).toFixed(5);

        if (!grupos[chave]) {

            grupos[chave] = {

                lat: Number(p["Pickup Lat"]),
                lng: Number(p["Pickup Lng"]),
                pedidos: []

            };

        }

        grupos[chave].pedidos.push(p);

    });

    return Object.values(grupos);

}
