/**
 * Test Canvas Code Examples
 * Ready-to-use code for testing the canvas rendering system
 */

export const testExamples = {
  heroSection: `// Hero Section Example
setBackground('#f0f9ff');

// Main hero background
addRect({
  x: 50, y: 80,
  width: 700, height: 400,
  fill: '#3b82f6',
  cornerRadius: 20,
  opacity: 0.95
});

// Hero title
addText({
  text: 'Welcome to Canvas Builder',
  x: 100, y: 160,
  fontSize: 56,
  color: '#ffffff',
  fontWeight: 'bold',
  fontFamily: 'Arial'
});

// Hero subtitle
addText({
  text: 'Create beautiful designs with code',
  x: 100, y: 230,
  fontSize: 24,
  color: '#e0e7ff'
});

// CTA Button
addRect({
  x: 100, y: 320,
  width: 180, height: 56,
  fill: '#ec4899',
  cornerRadius: 12
});

addText({
  text: 'Get Started',
  x: 150, y: 340,
  fontSize: 20,
  color: '#ffffff',
  fontWeight: '600'
});`,

  pricingCards: `// Pricing Cards Example
setBackground('#f8fafc');

// Free Tier Card
addRect({
  x: 50, y: 100,
  width: 220, height: 350,
  fill: '#ffffff',
  cornerRadius: 16,
  borderColor: '#e2e8f0',
  borderWidth: 2
});

addText({
  text: 'Free',
  x: 80, y: 130,
  fontSize: 28,
  color: '#1e293b',
  fontWeight: 'bold'
});

addText({
  text: '$0/month',
  x: 80, y: 170,
  fontSize: 20,
  color: '#64748b'
});

addRect({
  x: 70, y: 220,
  width: 180, height: 45,
  fill: '#f1f5f9',
  cornerRadius: 8
});

addText({
  text: 'Start Free',
  x: 115, y: 235,
  fontSize: 16,
  color: '#475569',
  fontWeight: '600'
});

// Pro Tier Card (highlighted)
addRect({
  x: 290, y: 80,
  width: 220, height: 390,
  fill: '#6366f1',
  cornerRadius: 16
});

addText({
  text: 'Pro',
  x: 320, y: 120,
  fontSize: 32,
  color: '#ffffff',
  fontWeight: 'bold'
});

addText({
  text: '$29/month',
  x: 320, y: 165,
  fontSize: 22,
  color: '#e0e7ff'
});

addRect({
  x: 310, y: 220,
  width: 180, height: 50,
  fill: '#ffffff',
  cornerRadius: 10
});

addText({
  text: 'Get Pro',
  x: 360, y: 237,
  fontSize: 18,
  color: '#6366f1',
  fontWeight: 'bold'
});

// Enterprise Card
addRect({
  x: 530, y: 100,
  width: 220, height: 350,
  fill: '#ffffff',
  cornerRadius: 16,
  borderColor: '#e2e8f0',
  borderWidth: 2
});

addText({
  text: 'Enterprise',
  x: 560, y: 130,
  fontSize: 28,
  color: '#1e293b',
  fontWeight: 'bold'
});

addText({
  text: 'Custom',
  x: 560, y: 170,
  fontSize: 20,
  color: '#64748b'
});

addRect({
  x: 550, y: 220,
  width: 180, height: 45,
  fill: '#1e293b',
  cornerRadius: 8
});

addText({
  text: 'Contact Us',
  x: 585, y: 235,
  fontSize: 16,
  color: '#ffffff',
  fontWeight: '600'
});`,

  dashboard: `// Dashboard UI Example
setBackground('#0f172a');

// Header bar
addRect({
  x: 0, y: 0,
  width: 800, height: 60,
  fill: '#1e293b'
});

addText({
  text: 'Dashboard',
  x: 20, y: 22,
  fontSize: 24,
  color: '#ffffff',
  fontWeight: 'bold'
});

// Stat card 1
addRect({
  x: 40, y: 100,
  width: 220, height: 120,
  fill: '#1e293b',
  cornerRadius: 12
});

addText({
  text: 'Total Users',
  x: 60, y: 120,
  fontSize: 14,
  color: '#94a3b8'
});

addText({
  text: '12,458',
  x: 60, y: 150,
  fontSize: 32,
  color: '#ffffff',
  fontWeight: 'bold'
});

// Stat card 2
addRect({
  x: 290, y: 100,
  width: 220, height: 120,
  fill: '#1e293b',
  cornerRadius: 12
});

addText({
  text: 'Revenue',
  x: 310, y: 120,
  fontSize: 14,
  color: '#94a3b8'
});

addText({
  text: '$45,231',
  x: 310, y: 150,
  fontSize: 32,
  color: '#10b981',
  fontWeight: 'bold'
});

// Stat card 3
addRect({
  x: 540, y: 100,
  width: 220, height: 120,
  fill: '#1e293b',
  cornerRadius: 12
});

addText({
  text: 'Active Now',
  x: 560, y: 120,
  fontSize: 14,
  color: '#94a3b8'
});

addText({
  text: '573',
  x: 560, y: 150,
  fontSize: 32,
  color: '#3b82f6',
  fontWeight: 'bold'
});`,

  modernCard: `// Modern Card Component
setBackground('#fafafa');

// Card shadow layer
addRect({
  x: 155, y: 155,
  width: 500, height: 300,
  fill: '#000000',
  cornerRadius: 24,
  opacity: 0.05
});

// Main card
addRect({
  x: 150, y: 150,
  width: 500, height: 300,
  fill: '#ffffff',
  cornerRadius: 24,
  borderColor: '#e5e7eb',
  borderWidth: 1
});

// Gradient accent bar
addRect({
  x: 150, y: 150,
  width: 500, height: 8,
  fill: '#3b82f6',
  cornerRadius: 24
});

// Icon circle
addCircle({
  x: 190, y: 200,
  radius: 30,
  fill: '#dbeafe',
  borderColor: '#3b82f6',
  borderWidth: 2
});

// Title
addText({
  text: 'Modern Card Design',
  x: 250, y: 195,
  fontSize: 28,
  color: '#111827',
  fontWeight: 'bold'
});

// Description
addText({
  text: 'This is a beautifully designed card component\\nwith modern styling and clean aesthetics.',
  x: 190, y: 250,
  fontSize: 16,
  color: '#6b7280'
});

// Action button
addRect({
  x: 190, y: 360,
  width: 140, height: 44,
  fill: '#3b82f6',
  cornerRadius: 10
});

addText({
  text: 'Learn More',
  x: 223, y: 375,
  fontSize: 16,
  color: '#ffffff',
  fontWeight: '600'
});`,

  shapesShowcase: `// Shapes Showcase
setBackground('#0f172a');

// Title
addText({
  text: 'Shape Gallery',
  x: 280, y: 30,
  fontSize: 36,
  color: '#ffffff',
  fontWeight: 'bold'
});

// Rectangle
addRect({
  x: 100, y: 100,
  width: 120, height: 120,
  fill: '#3b82f6',
  cornerRadius: 12
});

addText({
  text: 'Rectangle',
  x: 115, y: 235,
  fontSize: 14,
  color: '#94a3b8'
});

// Circle
addCircle({
  x: 340, y: 160,
  radius: 60,
  fill: '#ec4899'
});

addText({
  text: 'Circle',
  x: 328, y: 235,
  fontSize: 14,
  color: '#94a3b8'
});

// Triangle
addPolygon([
  { x: 0, y: -60 },
  { x: -60, y: 60 },
  { x: 60, y: 60 }
], {
  x: 580, y: 160,
  fill: '#10b981'
});

addText({
  text: 'Triangle',
  x: 545, y: 235,
  fontSize: 14,
  color: '#94a3b8'
});

// Star
addPolygon([
  { x: 0, y: -50 },
  { x: 15, y: -15 },
  { x: 50, y: -15 },
  { x: 20, y: 10 },
  { x: 30, y: 50 },
  { x: 0, y: 25 },
  { x: -30, y: 50 },
  { x: -20, y: 10 },
  { x: -50, y: -15 },
  { x: -15, y: -15 }
], {
  x: 340, y: 390,
  fill: '#f59e0b'
});

addText({
  text: 'Star',
  x: 330, y: 455,
  fontSize: 14,
  color: '#94a3b8'
});`
};

export function getRandomExample(): string {
  const examples = Object.values(testExamples);
  return examples[Math.floor(Math.random() * examples.length)];
}

export function getAllExampleNames(): string[] {
  return Object.keys(testExamples);
}
