// ==========================================
// Rodinhas Insights
// ==========================================

// URL da API Apps Script
const API_URL =
  "https://script.google.com/macros/s/AKfycbxreg3S8D7k7JAUCN3Ti-i8YU09kj7Djxd-ZN8fAgj2Lt-VKQEEMwYYnb5ZfDJ1JZGS/exec";

let mapa;
let marcadores;

// Última atualização
document.getElementById("ultimaAtualizacao").innerHTML =
  new Date().toLocaleString("pt-PT");

// ==========================================
// MAPA
// ==========================================

function iniciarMapa() {

    mapa = L.map("map").setView([39.6, -8.0], 7);

    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 19,
            attribution: "© OpenStreetMap"
        }
    ).addTo(mapa);

    marcadores = L.layerGroup().addTo(mapa);

}

// ==========================================
// Carregar pedidos
// ==========================================

async function carregarPedidos() {

  try {

    const response = await fetch(API_URL);

    pedidos = await response.json();

    console.log("Pedidos carregados:", pedidos.length);

    atualizarDashboard();

  } catch (erro) {

    console.error(erro);

  }

}

// ==========================================
// Dashboard
// ==========================================

function atualizarDashboard() {

  document.getElementById("pedidos").innerText = pedidos.length;

  const receita = pedidos.reduce((total, pedido) => {

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

carregarPedidos();
