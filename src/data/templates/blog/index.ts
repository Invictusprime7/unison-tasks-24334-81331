import { LayoutTemplate } from '../types';
import { wrapInHtmlDoc } from '../utils';

const blogExtras = (opts: {
  brand: string;
  accent: 'cyan' | 'amber' | 'rose' | 'red' | 'neutral';
  newsletterLabel: string;
}) => {
  const ctaGradient =
    opts.accent === 'cyan'
      ? 'from-cyan-500 to-blue-500'
      : opts.accent === 'amber'
        ? 'from-amber-500 to-orange-500'
        : opts.accent === 'red'
          ? 'from-red-600 to-rose-500'
          : opts.accent === 'neutral'
            ? 'from-neutral-900 to-neutral-700'
            : 'from-rose-500 to-pink-500';

  const chip =
    opts.accent === 'cyan'
      ? 'text-cyan-400 border-cyan-500/20 bg-cyan-500/10'
      : opts.accent === 'amber'
        ? 'text-amber-700 border-amber-500/20 bg-amber-500/10'
        : opts.accent === 'red'
          ? 'text-red-400 border-red-500/20 bg-red-500/10'
          : opts.accent === 'neutral'
            ? 'text-neutral-700 border-neutral-300 bg-white'
            : 'text-rose-400 border-rose-500/20 bg-rose-500/10';

  return `
<section class="py-20 px-6">
  <div class="max-w-6xl mx-auto">
    <div class="grid lg:grid-cols-3 gap-10 items-start">
      <div class="lg:col-span-2">
        <div class="flex items-end justify-between gap-6 mb-8">
          <div>
            <h2 class="text-2xl md:text-3xl font-bold">Explore by topic</h2>
            <p class="text-slate-400 mt-2">Tap a tab to preview what’s inside.</p>
          </div>
          <span class="hidden md:inline-flex px-3 py-1 rounded-full border ${chip} text-xs tracking-wider">INTERACTIVE</span>
        </div>

        <div class="rounded-3xl border border-white/10 bg-white/5 p-4" data-tabs="featured">
          <div class="flex flex-wrap gap-2">
            <button class="px-4 py-2 rounded-full text-sm border border-white/10 bg-white/5 text-slate-300 tw-focus" data-tab="featured" aria-selected="true">Featured</button>
            <button class="px-4 py-2 rounded-full text-sm border border-white/10 bg-white/5 text-slate-400 tw-focus" data-tab="tutorials" aria-selected="false">Tutorials</button>
            <button class="px-4 py-2 rounded-full text-sm border border-white/10 bg-white/5 text-slate-400 tw-focus" data-tab="opinions" aria-selected="false">Opinions</button>
            <button class="px-4 py-2 rounded-full text-sm border border-white/10 bg-white/5 text-slate-400 tw-focus" data-tab="roundups" aria-selected="false">Roundups</button>
          </div>

          <div class="mt-6">
            <div data-tab-panel="featured">
              <div class="grid md:grid-cols-2 gap-4">
                <div class="rounded-2xl border border-white/10 bg-slate-900/50 p-6">
                  <div class="text-xs text-slate-500">Editor’s pick</div>
                  <div class="text-lg font-semibold mt-2">How we research, outline, and publish</div>
                  <p class="text-sm text-slate-400 mt-2">A behind-the-scenes look at our writing process, from idea → draft → edit.</p>
                </div>
                <div class="rounded-2xl border border-white/10 bg-slate-900/50 p-6 md:translate-y-3">
                  <div class="text-xs text-slate-500">Most read</div>
                  <div class="text-lg font-semibold mt-2">The checklist we use before hitting publish</div>
                  <p class="text-sm text-slate-400 mt-2">Structure, SEO, accessibility, and readability—without sounding robotic.</p>
                </div>
              </div>
            </div>
            <div class="hidden" data-tab-panel="tutorials">
              <div class="rounded-2xl border border-white/10 bg-slate-900/50 p-6">
                <div class="text-sm font-semibold">Tutorial series</div>
                <ul class="mt-3 space-y-2 text-sm text-slate-400">
                  <li>• Build a clean layout system with Tailwind</li>
                  <li>• Write better headlines with real examples</li>
                  <li>• Turn readers into subscribers (ethically)</li>
                </ul>
              </div>
            </div>
            <div class="hidden" data-tab-panel="opinions">
              <div class="rounded-2xl border border-white/10 bg-slate-900/50 p-6">
                <div class="text-sm font-semibold">Hot takes (with receipts)</div>
                <p class="mt-2 text-sm text-slate-400">We keep opinions grounded: show the context, share counterpoints, and link the sources (in real implementations).</p>
              </div>
            </div>
            <div class="hidden" data-tab-panel="roundups">
              <div class="rounded-2xl border border-white/10 bg-slate-900/50 p-6">
                <div class="text-sm font-semibold">Weekly roundup</div>
                <p class="mt-2 text-sm text-slate-400">A curated selection of articles, tools, and ideas. Skimmable. Saveable. Shareable.</p>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-10">
          <h3 class="text-xl font-bold mb-4">Frequently asked</h3>
          <div class="space-y-3">
            <details class="group rounded-2xl border border-white/10 bg-slate-900/50 p-5">
              <summary class="flex items-center justify-between gap-4 tw-focus">
                <span class="font-semibold">How often do you publish?</span>
                <span class="text-slate-400 group-open:rotate-45 transition">+</span>
              </summary>
              <div class="mt-3 text-sm text-slate-400">Typically 2–3 posts per week, plus a weekly newsletter digest.</div>
            </details>
            <details class="group rounded-2xl border border-white/10 bg-slate-900/50 p-5">
              <summary class="flex items-center justify-between gap-4 tw-focus">
                <span class="font-semibold">Can I suggest a topic?</span>
                <span class="text-slate-400 group-open:rotate-45 transition">+</span>
              </summary>
              <div class="mt-3 text-sm text-slate-400">Yes—hit reply on any newsletter email or use the contact link in the footer. We keep a public backlog.</div>
            </details>
            <details class="group rounded-2xl border border-white/10 bg-slate-900/50 p-5">
              <summary class="flex items-center justify-between gap-4 tw-focus">
                <span class="font-semibold">Do you accept sponsorships?</span>
                <span class="text-slate-400 group-open:rotate-45 transition">+</span>
              </summary>
              <div class="mt-3 text-sm text-slate-400">Selectively. We only partner with products we’d recommend to a friend.</div>
            </details>
          </div>
        </div>
      </div>

      <aside class="rounded-3xl border border-white/10 bg-white/5 p-8" data-demo-form-host>
        <div class="text-xs tracking-widest text-slate-500">NEWSLETTER</div>
        <h3 class="text-xl font-bold mt-2">${opts.newsletterLabel}</h3>
        <p class="text-sm text-slate-400 mt-2">One email. Real value. No fluff.</p>
        <form class="mt-6 space-y-3" data-demo-form data-demo-message="Subscribed! Your next issue is on the way.">
          <label class="block text-sm text-slate-400">Email</label>
          <input class="w-full px-4 py-3 rounded-xl bg-slate-950/40 border border-white/10 outline-none tw-focus" placeholder="you@example.com" type="email" required />
          <button type="submit" class="w-full px-4 py-3 rounded-xl bg-gradient-to-r ${ctaGradient} text-white font-semibold tw-focus" data-intent="newsletter.subscribe">Subscribe</button>
          <p class="text-xs text-slate-500">By subscribing, you agree to receive emails from ${opts.brand}.</p>
        </form>
        <div class="mt-8 rounded-2xl border border-white/10 bg-slate-900/50 p-5">
          <div class="text-sm font-semibold">Quick links</div>
          <div class="mt-3 grid grid-cols-2 gap-3 text-sm">
            <a class="px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10" href="#">Start here</a>
            <a class="px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10" href="#">Popular</a>
            <a class="px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10" href="#">RSS</a>
            <a class="px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10" href="#">Contact</a>
          </div>
        </div>
      </aside>
    </div>
  </div>
</section>
`;
};

