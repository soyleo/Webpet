// --- VARIABLES GLOBALES ---
const seleccionarAtaque = document.getElementById("seleccion-ataque");
const botonMascota = document.getElementById("boton-mascota");
const spanVidasJugador = document.getElementById("vidas-jugador");
const spanVidasEnemigo = document.getElementById("vidas-enemigo");
const reinicio = document.getElementById("boton-reiniciar");
const botonReinicio = document.getElementById("reiniciar-juego");
const mascotaRival = document.getElementById("mascota-rival");
const spanMascotaJugador = document.getElementById("mascota-jugador");
const seleccionMascota = document.getElementById("seleccion-mascota");
const contenedorAtaques = document.querySelector("#contenedor-ataques");
const mensajes = document.getElementById("mensajes");
const mensajeTurno = document.getElementById("mensaje-turno");
const imgMascotaJugador = document.getElementById("img-mascota-jugador");
const imgMascotaPC = document.getElementById("img-mascota-rival");
const contenedorMascotas = document.getElementById("contenedor-mascotas");

// Variables de lógica de juego
let jugadorId = null;
let mascotaJugador;
let mascotaPC;
let webPets = [];
let vidasJugador;
let vidasEnemigo;
let modoJuego = ""; // "ONLINE" o "OFFLINE"
let intervaloMatchmaking = null;
let intervaloEsperaAtaque = null;
let timerAtaque = null;

// Reglas y Clase WebPet (igual que tu código original)
const reglas = {
  Fuego: { gana_a: ["Planta", "Hielo"], pierde_con: ["Agua", "Tierra"] },
  Agua: { gana_a: ["Fuego", "Tierra"], pierde_con: ["Planta", "Hielo"] },
  Planta: { gana_a: ["Agua", "Tierra"], pierde_con: ["Fuego", "Hielo"] },
  Tierra: { gana_a: ["Hielo", "Fuego"], pierde_con: ["Agua", "Planta"] },
  Hielo: { gana_a: ["Planta", "Agua"], pierde_con: ["Fuego", "Tierra"] },
  Normal: { gana_a: [], pierde_con: [] },
};
const baseDamage = 20;

class WebPet {
  constructor(nombre, img, vida, tipo) {
    this.nombre = nombre;
    this.img = img;
    this.vida = vida;
    this.tipo = tipo;
  }
}

// Instancias (Tus mascotas)
let wispy = new WebPet("Wispy", "Img/wispy.png", 200, "Fuego");
let bubbles = new WebPet("Bubbles", "Img/bubbles.png", 200, "Agua");
let lizzy = new WebPet("Lizzy", "Img/lizzy.png", 200, "Planta");
let dusty = new WebPet("Dusty", "Img/dusty.png", 200, "Tierra");
let frostiling = new WebPet("Frostiling", "Img/frostiling.png", 200, "Hielo");
let purrly = new WebPet("Purrly", "Img/purrly.png", 200, "Normal");

webPets.push(wispy, bubbles, lizzy, dusty, frostiling, purrly);

// --- INICIO DEL JUEGO ---
function cargaDelJuego() {
  seleccionarAtaque.style.display = "none";

  webPets.forEach((webPet) => {
    let opcionDeWebPets = `
      <input type="radio" name="mascota" id=${webPet.nombre.toLowerCase()} value=${
      webPet.nombre
    } />
      <label class="nombre-pet tarjeta-de-mokepon" for=${webPet.nombre.toLowerCase()}>
        <img class="img-card" src=${webPet.img} alt=${webPet.nombre}>
        ${webPet.nombre}
        <p class="btn-atq" id="boton-${webPet.tipo.toLowerCase()}" >${
      webPet.tipo
    }</p>
      </label>
    `;
    contenedorMascotas.innerHTML += opcionDeWebPets;
  });

  botonReinicio.style.display = "none";
  botonMascota.addEventListener("click", seleccionarMascotaJugador);
  reinicio.addEventListener("click", function () {
    location.reload(true);
  });

  unirseAlJuego();
}

