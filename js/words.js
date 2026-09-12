const Words = (() => {
  const banks = {
    easy: [
      "sol", "mar", "casa", "perro", "gato", "luna", "playa", "mundo", "cielo", "mesa",
      "libro", "agua", "fuego", "tierra", "nube", "puerta", "campo", "llave", "coche", "flor",
      "mango", "piedra", "queso", "silla", "tigre", "uva", "volcan", "leche", "norte", "naranja",
      "zapato", "yegua", "bolso", "dedo", "higado", "jaula"
    ],
    medium: [
      "rapido", "corazon", "musica", "arbol", "pagina", "dificil", "camara", "futbol", "lapiz", "sabado",
      "proximo", "jamaica", "primavera", "hojas", "ciudad", "ventana", "espejo", "amigo", "tambor", "verde",
      "bicicleta", "chocolate", "elefante", "farola", "guitarra", "helado", "isla", "jirafa", "limonada", "marron",
      "nacion", "oceano", "planeta", "relampago", "salvaje", "trueno"
    ],
    hard: [
      "alrededor", "examenes", "telefono", "facilmente", "maquina", "estacion", "parrafo", "celula",
      "gramatica", "hipopotamo", "murcielago", "psicologo", "rapidamente", "simbolo", "busqueda", "cabeza",
      "diciembre", "ejercito", "geografia", "kilometro", "lampara", "mercancio", "necesario", "quimera",
      "rafaga", "serpiente", "temperatura", "velocidad", "sinonimo", "travesia", "universo", "voluntad", "No vas a poder conseguirlo"
    ]
  };
  const shown = { easy: {}, medium: {}, hard: {} };

  function normalize(s) {
    return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function pick(tier) {
    const pool = banks[tier].filter((w) => !shown[tier][w]);
    const source = pool.length ? pool : banks[tier];
    if (!pool.length) shown[tier] = {};
    const word = source[Math.floor(Math.random() * source.length)];
    shown[tier][word] = true;
    return word;
  }

  return {
    pick,
    normalize,
    resetAll() {
      shown.easy = {};
      shown.medium = {};
      shown.hard = {};
    }
  };
})();