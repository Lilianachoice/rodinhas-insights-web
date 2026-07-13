// ==========================================
// Rodinhas Insights
// ==========================================

// URL da API Apps Script
const API_URL =
  "https://script.google.com/macros/s/AKfycbxreg3S8D7k7JAUCN3Ti-i8YU09kj7Djxd-ZN8fAgj2Lt-VKQEEMwYYnb5ZfDJ1JZGS/exec";

let pedidos = [];

console.log("Leaflet:", typeof L);

// Última atualização
document.getElementById("ultimaAtualizacao").innerHTML =
  new Date().toLocaleString("pt-PT");


// ==========================================
// Carregar pedidos
// ==========================================

async function carregarPedidos() {

  try {

    const response = await fetch(API_URL);

    pedidos = await response.json();

    const pedidosFiltrados = obterPedidosFiltrados(pedidos);

    atualizarDashboard(pedidosFiltrados);

    desenharPedidos(pedidosFiltrados);

  } catch (erro) {

    console.error(erro);

  }

}

// ==========================================
// Dashboard
// ==========================================

function atualizarDashboard(listaPedidos) {

  document.getElementById("pedidos").innerText =
    listaPedidos.length;

  const receita = listaPedidos.reduce((total, pedido) => {

    return total + (Number(pedido["Monthly Fee"]) || 0);

  }, 0);

  document.getElementById("receita").innerText =
    receita.toLocaleString("pt-PT") + " €";

  document.getElementById("oportunidades").innerText = "...";

}

// ==========================================
// Sliders
// ==========================================

function ligarSlider(idSlider, idTexto, sufixo) {

  const slider = document.getElementById(idSlider);
  const texto = document.getElementById(idTexto);

  if (!slider || !texto)
    return;

  function atualizar() {

    texto.innerText = slider.value + sufixo;

    // Mais tarde:
    // aplicarFiltros();

  }

  atualizar();

  slider.addEventListener("input", atualizar);

}

ligarSlider("capacidade", "valorCapacidade", " lugares");
ligarSlider("tempoViatura", "valorTempo", " minutos");
ligarSlider("pickupKm", "valorPickup", " km");
ligarSlider("dropoffKm", "valorDropoff", " km");
ligarSlider("valorMinimo", "valorMensal", " €");

// ==========================================

iniciarMapa();

carregarPedidos();
