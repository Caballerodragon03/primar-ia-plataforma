import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PRODUCTOS: Array<{
  nombre: string;
  categoria: string;
  calibres: string;
  variedades: string[];
}> = [
  // ── CÍTRICOS ─────────────────────────────────────────────────────────────
  {
    nombre: 'Naranja',
    categoria: 'Cítricos',
    calibres: '0 – 13 (≈ 92 → 60 mm de Ø)',
    variedades: ['Navelina', 'Navel Foyos', 'Navel Late', 'Lane Late', 'Navel Powell', 'Salustiana', 'Valencia Late', 'Barnfield', 'Delta Seedless'],
  },
  {
    nombre: 'Mandarina',
    categoria: 'Cítricos',
    calibres: '1 – 10',
    variedades: ['Oronules', 'Clemenules', 'Orogrande', 'Clemenvilla (Nova)', 'Nadorcott', 'Tango (Afourer)', 'Murcott', 'Satsuma Okitsu', 'Satsuma Iwasaki', 'Gold Nugget', 'Ortanique'],
  },
  {
    nombre: 'Limón',
    categoria: 'Cítricos',
    calibres: '1 – 7',
    variedades: ['Fino (Primofiori)', 'Verna', 'Eureka', 'Villafranca', 'Lisbon'],
  },
  {
    nombre: 'Pomelo',
    categoria: 'Cítricos',
    calibres: '0 > 170 mm · 1 · 2 · 3 · 4 · 5 · 6 · 7',
    variedades: ['Star Ruby', 'Marsh Seedless', 'Rio Red', 'Duncan'],
  },
  {
    nombre: 'Lima',
    categoria: 'Cítricos',
    calibres: '36 · 42 · 48 · 54 · 60 · 63',
    variedades: ['Tahití (Persian lime)'],
  },
  // ── FRUTAS DE HUESO ───────────────────────────────────────────────────────
  {
    nombre: 'Melocotón',
    categoria: 'Frutas de hueso',
    calibres: 'D (51-56 mm) · C (56-61) · B (61-67) · A (67-73) · AA (73-80) · AAA (80-90) · AAAA (>90)',
    variedades: ['Calanda (DOP)', 'Baby Gold 5', 'Baby Gold 6', 'Baby Gold 7', 'Catherine', 'Springcrest', 'Maycrest', 'Redhaven', 'Elegant Lady', 'Royal Glory'],
  },
  {
    nombre: 'Nectarina',
    categoria: 'Frutas de hueso',
    calibres: 'D (51-56 mm) · C (56-61) · B (61-67) · A (67-73) · AA (73-80) · AAA (80-90) · AAAA (>90)',
    variedades: ['Big Top', 'Venus', 'Fairlane', 'Queen Ruby', 'May Glo', 'Sunwright', 'Fantasia', 'Flavor Top'],
  },
  {
    nombre: 'Albaricoque',
    categoria: 'Frutas de hueso',
    calibres: 'AAAA ≥ 55 mm · AAA 50-55 mm · AA 45-50 mm · A 40-45 mm · B 35-40 mm · C 30-35 mm',
    variedades: ['Bulida', 'Paviot', 'Galta Roja', 'Mogador', 'Tom-Cot'],
  },
  {
    nombre: 'Ciruela',
    categoria: 'Frutas de hueso',
    calibres: 'A (<35 mm) · B (35-40) · C (40-45) · D (45-50) · E (>50 mm)',
    variedades: ['Reina Claudia', 'Golden Japan', 'Santa Rosa', 'Angeleno', 'Black Splendor', 'Fortune', 'Satsuma', 'Claudia Verde', 'Mirabel'],
  },
  {
    nombre: 'Cereza',
    categoria: 'Frutas de hueso',
    calibres: '20 · 22 · 24 · 26 · 28 · 30 mm',
    variedades: ['Burlat', 'Early Lory', 'Prime Giant', 'Brooks', 'Lapins', 'Santina', 'Sweetheart', 'Summit', 'Regina', 'Picota (Ambrunés)', 'Pico Negro', 'Pico Limón', 'Navalinda'],
  },
  {
    nombre: 'Paraguayo / Platerina',
    categoria: 'Frutas de hueso',
    calibres: 'AAAA > 90 mm · AAA 80-90 mm · AA 73-80 mm · A 67-73 mm · B 61-67 mm · C 56-61 mm · D 51-56 mm',
    variedades: ['Galaxy', 'Sweet Cap', 'UFO-4', 'Flatpretty', 'Platibelle'],
  },
  // ── FRUTAS DE PEPITA ─────────────────────────────────────────────────────
  {
    nombre: 'Manzana',
    categoria: 'Frutas de pepita',
    calibres: '60/65 · 65/70 · 70/75 · 75/80 · 80/85 · 85/90 · 90+ mm',
    variedades: ['Golden Delicious', 'Royal Gala', 'Fuji', 'Granny Smith', 'Red Delicious', 'Pink Lady', 'Reineta', 'Story Inored', 'Modi'],
  },
  {
    nombre: 'Pera',
    categoria: 'Frutas de pepita',
    calibres: '50/55 · 55/60 · 60/65 · 65/70 · 70/75 · 75/80 mm',
    variedades: ['Conference', 'Blanquilla', 'Williams-Bartlett', 'Ercolini', 'Limonera', 'Abate Fetel', 'Rocha', 'Carmen', 'Angelys', 'Decana del Comizio'],
  },
  {
    nombre: 'Membrillo',
    categoria: 'Frutas de pepita',
    calibres: 'Sin calibrado estándar',
    variedades: ['Vranja', 'Bereczki', 'Portugal'],
  },
  // ── UVA Y MELÓN ──────────────────────────────────────────────────────────
  {
    nombre: 'Uva de mesa',
    categoria: 'Uva',
    calibres: 'Pequeña (<14 mm) · Media (14-18 mm) · Grande (>18 mm)',
    variedades: ['Aledo (Vinalopó DOP)', 'Superior Seedless (Sugraone)', 'Crimson Seedless', 'Autumn Royal', 'Red Globe', 'Flame Seedless', 'Thompson Seedless', 'Italia', 'Cotton Candy', 'Scarlett Royal'],
  },
  {
    nombre: 'Melón Piel de Sapo',
    categoria: 'Melón y sandía',
    calibres: 'P (<2,5 kg) · M (2,5-3,5 kg) · G (3,5-4,5 kg) · GG (>4,5 kg)',
    variedades: ['Camacho', 'Campuzano', 'Corrales', 'Almadén', 'Barroso', 'Rochet', 'Soleares'],
  },
  {
    nombre: 'Sandía',
    categoria: 'Melón y sandía',
    calibres: 'Mini (<3 kg) · Estándar (3-6 kg) · Grande (>6 kg)',
    variedades: ['Fashion®', 'Bouquet®', 'Crimson Sweet', 'Sugar Baby', 'Black Panther', 'Piel de Sapo', 'Yellow Crimson', 'Orange Glo', 'Moon & Stars'],
  },
  // ── BERRIES ───────────────────────────────────────────────────────────────
  {
    nombre: 'Fresa',
    categoria: 'Berries',
    calibres: '25 · 30 · 35 · 38 · 40 · 45 · 50 · 55 mm',
    variedades: ['Fortuna', 'Rociera', 'Marisma', 'Calinda', 'Fandango', 'Victory'],
  },
  {
    nombre: 'Frambuesa',
    categoria: 'Berries',
    calibres: 'S (≤3 g) · M (3-6 g) · XL (≥6 g)',
    variedades: ['Adelita', 'Amira', 'Enrosadira', 'Kweli', 'Imara'],
  },
  {
    nombre: 'Arándano',
    categoria: 'Berries',
    calibres: 'S (<14 mm) · M (14-18 mm) · L (>18 mm)',
    variedades: ['Biloxi', 'Ventura', 'Duke', 'Bluecrop', 'Legacy', 'Aurora'],
  },
  {
    nombre: 'Mora',
    categoria: 'Berries',
    calibres: 'Por peso; preferencia >8 g',
    variedades: ['Loch Ness', 'Chester Thornless', 'Loch Tay', 'Natchez', 'Black Satin'],
  },
  // ── FRUTAS TROPICALES / EXÓTICAS ──────────────────────────────────────────
  {
    nombre: 'Aguacate',
    categoria: 'Frutas tropicales',
    calibres: '12 · 14 · 16 · 18 · 20 · 22 · 24 · 26 · 28 · 30 · 32',
    variedades: ['Hass', 'Lamb Hass', 'Bacon', 'Fuerte', 'Zutano', 'Reed', 'Pinkerton', 'Maluma'],
  },
  {
    nombre: 'Mango',
    categoria: 'Frutas tropicales',
    calibres: 'A (200-350 g) · B (351-550 g) · C (551-800 g); export 6-14',
    variedades: ['Osteen', 'Keitt', 'Kent', 'Tommy Atkins', 'Palmer', 'Irwin'],
  },
  {
    nombre: 'Papaya',
    categoria: 'Frutas tropicales',
    calibres: 'A (200-300 g) · B · C · D · E · F · G · J (≥2001 g)',
    variedades: ['Sweet Sense', 'Intenzza', 'Caballero', 'Alicia', 'Iuve'],
  },
  {
    nombre: 'Piña',
    categoria: 'Frutas tropicales',
    calibres: '5 (2000-2400 g) · 6 · 7 · 8 · 9 · 10 (1100-1200 g)',
    variedades: ['MD-2 (Gold)', 'Smooth Cayenne', 'Queen Victoria'],
  },
  {
    nombre: 'Chirimoya',
    categoria: 'Frutas tropicales',
    calibres: 'M (200-300 g) · G (>300 g)',
    variedades: ['Fino de Jete (DOP)', 'Campas', 'Pinto', 'Negrito'],
  },
  {
    nombre: 'Pitaya (fruta del dragón)',
    categoria: 'Frutas tropicales',
    calibres: 'Roja 400-500 g · Amarilla 150-250 g · Mini <300 g',
    variedades: ['Hylocereus undatus (roja/blanca)', 'H. costaricensis (roja/roja)', 'Selenicereus megalanthus (amarilla)', 'Isis Gold'],
  },
  {
    nombre: 'Plátano',
    categoria: 'Frutas tropicales',
    calibres: 'Extra (>22 cm, >32 mm Ø) · I (≥14 cm, ≥27 mm) · II',
    variedades: ['Gran Enana (Grande Naine)', 'Enano (Cavendish Enana)', 'Gruesa Palmera', 'Zelig', 'Williams', 'Valery'],
  },
  // ── OTRAS FRUTAS ─────────────────────────────────────────────────────────
  {
    nombre: 'Kiwi',
    categoria: 'Otras frutas',
    calibres: 'Nº frutas en 3 kg: 25 (≈120 g) … 46 (≈65 g)',
    variedades: ['Hayward (verde)', 'Soreli', 'Zespri SunGold', 'Jintao', 'Bruno'],
  },
  {
    nombre: 'Granada',
    categoria: 'Otras frutas',
    calibres: '5 (≥95 mm) a 10 (≈65 mm)',
    variedades: ['Mollar de Elche (DOP)', 'Wonderful', 'Acco', 'Valenciana', 'Purple Queen'],
  },
  {
    nombre: 'Caqui (Persimón)',
    categoria: 'Otras frutas',
    calibres: '18/20 · 20/22 · 22/24 · 24/26',
    variedades: ['Rojo Brillante (Persimon®)', 'Fuyu', 'Jiro', 'Triumph/Sharon'],
  },
  {
    nombre: 'Níspero',
    categoria: 'Otras frutas',
    calibres: 'GGG ≥53 mm · GG 46-53 mm · G 39-46 mm · M 32-39 mm · P 25-32 mm',
    variedades: ['Algar (Algerie)', 'Golden Nugget', 'Tanaka', 'Magdall'],
  },
  {
    nombre: 'Higo / Breva',
    categoria: 'Otras frutas',
    calibres: 'S (<40 mm) · M (40-50 mm) · L (50-55 mm) · XL (>55 mm)',
    variedades: ['Coll de Dama Negra', 'Coll de Dama Blanca', 'Cuello de Dama', 'Calabacita', 'Brown Turkey'],
  },
  {
    nombre: 'Castaña',
    categoria: 'Otras frutas',
    calibres: 'XS (<60/kg) · S (60-70) · M (70-90) · L (>90)',
    variedades: ['Longal', 'Parede', 'Bouche de Bétizac', 'Gallega', 'Parede-verdosa'],
  },
  // ── TOMATE ────────────────────────────────────────────────────────────────
  {
    nombre: 'Tomate redondo',
    categoria: 'Tomate',
    calibres: 'P (35-40 mm) · MM (40-47) · M (47-57) · G (57-67) · GG (67-82) · GGG (>82 mm)',
    variedades: ['Daniela', 'Caniles', 'Ramyle', 'Durinta', 'Rambo', 'Beires', 'Mondeo', 'Pico Luna'],
  },
  {
    nombre: 'Tomate cherry',
    categoria: 'Tomate',
    calibres: '<35 mm (a veces 25 mm / 25-35 mm)',
    variedades: ['Angelle', 'Sweetelle', 'Tobcherry', 'Tobralina', 'Zitronina', 'Chick', 'Sarita', 'Cherry Bomb F1', 'A Marola'],
  },
  {
    nombre: 'Tomate para industria',
    categoria: 'Tomate',
    calibres: 'Por peso y contenido sólidos solubles',
    variedades: ['Perfectpeel', 'Heinz 1370', 'H3402', 'Granito', 'Ferrari'],
  },
  // ── VERDURAS ──────────────────────────────────────────────────────────────
  {
    nombre: 'Pepino',
    categoria: 'Verduras',
    calibres: 'Corto (<15 cm) · Medio (15-18 cm) · Largo (18-21 cm) · Extra (>21 cm)',
    variedades: ['ZiMMan', 'PasioND', 'MagMMan', 'Centinela', 'Escolta'],
  },
  {
    nombre: 'Pimiento verde',
    categoria: 'Verduras',
    calibres: 'P (<150 g) · M (150-250 g) · G (>250 g)',
    variedades: ['Mesut', 'Avital RZ', 'Sweet Bite', 'Cornicabra', 'Lamuyo Verde', 'Italiano RF-215 RZ'],
  },
  {
    nombre: 'Berenjena',
    categoria: 'Verduras',
    calibres: 'Pequeña (<200 g) · Mediana (200-300 g) · Grande (>300 g)',
    variedades: ['Black Beauty', 'Bonica', 'Paloma', 'Rosa Bianca', 'Casper', 'Listada de Gandía', 'Mirabelle Blanca'],
  },
  {
    nombre: 'Calabacín',
    categoria: 'Verduras',
    calibres: 'S (<150 g) · M (150-250 g) · G (>250 g)',
    variedades: ['Midnight', 'Cora', 'Tamar', 'Defender', 'Astia'],
  },
  {
    nombre: 'Calabaza',
    categoria: 'Verduras',
    calibres: 'Por peso: P (<1,5 kg) · M (1,5-3 kg) · G (3-5 kg) · GG (>5 kg)',
    variedades: ['Butternut', 'Uchiki Kuri', 'Hokkaido', 'Potimarron', 'Cacahuete'],
  },
  {
    nombre: 'Zanahoria',
    categoria: 'Verduras',
    calibres: 'S (<20 mm Ø) · M (20-30) · L (30-40) · XL (>40 mm)',
    variedades: ['Nantesa', 'Chantenay', 'Berlicum', 'Amsterdam Forcing', 'Imperator', 'Cordoba'],
  },
  {
    nombre: 'Lechuga',
    categoria: 'Verduras de hoja',
    calibres: 'Baby (<400 g) · Normal (400-600 g) · XL (>600 g)',
    variedades: ['Cos clásica', 'Little Gem / Baby Cos', 'Romana Corazón', 'Romana Larga', 'Sucrine Midi', 'Romana Tudela'],
  },
  {
    nombre: 'Escarola',
    categoria: 'Verduras de hoja',
    calibres: 'Baby (<300 g) · M (300-500 g) · G (>500 g)',
    variedades: ['Rizada Ascari', 'Rizada Bekele', 'Rizada Benefine', 'Lisa Congo', 'Lisa Eliance', 'Cabello de Ángel'],
  },
  {
    nombre: 'Acelga',
    categoria: 'Verduras de hoja',
    calibres: 'Por peso del manojo',
    variedades: ['Verde de Penca Blanca', 'Amarilla de Lyon', 'Bright Lights', 'Lucullus', 'Ruby / Borgoña'],
  },
  {
    nombre: 'Espinaca',
    categoria: 'Verduras de hoja',
    calibres: 'Por peso del manojo',
    variedades: ['Bloomsdale Long Standing', 'Viroflay', 'Matador', 'Nueva Zelanda (Tetragonia)', 'Butterflay F1'],
  },
  {
    nombre: 'Brócoli',
    categoria: 'Crucíferas',
    calibres: 'Por diámetro de pella: S (<150 g) · M (150-300 g) · G (>300 g)',
    variedades: ['Marathon', 'Ironman', 'Calabrese', 'Beneforté', 'Monflor'],
  },
  {
    nombre: 'Coliflor',
    categoria: 'Crucíferas',
    calibres: 'S (<500 g) · M (500-800 g) · G (800-1200 g) · XL (>1200 g)',
    variedades: ['Clapton', 'Flamenco', 'Cheddar (amarilla)', 'Romanesco', 'All Year Round'],
  },
  {
    nombre: 'Repollo / Col',
    categoria: 'Crucíferas',
    calibres: 'P (<800 g) · M (800-1500 g) · G (>1500 g)',
    variedades: ['Grenadier', 'Candesa', 'Lennox', 'Lodero', 'Loma', 'Lombarda Rodeo'],
  },
  {
    nombre: 'Cebolla',
    categoria: 'Alliums',
    calibres: 'S (<60 mm) · M (60-80 mm) · G (80-100 mm) · XL (>100 mm)',
    variedades: ['Babosa', 'Fuentes de Ebro (DOP)', 'Recas', 'Grano de Oro', 'Valenciana', 'Red Creole'],
  },
  {
    nombre: 'Ajo',
    categoria: 'Alliums',
    calibres: 'S (30-40 mm) · M (40-50 mm) · G (50-60 mm) · XL (>60 mm)',
    variedades: ['Morado de Las Pedroñeras (DOP)', 'Blanco Seco', 'Rosado', 'Violeta de Cadillac'],
  },
  {
    nombre: 'Puerro',
    categoria: 'Alliums',
    calibres: 'Por diámetro: S (<12 mm) · M (12-16 mm) · G (>16 mm)',
    variedades: ['Carentan', 'Electra', 'Hannibal', 'Atlanta', 'Megaton'],
  },
  {
    nombre: 'Patata',
    categoria: 'Tubérculos',
    calibres: 'S (<35 mm) · M (35-55 mm) · G (55-75 mm) · XL (>75 mm)',
    variedades: ['Kennebec', 'Monalisa', 'Agria', 'Spunta', 'Desiree', 'Innovator', 'Magnum Bonum'],
  },
  {
    nombre: 'Boniato',
    categoria: 'Tubérculos',
    calibres: 'Por peso: P (<300 g) · M (300-600 g) · G (>600 g)',
    variedades: ['Beauregard', 'Hernandez', 'O Henry', 'Covington', 'Puerto Rican'],
  },
  {
    nombre: 'Espárrago verde',
    categoria: 'Otras verduras',
    calibres: 'Fino (<6 mm) · M (6-10 mm) · G (10-16 mm) · Extra (>16 mm)',
    variedades: ['UC157', 'Grande', 'Gijnlim', 'Backlim', 'Vegalim'],
  },
  {
    nombre: 'Alcachofa',
    categoria: 'Otras verduras',
    calibres: 'S (<250 g) · M (250-350 g) · G (350-500 g) · XL (>500 g)',
    variedades: ['Blanca de Tudela', 'Violet de Provence', 'Romanesca', 'Imperial Star', 'Spinoso Sardo'],
  },
  {
    nombre: 'Judía verde',
    categoria: 'Otras verduras',
    calibres: 'Fina (<6 mm) · Media (6-9 mm) · Gruesa (>9 mm)',
    variedades: ['Helda (plana)', 'Perona', 'Strike', 'Supernano', 'Carminat'],
  },
  {
    nombre: 'Setas / Champiñón',
    categoria: 'Hongos',
    calibres: 'S (<35 mm) · M (35-50 mm) · G (50-65 mm) · XL (>65 mm)',
    variedades: ['Champiñón blanco', 'Champiñón portobello', 'Shiitake', 'Pleurotus (Ostra)', 'Boletus edulis'],
  },
];

