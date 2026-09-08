/**
 * DEMO CONTENT BANKS — science subjects for the SANDBOX dev gateway only.
 *
 * Hand-authored, clearly-generic drill material aligned to the usual
 * Grade-9 PTB science syllabi (units, laws, definitions, simple numerics).
 * Every row is prefixed/flagged DEMO at insert time by the gateway so it can
 * never be confused with real board content; none of this is production data.
 *
 * Row shape:
 *   { t: 'mcq', q, o: [correct, ...3 distractors] }   — answer is o[0];
 *     the gateway rotates options per row for letter variety.
 *   { t: 'true_false', q, a: 'true' | 'false' }
 *   { t: 'fill_blank', q, a }
 *   { t: 'matching', pairs: [{ left, right }, ...] }
 *   { t: 'short' | 'essay' | 'numerical' | 'conceptual', q, a }
 */
export type DemoRow =
  | { t: 'mcq'; q: string; o: [string, string, string, string] }
  | { t: 'true_false'; q: string; a: 'true' | 'false' }
  | { t: 'fill_blank'; q: string; a: string }
  | { t: 'matching'; pairs: Array<{ left: string; right: string }> }
  | { t: 'short' | 'essay' | 'numerical' | 'conceptual'; q: string; a: string };

// ────────────────────────────── PHYSICS (75) ──────────────────────────────
export const physicsRows: DemoRow[] = [
  // mcq ×22
  { t: 'mcq', q: 'DEMO: The SI unit of force is', o: ['newton', 'joule', 'pascal', 'watt'] },
  { t: 'mcq', q: 'DEMO: The SI unit of pressure is', o: ['pascal', 'newton', 'joule', 'watt'] },
  { t: 'mcq', q: 'DEMO: The SI unit of work and energy is', o: ['joule', 'watt', 'pascal', 'newton'] },
  { t: 'mcq', q: 'DEMO: The SI unit of power is', o: ['watt', 'joule', 'newton', 'pascal'] },
  { t: 'mcq', q: 'DEMO: The SI unit of electric current is', o: ['ampere', 'volt', 'ohm', 'coulomb'] },
  { t: 'mcq', q: 'DEMO: The SI unit of frequency is', o: ['hertz', 'watt', 'joule', 'ampere'] },
  { t: 'mcq', q: 'DEMO: Which instrument measures atmospheric pressure?', o: ['barometer', 'thermometer', 'ammeter', 'speedometer'] },
  { t: 'mcq', q: 'DEMO: “A body remains at rest or in uniform motion unless acted on by an unbalanced force” is Newton’s', o: ['first law', 'second law', 'third law', 'law of gravitation'] },
  { t: 'mcq', q: 'DEMO: The relation F = ma expresses Newton’s', o: ['second law', 'first law', 'third law', 'law of gravitation'] },
  { t: 'mcq', q: 'DEMO: “To every action there is an equal and opposite reaction” is Newton’s', o: ['third law', 'first law', 'second law', 'law of gravitation'] },
  { t: 'mcq', q: 'DEMO: The acceleration due to gravity near the Earth’s surface is approximately', o: ['10 m/s²', '5 m/s²', '1.6 m/s²', '100 m/s²'] },
  { t: 'mcq', q: 'DEMO: Speed in a specified direction is called', o: ['velocity', 'momentum', 'acceleration', 'impulse'] },
  { t: 'mcq', q: 'DEMO: The rate of change of velocity is called', o: ['acceleration', 'speed', 'momentum', 'displacement'] },
  { t: 'mcq', q: 'DEMO: The product of mass and velocity is called', o: ['momentum', 'force', 'energy', 'power'] },
  { t: 'mcq', q: 'DEMO: The force that opposes the motion of surfaces in contact is called', o: ['friction', 'gravity', 'tension', 'thrust'] },
  { t: 'mcq', q: 'DEMO: The turning effect of a force about an axis is called', o: ['torque', 'pressure', 'impulse', 'energy'] },
  { t: 'mcq', q: 'DEMO: The gravitational force with which the Earth pulls a body is called its', o: ['weight', 'mass', 'density', 'inertia'] },
  { t: 'mcq', q: 'DEMO: The density of pure water is about', o: ['1000 kg/m³', '100 kg/m³', '10 kg/m³', '10 000 kg/m³'] },
  { t: 'mcq', q: 'DEMO: Which of the following is a renewable energy source?', o: ['solar energy', 'coal', 'petrol', 'natural gas'] },
  { t: 'mcq', q: 'DEMO: Sound cannot travel through', o: ['vacuum', 'air', 'water', 'steel'] },
  { t: 'mcq', q: 'DEMO: Heat always flows from a', o: ['hotter body to a colder body', 'colder body to a hotter body', 'body to a body of the same temperature', 'cold body to a colder body'] },
  { t: 'mcq', q: 'DEMO: The normal temperature of a healthy human body is about', o: ['37 °C', '27 °C', '40 °C', '47 °C'] },
  // true_false ×6
  { t: 'true_false', q: 'DEMO: The SI unit of time is the second.', a: 'true' },
  { t: 'true_false', q: 'DEMO: Velocity is a scalar quantity.', a: 'false' },
  { t: 'true_false', q: 'DEMO: Mass and weight of a body are always equal.', a: 'false' },
  { t: 'true_false', q: 'DEMO: Friction always opposes motion.', a: 'true' },
  { t: 'true_false', q: 'DEMO: Work is done when a force moves a body in the direction of the force.', a: 'true' },
  { t: 'true_false', q: 'DEMO: Conduction is the main mode of heat transfer in liquids and gases.', a: 'false' },
  // fill_blank ×6
  { t: 'fill_blank', q: 'DEMO: The rate of doing work is called ____.', a: 'power' },
  { t: 'fill_blank', q: 'DEMO: The gravitational force acting on a body of mass 1 kg is about ____ newtons.', a: '10' },
  { t: 'fill_blank', q: 'DEMO: The instrument used to measure electric current is called an ____.', a: 'ammeter' },
  { t: 'fill_blank', q: 'DEMO: A push or a pull acting on a body is called a ____.', a: 'force' },
  { t: 'fill_blank', q: 'DEMO: The number of complete waves passing a point per second is called ____.', a: 'frequency' },
  { t: 'fill_blank', q: 'DEMO: The quantity of matter in a body is called its ____.', a: 'mass' },
  // matching ×4
  { t: 'matching', pairs: [{ left: 'Force', right: 'newton' }, { left: 'Pressure', right: 'pascal' }, { left: 'Energy', right: 'joule' }, { left: 'Power', right: 'watt' }] },
  { t: 'matching', pairs: [{ left: 'Speed', right: 'm/s' }, { left: 'Acceleration', right: 'm/s²' }, { left: 'Density', right: 'kg/m³' }, { left: 'Frequency', right: 'hertz' }] },
  { t: 'matching', pairs: [{ left: 'Barometer', right: 'atmospheric pressure' }, { left: 'Thermometer', right: 'temperature' }, { left: 'Ammeter', right: 'electric current' }, { left: 'Stopwatch', right: 'time interval' }] },
  { t: 'matching', pairs: [{ left: 'Scalar quantity', right: 'distance' }, { left: 'Vector quantity', right: 'displacement' }, { left: 'Contact force', right: 'friction' }, { left: 'Non-contact force', right: 'gravity' }] },
  // short ×16
  { t: 'short', q: 'DEMO: Define force.', a: 'A push or pull that can change the state of rest or motion of a body.' },
  { t: 'short', q: 'DEMO: Define speed.', a: 'Distance covered per unit time.' },
  { t: 'short', q: 'DEMO: Define velocity.', a: 'Speed in a specified direction.' },
  { t: 'short', q: 'DEMO: Define acceleration.', a: 'Rate of change of velocity.' },
  { t: 'short', q: 'DEMO: State Newton’s first law of motion.', a: 'A body remains at rest or in uniform motion unless acted on by an unbalanced force.' },
  { t: 'short', q: 'DEMO: State Newton’s second law of motion.', a: 'Acceleration is directly proportional to net force and inversely proportional to mass (F = ma).' },
  { t: 'short', q: 'DEMO: State Newton’s third law of motion.', a: 'To every action there is an equal and opposite reaction.' },
  { t: 'short', q: 'DEMO: Define momentum and give its unit.', a: 'Product of mass and velocity (p = mv); unit kg·m/s.' },
  { t: 'short', q: 'DEMO: Define pressure.', a: 'Force acting normally per unit area (P = F/A).' },
  { t: 'short', q: 'DEMO: State Pascal’s law.', a: 'Pressure applied to an enclosed liquid is transmitted equally in all directions.' },
  { t: 'short', q: 'DEMO: Distinguish between mass and weight.', a: 'Mass is the quantity of matter in a body (constant); weight is the gravitational force on it (W = mg) and varies with location.' },
  { t: 'short', q: 'DEMO: Define density.', a: 'Mass per unit volume (ρ = m/V).' },
  { t: 'short', q: 'DEMO: State the law of conservation of energy.', a: 'Energy can neither be created nor destroyed; it only changes from one form to another.' },
  { t: 'short', q: 'DEMO: Define work in physics.', a: 'Work is done when a force moves a body through a distance in the direction of the force (W = Fd).' },
  { t: 'short', q: 'DEMO: What is conduction?', a: 'Transfer of heat through a substance without the substance itself moving, e.g. through solid metals.' },
  { t: 'short', q: 'DEMO: Differentiate between heat and temperature.', a: 'Heat is thermal energy in transit between bodies at different temperatures; temperature measures how hot a body is.' },
  // essay ×6
  { t: 'essay', q: 'DEMO: Explain Newton’s three laws of motion and give one example of each.', a: 'Model guide: first law — inertia (book on a table stays put); second law — F = ma (pushing a trolley); third law — action/reaction (rocket or recoil of a gun).' },
  { t: 'essay', q: 'DEMO: Explain the relation between work, energy and power, with their units.', a: 'Model guide: work W = Fd (joule); energy is the capacity to do work (joule); power is the rate of doing work, P = W/t (watt).' },
  { t: 'essay', q: 'DEMO: State Pascal’s law and explain two of its applications.', a: 'Model guide: transmitted equally in enclosed liquid; applications — hydraulic lift, hydraulic brakes, hydraulic press.' },
  { t: 'essay', q: 'DEMO: Explain heat transfer by conduction, convection and radiation, with one example each.', a: 'Model guide: conduction — metal spoon in hot tea; convection — warm air rising; radiation — heat from the Sun.' },
  { t: 'essay', q: 'DEMO: Differentiate scalar and vector quantities with at least three examples of each.', a: 'Model guide: scalars have magnitude only (speed, distance, mass); vectors have magnitude and direction (velocity, displacement, force).' },
  { t: 'essay', q: 'DEMO: Explain kinetic and potential energy, giving formulas and one example of each.', a: 'Model guide: KE = ½mv² (moving car); PE = mgh (water stored in a dam); energy changes from one form to the other as a body moves.' },
  // numerical ×10
  { t: 'numerical', q: 'DEMO: A car travels 60 km in 2 hours. Calculate its average speed.', a: '30 km/h' },
  { t: 'numerical', q: 'DEMO: A force of 12 N acts on a body of mass 3 kg. Find the acceleration produced.', a: '4 m/s²' },
  { t: 'numerical', q: 'DEMO: Find the weight of a 5 kg body (take g = 10 m/s²).', a: '50 N' },
  { t: 'numerical', q: 'DEMO: A block has mass 200 g and volume 50 cm³. Calculate its density.', a: '4 g/cm³' },
  { t: 'numerical', q: 'DEMO: Calculate the work done when a force of 25 N moves a body 4 m in the direction of the force.', a: '100 J' },
  { t: 'numerical', q: 'DEMO: A motor does 600 J of work in 10 seconds. Find its power.', a: '60 W' },
  { t: 'numerical', q: 'DEMO: A force of 100 N acts normally on an area of 2 m². Calculate the pressure.', a: '50 Pa' },
  { t: 'numerical', q: 'DEMO: Find the kinetic energy of a 2 kg body moving with a velocity of 5 m/s.', a: '25 J' },
  { t: 'numerical', q: 'DEMO: A stone is dropped from rest. Find its velocity after 3 seconds (g = 10 m/s²).', a: '30 m/s' },
  { t: 'numerical', q: 'DEMO: Calculate the pressure at the bottom of a water tank 2 m deep (density of water = 1000 kg/m³, g = 10 m/s²).', a: '20000 Pa' },
  // conceptual ×5
  { t: 'conceptual', q: 'DEMO: Why do we wear seat belts in a moving car?', a: 'Model guide: due to inertia our body tends to keep moving when the car stops suddenly; the seat belt applies a force to stop us safely.' },
  { t: 'conceptual', q: 'DEMO: Why are heavy trucks given more wheels?', a: 'Model guide: more wheels increase the area of contact, which reduces the pressure on the road and prevents sinking.' },
  { t: 'conceptual', q: 'DEMO: Why do objects weigh less on the Moon than on the Earth?', a: 'Model guide: weight = mg and the Moon’s gravity is about one-sixth of the Earth’s, so the same mass has less weight there.' },
  { t: 'conceptual', q: 'DEMO: Why do tyres have treads?', a: 'Model guide: treads increase friction between the tyre and the road, giving better grip, especially on wet roads.' },
  { t: 'conceptual', q: 'DEMO: Why does a hot cup of tea cool down faster when we blow on it?', a: 'Model guide: blowing removes the warm air above the surface and speeds up evaporation and convection, which carry heat away faster.' },
];

