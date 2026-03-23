/**
 * Industry × Theme Color Matrix
 *
 * Provides 3 unique HSL palettes per industry × theme combination.
 * Ensures "Bold + Restaurant" looks different from "Bold + Salon".
 */

export interface IndustryThemePalette {
  id: string;
  name: string;
  primary: string; primaryForeground: string;
  secondary: string; secondaryForeground: string;
  accent: string; accentForeground: string;
  background: string; foreground: string;
  muted: string; mutedForeground: string;
  card: string; cardForeground: string;
  border: string;
  fontHint?: { heading: string; body: string };
}

type PaletteTriple = [IndustryThemePalette, IndustryThemePalette, IndustryThemePalette];

function p(id: string, name: string, pri: string, sec: string, acc: string, bg: string, fg: string, mut: string, mutFg: string, card: string, brd: string, priFg = '0 0% 100%', secFg = '0 0% 100%', accFg = '0 0% 100%', cardFg?: string): IndustryThemePalette {
  return { id, name, primary: pri, primaryForeground: priFg, secondary: sec, secondaryForeground: secFg, accent: acc, accentForeground: accFg, background: bg, foreground: fg, muted: mut, mutedForeground: mutFg, card, cardForeground: cardFg || fg, border: brd };
}

// Dark helper (most bold/futuristic themes)
function dark(id: string, name: string, pri: string, sec: string, acc: string, hue: number, priFg = '0 0% 100%', accFg = '0 0% 5%'): IndustryThemePalette {
  return p(id, name, pri, sec, acc, `${hue} 12% 5%`, `${hue} 10% 96%`, `${hue} 8% 13%`, `${hue} 6% 55%`, `${hue} 10% 9%`, `${hue} 8% 20%`, priFg, '0 0% 100%', accFg, `${hue} 10% 96%`);
}
// Light helper (editorial/minimalist/organic)
function light(id: string, name: string, pri: string, sec: string, acc: string, hue: number, priFg = '0 0% 100%'): IndustryThemePalette {
  return p(id, name, pri, sec, acc, `${hue} 15% 97%`, `${hue} 20% 12%`, `${hue} 10% 91%`, `${hue} 7% 44%`, '0 0% 100%', `${hue} 10% 85%`, priFg, '0 0% 100%', '0 0% 100%', `${hue} 20% 12%`);
}