// Seasonal calendar data (months as bitmask or array 1-12)
const CALENDARIO: Array<{
  producto: string;
  produccion: number[];   // months 1-12
  comercializacion: number[];
  notas?: string;
}> = [
  // VERDURAS (invernadero / campo)
  { producto: 'Tomate redondo', produccion: [10,11,12,1,2,3,4,5,6], comercializacion: [1,2,3,4,5,6,7,8,9,10,11,12] },
  { producto: 'Tomate cherry', produccion: [10,11,12,1,2,3,4,5,6], comercializacion: [1,2,3,4,5,6,7,8,9,10,11,12] },
  { producto: 'Pepino', produccion: [9,10,11,12,1,2,3,4,5,6], comercializacion: [1,2,3,4,5,6,7,8,9,10,11,12] },
  { producto: 'Pimiento verde', produccion: [9,10,11,12,1,2,3,4,5,6], comercializacion: [1,2,3,4,5,6,7,8,9,10,11,12] },
  { producto: 'Lechuga', produccion: [1,2,3,4,5,6,7,8,9,10,11,12], comercializacion: [1,2,3,4,5,6,7,8,9,10,11,12] },
  { producto: 'Escarola', produccion: [10,11,12,1,2,3], comercializacion: [10,11,12,1,2,3] },
  { producto: 'Acelga', produccion: [1,2,3,4,5,6,7,8,9,10,11,12], comercializacion: [1,2,3,4,5,6,7,8,9,10,11,12] },
  { producto: 'Espinaca', produccion: [1,2,3,4,5,6,7,8,9,10,11,12], comercializacion: [1,2,3,4,5,6,7,8,9,10,11,12] },
  { producto: 'Zanahoria', produccion: [1,2,3,4,5,6,7,8,9,10,11,12], comercializacion: [1,2,3,4,5,6,7,8,9,10,11,12] },
  { producto: 'Berenjena', produccion: [10,11,12,1,2,3,4,5], comercializacion: [1,2,3,4,5,6,7,8,9,10,11,12] },
  { producto: 'Calabacín', produccion: [9,10,11,12,1,2,3,4,5], comercializacion: [1,2,3,4,5,6,7,8,9,10,11,12] },
  { producto: 'Calabaza', produccion: [9,10,11], comercializacion: [9,10,11,12,1,2,3] },
  { producto: 'Cebolla', produccion: [5,6,7,8,9], comercializacion: [1,2,3,4,5,6,7,8,9,10,11,12] },
  { producto: 'Ajo', produccion: [5,6], comercializacion: [1,2,3,4,5,6,7,8,9,10,11,12] },
  { producto: 'Puerro', produccion: [9,10,11,12,1,2,3,4], comercializacion: [1,2,3,4,5,6,7,8,9,10,11,12] },
  { producto: 'Brócoli', produccion: [10,11,12,1,2,3,4,5], comercializacion: [10,11,12,1,2,3,4,5,6] },
  { producto: 'Coliflor', produccion: [10,11,12,1,2,3,4], comercializacion: [10,11,12,1,2,3,4,5] },
  { producto: 'Repollo / Col', produccion: [10,11,12,1,2,3,4], comercializacion: [10,11,12,1,2,3,4,5] },
  { producto: 'Judía verde', produccion: [5,6,7,8,9,10,11,12,1,2,3,4,5], comercializacion: [1,2,3,4,5,6,7,8,9,10,11,12] },
  { producto: 'Espárrago verde', produccion: [3,4,5,6], comercializacion: [3,4,5,6] },
  { producto: 'Alcachofa', produccion: [10,11,12,1,2,3,4,5], comercializacion: [10,11,12,1,2,3,4,5] },
  { producto: 'Patata', produccion: [4,5,6,7,8,9,10], comercializacion: [1,2,3,4,5,6,7,8,9,10,11,12] },
  { producto: 'Boniato', produccion: [9,10,11], comercializacion: [1,2,3,4,5,6,7,8,9,10,11,12] },
  { producto: 'Setas / Champiñón', produccion: [1,2,3,4,5,6,7,8,9,10,11,12], comercializacion: [1,2,3,4,5,6,7,8,9,10,11,12] },
  // CÍTRICOS
  { producto: 'Naranja', produccion: [10,11,12,1,2,3,4,5,6], comercializacion: [10,11,12,1,2,3,4,5,6] },
  { producto: 'Mandarina', produccion: [9,10,11,12,1,2,3,4], comercializacion: [9,10,11,12,1,2,3,4] },
  { producto: 'Limón', produccion: [9,10,11,12,1,2,3,4,5,6,7], comercializacion: [9,10,11,12,1,2,3,4,5,6,7] },
  { producto: 'Pomelo', produccion: [11,12,1,2,3,4], comercializacion: [11,12,1,2,3,4,5] },
  { producto: 'Lima', produccion: [6,7,8,9,10], comercializacion: [1,2,3,4,5,6,7,8,9,10,11,12] },
  // FRUTAS DE HUESO
  { producto: 'Albaricoque', produccion: [5,6,7], comercializacion: [5,6,7], notas: 'Campaña breve jun-jul' },
  { producto: 'Melocotón', produccion: [5,6,7,8,9], comercializacion: [5,6,7,8,9,10], notas: 'Calanda alarga a oct' },
  { producto: 'Nectarina', produccion: [5,6,7,8,9], comercializacion: [5,6,7,8,9] },
  { producto: 'Paraguayo / Platerina', produccion: [5,6,7,8], comercializacion: [5,6,7,8,9] },
  { producto: 'Ciruela', produccion: [6,7,8,9], comercializacion: [6,7,8,9,10] },
  { producto: 'Cereza', produccion: [5,6,7], comercializacion: [5,6,7], notas: 'Jerte pico jun-jul' },
  // FRUTAS DE PEPITA
  { producto: 'Manzana', produccion: [8,9,10,11], comercializacion: [9,10,11,12,1,2,3,4,5,6] },
  { producto: 'Pera', produccion: [8,9], comercializacion: [8,9,10,11,12,1,2,3,4,5] },
  // UVA Y MELÓN
  { producto: 'Uva de mesa', produccion: [8,9,10,11], comercializacion: [8,9,10,11] },
  { producto: 'Melón Piel de Sapo', produccion: [6,7,8,9], comercializacion: [6,7,8,9,10] },
  { producto: 'Sandía', produccion: [5,6,7,8,9], comercializacion: [5,6,7,8,9,10] },
  // BERRIES
  { producto: 'Fresa', produccion: [12,1,2,3,4,5,6], comercializacion: [12,1,2,3,4,5,6], notas: 'Huelva; pico feb-may' },
  { producto: 'Frambuesa', produccion: [10,11,12,1,2,3,4,5,6], comercializacion: [10,11,12,1,2,3,4,5,6] },
  { producto: 'Arándano', produccion: [3,4,5,6], comercializacion: [3,4,5,6,7] },
  { producto: 'Mora', produccion: [5,6,7,8], comercializacion: [5,6,7,8,9] },
  // FRUTAS TROPICALES
  { producto: 'Aguacate', produccion: [11,12,1,2,3,4,5,6], comercializacion: [11,12,1,2,3,4,5,6,7,8], notas: 'Hass dic-abr; Lamb Hass may-jun; Reed jun-ago' },
  { producto: 'Mango', produccion: [8,9,10,11,12], comercializacion: [9,10,11], notas: 'Mejor época sep-nov (Málaga-Granada)' },
  { producto: 'Papaya', produccion: [1,2,3,4,5,6,7,8,9,10,11,12], comercializacion: [1,2,3,4,5,6,7,8,9,10,11,12] },
  { producto: 'Chirimoya', produccion: [9,10,11,12,1], comercializacion: [9,10,11,12,1], notas: 'Costa Tropical' },
  { producto: 'Pitaya (fruta del dragón)', produccion: [6,7,8,9,10,11,12,1,2], comercializacion: [6,7,8,9,10,11,12,1,2] },
  { producto: 'Plátano', produccion: [1,2,3,4,5,6,7,8,9,10,11,12], comercializacion: [1,2,3,4,5,6,7,8,9,10,11,12], notas: 'Plátano de Canarias IGP' },
  // OTRAS FRUTAS
  { producto: 'Kiwi', produccion: [11,12,1], comercializacion: [11,12,1,2,3,4,5], notas: 'Hayward se corta nov-dic en Galicia' },
  { producto: 'Granada', produccion: [9,10,11], comercializacion: [9,10,11,12,1], notas: 'DOP inicio oct (Mollar de Elche)' },
  { producto: 'Caqui (Persimón)', produccion: [10,11,12], comercializacion: [10,11,12,1] },
  { producto: 'Níspero', produccion: [4,5,6], comercializacion: [4,5,6] },
  { producto: 'Higo / Breva', produccion: [5,6,8,9,10], comercializacion: [5,6,7,8,9,10] },
  { producto: 'Castaña', produccion: [9,10,11], comercializacion: [10,11,12,1] },
];

