/* Synthetic sample lessons written for this project (no real learner data). */
var LP_SAMPLES = [
  {
    v: 1, code: 'FRAC', lang: 'en', title: 'Equivalent fractions',
    intro: 'About 10 minutes. You only need this file — no internet.',
    smsPrefix: 'Fractions', phone: '', credit: 'Sample lesson (synthetic).',
    steps: [
      { t: 'read', h: 'Same amount, different names', b: 'Cut a flatbread into 2 equal parts and eat 1 part: you ate one half, written 1/2. Cut the same flatbread into 4 equal parts and eat 2 parts: you ate 2/4. You ate the same amount both times. So 1/2 and 2/4 are equal. We call them equivalent fractions.' },
      { t: 'read', h: 'The rule', b: 'Multiply the top number and the bottom number by the same number. The fraction keeps its value. Example: start with 1/3. Multiply the top and the bottom by 2. You get 2/6. You can also divide the top and the bottom by the same number: 6/8 becomes 3/4.' },
      { t: 'q', b: 'Which fraction is equal to 1/2?', o: ['2/3', '3/6', '1/4'], a: 1, why: '3/6 is equal to 1/2: multiply the top and the bottom of 1/2 by 3.', m: ["2/3 adds 1 to the top and to the bottom. Adding does not keep the value: multiply both by the same number.","","1/4 doubles only the bottom number, so each piece got smaller. Change the top and the bottom by the same factor."] },
      { t: 'q', b: 'Which fraction is equal to 2/5?', o: ['4/10', '4/5', '2/10'], a: 0, why: '4/10: multiply the top and the bottom of 2/5 by 2. In 4/5 only the top changed.', m: ["","4/5 doubles only the top number, so the fraction got bigger.","2/10 multiplies only the bottom number, so the pieces got smaller."] },
      { t: 'q', b: 'Is 3/4 equal to 6/8?', o: ['Yes', 'No'], a: 0, why: 'Yes. Multiply the top and the bottom of 3/4 by 2 and you get 6/8.', m: ["","Try it: multiply the top and the bottom of 3/4 by 2. What do you get?"] },
      { t: 'q', b: 'Simplify 8/12. Which fraction has the same value?', o: ['4/8', '2/3', '8/6'], a: 1, why: '2/3: divide the top and the bottom of 8/12 by 4.', m: ["4/8 takes 4 away from the top and the bottom. To simplify, divide both by the same number.","","8/6 divides only the bottom number. Divide the top and the bottom by the same number."] }
    ]
  },
  {
    v: 1, code: 'WATER', lang: 'en', title: 'The water cycle',
    intro: 'About 10 minutes. Read each part, then answer the questions.',
    smsPrefix: 'Water cycle', phone: '', credit: 'Sample lesson (synthetic).',
    steps: [
      { t: 'read', h: 'Evaporation', b: 'The sun warms water in oceans, lakes and rivers. Some of the water turns into an invisible gas called water vapour. The vapour rises into the air. This change from liquid to gas is called evaporation.' },
      { t: 'read', h: 'Condensation', b: 'High in the sky the air is cooler. The water vapour cools down and turns back into tiny drops of liquid water. Many tiny drops together make a cloud. This change from gas to liquid is called condensation.' },
      { t: 'read', h: 'Precipitation and collection', b: 'When the drops in a cloud join and become heavy, they fall as rain, snow or hail. This is precipitation. The water collects in rivers, lakes, oceans and under the ground. Then the cycle starts again.' },
      { t: 'q', b: 'What is evaporation?', o: ['Water vapour turning into drops', 'Liquid water turning into gas', 'Rain falling from clouds'], a: 1, why: 'Evaporation is liquid water turning into a gas (water vapour), usually because of heat from the sun.', m: ["That is condensation: gas turning back into liquid drops. Evaporation goes the other way.","","That is precipitation. Evaporation happens before any cloud forms."] },
      { t: 'q', b: 'Why does water vapour turn into cloud drops high in the sky?', o: ['The air there is cooler', 'The air there is warmer', 'The wind pushes it'], a: 0, why: 'Cooler air makes the vapour condense into tiny liquid drops.', m: ["","Warm air helps water evaporate, not condense. Read the part called Condensation again.","Wind moves clouds around, but it is cooling that turns vapour into drops."] },
      { t: 'q', b: 'Snow falling from a cloud is an example of…', o: ['condensation', 'evaporation', 'precipitation'], a: 2, why: 'Rain, snow and hail falling from clouds are all precipitation.', m: ["Condensation makes the drops inside the cloud. Falling from the cloud is a different step.","Evaporation is water rising as a gas, not falling.",""] },
      { t: 'q', b: 'On a cold morning, drops form on the outside of a cold cup. Which step of the cycle is this most like?', o: ['Condensation', 'Precipitation', 'Collection'], a: 0, why: 'Water vapour in the air cools on the cold cup and becomes liquid drops: condensation.', m: ["","Nothing is falling from a cloud here. Where did the drops on the cup come from?","Collection is water gathering in rivers and lakes. These drops formed from the air."] }
    ]
  },
  {
    v: 1, code: 'FOTO', lang: 'es', title: 'La fotosíntesis',
    intro: 'Unos 10 minutos. Solo necesitas este archivo, sin internet.',
    smsPrefix: 'Fotosintesis', phone: '', credit: 'Lección de ejemplo (sintética).',
    steps: [
      { t: 'read', h: '¿Qué es la fotosíntesis?', b: 'Las plantas fabrican su propio alimento. Para hacerlo usan la luz del sol, el agua que toman por las raíces y el dióxido de carbono que toman del aire. Este proceso se llama fotosíntesis y ocurre sobre todo en las hojas.' },
      { t: 'read', h: '¿Qué produce?', b: 'Con la fotosíntesis la planta produce azúcar, que le da energía para crecer. También libera oxígeno al aire. Las personas y los animales respiramos ese oxígeno.' },
      { t: 'q', b: '¿Qué necesita una planta para hacer la fotosíntesis?', o: ['Luz, agua y dióxido de carbono', 'Solo tierra', 'Oxígeno y azúcar'], a: 0, why: 'La planta usa luz del sol, agua y dióxido de carbono.', m: ["","La tierra da agua y minerales, pero la planta también necesita luz y aire.","El oxígeno y el azúcar son lo que la planta produce, no lo que usa."] },
      { t: 'q', b: '¿Qué gas libera la planta al aire?', o: ['Dióxido de carbono', 'Oxígeno', 'Vapor de agua solamente'], a: 1, why: 'La fotosíntesis libera oxígeno.', m: ["La planta toma dióxido de carbono del aire; en la fotosíntesis no lo libera.","","Las plantas también pierden vapor de agua, pero el gas que produce la fotosíntesis es el oxígeno."] },
      { t: 'q', b: '¿Dónde ocurre la fotosíntesis principalmente?', o: ['En las raíces', 'En las flores', 'En las hojas'], a: 2, why: 'Ocurre sobre todo en las hojas, que reciben la luz del sol.', m: ["Las raíces toman agua, pero casi no reciben luz.","Las flores sirven para reproducirse; la luz se capta sobre todo en las hojas.",""] }
    ]
  }
];
if (typeof module !== 'undefined') module.exports = { LP_SAMPLES: LP_SAMPLES };
