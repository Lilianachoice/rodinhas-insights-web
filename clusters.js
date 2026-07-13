// ==========================================
// CLUSTERS
// ==========================================

// ==========================================
// DISTÂNCIA ENTRE DOIS PONTOS (KM)
// ==========================================

function calcularDistancia(lat1, lng1, lat2, lng2) {

    const R = 6371;

    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;

}

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

function criarClusters(listaPedidos) {

    const distanciaMaxima =
        Number(document.getElementById("pickupKm").value);

    const grupos = [];

    const utilizados = new Array(listaPedidos.length).fill(false);

    for (let i = 0; i < listaPedidos.length; i++) {

        if (utilizados[i])
            continue;

        const pedidoBase = listaPedidos[i];

        const latBase = Number(pedidoBase["Pickup Lat"]);
        const lngBase = Number(pedidoBase["Pickup Lng"]);

        if (isNaN(latBase) || isNaN(lngBase))
            continue;

        const grupo = {

            lat: latBase,
            lng: lngBase,

            shared: 0,
            private: 0,

            receita: 0,

            pedidos: []

        };

        for (let j = i; j < listaPedidos.length; j++) {

            if (utilizados[j])
                continue;

            const pedido = listaPedidos[j];

            const lat = Number(pedido["Pickup Lat"]);
            const lng = Number(pedido["Pickup Lng"]);

            if (isNaN(lat) || isNaN(lng))
                continue;

            const distancia = calcularDistancia(

                latBase,
                lngBase,

                lat,
                lng

            );

            if (distancia > distanciaMaxima)
                continue;

            utilizados[j] = true;

            grupo.pedidos.push(pedido);

            grupo.receita += Number(pedido["Monthly Fee"]) || 0;

            if (pedido["Transport Type"] === "Shared")
                grupo.shared++;

            if (pedido["Transport Type"] === "Private")
                grupo.private++;

        }

        grupos.push(grupo);

    }

    console.log("Clusters criados:", grupos.length);

    return grupos;

}