// ────────────────────────────── CHEMISTRY (75) ────────────────────────────
export const chemistryRows: DemoRow[] = [
  // mcq ×22
  { t: 'mcq', q: 'DEMO: The chemical symbol of sodium is', o: ['Na', 'S', 'So', 'N'] },
  { t: 'mcq', q: 'DEMO: The chemical symbol of potassium is', o: ['K', 'P', 'Po', 'Pt'] },
  { t: 'mcq', q: 'DEMO: The chemical formula of water is', o: ['H2O', 'H2O2', 'HO', 'H2'] },
  { t: 'mcq', q: 'DEMO: The chemical formula of carbon dioxide is', o: ['CO2', 'CO', 'C2O', 'CO3'] },
  { t: 'mcq', q: 'DEMO: The atomic number of carbon is', o: ['6', '4', '8', '12'] },
  { t: 'mcq', q: 'DEMO: The atomic number of oxygen is', o: ['8', '6', '16', '10'] },
  { t: 'mcq', q: 'DEMO: The most abundant gas in the Earth’s atmosphere is', o: ['nitrogen', 'oxygen', 'carbon dioxide', 'hydrogen'] },
  { t: 'mcq', q: 'DEMO: The gas essential for respiration is', o: ['oxygen', 'nitrogen', 'helium', 'hydrogen'] },
  { t: 'mcq', q: 'DEMO: The chemical name of common salt is', o: ['sodium chloride', 'potassium chloride', 'sodium carbonate', 'calcium chloride'] },
  { t: 'mcq', q: 'DEMO: The chemical formula of common salt is', o: ['NaCl', 'NaOH', 'Na2CO3', 'KCl'] },
  { t: 'mcq', q: 'DEMO: Acids turn blue litmus paper', o: ['red', 'blue', 'green', 'yellow'] },
  { t: 'mcq', q: 'DEMO: Bases turn red litmus paper', o: ['blue', 'red', 'green', 'colourless'] },
  { t: 'mcq', q: 'DEMO: The pH of a neutral solution at 25 °C is', o: ['7', '0', '5', '14'] },
  { t: 'mcq', q: 'DEMO: A solution with pH 2 is', o: ['strongly acidic', 'strongly basic', 'neutral', 'weakly basic'] },
  { t: 'mcq', q: 'DEMO: The smallest particle of an element that can take part in a chemical reaction is', o: ['an atom', 'a cell', 'a crystal', 'a mixture'] },
  { t: 'mcq', q: 'DEMO: Two or more atoms bonded together form a', o: ['molecule', 'proton', 'neutron', 'crystal'] },
  { t: 'mcq', q: 'DEMO: A solid changing directly into vapour is called', o: ['sublimation', 'evaporation', 'condensation', 'melting'] },
  { t: 'mcq', q: 'DEMO: Water boils at sea level at', o: ['100 °C', '90 °C', '110 °C', '120 °C'] },
  { t: 'mcq', q: 'DEMO: The hardest natural substance is', o: ['diamond', 'graphite', 'coal', 'chalk'] },
  { t: 'mcq', q: 'DEMO: A metal reacting with a dilute acid produces', o: ['hydrogen gas', 'oxygen gas', 'nitrogen gas', 'chlorine gas'] },
  { t: 'mcq', q: 'DEMO: Rusting of iron requires', o: ['oxygen and water', 'only oxygen', 'only water', 'carbon dioxide'] },
  { t: 'mcq', q: 'DEMO: A liquid changing into vapour from its surface is called', o: ['evaporation', 'condensation', 'sublimation', 'freezing'] },
  // true_false ×6
  { t: 'true_false', q: 'DEMO: The chemical symbol of iron is Fe.', a: 'true' },
  { t: 'true_false', q: 'DEMO: Pure water is a good conductor of electricity.', a: 'false' },
  { t: 'true_false', q: 'DEMO: An atom is the smallest particle of an element that takes part in a chemical reaction.', a: 'true' },
  { t: 'true_false', q: 'DEMO: Lemon juice is acidic in nature.', a: 'true' },
  { t: 'true_false', q: 'DEMO: Burning of wood is a physical change.', a: 'false' },
  { t: 'true_false', q: 'DEMO: The formula of carbon monoxide is CO2.', a: 'false' },
  // fill_blank ×8
  { t: 'fill_blank', q: 'DEMO: The smallest particle of an element is an ____.', a: 'atom' },
  { t: 'fill_blank', q: 'DEMO: The number of protons in an atom is called its ____ number.', a: 'atomic' },
  { t: 'fill_blank', q: 'DEMO: The central part of an atom is called the ____.', a: 'nucleus' },
  { t: 'fill_blank', q: 'DEMO: The chemical formula of sulphuric acid is ____.', a: 'H2SO4' },
  { t: 'fill_blank', q: 'DEMO: A solution which turns red litmus blue is a ____.', a: 'base' },
  { t: 'fill_blank', q: 'DEMO: The gas produced when zinc reacts with dilute hydrochloric acid is ____.', a: 'hydrogen' },
  { t: 'fill_blank', q: 'DEMO: In a neutral atom the number of electrons equals the number of ____.', a: 'protons' },
  { t: 'fill_blank', q: 'DEMO: The most abundant element in the Earth’s crust is ____.', a: 'oxygen' },
  // matching ×3
  { t: 'matching', pairs: [{ left: 'Oxygen', right: 'O' }, { left: 'Iron', right: 'Fe' }, { left: 'Gold', right: 'Au' }, { left: 'Lead', right: 'Pb' }] },
  { t: 'matching', pairs: [{ left: 'CO2', right: 'carbon dioxide' }, { left: 'H2O', right: 'water' }, { left: 'NaCl', right: 'sodium chloride' }, { left: 'CaCO3', right: 'calcium carbonate' }] },
  { t: 'matching', pairs: [{ left: 'Proton', right: 'positive charge' }, { left: 'Electron', right: 'negative charge' }, { left: 'Neutron', right: 'no charge' }, { left: 'Nucleus', right: 'contains protons and neutrons' }] },
  // short ×16
  { t: 'short', q: 'DEMO: Define an element.', a: 'A pure substance made of only one kind of atoms that cannot be broken into simpler substances by chemical means.' },
  { t: 'short', q: 'DEMO: Define a compound.', a: 'A pure substance formed when two or more elements combine chemically in a fixed ratio, e.g. water (H2O).' },
  { t: 'short', q: 'DEMO: Define a mixture.', a: 'A substance made of two or more elements or compounds mixed together without any chemical reaction.' },
  { t: 'short', q: 'DEMO: Differentiate between a physical change and a chemical change.', a: 'Physical change — no new substance, easily reversible (melting of ice); chemical change — new substance formed, usually irreversible (burning of wood).' },
  { t: 'short', q: 'DEMO: Define atomic number.', a: 'The number of protons in the nucleus of an atom of an element.' },
  { t: 'short', q: 'DEMO: Define mass number.', a: 'The total number of protons and neutrons in the nucleus of an atom.' },
  { t: 'short', q: 'DEMO: What is valency?', a: 'The combining capacity of an element, equal to the number of electrons it loses, gains or shares in a reaction.' },
  { t: 'short', q: 'DEMO: State the law of conservation of mass.', a: 'Mass is neither created nor destroyed in a chemical reaction; total mass of reactants equals total mass of products.' },
  { t: 'short', q: 'DEMO: What are isotopes? Give one example.', a: 'Atoms of the same element having the same atomic number but different mass numbers, e.g. carbon-12 and carbon-14.' },
  { t: 'short', q: 'DEMO: What is a catalyst?', a: 'A substance that speeds up a chemical reaction without itself being used up (e.g. manganese dioxide with hydrogen peroxide).' },
  { t: 'short', q: 'DEMO: How would you test an acid and a base with litmus paper?', a: 'Acids turn blue litmus red; bases turn red litmus blue.' },
  { t: 'short', q: 'DEMO: Define solubility.', a: 'The maximum amount of a solute that can dissolve in a given amount of solvent at a particular temperature.' },
  { t: 'short', q: 'DEMO: What is a mole?', a: 'The amount of a substance containing 6.02 × 10²³ particles (Avogadro’s number); mass of one mole = molar mass in grams.' },
  { t: 'short', q: 'DEMO: Define electrolysis.', a: 'The decomposition of a compound in molten or solution state into its elements by passing electric current.' },
  { t: 'short', q: 'DEMO: What is meant by an aqueous solution?', a: 'A solution in which water is the solvent, shown as (aq) in equations.' },
  { t: 'short', q: 'DEMO: Write the valencies of oxygen, nitrogen and sodium.', a: 'Oxygen 2, nitrogen 3, sodium 1.' },
  // essay ×6
  { t: 'essay', q: 'DEMO: Explain the difference between elements, compounds and mixtures with two examples of each.', a: 'Model guide: element — one kind of atoms (oxygen, iron); compound — fixed ratio combination (water, salt); mixture — no chemical union, variable ratio (air, sea water).' },
  { t: 'essay', q: 'DEMO: Describe the structure of an atom, giving the location and charge of its particles.', a: 'Model guide: protons (+1) and neutrons (0) in the nucleus; electrons (−1) moving in shells around the nucleus; atomic number = protons; mass number = protons + neutrons.' },
  { t: 'essay', q: 'DEMO: Explain periods and groups of the modern periodic table.', a: 'Model guide: horizontal rows = periods (7), same number of shells; vertical columns = groups (18), same outer-shell electron count and similar chemical properties.' },
  { t: 'essay', q: 'DEMO: Explain rusting of iron and three methods to prevent it.', a: 'Model guide: iron reacts with oxygen and moisture forming rust (iron oxide); prevention — painting, oiling/greasing, galvanising, alloying.' },
  { t: 'essay', q: 'DEMO: Describe the three states of matter and the changes between them.', a: 'Model guide: solid, liquid, gas; melting, freezing, evaporation/boiling, condensation, sublimation; state depends on particle arrangement and energy.' },
  { t: 'essay', q: 'DEMO: Explain acids, bases and salts with examples and the pH scale.', a: 'Model guide: acids give H⁺ in water (HCl, lemon juice, pH < 7); bases give OH⁻ (NaOH, pH > 7); salts form when acids neutralise bases (NaCl); pH 7 neutral.' },
  // numerical ×10
  { t: 'numerical', q: 'DEMO: Calculate the molar mass of water (H = 1, O = 16).', a: '18 g/mol' },
  { t: 'numerical', q: 'DEMO: How many moles are present in 36 g of water (molar mass 18 g/mol)?', a: '2 mol' },
  { t: 'numerical', q: 'DEMO: Find the mass of 0.5 mol of carbon dioxide (molar mass 44 g/mol).', a: '22 g' },
  { t: 'numerical', q: 'DEMO: How many moles are present in 4.4 g of carbon dioxide (molar mass 44 g/mol)?', a: '0.1 mol' },
  { t: 'numerical', q: 'DEMO: Calculate the molar mass of sulphuric acid H2SO4 (H = 1, S = 32, O = 16).', a: '98 g/mol' },
  { t: 'numerical', q: 'DEMO: Find the percentage of calcium in calcium carbonate CaCO3 (Ca = 40, C = 12, O = 16).', a: '40%' },
  { t: 'numerical', q: 'DEMO: Calculate the mass of oxygen present in 18 g of water (H2O; H = 1, O = 16).', a: '16 g' },
  { t: 'numerical', q: 'DEMO: What is the ratio by mass of hydrogen to oxygen in water?', a: '1:8' },
  { t: 'numerical', q: 'DEMO: How many moles of atoms are present in 12 g of carbon (C = 12)?', a: '1 mol' },
  { t: 'numerical', q: 'DEMO: Find the number of moles in 11 g of carbon dioxide (molar mass 44 g/mol).', a: '0.25 mol' },
  // conceptual ×4
  { t: 'conceptual', q: 'DEMO: Why is sodium metal stored in kerosene oil?', a: 'Model guide: sodium reacts very vigorously with air (oxygen) and moisture; kerosene keeps it away from both.' },
  { t: 'conceptual', q: 'DEMO: Why do we smell perfume from a distance?', a: 'Model guide: perfume vapours diffuse through the air; diffusion is faster when particles are spread by their kinetic energy.' },
  { t: 'conceptual', q: 'DEMO: Why is dry ice (solid carbon dioxide) used for storing food?', a: 'Model guide: it sublimes to cold carbon dioxide gas, keeping the food cold and dry without wetting it.' },
  { t: 'conceptual', q: 'DEMO: Why is burning of plastics discouraged?', a: 'Model guide: burning plastics releases toxic fumes and polluting gases that harm health and the environment.' },
];