function unirseAlJuego() {
  fetch("http://localhost:8080/unirse").then(function (res) {
    if (res.ok) {
      res.text().then(function (respuesta) {
        console.log("ID Jugador:", respuesta);
        jugadorId = respuesta;
      });
    }
  });
}

function seleccionarMascotaJugador() {
  let mascota = document.querySelector('input[name="mascota"]:checked');

  if (mascota == null) {
    alert("Selecciona una mascota");
  } else {
    spanMascotaJugador.textContent = mascota.value;
    mascotaJugador = webPets.find((pet) => pet.nombre === mascota.value);
    imgMascotaJugador.src = mascotaJugador.img; // Setear imagen propia

    seleccionarWebPet(mascotaJugador);

    // CAMBIO DE PANTALLA
    seleccionMascota.style.display = "none";
    seleccionarAtaque.style.display = "flex"; // Mostramos la pantalla de batalla

    // Ocultar botones de ataque mientras buscamos rival
    document.getElementById("contenedor-ataques").style.display = "none";

    iniciarMatchmaking(); // Empezar búsqueda (Polling 30s)
  }
}

function seleccionarWebPet(mascotaJugador) {
  fetch("http://localhost:8080/webpet/" + jugadorId, {
    method: "post",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ webPet: mascotaJugador.nombre }), // Enviamos solo nombre para simplificar
  });
}

// --- SISTEMA DE MATCHMAKING (30s) ---
function iniciarMatchmaking() {
  let tiempoBuscando = 0;
  mensajeTurno.innerHTML = "Buscando oponente...";

  intervaloMatchmaking = setInterval(() => {
    tiempoBuscando++;
    mensajeTurno.innerHTML = `Buscando oponente... ${tiempoBuscando}s`;

    fetch(`http://localhost:8080/matchmaking/${jugadorId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.hayOponente) {
          clearInterval(intervaloMatchmaking);
          modoJuego = "ONLINE";
          mascotaPC =
            webPets.find((p) => p.nombre === data.oponentePet.nombre) ||
            webPets[0];
          iniciarPeleaUI();
        } else if (tiempoBuscando >= 30) {
          clearInterval(intervaloMatchmaking);
          modoJuego = "OFFLINE";

          // --- BLOQUEO PARA IA ---
          // Avisamos al servidor que ya no estamos disponibles aunque estemos contra la IA
          fetch(`http://localhost:8080/webpet/${jugadorId}/bloquear`, {
            method: "post",
          });

          let aleatorioIndex = aleatorio(0, webPets.length - 1);
          mascotaPC = webPets[aleatorioIndex];
          iniciarPeleaUI();
        }
      });
  }, 1000);
}

// --- INICIO DE PELEA UI ---
function iniciarPeleaUI() {
  mascotaRival.textContent = mascotaPC.nombre;
  imgMascotaPC.src = mascotaPC.img;
  vidasJugador = mascotaJugador.vida;
  vidasEnemigo = mascotaPC.vida;
  spanVidasJugador.textContent = vidasJugador;
  spanVidasEnemigo.textContent = vidasEnemigo;

  if (modoJuego === "OFFLINE") {
    document.getElementById("contenedor-ataques").style.display = "flex";
    iniciarTurnoJugador();
  } else {
    // MODO ONLINE: Sincronizar entrada
    sincronizarComienzo();
  }
}