const MATRIX: Record<string, Record<string, PaletteTriple>> = {
  modern: {
    restaurant: [
      dark('mod-r1', 'Midnight Bistro', '24 95% 53%', '350 80% 52%', '43 96% 56%', 240),
      light('mod-r2', 'Garden Fresh', '142 72% 40%', '28 90% 55%', '48 96% 53%', 80),
      dark('mod-r3', 'Wine & Dine', '350 70% 45%', '280 45% 40%', '33 90% 55%', 300),
    ],
    salon: [
      light('mod-s1', 'Rose Gold', '340 82% 60%', '300 50% 50%', '38 92% 60%', 330),
      dark('mod-s2', 'Velvet Night', '280 70% 60%', '320 65% 55%', '45 85% 60%', 270),
      light('mod-s3', 'Sage Serenity', '160 45% 45%', '175 40% 40%', '340 60% 60%', 150),
    ],
    realestate: [
      light('mod-re1', 'Trust Navy', '215 85% 45%', '200 75% 40%', '38 92% 55%', 210),
      dark('mod-re2', 'Urban Gold', '38 75% 45%', '25 60% 35%', '0 0% 100%', 30, '0 0% 100%', '0 0% 10%'),
      light('mod-re3', 'Green Estate', '152 60% 40%', '170 50% 35%', '220 70% 55%', 150),
    ],
    consulting: [
      dark('mod-c1', 'Digital Navy', '225 80% 55%', '260 70% 60%', '175 70% 45%', 225),
      light('mod-c2', 'Growth Teal', '172 65% 40%', '200 60% 45%', '38 85% 55%', 170),
      light('mod-c3', 'Executive Slate', '250 60% 55%', '230 50% 50%', '160 55% 45%', 220),
    ],
    ecommerce: [
      light('mod-e1', 'Mono Orange', '0 0% 10%', '0 0% 20%', '24 95% 53%', 0),
      light('mod-e2', 'Hot Pink', '330 85% 55%', '290 70% 50%', '45 90% 55%', 330),
      dark('mod-e3', 'Dark Luxe', '42 75% 55%', '30 50% 40%', '0 0% 100%', 0, '0 0% 5%', '0 0% 5%'),
    ],
    fitness: [
      dark('mod-f1', 'Power Orange', '24 95% 53%', '0 85% 50%', '48 95% 55%', 0),
      dark('mod-f2', 'Neon Lime', '80 85% 45%', '120 60% 40%', '190 80% 50%', 120, '0 0% 5%'),
      dark('mod-f3', 'Electric Blue', '210 95% 55%', '240 80% 60%', '170 80% 45%', 230),
    ],
    healthcare: [
      light('mod-h1', 'Trust Sky', '198 80% 48%', '210 65% 42%', '160 60% 45%', 200),
      light('mod-h2', 'Calm Teal', '172 55% 42%', '190 50% 38%', '45 80% 55%', 170),
      light('mod-h3', 'Clinical Blue', '225 75% 50%', '210 60% 45%', '142 55% 45%', 220),
    ],
    technology: [
      dark('mod-t1', 'Cyber Violet', '265 85% 60%', '240 75% 55%', '175 80% 50%', 240),
      dark('mod-t2', 'Neon Blue', '210 95% 55%', '225 80% 50%', '50 90% 55%', 0),
      light('mod-t3', 'Clean Indigo', '240 70% 55%', '260 60% 50%', '160 65% 45%', 240),
    ],
    localservice: [
      light('mod-l1', 'Trusty Blue', '200 75% 45%', '215 65% 40%', '30 90% 55%', 210),
      light('mod-l2', 'Pro Navy', '225 75% 42%', '240 60% 38%', '48 90% 55%', 225),
      light('mod-l3', 'Green Trust', '142 60% 38%', '160 50% 35%', '200 70% 50%', 140),
    ],
    creator: [
      dark('mod-cr1', 'Dark Mono', '0 0% 95%', '0 0% 70%', '24 95% 53%', 0, '0 0% 5%'),
      dark('mod-cr2', 'Creative Purple', '270 80% 60%', '300 65% 55%', '330 75% 60%', 270),
      light('mod-cr3', 'Clean Slate', '220 15% 15%', '220 10% 30%', '210 80% 55%', 220),
    ],
    nonprofit: [
      light('mod-n1', 'Heart Rose', '350 80% 50%', '340 65% 42%', '48 90% 55%', 350),
      light('mod-n2', 'Earth Green', '142 65% 38%', '160 55% 35%', '198 70% 50%', 140),
      light('mod-n3', 'Impact Blue', '220 75% 52%', '235 65% 48%', '24 90% 55%', 220),
    ],
  },

  editorial: {
    restaurant: [
      light('ed-r1', 'Bistro Warmth', '25 45% 38%', '15 35% 30%', '25 45% 38%', 35),
      light('ed-r2', 'Olive Garden', '85 35% 35%', '70 25% 28%', '85 35% 35%', 60),
      light('ed-r3', 'Burgundy Press', '345 50% 35%', '330 40% 28%', '345 50% 35%', 345),
    ],
    salon: [
      light('ed-s1', 'Powder Rose', '340 40% 45%', '330 30% 38%', '340 40% 45%', 335),
      light('ed-s2', 'Mauve Silk', '280 30% 42%', '270 25% 35%', '280 30% 42%', 275),
      light('ed-s3', 'Sage Retreat', '155 30% 38%', '145 25% 32%', '155 30% 38%', 150),
    ],
    realestate: [
      light('ed-re1', 'Heritage Brown', '25 40% 35%', '15 30% 28%', '25 40% 35%', 25),
      light('ed-re2', 'Charcoal Trust', '210 20% 28%', '220 18% 22%', '210 20% 28%', 210),
      light('ed-re3', 'Forest Green', '145 35% 32%', '135 28% 26%', '145 35% 32%', 140),
    ],
    consulting: [
      light('ed-c1', 'Ink Blue', '220 35% 30%', '215 28% 24%', '220 35% 30%', 210),
      light('ed-c2', 'Warm Stone', '30 25% 38%', '25 20% 30%', '30 25% 38%', 30),
      light('ed-c3', 'Slate Authority', '240 15% 25%', '235 12% 20%', '240 15% 25%', 240),
    ],
    ecommerce: [
      light('ed-e1', 'Black & Cream', '0 0% 10%', '0 0% 20%', '0 0% 10%', 40),
      light('ed-e2', 'Terracotta', '15 55% 42%', '10 40% 34%', '15 55% 42%', 15),
      light('ed-e3', 'Navy Classic', '215 35% 32%', '210 28% 25%', '215 35% 32%', 215),
    ],
    fitness: [
      light('ed-f1', 'Athletic Slate', '210 18% 25%', '200 14% 20%', '210 18% 25%', 210),
      light('ed-f2', 'Olive Force', '75 30% 32%', '70 24% 26%', '75 30% 32%', 70),
      light('ed-f3', 'Deep Bronze', '30 40% 32%', '25 30% 25%', '30 40% 32%', 25),
    ],
    healthcare: [
      light('ed-h1', 'Sage Care', '160 30% 35%', '150 25% 28%', '160 30% 35%', 155),
      light('ed-h2', 'Warm Clinical', '200 30% 38%', '195 24% 32%', '200 30% 38%', 195),
      light('ed-h3', 'Plum Wellness', '290 25% 38%', '280 20% 30%', '290 25% 38%', 285),
    ],
    technology: [
      light('ed-t1', 'Ink Indigo', '240 30% 30%', '235 24% 24%', '240 30% 30%', 235),
      light('ed-t2', 'Steel Gray', '210 12% 28%', '205 10% 22%', '210 12% 28%', 210),
      light('ed-t3', 'Teal Logic', '180 30% 32%', '175 24% 26%', '180 30% 32%', 175),
    ],
    localservice: [
      light('ed-l1', 'Craft Brown', '25 35% 35%', '20 28% 28%', '25 35% 35%', 25),
      light('ed-l2', 'Trust Charcoal', '210 15% 25%', '205 12% 20%', '210 15% 25%', 210),
      light('ed-l3', 'Forest Service', '140 30% 30%', '135 24% 24%', '140 30% 30%', 135),
    ],
    creator: [
      light('ed-cr1', 'Ivory Mono', '0 0% 15%', '0 0% 25%', '0 0% 15%', 35),
      light('ed-cr2', 'Wine Portfolio', '350 35% 35%', '340 28% 28%', '350 35% 35%', 345),
      light('ed-cr3', 'Olive Creative', '85 25% 32%', '80 20% 26%', '85 25% 32%', 80),
    ],
    nonprofit: [
      light('ed-n1', 'Mission Warm', '350 40% 40%', '345 32% 32%', '350 40% 40%', 350),
      light('ed-n2', 'Earth Impact', '145 30% 32%', '140 24% 26%', '145 30% 32%', 140),
      light('ed-n3', 'Deep Ocean', '205 35% 32%', '200 28% 25%', '205 35% 32%', 200),
    ],
  },

  futuristic: {
    restaurant: [
      dark('fu-r1', 'Neon Dine', '330 90% 55%', '280 80% 50%', '50 95% 60%', 260),
      dark('fu-r2', 'Cyber Kitchen', '175 90% 45%', '200 80% 50%', '40 90% 55%', 210, '0 0% 5%'),
      dark('fu-r3', 'Fusion Glow', '24 95% 55%', '350 85% 55%', '60 90% 60%', 15),
    ],
    salon: [
      dark('fu-s1', 'Holo Rose', '330 85% 60%', '290 75% 55%', '200 90% 60%', 300),
      dark('fu-s2', 'Chrome Beauty', '0 0% 85%', '280 60% 55%', '340 80% 60%', 270, '0 0% 5%'),
      dark('fu-s3', 'Bioluminescent', '165 85% 50%', '195 80% 55%', '310 75% 60%', 180, '0 0% 5%'),
    ],
    realestate: [
      dark('fu-re1', 'Smart Property', '210 90% 55%', '240 80% 58%', '170 85% 50%', 225),
      dark('fu-re2', 'Platinum Living', '38 85% 55%', '25 70% 48%', '210 80% 58%', 30, '0 0% 5%'),
      dark('fu-re3', 'Digital Estate', '160 80% 48%', '175 70% 45%', '45 90% 55%', 170, '0 0% 5%'),
    ],
    consulting: [
      dark('fu-c1', 'AI Strategy', '250 85% 62%', '270 75% 58%', '180 85% 50%', 255),
      dark('fu-c2', 'Data Blue', '200 90% 52%', '215 80% 48%', '55 90% 55%', 210),
      dark('fu-c3', 'Quantum Green', '155 80% 48%', '170 70% 45%', '260 75% 60%', 160, '0 0% 5%'),
    ],
    ecommerce: [
      dark('fu-e1', 'Neon Shop', '330 85% 58%', '290 75% 55%', '55 90% 60%', 310),
      dark('fu-e2', 'Cyber Market', '175 85% 50%', '195 78% 48%', '0 0% 90%', 185, '0 0% 5%', '0 0% 5%'),
      dark('fu-e3', 'Electric Luxe', '265 80% 60%', '280 70% 55%', '42 90% 58%', 270),
    ],
    fitness: [
      dark('fu-f1', 'Plasma Red', '0 90% 55%', '340 80% 50%', '50 95% 55%', 350),
      dark('fu-f2', 'Matrix Green', '120 85% 48%', '145 75% 45%', '180 80% 50%', 130, '0 0% 5%'),
      dark('fu-f3', 'Thunder Blue', '220 90% 58%', '240 80% 55%', '30 90% 55%', 230),
    ],
    healthcare: [
      dark('fu-h1', 'Med-Tech Blue', '200 85% 52%', '215 78% 48%', '160 80% 48%', 210),
      dark('fu-h2', 'Bio Green', '158 80% 48%', '175 72% 44%', '280 70% 58%', 165, '0 0% 5%'),
      dark('fu-h3', 'Neural Violet', '270 78% 58%', '285 70% 52%', '175 80% 50%', 275),
    ],
    technology: [
      dark('fu-t1', 'Quantum Purple', '270 85% 62%', '290 78% 58%', '175 85% 52%', 275),
      dark('fu-t2', 'Cyber Teal', '180 90% 48%', '195 82% 45%', '330 80% 58%', 185, '0 0% 5%'),
      dark('fu-t3', 'Neon Grid', '210 92% 55%', '230 85% 52%', '55 92% 58%', 220),
    ],
    localservice: [
      dark('fu-l1', 'Smart Service', '200 85% 52%', '220 78% 48%', '45 90% 55%', 210),
      dark('fu-l2', 'Electric Pro', '155 80% 48%', '170 72% 45%', '30 85% 55%', 160, '0 0% 5%'),
      dark('fu-l3', 'Tech Fix', '265 78% 58%', '280 70% 52%', '175 80% 50%', 270),
    ],
    creator: [
      dark('fu-cr1', 'Neon Creator', '330 88% 58%', '300 78% 55%', '55 92% 58%', 315),
      dark('fu-cr2', 'Holo Artist', '180 85% 50%', '200 78% 48%', '280 75% 58%', 190, '0 0% 5%'),
      dark('fu-cr3', 'Chrome Studio', '0 0% 88%', '0 0% 70%', '270 80% 60%', 0, '0 0% 5%'),
    ],
    nonprofit: [
      dark('fu-n1', 'Impact Glow', '350 85% 55%', '330 75% 50%', '45 90% 58%', 340),
      dark('fu-n2', 'Green Future', '155 82% 48%', '170 74% 44%', '200 85% 55%', 160, '0 0% 5%'),
      dark('fu-n3', 'Digital Hope', '210 88% 55%', '225 80% 52%', '160 78% 48%', 215),
    ],
  },

  minimalist: {
    restaurant: [
      light('min-r1', 'Warm Minimal', '25 60% 42%', '20 40% 35%', '25 60% 42%', 0),
      light('min-r2', 'Sage Table', '150 30% 38%', '145 22% 32%', '150 30% 38%', 145),
      light('min-r3', 'Ink Dining', '0 0% 12%', '0 0% 25%', '350 50% 48%', 0),
    ],
    salon: [
      light('min-s1', 'Blush Air', '340 45% 52%', '335 32% 44%', '340 45% 52%', 335),
      light('min-s2', 'Stone Zen', '25 15% 35%', '20 10% 28%', '25 15% 35%', 25),
      light('min-s3', 'Lavender Calm', '270 30% 48%', '265 22% 40%', '270 30% 48%', 268),
    ],
    realestate: [
      light('min-re1', 'Clean Navy', '220 55% 40%', '215 42% 33%', '220 55% 40%', 220),
      light('min-re2', 'Sand Modern', '35 35% 38%', '30 25% 30%', '35 35% 38%', 35),
      light('min-re3', 'Pure Dark', '0 0% 15%', '0 0% 28%', '152 40% 42%', 0),
    ],
    consulting: [
      light('min-c1', 'Slate Focus', '220 18% 28%', '215 14% 22%', '220 18% 28%', 220),
      light('min-c2', 'Teal Accent', '175 45% 38%', '170 35% 32%', '175 45% 38%', 170),
      light('min-c3', 'Ink Minimal', '0 0% 10%', '0 0% 22%', '210 60% 50%', 0),
    ],
    ecommerce: [
      light('min-e1', 'Pure Black', '0 0% 8%', '0 0% 20%', '24 80% 50%', 0),
      light('min-e2', 'Sand Shop', '28 40% 40%', '22 30% 32%', '28 40% 40%', 28),
      light('min-e3', 'Quiet Rose', '345 38% 48%', '340 28% 40%', '345 38% 48%', 340),
    ],
    fitness: [
      light('min-f1', 'Clean Force', '0 0% 10%', '0 0% 22%', '24 80% 52%', 0),
      light('min-f2', 'Forest Fit', '145 40% 35%', '140 30% 28%', '145 40% 35%', 140),
      light('min-f3', 'Steel Blue', '210 35% 38%', '205 25% 30%', '210 35% 38%', 210),
    ],
    healthcare: [
      light('min-h1', 'Air Blue', '200 45% 42%', '195 35% 35%', '200 45% 42%', 195),
      light('min-h2', 'Mint Clean', '162 38% 38%', '158 28% 32%', '162 38% 38%', 158),
      light('min-h3', 'Pure White', '225 50% 45%', '220 40% 38%', '225 50% 45%', 225),
    ],
    technology: [
      light('min-t1', 'Gray Code', '0 0% 12%', '0 0% 25%', '250 55% 55%', 0),
      light('min-t2', 'Indigo Dot', '240 50% 48%', '235 38% 40%', '240 50% 48%', 235),
      light('min-t3', 'Teal Signal', '180 40% 38%', '175 30% 32%', '180 40% 38%', 175),
    ],
    localservice: [
      light('min-l1', 'Trust Simple', '210 45% 40%', '205 35% 33%', '210 45% 40%', 210),
      light('min-l2', 'Olive Service', '90 25% 35%', '85 20% 28%', '90 25% 35%', 85),
      light('min-l3', 'Dark Anchor', '0 0% 10%', '0 0% 22%', '30 55% 48%', 0),
    ],
    creator: [
      light('min-cr1', 'White Space', '0 0% 8%', '0 0% 20%', '0 0% 8%', 0),
      light('min-cr2', 'Warm Canvas', '30 25% 35%', '25 18% 28%', '30 25% 35%', 30),
      light('min-cr3', 'One Blue', '215 50% 45%', '210 38% 38%', '215 50% 45%', 210),
    ],
    nonprofit: [
      light('min-n1', 'Heart Red', '350 55% 48%', '345 42% 40%', '350 55% 48%', 350),
      light('min-n2', 'Green Mission', '148 40% 38%', '142 30% 30%', '148 40% 38%', 142),
      light('min-n3', 'Ink Cause', '0 0% 10%', '0 0% 22%', '215 55% 50%', 0),
    ],
  },

  bold: {
    restaurant: [
      dark('bo-r1', 'Fire Kitchen', '0 85% 50%', '30 90% 55%', '48 95% 55%', 0),
      dark('bo-r2', 'Royal Feast', '270 75% 52%', '300 65% 48%', '42 90% 58%', 275),
      dark('bo-r3', 'Garden Punch', '145 80% 42%', '80 70% 45%', '0 80% 52%', 140),
    ],
    salon: [
      dark('bo-s1', 'Glam Pink', '330 90% 55%', '340 80% 50%', '42 90% 60%', 325),
      dark('bo-s2', 'Violet Glam', '275 80% 58%', '300 70% 52%', '200 85% 55%', 280),
      dark('bo-s3', 'Gold Luxe', '38 85% 52%', '25 75% 45%', '0 0% 95%', 30, '0 0% 5%', '0 0% 5%'),
    ],
    realestate: [
      dark('bo-re1', 'Power Blue', '215 90% 52%', '230 80% 48%', '42 90% 55%', 225),
      dark('bo-re2', 'Emerald Estate', '155 75% 42%', '170 65% 38%', '0 0% 95%', 160, '0 0% 100%', '0 0% 5%'),
      dark('bo-re3', 'Gold Premium', '38 80% 50%', '22 70% 42%', '210 80% 55%', 25, '0 0% 5%'),
    ],
    consulting: [
      dark('bo-c1', 'Impact Blue', '220 88% 55%', '245 78% 52%', '170 80% 48%', 230),
      dark('bo-c2', 'Red Authority', '0 82% 50%', '350 72% 45%', '42 85% 55%', 355),
      dark('bo-c3', 'Teal Drive', '175 80% 42%', '190 70% 38%', '42 85% 55%', 180),
    ],
    ecommerce: [
      dark('bo-e1', 'Hot Sale', '0 85% 52%', '330 78% 48%', '48 92% 55%', 350),
      dark('bo-e2', 'Electric Violet', '270 82% 58%', '290 72% 52%', '330 80% 58%', 275),
      dark('bo-e3', 'Midnight Gold', '42 85% 52%', '30 75% 45%', '0 0% 95%', 35, '0 0% 5%', '0 0% 5%'),
    ],
    fitness: [
      dark('bo-f1', 'Beast Red', '0 90% 48%', '15 82% 45%', '48 95% 55%', 0),
      dark('bo-f2', 'Nuclear Green', '90 88% 42%', '120 75% 38%', '210 82% 55%', 100, '0 0% 5%'),
      dark('bo-f3', 'Thunder Purple', '270 85% 55%', '290 75% 50%', '24 90% 55%', 275),
    ],
    healthcare: [
      dark('bo-h1', 'Vital Blue', '210 85% 50%', '225 75% 46%', '155 72% 45%', 215),
      dark('bo-h2', 'Bold Teal', '172 78% 42%', '185 68% 38%', '42 85% 55%', 178),
      light('bo-h3', 'White Coat', '220 78% 52%', '200 65% 45%', '0 72% 50%', 210),
    ],
    technology: [
      dark('bo-t1', 'Plasma Purple', '265 88% 60%', '280 78% 55%', '180 85% 50%', 270),
      dark('bo-t2', 'Electric Cyan', '185 90% 48%', '200 82% 45%', '330 80% 55%', 190, '0 0% 5%'),
      dark('bo-t3', 'Neon Yellow', '55 92% 50%', '45 85% 48%', '270 80% 58%', 50, '0 0% 5%', '0 0% 100%'),
    ],
    localservice: [
      dark('bo-l1', 'Bold Blue', '215 88% 52%', '230 78% 48%', '42 90% 55%', 220),
      dark('bo-l2', 'Safety Orange', '24 90% 50%', '15 82% 45%', '210 80% 55%', 20),
      dark('bo-l3', 'Power Green', '145 78% 40%', '160 68% 36%', '48 88% 55%', 150),
    ],
    creator: [
      dark('bo-cr1', 'Bold Mono', '0 0% 95%', '0 0% 75%', '24 92% 55%', 0, '0 0% 5%'),
      dark('bo-cr2', 'Hot Creative', '330 85% 55%', '350 75% 50%', '55 90% 55%', 340),
      dark('bo-cr3', 'Electric Studio', '210 90% 55%', '230 82% 52%', '42 88% 55%', 220),
    ],
    nonprofit: [
      dark('bo-n1', 'Impact Red', '350 85% 50%', '0 75% 45%', '42 90% 55%', 355),
      dark('bo-n2', 'Vital Green', '148 78% 40%', '162 68% 36%', '210 80% 55%', 152),
      dark('bo-n3', 'Hope Blue', '215 85% 52%', '230 75% 48%', '345 78% 52%', 220),
    ],
  },

  organic: {
    restaurant: [
      light('or-r1', 'Earth Kitchen', '25 55% 42%', '35 45% 35%', '85 40% 45%', 35),
      light('or-r2', 'Herb Garden', '120 40% 35%', '100 32% 30%', '35 55% 48%', 110),
      light('or-r3', 'Sunset Bistro', '15 65% 48%', '350 50% 42%', '48 60% 50%', 15),
    ],
    salon: [
      light('or-s1', 'Petal Soft', '335 50% 52%', '345 40% 45%', '155 35% 42%', 335),
      light('or-s2', 'Eucalyptus', '155 40% 40%', '165 32% 34%', '340 42% 50%', 155),
      light('or-s3', 'Clay & Rose', '18 45% 45%', '8 35% 38%', '330 45% 52%', 15),
    ],
    realestate: [
      light('or-re1', 'Stone & Wood', '30 35% 38%', '22 28% 30%', '145 35% 40%', 30),
      light('or-re2', 'Forest Haven', '142 42% 36%', '135 32% 30%', '28 45% 45%', 140),
      light('or-re3', 'Sand Dune', '38 45% 42%', '30 35% 35%', '200 40% 45%', 35),
    ],
    consulting: [
      light('or-c1', 'Warm Sage', '140 35% 38%', '135 28% 32%', '25 45% 45%', 135),
      light('or-c2', 'Clay Trust', '20 40% 40%', '15 30% 33%', '175 38% 42%', 20),
      light('or-c3', 'Ocean Organic', '195 40% 38%', '200 32% 32%', '35 45% 48%', 195),
    ],
    ecommerce: [
      light('or-e1', 'Natural Shop', '28 45% 40%', '20 35% 33%', '145 38% 42%', 28),
      light('or-e2', 'Olive Market', '85 35% 35%', '78 28% 28%', '15 50% 48%', 82),
      light('or-e3', 'Terra Store', '12 50% 45%', '5 40% 38%', '42 50% 50%', 12),
    ],
    fitness: [
      light('or-f1', 'Forest Energy', '145 50% 38%', '135 40% 32%', '24 55% 50%', 140),
      light('or-f2', 'Earth Strong', '25 50% 40%', '18 40% 33%', '145 42% 42%', 22),
      light('or-f3', 'Sky Move', '195 45% 40%', '200 35% 34%', '48 50% 50%', 195),
    ],
    healthcare: [
      light('or-h1', 'Healing Green', '155 42% 38%', '148 32% 32%', '28 42% 45%', 152),
      light('or-h2', 'Warm Care', '200 38% 40%', '195 30% 34%', '155 38% 42%', 198),
      light('or-h3', 'Lavender Heal', '275 30% 42%', '270 22% 35%', '160 35% 42%', 272),
    ],
    technology: [
      light('or-t1', 'Eco Tech', '145 40% 38%', '140 32% 32%', '210 42% 48%', 142),
      light('or-t2', 'Warm Data', '25 42% 40%', '20 32% 33%', '175 40% 42%', 25),
      light('or-t3', 'Ocean Digital', '195 42% 38%', '200 34% 32%', '38 48% 48%', 198),
    ],
    localservice: [
      light('or-l1', 'Craft Service', '30 42% 38%', '25 32% 32%', '145 38% 42%', 28),
      light('or-l2', 'Green Work', '142 40% 36%', '138 32% 30%', '28 45% 45%', 140),
      light('or-l3', 'River Trust', '200 38% 38%', '195 30% 32%', '35 48% 48%', 198),
    ],
    creator: [
      light('or-cr1', 'Clay Studio', '18 48% 42%', '12 38% 35%', '155 35% 42%', 15),
      light('or-cr2', 'Moss Creative', '90 35% 35%', '85 28% 28%', '330 40% 48%', 88),
      light('or-cr3', 'Sand Portfolio', '38 40% 40%', '32 30% 33%', '200 38% 42%', 36),
    ],
    nonprofit: [
      light('or-n1', 'Heart Warm', '350 50% 48%', '345 40% 40%', '145 38% 42%', 348),
      light('or-n2', 'Growing Green', '148 42% 36%', '142 34% 30%', '25 45% 48%', 145),
      light('or-n3', 'Sky Hope', '200 40% 40%', '195 32% 34%', '25 48% 48%', 198),
    ],
  },
};