async function main() {
  console.log('🌱 Seeding products, varieties and seasonal calendar...');

  let created = 0;
  let skipped = 0;

  for (const p of PRODUCTOS) {
    const existing = await prisma.producto.findUnique({ where: { nombre: p.nombre } });
    if (existing) {
      // Update calibres field via JSON metadata and upsert varieties
      for (const varNombre of p.variedades) {
        await prisma.variedad.upsert({
          where: { productoId_nombre: { productoId: existing.id, nombre: varNombre } },
          create: { productoId: existing.id, nombre: varNombre },
          update: {},
        });
      }
      skipped++;
      continue;
    }

    const producto = await prisma.producto.create({
      data: {
        nombre: p.nombre,
        categoria: p.categoria,
        activo: true,
      },
    });

    for (const varNombre of p.variedades) {
      await prisma.variedad.create({
        data: { productoId: producto.id, nombre: varNombre },
      });
    }

    created++;
  }

  console.log(`✅ Products: ${created} created, ${skipped} already existed (varieties upserted)`);

  // Seed calendar data into a JSON file that the API can serve statically
  // (no DB model needed for calendar — served as static config)
  const calendarPath = `${process.cwd()}/prisma/calendar-data.json`;
  const fs = await import('fs');
  fs.writeFileSync(calendarPath, JSON.stringify(CALENDARIO, null, 2));
  console.log(`📅 Calendar data written to ${calendarPath}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
