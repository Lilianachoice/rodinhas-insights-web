// ==========================================
// FILTROS
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
