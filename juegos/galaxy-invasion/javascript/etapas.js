/* =========================================================
   GALAXY INVASION — etapas.js
   Las etapas del Modo Historia: nombre, si ya se pueden
   jugar, el texto de la introducción y el de la victoria.
   ========================================================= */

export const ETAPAS = [
  {
    id: 'granja',
    numero: 1,
    nombre: 'La granja',
    estado: 'jugable',
    resumen: 'Defiende tu granja de los babosos, consigue las llaves y vence a la Bestia de Heno.',
    titulo: 'La noche que cayeron',
    texto: [
      'San Isidro, 11:40 de la noche. Una nave enorme se quedó flotando sobre la ciudad… y un platillo bajó sobre tu granja y se llevó a <strong>{tuPariente}</strong> con un rayo verde.',
      'Eres <strong>{completo}</strong>. Todo el pueblo huyó, pero tú no te vas sin {pareja}. Con la <strong>escopeta vieja</strong> de tu papá vas a abrirte paso entre los <strong>babosos</strong> que dejaron en la granja.',
      'Busca los <strong>cofres</strong>: tienen armas. Los <strong>barriles rojos</strong> explotan si les disparas. Toma las llaves, sube a la <strong>camioneta</strong> y sal manejando por el portón: el rastro de {pareja} empieza en esa nave.'
    ],
    victoria: {
      titulo: '¡Granja defendida!',
      nota: 'La Bestia de Heno quedó hecha paja. {nombre} arranca la camioneta y toma la carretera rumbo a la ciudad.'
    }
  },
  {
    id: 'carretera',
    numero: 2,
    nombre: 'La carretera',
    estado: 'jugable',
    resumen: 'Maneja hacia la ciudad… hasta que algo enorme te corta el camino.',
    titulo: 'Novecientos metros',
    texto: [
      'La camioneta arranca. Delante, una carretera de <strong>900 metros</strong> hasta la ciudad, y encima de la ciudad, la nave.',
      'Hay aliens pequeños en la vía: los puedes <strong>atropellar</strong>. Mira el <strong>minimapa</strong> para no perderte.',
      'Algo se mueve en los maizales… Si te quedas sin camioneta, sigue <strong>a pie</strong>: tu escopeta todavía funciona.'
    ],
    victoria: {
      titulo: '¡Llegaste a la ciudad!',
      nota: 'El Lanzador quedó tendido en la carretera. Delante, la ciudad en llamas… y la nave nodriza esperando.'
    }
  },
  {
    id: 'ciudad',
    numero: 3,
    nombre: 'La ciudad',
    estado: 'jugable',
    resumen: 'Cruza la avenida, rescata a los soldados y vence al Guardián de la nave.',
    titulo: 'La avenida de la nave',
    texto: [
      'La ciudad está tomada. Al final de la avenida, sobre la plaza, flota la <strong>nave nodriza</strong>. Mientras más te acerques, <strong>más aliens</strong> van a salir.',
      'Cuidado con los <strong>Soldados alien</strong> (disparan plasma: cúbrete detrás de autos y barreras) y con los <strong>Brutos</strong> (cargan de frente: muévete de lado).',
      'Dicen que quedan soldados atrapados en la ciudad. Si los rescatas, pelearán contigo.'
    ],
    victoria: {
      titulo: '¡A bordo de la nave!',
      nota: 'El rayo te sube hacia la nave nodriza. ¿Estará {pareja} ahí arriba?'
    }
  },
  {
    id: 'nave',
    numero: 4,
    nombre: 'La nave nodriza',
    estado: 'jugable',
    resumen: 'Cuarto de armas, motores y la cabina del Capitán. Averigua a dónde llevaron a {pareja}.',
    titulo: 'Dentro de la Colmena',
    texto: [
      'El rayo te dejó en el <strong>hangar</strong> de la nave nodriza. Las cápsulas donde guardaban a la gente están vacías… pero {pareja} tiene que haber pasado por aquí.',
      'Busca <strong>pistas</strong>. Sabotea los <strong>3 motores</strong> disparándole a sus núcleos morados para que la nave no se mueva.',
      'En la cabina te espera <strong>el Capitán</strong>. Su armadura es casi irrompible: dispárale a la <strong>gema del pecho</strong> cuando brille.'
    ],
    victoria: {
      titulo: '¡La nave cayó!',
      nota: 'Una cápsula de escape te lleva hacia el planeta de la Mente Colmena. Ahí tienen a {pareja} y a los demás. Continuará en la Etapa 5.'
    }
  },
  {
    id: 'planeta',
    numero: 5,
    nombre: 'El planeta colmena',
    estado: 'pronto',
    version: 'v0.8',
    resumen: 'Fábrica, fuente de alimento y el núcleo de la Mente Colmena. Ahí tienen a {pareja} y a los demás humanos: sácalos a todos.'
  }
];

/* Texto del número: "Etapa 2" o "Extra" */
export function etiquetaEtapa(et) {
  return typeof et.numero === 'number' ? 'Etapa ' + et.numero : et.numero;
}

export function etapa(id) {
  return ETAPAS.find((e) => e.id === id);
}
