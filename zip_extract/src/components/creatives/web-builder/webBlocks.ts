import { Canvas as FabricCanvas, Group, Rect, IText } from "fabric";

export interface WebBlock {
  id: string;
  label: string;
  category: string;
  subcategory?: string;
  preview?: string;
  html: string;
  create: (canvas: FabricCanvas) => any;
}

export const webBlocks: WebBlock[] = [
  // HERO SECTIONS
  {
    id: "hero-centered",
    label: "Hero - Centered",
    category: "Sections",
    subcategory: "Hero",
    html: `<section class="hero-section">
  <h1>Welcome to Our Platform</h1>
  <p>Build amazing experiences with our tools</p>
  <button>Get Started</button>
</section>`,
    create: (canvas: FabricCanvas) => {
      const background = new Rect({
        width: 1200,
        height: 400,
        fill: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      });

      const title = new IText("Welcome to Our Platform", {
        fontSize: 48,
        fontWeight: "bold",
        fill: "#ffffff",
        textAlign: "center",
        top: 120,
        left: 600,
        originX: "center",
      });

      const subtitle = new IText("Build amazing experiences with our industry-leading tools", {
        fontSize: 20,
        fill: "#ffffff",
        textAlign: "center",
        top: 200,
        left: 600,
        originX: "center",
      });

      const button = new Group([
        new Rect({
          width: 160,
          height: 48,
          fill: "#ffffff",
          rx: 8,
          ry: 8,
        }),
        new IText("Get Started", {
          fontSize: 16,
          fontWeight: "600",
          fill: "#667eea",
          left: 80,
          top: 24,
          originX: "center",
          originY: "center",
        }),
      ], {
        top: 270,
        left: 600,
        originX: "center",
      });

      const group = new Group([background, title, subtitle, button], {
        selectable: true,
        hasControls: true,
      });

      (group as any).blockData = {
        id: "hero-centered",
        html: `<section class="hero-section">
  <h1>Welcome to Our Platform</h1>
  <p>Build amazing experiences with our industry-leading tools</p>
  <button>Get Started</button>
</section>`,
      };

      return group;
    },
  },

  // FEATURE GRID
  {
    id: "feature-grid-3col",
    label: "Feature Grid - 3 Columns",
    category: "Sections",
    subcategory: "Features",
    html: `<section class="feature-section">
  <h2>Our Features</h2>
  <div class="feature-grid">
    <div class="card"><h3>Fast</h3><p>Lightning-fast performance</p></div>
    <div class="card"><h3>Easy</h3><p>Intuitive interface</p></div>
    <div class="card"><h3>Secure</h3><p>Enterprise-grade security</p></div>
  </div>
</section>`,
    create: (canvas: FabricCanvas) => {
      const background = new Rect({
        width: 1200,
        height: 500,
        fill: "#f9fafb",
      });

      const title = new IText("Our Features", {
        fontSize: 36,
        fontWeight: "bold",
        fill: "#111827",
        textAlign: "center",
        top: 40,
        left: 600,
        originX: "center",
      });

      const createCard = (x: number, title: string, desc: string, color: string) => {
        return new Group([
          new Rect({
            width: 350,
            height: 200,
            fill: "#ffffff",
            rx: 12,
            ry: 12,
          }),
          new Rect({
            width: 48,
            height: 48,
            fill: color,
            rx: 8,
            ry: 8,
            top: 30,
            left: 30,
          }),
          new IText(title, {
            fontSize: 20,
            fontWeight: "600",
            fill: "#111827",
            top: 100,
            left: 30,
          }),
          new IText(desc, {
            fontSize: 14,
            fill: "#6b7280",
            top: 135,
            left: 30,
            width: 290,
          }),
        ], {
          left: x,
          top: 250,
        });
      };

      const card1 = createCard(60, "Fast Performance", "Lightning-fast load times", "#667eea");
      const card2 = createCard(430, "Easy to Use", "Intuitive interface", "#764ba2");
      const card3 = createCard(800, "Secure", "Enterprise-grade security", "#f093fb");

      const group = new Group([background, title, card1, card2, card3], {
        selectable: true,
        hasControls: true,
      });

      (group as any).blockData = {
        id: "feature-grid-3col",
        html: `<section class="feature-section">
  <h2>Our Features</h2>
  <div class="feature-grid">
    <div class="card"><h3>Fast Performance</h3><p>Lightning-fast load times</p></div>
    <div class="card"><h3>Easy to Use</h3><p>Intuitive interface</p></div>
    <div class="card"><h3>Secure</h3><p>Enterprise-grade security</p></div>
  </div>
</section>`,
      };

      return group;
    },
  },

  // TESTIMONIALS
  {
    id: "testimonials-2col",
    label: "Testimonials - 2 Columns",
    category: "Sections",
    subcategory: "Social Proof",
    html: `<section class="testimonials">
  <h2>What Our Customers Say</h2>
  <div class="testimonial-grid">
    <div class="testimonial-card">
      <p>"Amazing platform!"</p>
      <div class="author">Sarah Johnson, CEO</div>
    </div>
    <div class="testimonial-card">
      <p>"Best solution ever"</p>
      <div class="author">Michael Chen, Designer</div>
    </div>
  </div>
</section>`,
    create: (canvas: FabricCanvas) => {
      const background = new Rect({
        width: 1200,
        height: 400,
        fill: "#ffffff",
      });

      const title = new IText("What Our Customers Say", {
        fontSize: 36,
        fontWeight: "bold",
        fill: "#111827",
        textAlign: "center",
        top: 40,
        left: 600,
        originX: "center",
      });

      const createTestimonial = (x: number, quote: string, author: string, color: string) => {
        return new Group([
          new Rect({
            width: 550,
            height: 180,
            fill: "#f9fafb",
            rx: 12,
            ry: 12,
          }),
          new Rect({
            width: 4,
            height: 180,
            fill: color,
            left: 0,
            top: 0,
          }),
          new IText(quote, {
            fontSize: 16,
            fill: "#374151",
            top: 30,
            left: 30,
            width: 490,
          }),
          new Rect({
            width: 48,
            height: 48,
            fill: color,
            rx: 24,
            ry: 24,
            top: 110,
            left: 30,
          }),
          new IText(author, {
            fontSize: 14,
            fontWeight: "600",
            fill: "#111827",
            top: 125,
            left: 90,
          }),
        ], {
          left: x,
          top: 180,
        });
      };

      const testimonial1 = createTestimonial(
        60,
        '"This platform has transformed how we work. Amazing!"',
        "Sarah Johnson, CEO",
        "#667eea"
      );

      const testimonial2 = createTestimonial(
        640,
        '"Outstanding experience! The best solution."',
        "Michael Chen, Designer",
        "#764ba2"
      );

      const group = new Group([background, title, testimonial1, testimonial2], {
        selectable: true,
        hasControls: true,
      });

      (group as any).blockData = {
        id: "testimonials-2col",
        html: `<section class="testimonials">
  <h2>What Our Customers Say</h2>
  <div class="testimonial-grid">
    <div class="testimonial-card">
      <p>"This platform has transformed how we work. Amazing!"</p>
      <div class="author">Sarah Johnson, CEO</div>
    </div>
    <div class="testimonial-card">
      <p>"Outstanding experience! The best solution."</p>
      <div class="author">Michael Chen, Designer</div>
    </div>
  </div>
</section>`,
      };

      return group;
    },
  },

  // CTA SECTION
  {
    id: "cta-centered",
    label: "CTA - Centered",
    category: "Sections",
    subcategory: "CTA",
    html: `<section class="cta-section">
  <h2>Ready to Get Started?</h2>
  <p>Join thousands of users</p>
  <button>Start Free Trial</button>
</section>`,
    create: (canvas: FabricCanvas) => {
      const background = new Rect({
        width: 1200,
        height: 300,
        fill: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      });

      const title = new IText("Ready to Get Started?", {
        fontSize: 40,
        fontWeight: "bold",
        fill: "#ffffff",
        textAlign: "center",
        top: 60,
        left: 600,
        originX: "center",
      });

      const subtitle = new IText("Join thousands of users who are already using our platform", {
        fontSize: 18,
        fill: "rgba(255,255,255,0.9)",
        textAlign: "center",
        top: 130,
        left: 600,
        originX: "center",
      });

      const button = new Group([
        new Rect({
          width: 180,
          height: 50,
          fill: "#ffffff",
          rx: 8,
          ry: 8,
        }),
        new IText("Start Free Trial", {
          fontSize: 16,
          fontWeight: "600",
          fill: "#667eea",
          left: 90,
          top: 25,
          originX: "center",
          originY: "center",
        }),
      ], {
        top: 190,
        left: 600,
        originX: "center",
      });

      const group = new Group([background, title, subtitle, button], {
        selectable: true,
        hasControls: true,
      });

      (group as any).blockData = {
        id: "cta-centered",
        html: `<section class="cta-section">
  <h2>Ready to Get Started?</h2>
  <p>Join thousands of users who are already using our platform</p>
  <button>Start Free Trial</button>
</section>`,
      };

      return group;
    },
  },

  // STATS SECTION
  {
    id: "stats-4col",
    label: "Stats - 4 Columns",
    category: "Sections",
    subcategory: "Stats",
    html: `<section class="stats-section">
  <div class="stat"><h3>10K+</h3><p>Users</p></div>
  <div class="stat"><h3>50K+</h3><p>Projects</p></div>
  <div class="stat"><h3>99.9%</h3><p>Uptime</p></div>
  <div class="stat"><h3>24/7</h3><p>Support</p></div>
</section>`,
    create: (canvas: FabricCanvas) => {
      const background = new Rect({
        width: 1200,
        height: 250,
        fill: "#ffffff",
      });

      const createStat = (x: number, value: string, label: string, color: string) => {
        return new Group([
          new IText(value, {
            fontSize: 48,
            fontWeight: "bold",
            fill: color,
            textAlign: "center",
            left: 0,
            top: 0,
            originX: "center",
          }),
          new IText(label, {
            fontSize: 18,
            fill: "#6b7280",
            textAlign: "center",
            left: 0,
            top: 70,
            originX: "center",
          }),
        ], {
          left: x,
          top: 85,
        });
      };

      const stat1 = createStat(150, "10K+", "Active Users", "#667eea");
      const stat2 = createStat(450, "50K+", "Projects Created", "#764ba2");
      const stat3 = createStat(750, "99.9%", "Uptime", "#f093fb");
      const stat4 = createStat(1050, "24/7", "Support", "#667eea");

      const group = new Group([background, stat1, stat2, stat3, stat4], {
        selectable: true,
        hasControls: true,
      });

      (group as any).blockData = {
        id: "stats-4col",
        html: `<section class="stats-section">
  <div class="stat"><h3>10K+</h3><p>Active Users</p></div>
  <div class="stat"><h3>50K+</h3><p>Projects Created</p></div>
  <div class="stat"><h3>99.9%</h3><p>Uptime</p></div>
  <div class="stat"><h3>24/7</h3><p>Support</p></div>
</section>`,
      };

      return group;
    },
  },
];