// Industry aliases
const ALIASES: Record<string, string> = {
  restaurant: 'restaurant', cafe: 'restaurant', bistro: 'restaurant', dining: 'restaurant', food: 'restaurant', bakery: 'restaurant',
  salon: 'salon', spa: 'salon', beauty: 'salon', hair: 'salon', wellness: 'salon', barber: 'salon', salon_spa: 'salon',
  realestate: 'realestate', real_estate: 'realestate', property: 'realestate', realtor: 'realestate',
  consulting: 'consulting', business: 'consulting', coaching: 'consulting', coach: 'consulting', agency: 'consulting', coaching_consulting: 'consulting',
  ecommerce: 'ecommerce', shop: 'ecommerce', store: 'ecommerce', retail: 'ecommerce', boutique: 'ecommerce', fashion: 'ecommerce',
  fitness: 'fitness', gym: 'fitness', workout: 'fitness', training: 'fitness', yoga: 'fitness',
  healthcare: 'healthcare', medical: 'healthcare', clinic: 'healthcare', dental: 'healthcare', therapy: 'healthcare',
  technology: 'technology', saas: 'technology', software: 'technology', tech: 'technology', startup: 'technology',
  localservice: 'localservice', local_service: 'localservice', plumber: 'localservice', hvac: 'localservice', electrician: 'localservice', contractor: 'localservice',
  creator: 'creator', portfolio: 'creator', artist: 'creator', designer: 'creator', photographer: 'creator',
  nonprofit: 'nonprofit', charity: 'nonprofit', foundation: 'nonprofit', ngo: 'nonprofit',
};

function resolveIndustry(industry: string): string {
  return ALIASES[industry.toLowerCase().replace(/[-\s]/g, '_')] || 'consulting';
}

/** Pick an industry-specific palette for a theme using the variation seed. */
export function pickIndustryPalette(themeId: string, industry: string, seed: string): IndustryThemePalette | undefined {
  const pool = MATRIX[themeId]?.[resolveIndustry(industry)];
  if (!pool) return undefined;
  let h = 0x811c9dc5;
  const key = `${themeId}_${resolveIndustry(industry)}_${seed}`;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return pool[((h >>> 0) % pool.length)];
}

/** Convert palette to the aestheticColorTokens format. */
export function paletteToColorTokens(p: IndustryThemePalette) {
  return {
    primary: p.primary, primaryForeground: p.primaryForeground,
    secondary: p.secondary, secondaryForeground: p.secondaryForeground,
    accent: p.accent, accentForeground: p.accentForeground,
    background: p.background, foreground: p.foreground,
    muted: p.muted, mutedForeground: p.mutedForeground,
    card: p.card, cardForeground: p.cardForeground,
    border: p.border,
  };
}