export const blogTemplates: LayoutTemplate[] = [
  {
    id: "blog-tech",
    name: "Tech Blog",
    category: "blog",
    description: "Modern tech/developer blog",
    tags: ["tech", "developer", "full"],
    code: wrapInHtmlDoc(`
<nav class="fixed top-0 left-0 right-0 z-50 px-6 py-4 bg-slate-950/90 backdrop-blur-lg border-b border-white/5"><div class="max-w-5xl mx-auto flex items-center justify-between"><a href="#" class="text-xl font-bold text-cyan-500">&lt;DevBlog /&gt;</a><div class="hidden md:flex items-center gap-6"><a href="#" class="text-sm text-slate-300 hover:text-white">Articles</a><a href="#" class="text-sm text-slate-300 hover:text-white">Tutorials</a><a href="#" class="text-sm text-slate-300 hover:text-white">Newsletter</a></div><button class="px-4 py-2 bg-cyan-500 text-black text-sm font-semibold rounded-lg" data-intent="newsletter.subscribe">Subscribe</button></div></nav>
<section class="pt-32 pb-16 px-6"><div class="max-w-5xl mx-auto"><span class="text-cyan-500 text-sm font-mono">// Welcome to</span><h1 class="text-5xl md:text-6xl font-bold mt-2 mb-6">The Developer Blog</h1><p class="text-xl text-slate-400 max-w-2xl">Tutorials, deep dives, and insights on web development, AI, and modern software engineering.</p></div></section>
<section class="py-8 px-6"><div class="max-w-5xl mx-auto"><div class="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-2xl p-8 border border-white/10"><div class="grid lg:grid-cols-2 gap-8 items-center"><div><span class="text-cyan-500 text-sm font-semibold">FEATURED</span><h2 class="text-3xl font-bold mt-2 mb-4">Building AI-Powered Apps with Next.js</h2><p class="text-slate-400 mb-4">A comprehensive guide to integrating OpenAI and Claude APIs into your Next.js applications.</p><div class="flex items-center gap-4"><img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&q=80" class="w-10 h-10 rounded-full"/><div><span class="text-sm font-medium">Alex Chen</span><span class="text-sm text-slate-500 ml-2">12 min read</span></div></div></div><img src="https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&q=80" alt="" class="rounded-xl"/></div></div></div></section>
<section class="py-16 px-6"><div class="max-w-5xl mx-auto"><h2 class="text-2xl font-bold mb-8">Latest Articles</h2><div class="space-y-8"><div class="flex gap-6 items-start pb-8 border-b border-white/5"><img src="https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=200&q=80" alt="" class="w-48 h-32 object-cover rounded-lg hidden md:block"/><div><span class="text-cyan-500 text-xs font-semibold">TYPESCRIPT</span><h3 class="text-xl font-bold mt-1 mb-2 hover:text-cyan-500 cursor-pointer">Advanced TypeScript Patterns Every Dev Should Know</h3><p class="text-slate-400 text-sm mb-3">Master generics, conditional types, and mapped types to level up your TypeScript skills.</p><span class="text-sm text-slate-500">8 min read</span></div></div><div class="flex gap-6 items-start pb-8 border-b border-white/5"><img src="https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=200&q=80" alt="" class="w-48 h-32 object-cover rounded-lg hidden md:block"/><div><span class="text-purple-500 text-xs font-semibold">DEVOPS</span><h3 class="text-xl font-bold mt-1 mb-2 hover:text-cyan-500 cursor-pointer">Docker Best Practices for Production</h3><p class="text-slate-400 text-sm mb-3">Optimize your Docker images for security, performance, and maintainability.</p><span class="text-sm text-slate-500">10 min read</span></div></div><div class="flex gap-6 items-start"><img src="https://images.unsplash.com/photo-1551650975-87deedd944c3?w=200&q=80" alt="" class="w-48 h-32 object-cover rounded-lg hidden md:block"/><div><span class="text-emerald-500 text-xs font-semibold">REACT</span><h3 class="text-xl font-bold mt-1 mb-2 hover:text-cyan-500 cursor-pointer">React Server Components Explained</h3><p class="text-slate-400 text-sm mb-3">Understanding the future of React rendering with RSC.</p><span class="text-sm text-slate-500">6 min read</span></div></div></div></div></section>
<section class="py-16 px-6 bg-white/5"><div class="max-w-3xl mx-auto text-center"><h2 class="text-3xl font-bold mb-4">Subscribe to the Newsletter</h2><p class="text-slate-400 mb-8">Get weekly tutorials and articles straight to your inbox. No spam.</p><form class="flex max-w-md mx-auto"><input type="email" name="email" placeholder="you@example.com" class="flex-1 px-5 py-4 bg-slate-900 border border-white/10 rounded-l-lg outline-none focus:border-cyan-500"/><button class="px-8 py-4 bg-cyan-500 text-black font-semibold rounded-r-lg" data-intent="newsletter.subscribe">Subscribe</button></form><p class="text-xs text-slate-500 mt-4">Join 12,000+ developers</p></div></section>
${blogExtras({ brand: '<DevBlog />', accent: 'cyan', newsletterLabel: 'Get the next deep dive' })}
<footer class="py-12 px-6 border-t border-white/5"><div class="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6"><span class="text-xl font-bold text-cyan-500">&lt;DevBlog /&gt;</span><div class="flex gap-6 text-sm text-slate-400"><a href="#">Twitter</a><a href="#">GitHub</a><a href="#">RSS</a></div></div></footer>
    `, "Tech Blog"),
  },
  {
    id: "blog-lifestyle",
    name: "Lifestyle Blog",
    category: "blog",
    description: "Clean lifestyle/wellness blog",
    tags: ["lifestyle", "wellness", "full"],
    code: wrapInHtmlDoc(`
<div class="bg-stone-50 text-stone-900 min-h-screen">
<nav class="fixed top-0 left-0 right-0 z-50 px-6 py-6 bg-stone-50/90 backdrop-blur-lg"><div class="max-w-5xl mx-auto flex items-center justify-between"><a href="#" class="text-2xl font-serif italic">Bloom</a><div class="hidden md:flex items-center gap-8 text-sm"><a href="#" class="text-stone-500 hover:text-stone-900">Lifestyle</a><a href="#" class="text-stone-500 hover:text-stone-900">Wellness</a><a href="#" class="text-stone-500 hover:text-stone-900">Travel</a><a href="#" class="text-stone-500 hover:text-stone-900">About</a></div><button class="text-sm">Subscribe</button></div></nav>
<section class="pt-32 pb-16 px-6"><div class="max-w-4xl mx-auto text-center"><h1 class="text-5xl md:text-6xl font-serif mb-6">Live Beautifully</h1><p class="text-xl text-stone-500">Inspiration for mindful living, wellness, and everyday joy.</p></div></section>
<section class="py-8 px-6"><div class="max-w-5xl mx-auto"><div class="relative rounded-2xl overflow-hidden"><img src="https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=1200&q=80" alt="" class="w-full h-96 object-cover"/><div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-8"><div class="text-white"><span class="text-amber-300 text-sm font-semibold">FEATURED</span><h2 class="text-3xl font-serif mt-2 mb-3">Finding Peace in Morning Rituals</h2><p class="text-white/80">How a simple morning routine transformed my days.</p></div></div></div></div></section>
<section class="py-16 px-6"><div class="max-w-5xl mx-auto"><h2 class="text-2xl font-serif mb-8">Recent Posts</h2><div class="grid md:grid-cols-3 gap-8"><div class="group cursor-pointer"><img src="https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&q=80" alt="" class="w-full aspect-[4/3] object-cover rounded-xl mb-4"/><span class="text-amber-600 text-xs font-semibold uppercase">Wellness</span><h3 class="font-serif text-xl mt-2 group-hover:text-amber-600">The Art of Slow Living</h3><p class="text-stone-500 text-sm mt-2">Embracing intentionality in a fast-paced world.</p></div><div class="group cursor-pointer"><img src="https://images.unsplash.com/photo-1493770348161-369560ae357d?w=400&q=80" alt="" class="w-full aspect-[4/3] object-cover rounded-xl mb-4"/><span class="text-rose-600 text-xs font-semibold uppercase">Recipes</span><h3 class="font-serif text-xl mt-2 group-hover:text-amber-600">Nourishing Winter Soups</h3><p class="text-stone-500 text-sm mt-2">Comfort food that feeds the soul.</p></div><div class="group cursor-pointer"><img src="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&q=80" alt="" class="w-full aspect-[4/3] object-cover rounded-xl mb-4"/><span class="text-emerald-600 text-xs font-semibold uppercase">Home</span><h3 class="font-serif text-xl mt-2 group-hover:text-amber-600">Creating a Cozy Reading Nook</h3><p class="text-stone-500 text-sm mt-2">Your perfect escape at home.</p></div></div></div></section>
<section class="py-16 px-6 bg-amber-50"><div class="max-w-3xl mx-auto text-center"><h2 class="text-3xl font-serif mb-4">Join the Community</h2><p class="text-stone-600 mb-8">Subscribe for weekly inspiration on living well.</p><div class="flex max-w-md mx-auto"><input type="email" placeholder="Your email" class="flex-1 px-5 py-4 border border-stone-200 rounded-l-lg outline-none focus:border-amber-500"/><button class="px-8 py-4 bg-amber-600 text-white font-medium rounded-r-lg">Subscribe</button></div></div></section>
${blogExtras({ brand: 'Bloom', accent: 'amber', newsletterLabel: 'Weekly inspiration, beautifully curated' })}
<footer class="py-12 px-6 border-t border-stone-200"><div class="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6"><span class="text-2xl font-serif italic">Bloom</span><div class="flex gap-6 text-sm text-stone-500"><a href="#">Instagram</a><a href="#">Pinterest</a></div></div></footer>
</div>
    `, "Lifestyle Blog"),
  },
  {
    id: "blog-magazine",
    name: "Digital Magazine",
    category: "blog",
    description: "Editorial magazine style blog",
    tags: ["magazine", "editorial", "full"],
    code: wrapInHtmlDoc(`
<nav class="fixed top-0 left-0 right-0 z-50 px-6 py-4 bg-slate-950/90 backdrop-blur-lg border-b border-white/5"><div class="max-w-7xl mx-auto flex items-center justify-between"><a href="#" class="text-2xl font-black tracking-tight">PULSE</a><div class="hidden md:flex items-center gap-6"><a href="#" class="text-sm text-slate-300 hover:text-white">Culture</a><a href="#" class="text-sm text-slate-300 hover:text-white">Tech</a><a href="#" class="text-sm text-slate-300 hover:text-white">Design</a><a href="#" class="text-sm text-slate-300 hover:text-white">Life</a></div><button class="px-4 py-2 bg-rose-500 text-sm font-bold rounded">Subscribe</button></div></nav>
<section class="pt-24 pb-8 px-6"><div class="max-w-7xl mx-auto"><div class="grid lg:grid-cols-2 gap-8"><div class="relative aspect-[16/10] rounded-2xl overflow-hidden"><img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80" alt="" class="w-full h-full object-cover"/><div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-8"><span class="text-rose-500 text-sm font-bold">COVER STORY</span><h2 class="text-3xl font-bold mt-2 mb-2">The Future of Digital Art in 2025</h2><p class="text-white/70">How AI is reshaping creative expression.</p></div></div><div class="grid grid-rows-2 gap-8"><div class="relative aspect-[16/8] rounded-xl overflow-hidden"><img src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=600&q=80" alt="" class="w-full h-full object-cover"/><div class="absolute inset-0 bg-black/50 flex flex-col justify-end p-6"><span class="text-cyan-400 text-xs font-bold">TECH</span><h3 class="text-xl font-bold mt-1">Inside the Metaverse Revolution</h3></div></div><div class="relative aspect-[16/8] rounded-xl overflow-hidden"><img src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80" alt="" class="w-full h-full object-cover"/><div class="absolute inset-0 bg-black/50 flex flex-col justify-end p-6"><span class="text-amber-400 text-xs font-bold">DESIGN</span><h3 class="text-xl font-bold mt-1">Minimalism Is Dead. Long Live Maximalism.</h3></div></div></div></div></div></section>
<section class="py-16 px-6"><div class="max-w-7xl mx-auto"><div class="flex justify-between items-center mb-8"><h2 class="text-2xl font-bold">Trending Now</h2><a href="#" class="text-rose-500 text-sm">View All</a></div><div class="grid md:grid-cols-4 gap-6"><div class="group cursor-pointer"><img src="https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=300&q=80" alt="" class="w-full aspect-square object-cover rounded-xl mb-4"/><span class="text-purple-400 text-xs font-bold">CULTURE</span><h3 class="font-bold mt-1 group-hover:text-rose-500">Why Gen Z is Redefining Luxury</h3></div><div class="group cursor-pointer"><img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&q=80" alt="" class="w-full aspect-square object-cover rounded-xl mb-4"/><span class="text-emerald-400 text-xs font-bold">LIFE</span><h3 class="font-bold mt-1 group-hover:text-rose-500">The New Rules of Self-Care</h3></div><div class="group cursor-pointer"><img src="https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=300&q=80" alt="" class="w-full aspect-square object-cover rounded-xl mb-4"/><span class="text-cyan-400 text-xs font-bold">TECH</span><h3 class="font-bold mt-1 group-hover:text-rose-500">Retro Gaming's Unexpected Comeback</h3></div><div class="group cursor-pointer"><img src="https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&q=80" alt="" class="w-full aspect-square object-cover rounded-xl mb-4"/><span class="text-rose-400 text-xs font-bold">MUSIC</span><h3 class="font-bold mt-1 group-hover:text-rose-500">The Sound of 2025</h3></div></div></div></section>
<section class="py-16 px-6 bg-rose-500"><div class="max-w-4xl mx-auto text-center"><h2 class="text-3xl font-black mb-4 text-white">Get the Latest</h2><p class="text-white/80 mb-8">Weekly culture digest. No spam, ever.</p><div class="flex max-w-md mx-auto"><input type="email" placeholder="your@email.com" class="flex-1 px-5 py-4 rounded-l-lg outline-none text-black"/><button class="px-8 py-4 bg-black text-white font-bold rounded-r-lg">Subscribe</button></div></div></section>
${blogExtras({ brand: 'PULSE', accent: 'rose', newsletterLabel: 'The weekly culture digest' })}
<footer class="py-12 px-6 border-t border-white/5"><div class="max-w-7xl mx-auto flex justify-between items-center"><span class="text-xl font-black">PULSE</span><div class="flex gap-6 text-sm text-slate-400"><a href="#">Twitter</a><a href="#">Instagram</a><a href="#">TikTok</a></div></div></footer>
    `, "Digital Magazine"),
  },
  {
    id: "blog-personal",
    name: "Personal Blog",
    category: "blog",
    description: "Minimalist personal blog",
    tags: ["personal", "minimal", "full"],
    code: wrapInHtmlDoc(`
<div class="bg-neutral-50 text-neutral-900 min-h-screen">
<nav class="px-6 py-8"><div class="max-w-2xl mx-auto flex items-center justify-between"><a href="#" class="text-lg font-medium">Sarah Chen</a><div class="flex items-center gap-6 text-sm"><a href="#" class="text-neutral-500 hover:text-neutral-900">Writing</a><a href="#" class="text-neutral-500 hover:text-neutral-900">About</a><a href="#" class="text-neutral-500 hover:text-neutral-900">Contact</a></div></div></nav>
<section class="py-16 px-6"><div class="max-w-2xl mx-auto"><h1 class="text-4xl font-serif mb-6">Hi, I'm Sarah</h1><p class="text-xl text-neutral-600 leading-relaxed">I write about design, technology, and the intersection of creativity and everyday life. Welcome to my corner of the internet.</p></div></section>
<section class="py-8 px-6"><div class="max-w-2xl mx-auto"><h2 class="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-8">Recent Writing</h2><div class="space-y-12"><article class="group"><time class="text-sm text-neutral-400">January 18, 2025</time><h3 class="text-2xl font-serif mt-2 mb-3 group-hover:text-rose-600 cursor-pointer">On the Art of Doing Nothing</h3><p class="text-neutral-600 leading-relaxed">In a world obsessed with productivity, I've been experimenting with intentional rest. Here's what I learned about slowing down...</p><a href="#" class="inline-block mt-4 text-sm text-rose-600 font-medium">Read more</a></article><article class="group"><time class="text-sm text-neutral-400">January 10, 2025</time><h3 class="text-2xl font-serif mt-2 mb-3 group-hover:text-rose-600 cursor-pointer">Lessons from a Year of Daily Journaling</h3><p class="text-neutral-600 leading-relaxed">365 days of putting pen to paper. The surprising insights, the unexpected benefits, and the simple practice that changed my mornings...</p><a href="#" class="inline-block mt-4 text-sm text-rose-600 font-medium">Read more</a></article><article class="group"><time class="text-sm text-neutral-400">December 28, 2024</time><h3 class="text-2xl font-serif mt-2 mb-3 group-hover:text-rose-600 cursor-pointer">Building a Reading Habit (Finally)</h3><p class="text-neutral-600 leading-relaxed">After years of starting and stopping, I finally cracked the code on reading regularly. The secret? Lowering the bar...</p><a href="#" class="inline-block mt-4 text-sm text-rose-600 font-medium">Read more</a></article></div></div></section>
<section class="py-16 px-6 bg-neutral-100"><div class="max-w-2xl mx-auto"><h2 class="text-2xl font-serif mb-4">Newsletter</h2><p class="text-neutral-600 mb-6">Occasional thoughts on design, creativity, and life. No spam, unsubscribe anytime.</p><div class="flex"><input type="email" placeholder="your@email.com" class="flex-1 px-4 py-3 border border-neutral-200 rounded-l-lg outline-none focus:border-neutral-400"/><button class="px-6 py-3 bg-neutral-900 text-white font-medium rounded-r-lg">Subscribe</button></div></div></section>
${blogExtras({ brand: 'Sarah Chen', accent: 'neutral', newsletterLabel: 'Occasional notes worth reading' })}
<footer class="py-12 px-6"><div class="max-w-2xl mx-auto flex justify-between items-center text-sm text-neutral-400"><span>© 2025 Sarah Chen</span><div class="flex gap-4"><a href="#">Twitter</a><a href="#">Instagram</a></div></div></footer>
</div>
    `, "Personal Blog"),
  },
  {
    id: "blog-news",
    name: "News Portal",
    category: "blog",
    description: "News publication style blog",
    tags: ["news", "publication", "full"],
    code: wrapInHtmlDoc(`
<nav class="fixed top-0 left-0 right-0 z-50 px-6 py-3 bg-slate-950 border-b border-white/10"><div class="max-w-7xl mx-auto"><div class="flex items-center justify-between"><a href="#" class="text-2xl font-black text-red-600">DAILY</a><div class="hidden lg:flex items-center gap-6 text-sm"><a href="#" class="text-white font-semibold">Home</a><a href="#" class="text-slate-300">Politics</a><a href="#" class="text-slate-300">Business</a><a href="#" class="text-slate-300">Tech</a><a href="#" class="text-slate-300">Sports</a><a href="#" class="text-slate-300">Opinion</a></div><div class="flex items-center gap-4"><button class="p-2">🔍</button><button class="px-4 py-2 bg-red-600 text-sm font-bold rounded">Subscribe</button></div></div><div class="text-xs text-slate-400 mt-2 hidden md:block">Friday, January 24, 2025 | Breaking: Markets reach all-time high</div></div></nav>
<section class="pt-28 pb-8 px-6"><div class="max-w-7xl mx-auto"><div class="grid lg:grid-cols-3 gap-8"><div class="lg:col-span-2"><div class="relative aspect-[16/9] rounded-xl overflow-hidden"><img src="https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=900&q=80" alt="" class="w-full h-full object-cover"/><div class="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent flex flex-col justify-end p-8"><span class="text-red-500 text-sm font-bold">BREAKING</span><h1 class="text-3xl md:text-4xl font-bold mt-2 mb-3">Global Leaders Meet for Historic Climate Summit</h1><p class="text-white/70 mb-2">New agreements expected to reshape international environmental policy.</p><span class="text-sm text-slate-400">2 hours ago | Politics</span></div></div></div><div class="space-y-6"><div class="flex gap-4 pb-4 border-b border-white/10"><img src="https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=120&q=80" class="w-24 h-20 object-cover rounded"/><div><span class="text-xs text-amber-500 font-semibold">BUSINESS</span><h3 class="font-bold mt-1 text-sm leading-snug">Tech Giants Report Record Q4 Earnings</h3><span class="text-xs text-slate-500">45 min ago</span></div></div><div class="flex gap-4 pb-4 border-b border-white/10"><img src="https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=120&q=80" class="w-24 h-20 object-cover rounded"/><div><span class="text-xs text-blue-500 font-semibold">SPORTS</span><h3 class="font-bold mt-1 text-sm leading-snug">Championship Finals Set After Dramatic Semifinals</h3><span class="text-xs text-slate-500">1 hour ago</span></div></div><div class="flex gap-4"><img src="https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=120&q=80" class="w-24 h-20 object-cover rounded"/><div><span class="text-xs text-purple-500 font-semibold">TECH</span><h3 class="font-bold mt-1 text-sm leading-snug">New AI Model Breaks Previous Benchmarks</h3><span class="text-xs text-slate-500">3 hours ago</span></div></div></div></div></div></section>
<section class="py-12 px-6 bg-white/5"><div class="max-w-7xl mx-auto"><h2 class="text-xl font-bold mb-6 flex items-center"><span class="w-1 h-6 bg-red-600 mr-3"></span>Top Stories</h2><div class="grid md:grid-cols-4 gap-6"><div class="group cursor-pointer"><img src="https://images.unsplash.com/photo-1579621970795-87facc2f976d?w=300&q=80" alt="" class="w-full aspect-[4/3] object-cover rounded-lg mb-3"/><span class="text-xs text-amber-500 font-semibold">ECONOMY</span><h3 class="font-bold mt-1 group-hover:text-red-500">Central Bank Signals Rate Hold</h3></div><div class="group cursor-pointer"><img src="https://images.unsplash.com/photo-1518770660439-4636190af475?w=300&q=80" alt="" class="w-full aspect-[4/3] object-cover rounded-lg mb-3"/><span class="text-xs text-purple-500 font-semibold">SCIENCE</span><h3 class="font-bold mt-1 group-hover:text-red-500">Breakthrough in Quantum Computing</h3></div><div class="group cursor-pointer"><img src="https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=300&q=80" alt="" class="w-full aspect-[4/3] object-cover rounded-lg mb-3"/><span class="text-xs text-emerald-500 font-semibold">POLITICS</span><h3 class="font-bold mt-1 group-hover:text-red-500">Senate Passes Major Reform Bill</h3></div><div class="group cursor-pointer"><img src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&q=80" alt="" class="w-full aspect-[4/3] object-cover rounded-lg mb-3"/><span class="text-xs text-blue-500 font-semibold">HEALTH</span><h3 class="font-bold mt-1 group-hover:text-red-500">New Study Reveals Exercise Benefits</h3></div></div></div></section>
<section class="py-12 px-6"><div class="max-w-3xl mx-auto bg-red-600 rounded-2xl p-8 text-center"><h2 class="text-2xl font-bold mb-3">Stay Informed</h2><p class="text-white/80 mb-6">Get breaking news delivered to your inbox.</p><div class="flex max-w-md mx-auto"><input type="email" placeholder="your@email.com" class="flex-1 px-4 py-3 rounded-l-lg outline-none text-black"/><button class="px-6 py-3 bg-black text-white font-bold rounded-r-lg">Subscribe</button></div></div></section>
${blogExtras({ brand: 'DAILY', accent: 'red', newsletterLabel: 'Breaking news, once a day' })}
<footer class="py-8 px-6 border-t border-white/5"><div class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4"><span class="text-xl font-black text-red-600">DAILY</span><div class="flex gap-6 text-sm text-slate-400"><a href="#">About</a><a href="#">Contact</a><a href="#">Advertise</a></div><p class="text-sm text-slate-500">© 2025 Daily News</p></div></footer>
    `, "News Portal"),
  },
];