function sincronizarComienzo() {
  mensajeTurno.textContent = "Sincronizando con rival...";

  // 1. Decirle al servidor que yo ya estoy listo
  fetch(`http://localhost:8080/webpet/${jugadorId}/confirmar-listo`, {
    method: "post",
  });

  // 2. Esperar a que el oponente también esté listo
  let intervaloSync = setInterval(() => {
    fetch(`http://localhost:8080/webpet/${jugadorId}/ambos-listos`)
      .then((res) => res.json())
      .then((data) => {
        if (data.listos) {
          clearInterval(intervaloSync);
          mensajeTurno.textContent = "¡Rival conectado! Empieza la batalla.";
          document.getElementById("contenedor-ataques").style.display = "flex";

          // Solo ahora habilitamos el primer turno
          setTimeout(() => {
            iniciarTurnoJugador();
          }, 1000);
        }
      });
  }, 1000);
}

// --- TIMER DE ATAQUE (15s) ---
function iniciarTurnoJugador() {
  // Habilitar botones
  const botones = document.querySelectorAll(".btn-atq");
  botones.forEach((btn) => (btn.disabled = false));

  let tiempoRestante = 15;
  mensajeTurno.textContent = `¡Tu turno! Tiempo: ${tiempoRestante}s`;

  if (timerAtaque) clearInterval(timerAtaque);

  timerAtaque = setInterval(() => {
    tiempoRestante--;
    mensajeTurno.textContent = `¡Tu turno! Tiempo: ${tiempoRestante}s`;

    if (tiempoRestante <= 0) {
      clearInterval(timerAtaque);
      // Selección automática
      const randomBtn = botones[aleatorio(0, botones.length - 1)];
      ataqueAutomatico(randomBtn.value);
    }
  }, 1000);
}

// Listener de ataques (Unificado)
contenedorAtaques.addEventListener("click", (e) => {
  if (e.target.classList.contains("btn-atq")) {
    // Asegurar que es botón
    clearInterval(timerAtaque);
    resolverAccionJugador(e.target.value);
  }
});

function ataqueAutomatico(ataque) {
  console.log("Tiempo agotado. Ataque auto:", ataque);
  resolverAccionJugador(ataque);
}

function resolverAccionJugador(ataqueSeleccionado) {
  if (modoJuego === "OFFLINE") {
    let ataqueEnemigo = ataquePC();
    // En OFFLINE el cálculo es instantáneo
    combatir(ataqueSeleccionado, ataqueEnemigo);
  } else {
    // En ONLINE esperamos la sincronización del servidor
    enviarAtaqueOnline(ataqueSeleccionado);
  }
}

// --- LÓGICA ONLINE ---
function enviarAtaqueOnline(ataqueSeleccionado) {
    mensajeTurno.textContent = "Esperando al rival...";
    
    // 1. Enviamos nuestro ataque
    fetch(`http://localhost:8080/webpet/${jugadorId}/ataque`, {
        method: "post",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ataque: ataqueSeleccionado })
    });

    // 2. POLLING: Esperamos a que el servidor tenga AMBOS ataques
    intervaloEsperaAtaque = setInterval(() => {
        fetch(`http://localhost:8080/webpet/${jugadorId}/resultado-turno`)
            .then(res => res.json())
            .then(data => {
                if (data.listo) {
                    clearInterval(intervaloEsperaAtaque);
                    
                    // Ejecutamos el combate con los datos sincronizados del servidor
                    combatir(data.ataqueJugador, data.ataqueRival);
                    
                    // --- EL NUEVO HANDSHAKE DE LIMPIEZA ---
                    // Esperamos 2 segundos para que el usuario vea qué pasó
                    setTimeout(() => {
                        // Limpiamos nuestro ataque en el servidor
                        fetch(`http://localhost:8080/webpet/${jugadorId}/limpiar`, { method: 'post' })
                        .then(() => {
                            // Solo iniciamos el siguiente turno si la pelea NO ha terminado
                            if (vidasJugador > 0 && vidasEnemigo > 0) {
                                iniciarTurnoJugador();
                            }
                        });
                    }, 2000);

                } else if (data.oponenteDesconectado) {
                    clearInterval(intervaloEsperaAtaque);
                    mensajeTurno.textContent = "El oponente se ha ido. Partida finalizada.";
                    botonReinicio.style.display = "block";
                }
            });
    }, 1000);
}