// ─────────────────────────────── BIOLOGY (75) ──────────────────────────────
export const biologyRows: DemoRow[] = [
  // mcq ×22
  { t: 'mcq', q: 'DEMO: The basic structural and functional unit of life is the', o: ['cell', 'atom', 'organ', 'tissue'] },
  { t: 'mcq', q: 'DEMO: The “powerhouse of the cell” is the', o: ['mitochondrion', 'nucleus', 'ribosome', 'chloroplast'] },
  { t: 'mcq', q: 'DEMO: The control centre of the cell is the', o: ['nucleus', 'cytoplasm', 'cell wall', 'vacuole'] },
  { t: 'mcq', q: 'DEMO: Photosynthesis mainly takes place in', o: ['chloroplasts', 'mitochondria', 'ribosomes', 'lysosomes'] },
  { t: 'mcq', q: 'DEMO: The green pigment present in plants is called', o: ['chlorophyll', 'haemoglobin', 'melanin', 'carotene'] },
  { t: 'mcq', q: 'DEMO: The process by which green plants make their food is called', o: ['photosynthesis', 'respiration', 'digestion', 'transpiration'] },
  { t: 'mcq', q: 'DEMO: The functional unit of the kidney is the', o: ['nephron', 'neuron', 'alveolus', 'villus'] },
  { t: 'mcq', q: 'DEMO: The structural and functional unit of the nervous system is the', o: ['neuron', 'nephron', 'villus', 'trachea'] },
  { t: 'mcq', q: 'DEMO: Which blood cells fight against infections?', o: ['white blood cells', 'red blood cells', 'platelets', 'plasma'] },
  { t: 'mcq', q: 'DEMO: The pigment that carries oxygen in red blood cells is', o: ['haemoglobin', 'chlorophyll', 'melanin', 'keratin'] },
  { t: 'mcq', q: 'DEMO: Which vitamin is made in the skin in the presence of sunlight?', o: ['vitamin D', 'vitamin A', 'vitamin C', 'vitamin B'] },
  { t: 'mcq', q: 'DEMO: The main source of quick energy in our food is', o: ['carbohydrates', 'proteins', 'fats', 'vitamins'] },
  { t: 'mcq', q: 'DEMO: Which of the following is an enzyme?', o: ['pepsin', 'glucose', 'insulin', 'haemoglobin'] },
  { t: 'mcq', q: 'DEMO: Most absorption of digested food takes place in the', o: ['small intestine', 'stomach', 'large intestine', 'oesophagus'] },
  { t: 'mcq', q: 'DEMO: Exchange of gases in the lungs takes place in the', o: ['alveoli', 'bronchi', 'trachea', 'larynx'] },
  { t: 'mcq', q: 'DEMO: Which organ removes urea and excess water from the blood?', o: ['kidney', 'liver', 'lungs', 'heart'] },
  { t: 'mcq', q: 'DEMO: The removal of nitrogenous wastes from the body is called', o: ['excretion', 'respiration', 'egestion', 'secretion'] },
  { t: 'mcq', q: 'DEMO: Bacteria are placed in the kingdom', o: ['Monera', 'Plantae', 'Animalia', 'Fungi'] },
  { t: 'mcq', q: 'DEMO: Which of the following diseases is caused by a virus?', o: ['influenza', 'typhoid', 'malaria', 'cholera'] },
  { t: 'mcq', q: 'DEMO: Malaria is caused by a', o: ['protozoan', 'bacterium', 'virus', 'fungus'] },
  { t: 'mcq', q: 'DEMO: Which gas do plants absorb during photosynthesis?', o: ['carbon dioxide', 'oxygen', 'nitrogen', 'hydrogen'] },
  { t: 'mcq', q: 'DEMO: Water moves upward in plants mainly through', o: ['xylem', 'phloem', 'stomata', 'root hairs'] },
  // true_false ×6
  { t: 'true_false', q: 'DEMO: The cell wall is present in plant cells but not in animal cells.', a: 'true' },
  { t: 'true_false', q: 'DEMO: Mitochondria are found only in animal cells.', a: 'false' },
  { t: 'true_false', q: 'DEMO: Photosynthesis releases oxygen gas.', a: 'true' },
  { t: 'true_false', q: 'DEMO: Arteries carry blood away from the heart.', a: 'true' },
  { t: 'true_false', q: 'DEMO: Insulin controls the level of sugar in the blood.', a: 'true' },
  { t: 'true_false', q: 'DEMO: Viral diseases can be cured by antibiotics.', a: 'false' },
  // fill_blank ×8
  { t: 'fill_blank', q: 'DEMO: The powerhouse of the cell is the ____.', a: 'mitochondrion' },
  { t: 'fill_blank', q: 'DEMO: Plants store extra food in the form of ____.', a: 'starch' },
  { t: 'fill_blank', q: 'DEMO: The smallest blood vessels are called ____.', a: 'capillaries' },
  { t: 'fill_blank', q: 'DEMO: Loss of water in the form of vapour from plant leaves is called ____.', a: 'transpiration' },
  { t: 'fill_blank', q: 'DEMO: Deficiency of vitamin C causes ____.', a: 'scurvy' },
  { t: 'fill_blank', q: 'DEMO: The movement of air into the lungs is called ____.', a: 'inhalation' },
  { t: 'fill_blank', q: 'DEMO: The disease caused by deficiency of insulin is ____.', a: 'diabetes' },
  { t: 'fill_blank', q: 'DEMO: The part of the eye that controls the amount of light entering it is the ____.', a: 'iris' },
  // matching ×4
  { t: 'matching', pairs: [{ left: 'Heart', right: 'pumps blood' }, { left: 'Lungs', right: 'gaseous exchange' }, { left: 'Kidney', right: 'filters blood' }, { left: 'Stomach', right: 'digestion of food' }] },
  { t: 'matching', pairs: [{ left: 'Nucleus', right: 'controls cell activities' }, { left: 'Mitochondrion', right: 'releases energy' }, { left: 'Chloroplast', right: 'photosynthesis' }, { left: 'Cell membrane', right: 'controls entry and exit of substances' }] },
  { t: 'matching', pairs: [{ left: 'Vitamin A', right: 'night blindness' }, { left: 'Vitamin C', right: 'scurvy' }, { left: 'Vitamin D', right: 'rickets' }, { left: 'Vitamin B1', right: 'beriberi' }] },
  { t: 'matching', pairs: [{ left: 'Malaria', right: 'protozoan' }, { left: 'Influenza', right: 'virus' }, { left: 'Typhoid', right: 'bacterium' }, { left: 'Ringworm', right: 'fungus' }] },
  // short ×16
  { t: 'short', q: 'DEMO: Define a cell.', a: 'The basic structural and functional unit of all living organisms.' },
  { t: 'short', q: 'DEMO: Write two differences between a plant cell and an animal cell.', a: 'Plant cells have a cell wall and chloroplasts and a large vacuole; animal cells lack cell wall and chloroplasts and have small vacuoles.' },
  { t: 'short', q: 'DEMO: What is the function of mitochondria?', a: 'They release energy (ATP) from food during aerobic respiration — hence called the powerhouse of the cell.' },
  { t: 'short', q: 'DEMO: Define photosynthesis and write its raw materials.', a: 'The process by which green plants make glucose from carbon dioxide and water using sunlight; products are glucose and oxygen.' },
  { t: 'short', q: 'DEMO: Why are green plants called producers?', a: 'They prepare their own food by photosynthesis and are the first link of every food chain.' },
  { t: 'short', q: 'DEMO: Define a tissue with an example.', a: 'A group of similar cells performing the same function, e.g. muscle tissue, xylem tissue.' },
  { t: 'short', q: 'DEMO: Name the three types of blood cells and state the function of each.', a: 'Red blood cells carry oxygen; white blood cells fight infection; platelets help in clotting of blood.' },
  { t: 'short', q: 'DEMO: What is the function of the human heart?', a: 'It pumps blood through the arteries to all parts of the body and receives it back through veins.' },
  { t: 'short', q: 'DEMO: Define excretion.', a: 'The removal of nitrogenous waste products of metabolism from the body, e.g. urea through kidneys.' },
  { t: 'short', q: 'DEMO: What is the role of insulin?', a: 'Insulin, secreted by the pancreas, controls the level of glucose in the blood.' },
  { t: 'short', q: 'DEMO: Define an enzyme.', a: 'A biological catalyst that speeds up chemical reactions in living organisms without being consumed, e.g. pepsin.' },
  { t: 'short', q: 'DEMO: What is vaccination?', a: 'Injecting a weakened or killed pathogen to make the body produce antibodies and develop immunity against that disease.' },
  { t: 'short', q: 'DEMO: What are the functions of xylem and phloem?', a: 'Xylem transports water and minerals from roots upward; phloem transports food made in leaves to all parts.' },
  { t: 'short', q: 'DEMO: Define osmosis.', a: 'Movement of water molecules from a region of higher water concentration to lower water concentration through a semi-permeable membrane.' },
  { t: 'short', q: 'DEMO: Write two differences between an artery and a vein.', a: 'Arteries carry blood away from the heart and have thick elastic walls; veins carry blood towards the heart and have valves and thinner walls.' },
  { t: 'short', q: 'DEMO: Define homeostasis.', a: 'The maintenance of a constant internal environment of the body, e.g. temperature, water and glucose balance.' },
  // essay ×6
  { t: 'essay', q: 'DEMO: Describe five parts of a cell and the function of each.', a: 'Model guide: cell membrane — boundary control; cytoplasm — site of reactions; nucleus — controls activities; mitochondria — energy; vacuole — storage (plant) or lysosomes — digestion.' },
  { t: 'essay', q: 'DEMO: Explain the process of photosynthesis and why it is important for life.', a: 'Model guide: chlorophyll traps sunlight; carbon dioxide + water → glucose + oxygen; supplies food to all living things and oxygen to the atmosphere.' },
  { t: 'essay', q: 'DEMO: Describe the main organs of the human digestive system in order.', a: 'Model guide: mouth (chewing, saliva) → oesophagus → stomach (acid + churning) → small intestine (digestion + absorption) → large intestine (water absorption) → anus (egestion).' },
  { t: 'essay', q: 'DEMO: Explain how water is transported from the roots to the leaves of a tall tree.', a: 'Model guide: root hairs absorb water; it rises through xylem by root pressure and the transpiration pull created by water loss from leaves.' },
  { t: 'essay', q: 'DEMO: Describe the mechanism of breathing in humans.', a: 'Model guide: inhalation — diaphragm contracts and flattens, ribcage rises, air enters lungs; exhalation — diaphragm relaxes, ribcage falls, air leaves; exchange occurs in alveoli.' },
  { t: 'essay', q: 'DEMO: Write a note on the components of human blood and their functions.', a: 'Model guide: plasma — liquid carrier; red cells — oxygen; white cells — immunity; platelets — clotting.' },
  // conceptual ×13
  { t: 'conceptual', q: 'DEMO: Why should our diet be balanced?', a: 'Model guide: a balanced diet supplies carbohydrates, proteins, fats, vitamins and minerals in the right amounts to keep the body healthy and prevent deficiency diseases.' },
  { t: 'conceptual', q: 'DEMO: Why do we breathe faster after hard exercise?', a: 'Model guide: muscles need more oxygen to release extra energy, and more carbon dioxide is produced, so the breathing rate rises to supply and remove these gases.' },
  { t: 'conceptual', q: 'DEMO: Why is the small intestine very long?', a: 'Model guide: its long length with villi gives a very large surface area so that digested food can be absorbed efficiently.' },
  { t: 'conceptual', q: 'DEMO: Why should we not drink river or well water without purification?', a: 'Model guide: untreated water may contain harmful bacteria and parasites that cause diseases such as cholera and typhoid; boiling or filtering kills/removes them.' },
  { t: 'conceptual', q: 'DEMO: Why is ORS given to a patient of diarrhoea?', a: 'Model guide: diarrhoea causes loss of water and salts from the body; ORS replaces the lost water and essential salts to prevent dehydration.' },
  { t: 'conceptual', q: 'DEMO: Why do plants need both xylem and phloem?', a: 'Model guide: xylem carries water and minerals from roots to leaves; phloem carries food made in leaves to all other parts — two different needs, two different tubes.' },
  { t: 'conceptual', q: 'DEMO: Why is the wall of the left ventricle thicker than that of the right ventricle?', a: 'Model guide: the left ventricle pumps blood to the whole body (long distance, high pressure), while the right ventricle pumps only to the lungs.' },
  { t: 'conceptual', q: 'DEMO: Why do leaves appear green?', a: 'Model guide: chlorophyll absorbs red and blue light and reflects green light, so green light reaches our eyes.' },
  { t: 'conceptual', q: 'DEMO: Why is vaccination important for children?', a: 'Model guide: vaccines build immunity against dangerous diseases (polio, measles, TB) so children do not fall seriously ill later.' },
  { t: 'conceptual', q: 'DEMO: Why do we shiver when we feel cold?', a: 'Model guide: shivering is rapid contraction of muscles that generates heat, helping the body keep its temperature stable.' },
  { t: 'conceptual', q: 'DEMO: Why do fish have gills instead of lungs?', a: 'Model guide: gills extract the oxygen dissolved in water, which is how fish breathe in water; lungs cannot extract dissolved oxygen.' },
  { t: 'conceptual', q: 'DEMO: Why is photosynthesis considered essential for life on Earth?', a: 'Model guide: it produces the food energy for almost all living things and releases the oxygen we breathe.' },
  { t: 'conceptual', q: 'DEMO: Why should antibiotics not be taken without a doctor’s advice?', a: 'Model guide: wrong or overuse of antibiotics can kill useful bacteria, cause side effects, and make bacteria resistant to the medicine.' },
];
