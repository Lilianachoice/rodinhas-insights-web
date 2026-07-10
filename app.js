// URL da API do Apps Script
const API_URL = "https://script.google.com/macros/s/AKfycbxreg3S8D7k7JAUCN3Ti-i8YU09kj7Djxd-ZN8fAgj2Lt-VKQEEMwYYnb5ZfDJ1JZGS/exec";

// Atualiza a data/hora
document.getElementById("ultimaAtualizacao").innerHTML =
    new Date().toLocaleString("pt-PT");

// Carrega os pedidos
async function carregarPedidos() {

    try {

        const response = await fetch(API_URL);

        const pedidos = await response.json();

        console.log(pedidos);

        atualizarDashboard(pedidos);

    } catch (erro) {

        console.error(erro);

    }

}

// Atualiza os cartões
function atualizarDashboard(pedidos) {

    // Nº de pedidos
    document.getElementById("totalPedidos").innerText = pedidos.length;

    // Receita potencial
    const receita = pedidos.reduce((total, p) => {

        return total + Number(p["Monthly Fee"] || 0);

    }, 0);

    document.getElementById("receitaPotencial").innerText =
        receita.toLocaleString("pt-PT") + " €";

    // Ainda vamos calcular isto mais tarde
    document.getElementById("totalOportunidades").innerText = "...";

}

carregarPedidos();