// --- COMBATE Y RESULTADOS ---
function combatir(ataqueJugador, ataqueEnemigo) {
  let resultado = determinarGanador(ataqueJugador, ataqueEnemigo);

  mensajeTurno.innerHTML = `Tú atacaste con <b>${ataqueJugador}</b>.<br>El rival atacó con <b>${ataqueEnemigo}</b>.<br>${resultado}`;

  revisarVidas();
}

function revisarVidas() {
  if (vidasEnemigo <= 0 || vidasJugador <= 0) {
    // Determinar mensaje final
    if (vidasEnemigo <= 0) {
      mensajeTurno.textContent = "¡GANASTE LA BATALLA!";
    } else {
      mensajeTurno.textContent = "HAS PERDIDO...";
    }

    botonReinicio.style.display = "block";

    // --- ELIMINAR JUGADOR DEL SERVIDOR ---
    // Como el combate terminó, borramos el ID de la lista de online
    fetch(`http://localhost:8080/jugador/${jugadorId}/eliminar`, {
      method: "delete",
    }).then(() =>
      console.log("Sesión de combate terminada y eliminada del servidor.")
    );
  } else {
    setTimeout(() => {
      iniciarTurnoJugador();
    }, 2000);
  }
}

// --- UTILS ---
function ataquePC() {
  // Definimos los ataques exactos que existen en nuestras reglas
  const ataquesPosibles = ["Fuego", "Agua", "Planta", "Tierra", "Hielo"];
  const indiceAleatorio = aleatorio(0, ataquesPosibles.length - 1);
  const ataqueElegido = ataquesPosibles[indiceAleatorio];

  console.log("La IA eligió: " + ataqueElegido); // Para que revises en consola
  return ataqueElegido;
}

function aleatorio(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function determinarGanador(ataqueSeleccionado, ataqueAleatorio) {
  // Si alguno es undefined o no existe en reglas, evitamos el crash
  if (!reglas[ataqueSeleccionado] || !reglas[ataqueAleatorio]) {
    console.error("Error: Ataque no reconocido", {
      ataqueSeleccionado,
      ataqueAleatorio,
    });
    return "Error en combate";
  }

  if (ataqueSeleccionado === ataqueAleatorio) {
    return "¡Empate!";
  }

  if (reglas[ataqueSeleccionado].gana_a.includes(ataqueAleatorio)) {
    let danio = resolucionDeTipos(
      mascotaJugador.tipo,
      ataqueSeleccionado,
      mascotaPC.tipo
    );
    vidasEnemigo -= danio;
    spanVidasEnemigo.textContent = Math.max(0, vidasEnemigo);
    return `¡Ganaste la ronda! El rival recibe ${danio} de daño.`;
  } else {
    let danio = resolucionDeTipos(
      mascotaPC.tipo,
      ataqueAleatorio,
      mascotaJugador.tipo
    );
    vidasJugador -= danio;
    spanVidasJugador.textContent = Math.max(0, vidasJugador);
    return `¡Perdiste la ronda! Recibes ${danio} de daño.`;
  }
}

function resolucionDeTipos(tipoAtacante, ataque, tipoDefensor) {
  // Verificación de seguridad: si el ataque no está en las reglas, no aplicar multiplicador
  if (!reglas[ataque]) {
    console.warn(`El ataque "${ataque}" no existe en las reglas.`);
    return baseDamage;
  }

  let multiplier = 1;
  if (tipoAtacante === ataque) {
    multiplier *= 1.5;
  }

  if (reglas[ataque].gana_a.includes(tipoDefensor)) {
    multiplier *= 2;
  } else if (reglas[ataque].pierde_con.includes(tipoDefensor)) {
    multiplier *= 0.5;
  }

  return Math.floor(baseDamage * multiplier);
}

window.addEventListener("load", cargaDelJuego);
