import {
  BookOpen,
  Layout,
  Users,
  Palette,
  Cloud,
  FolderOpen,
  Workflow,
  type LucideIcon,
} from "lucide-react";

export interface DocSection {
  id: string;
  title: string;
  icon: LucideIcon;
  description: string;
  image: string;
  articles: DocArticle[];
}

export interface DocArticle {
  id: string;
  title: string;
  content: string;
  image?: string;
}

export const docSections: DocSection[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: BookOpen,
    description: "Your first steps with Unison Tasks",
    image: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=400&h=200&fit=crop",
    articles: [
      {
        id: "platform-overview",
        title: "Welcome to Unison Tasks",
        image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=300&fit=crop",
        content: `# Welcome to Unison Tasks! 👋

We're so glad you're here! Unison Tasks is your all-in-one workspace to get things done, build websites, and grow your business.

## What Can You Do Here?

Think of Unison Tasks as your digital office. Here's what's waiting for you:

**📋 Manage Your Projects**
Keep track of everything you're working on. Create to-do lists, set deadlines, and never forget what needs to be done.

**🌐 Build Websites**
Create beautiful websites without any coding. Just drag, drop, and customize — it's that simple!

**🎨 Design Graphics**
Make eye-catching images for social media, business cards, flyers, and more.

**👥 Manage Customers**
Keep all your contacts organized and never lose track of a potential customer.

**☁️ Store Your Files**
Upload and organize all your important files in one safe place.

## Your First Steps

Ready to get started? Here's what to do:

1. **Look around the home page** — You'll see cards for each tool. Click any card to explore!

2. **Create your first project** — Click "New Project" on the Dashboard to start organizing your work.

3. **Try the Website Builder** — It's fun! Pick a template and make it your own.

4. **Need help?** — This documentation is always here. Just click the menu icon anytime!

## Quick Tip 💡

The home page is your starting point for everything. Bookmark it so you can always find your way back!`,
      },
      {
        id: "dashboard-guide",
        title: "Using Your Dashboard",
        image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=300&fit=crop",
        content: `# Your Dashboard — Command Central 🎯

The Dashboard is where you'll spend most of your time. Think of it as your personal command center where you can see everything at a glance.

## What You'll See

When you open the Dashboard, you'll find:

**Your Projects**
All your work, organized in neat cards. Each card shows the project name and how many tasks are inside.

**Quick Action Buttons**
Big, friendly buttons at the top to create new projects or tasks with one click.

## How to Create a Project

1. Click the **"New Project"** button (it has a + sign)
2. Give your project a name (like "My Website" or "Marketing Ideas")
3. Click **Create** — that's it!

## How to Add Tasks

1. Click on any project to open it
2. Click **"Add Task"**
3. Type what you need to do
4. Set a due date if you want a reminder
5. Click **Save**

## Helpful Tips 💡

**Keep it simple**: Start with just one or two projects. You can always add more later.

**Use clear names**: "Website Redesign" is better than "Project 1" — you'll thank yourself later!

**Check in daily**: Spend 2 minutes each morning looking at your tasks. It helps you stay focused.

## What Do the Colors Mean?

- **Green** = Completed! Great job! 🎉
- **Yellow** = Due soon — better get on it!
- **Red** = Overdue — needs your attention now`,
      },
      {
        id: "pricing-plans",
        title: "Choosing Your Plan",
        image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&h=300&fit=crop",
        content: `# Which Plan is Right for You? 💰

We have three simple plans. Start free and upgrade whenever you're ready!

## 🆓 Free Plan — $0/month

Perfect for trying things out or personal projects.

**What you get:**
- 1 project to work on
- Create 10 AI designs per month
- Basic templates to get started
- 100MB of file storage (enough for lots of images!)

**Best for:** Individuals just getting started or testing the platform.

## ⭐ Pro Plan — $29/month

Our most popular choice! Great for freelancers and small businesses.

**What you get:**
- Unlimited projects — create as many as you need
- 500 AI designs per month
- All our premium templates
- Priority support (we respond faster!)
- Up to 5 team members
- Use your own website address
- 10GB of storage

**Best for:** Freelancers, small business owners, and growing teams.

## 🏢 Business Plan — $99/month

For agencies and larger teams who need the full power.

**What you get:**
- Everything in Pro, plus...
- Unlimited AI designs
- Remove our branding completely
- A dedicated person to help you
- Unlimited team members
- Extra security features
- 100GB of storage

**Best for:** Agencies, enterprises, and teams with big ambitions.

## Common Questions

**Can I change plans later?**
Absolutely! Upgrade or downgrade anytime. We'll adjust your bill automatically.

**Is there a free trial for Pro?**
Yes! You get 14 days free to try Pro before paying.

**What if I need help choosing?**
Just reach out — we're happy to help you find the right fit!`,
      },
    ],
  },
  {
    id: "web-builder",
    title: "Website Builder",
    icon: Layout,
    description: "Create beautiful websites easily",
    image: "https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=400&h=200&fit=crop",
    articles: [
      {
        id: "web-builder-intro",
        title: "Building Your First Website",
        image: "https://images.unsplash.com/photo-1547658719-da2b51169166?w=600&h=300&fit=crop",
        content: `# Build a Website in Minutes! 🌐

No coding needed. No technical skills required. If you can use a word processor, you can build a website!

## How It Works

**1. Pick a Starting Point**
Choose from our ready-made templates. They're professionally designed, so you already look great!

**2. Make It Yours**
Click on any text to change it. Click on images to swap them out. Drag things around until you love it.

**3. Preview & Publish**
See exactly how your site looks on phones and computers. When you're happy, hit publish!

## Step-by-Step: Your First Website

**Step 1: Open Web Builder**
From the home page, click the "Website Builder" card.

**Step 2: Choose a Template**
Browse the templates. See one you like? Click it!
- Business templates for companies
- Portfolio templates for creatives
- Simple templates for personal sites

**Step 3: Edit the Text**
Click on any text on the page. A box appears where you can type your own words.

**Step 4: Change Images**
Click on any image. You can:
- Upload your own photos
- Choose from our free image library
- Use AI to generate images!

**Step 5: Preview**
Click the "Preview" button to see your site. Check how it looks on:
- Desktop computers
- Tablets
- Mobile phones

**Step 6: Publish!**
Happy with it? Click "Publish" and your website is live!

## Tips for a Great Website 💡

**Less is more**: Don't crowd your pages. Give things room to breathe.

**Use quality images**: Blurry photos make your site look unprofessional.

**Keep text short**: Most visitors skim. Use short paragraphs and bullet points.

**Test on your phone**: More than half of visitors will see your site on mobile!`,
      },
      {
        id: "ai-page-generator",
        title: "Let AI Design For You",
        image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&h=300&fit=crop",
        content: `# AI-Powered Design Magic ✨

Not sure where to start? Just tell our AI what you want, and it'll create a page for you!

## How Simple Is It?

Really simple. Here's all you do:

1. **Describe what you need** — Type something like "A homepage for my bakery with photos of our pastries"

2. **Click Generate** — Wait a few seconds while the magic happens

3. **Customize it** — The AI gives you a starting point. Tweak it to make it perfect!

## What to Include in Your Description

The more details you give, the better the results. Try including:

- **What your business does**: "I sell handmade jewelry"
- **The style you want**: "Modern and clean" or "Warm and cozy"
- **Key sections**: "Include a gallery, about section, and contact form"
- **Your colors**: "Use blue and white" (optional — AI can choose for you!)

## Example Prompts That Work Great

**For a restaurant:**
"Create a restaurant homepage with our menu, photos of food, location map, and a reservation button. Warm, inviting colors."

**For a portfolio:**
"Design a portfolio page for a photographer. Include a gallery grid, about me section, and contact info. Minimal and elegant."

**For a service business:**
"Build a landing page for a house cleaning service. Show our services, pricing, customer reviews, and a booking button."

## Good to Know 💡

**You can always edit**: AI gives you a head start. You're in control of the final result.

**Try different descriptions**: Not happy? Generate again with different words.

**It counts toward your plan**: Each generation uses one of your monthly AI credits.`,
      },
      {
        id: "creatives-gallery",
        title: "Your Creative Assets",
        image: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600&h=300&fit=crop",
        content: `# All Your Creative Files in One Place 🎨

The Creatives Gallery is like a digital filing cabinet for all your visual stuff — images, designs, templates, and more.

## What Goes Here?

Everything visual that you create or upload:

- **Photos** — Pictures for your website, social media, etc.
- **Graphics** — Logos, icons, banners you've designed
- **Templates** — Page designs you want to reuse
- **Documents** — PDFs, presentations, reports

## How to Stay Organized

**Create Folders**
Just like on your computer! Make folders like:
- "Website Images"
- "Social Media Posts"
- "Client Logos"

**Add Favorites**
See a file you use often? Click the star to favorite it. Favorites appear at the top so you can find them quickly.

**Use the Search**
Can't remember where you put something? Just type in the search box. We'll find it for you.

## Uploading Files

**Drag and Drop**
The easiest way! Just drag files from your computer and drop them in the gallery.

**Click to Browse**
Click the upload button and select files from your computer.

**Upload Many at Once**
Select multiple files and upload them all together. No need to do one at a time!

## Sharing With Others

Need to share a file with a teammate?
1. Click on the file
2. Click "Share"
3. Copy the link and send it

That's it! They can view or download it.`,
      },
    ],
  },
  {
    id: "design-studio",
    title: "Design Studio",
    icon: Palette,
    description: "Create graphics like a pro",
    image: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=200&fit=crop",
    articles: [
      {
        id: "design-studio-overview",
        title: "Creating Beautiful Designs",
        image: "https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=600&h=300&fit=crop",
        content: `# Design Like a Pro — No Experience Needed! 🎨

The Design Studio helps you create professional graphics for anything — social media, business cards, flyers, presentations, and more.

## What Can You Create?

**Social Media Posts**
Perfect-sized images for Instagram, Facebook, Twitter, LinkedIn — you name it!

**Business Materials**
Business cards, letterheads, envelopes — look professional in print.

**Marketing Materials**
Flyers, posters, brochures, banners — grab attention!

**Presentations**
Slides that impress your audience.

## Getting Started

**Step 1: Pick What You're Making**
Click "New Design" and choose:
- Social media post
- Business card
- Flyer
- Custom size

**Step 2: Start with a Template (Recommended!)**
Browse our templates for inspiration. Click one to start with a professional design.

**Step 3: Make It Yours**
- Click text to edit words
- Click images to replace them
- Drag elements to move them around
- Use the color picker to change colors

**Step 4: Download or Share**
When you're done:
- Download as an image file (JPG, PNG)
- Share directly to social media
- Save to use later

## Design Tips for Beginners 💡

**Stick to 2-3 colors**: Too many colors look messy. Keep it simple.

**Use big, bold text for headlines**: People should be able to read it at a glance.

**Leave white space**: Don't fill every inch. Empty space makes things easier to read.

**Align everything**: Keep text and images lined up for a clean look.`,
      },
      {
        id: "canvas-editor",
        title: "Using the Canvas Editor",
        image: "https://images.unsplash.com/photo-1626785774573-4b799315345d?w=600&h=300&fit=crop",
        content: `# The Canvas Editor — Your Creative Playground 🖌️

The canvas is where the magic happens. It's like a digital piece of paper where you can add and arrange anything.

## What You'll See

**The Canvas (Center)**
This is your workspace — the white area where you create your design.

**The Toolbar (Top)**
Buttons for all the tools: add text, shapes, images, undo mistakes.

**The Side Panel (Right)**
Options for whatever you've selected. Click a shape? See options to change its color.

## Basic Actions

**Adding Text**
1. Click the "Text" button in the toolbar
2. Click where you want the text
3. Start typing!

**Adding Shapes**
1. Click the "Shapes" button
2. Pick a shape (rectangle, circle, star, etc.)
3. Click and drag on the canvas to draw it

**Adding Images**
1. Click "Image" in the toolbar
2. Upload your own or browse our library
3. Click to place it on the canvas

**Moving Things**
Click on anything to select it, then drag it wherever you want.

**Resizing**
Click to select, then drag the corner handles to make it bigger or smaller.

## Undo Mistakes

Made an error? No problem!
- Press **Ctrl + Z** (or Cmd + Z on Mac) to undo
- Press it multiple times to undo several steps

## Saving Your Work

Your work saves automatically! But you can also:
- Click "Save" anytime to be sure
- Click "Download" to get a copy on your computer

## Helpful Shortcuts

- **Ctrl + C** = Copy
- **Ctrl + V** = Paste
- **Ctrl + Z** = Undo
- **Delete key** = Remove selected item`,
      },
    ],
  },
  {
    id: "crm",
    title: "CRM & Pipeline",
    icon: Users,
    description: "Manage your contacts and sales",
    image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=200&fit=crop",
    articles: [
      {
        id: "crm-overview",
        title: "What is CRM?",
        image: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=600&h=300&fit=crop",
        content: `# Your Customer Relationship Manager 👥

CRM stands for "Customer Relationship Management" — but think of it as your digital address book on steroids!

## What Does It Do?

**Keeps All Your Contacts in One Place**
No more scattered spreadsheets, sticky notes, or lost business cards. Everyone you do business with is right here.

**Tracks Your Conversations**
Remember when you last talked to someone and what you discussed. Never awkwardly ask "Did I already call you?"

**Helps You Follow Up**
Get reminders to reach out to people. Never let a potential customer slip through the cracks.

**Shows Your Sales Progress**
See how many deals you're working on and how close they are to closing.

## The Main Parts

**📇 Contacts**
All the people you know — customers, prospects, partners. Store their info and notes about them.

**🎯 Leads**
People who might become customers. Track them from "just interested" to "ready to buy."

**📊 Pipeline**
A visual board showing where each deal is in your sales process.

## Getting Started

1. **Add your first contact** — Click "Add Contact" and enter their name and email
2. **Add notes** — Write down what you know about them
3. **Set a follow-up** — Schedule when you'll reach out next

## Why Bother?

Without a CRM, it's easy to forget to follow up with people. With it:
- You close more deals
- Customers feel remembered and valued
- Your business grows!

## Don't Be Intimidated! 💡

Start simple. Just add a few contacts. The more you use it, the more valuable it becomes.`,
      },
      {
        id: "leads-management",
        title: "Turning Leads into Customers",
        image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=300&fit=crop",
        content: `# From "Maybe" to "Yes!" — Managing Your Leads 🎯

A lead is anyone who might buy from you. Maybe they filled out a form on your website, or you met them at a networking event. Here's how to turn them into happy customers!

## The Journey of a Lead

**1. They Show Interest**
Someone visits your website, downloads something, or reaches out. They're curious!

**2. You Reach Out**
Send them an email, give them a call, or connect on social media.

**3. You Learn About Them**
Find out what they need and if you can help them.

**4. You Make an Offer**
Share your pricing or proposal with them.

**5. They Say Yes! 🎉**
Congratulations — they're now a customer!

## How to Track Leads

**Add a New Lead**
1. Click "Add Lead" 
2. Enter their name and how they found you
3. Add any notes from your conversation

**Update Their Status**
As you talk to them, update where they are:
- **New** — Just added, haven't talked yet
- **Contacted** — You've reached out
- **Interested** — They're engaged
- **Proposal Sent** — Ball's in their court
- **Won** — They said yes! 🎉
- **Lost** — Not this time (that's okay!)

## Tips for Success 💡

**Follow up fast**: People are most interested right after they reach out. Don't wait!

**Take notes**: Write down what you discussed. You'll thank yourself later.

**Be helpful, not pushy**: People buy when they feel understood, not pressured.

**Don't give up too soon**: Sometimes people need 5+ touches before they're ready.

## Good News

Even if someone says "no," they might say "yes" later. Keep them in your system!`,
      },
      {
        id: "business-settings",
        title: "Setting Up Your Business",
        image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=300&fit=crop",
        content: `# Get Your Business Settings Right ⚙️

Take a few minutes to set up your business profile. It helps everything work better and look more professional!

## Your Business Profile

**Add Your Company Info**
- Your business name — appears on documents and emails
- Your logo — looks great on everything you create!
- Contact details — phone, email, address

## Notifications — Stay in the Loop

Choose what you want to be notified about:

**Email Alerts**
- New lead comes in ✉️
- Task is due soon ⏰
- Deal status changes 📈

**You Decide the Frequency**
- Instant — get alerts right away
- Daily digest — one email per day
- Weekly summary — once a week overview

## Team Settings (If You Have a Team)

**Adding Team Members**
1. Click "Invite Team Member"
2. Enter their email
3. Choose what they can access

**Who Sees What**
You control who can:
- View contacts
- Edit projects
- Access billing

## Connecting Other Apps

Make Unison Tasks work with tools you already use:

- **Email**: Connect Gmail or Outlook to send emails directly
- **Calendar**: Sync with Google Calendar or Outlook
- **Payment**: Connect Stripe to accept payments

## Quick Setup Checklist ✅

- [ ] Added company name
- [ ] Uploaded logo
- [ ] Set up email notifications
- [ ] Invited team members (if applicable)
- [ ] Connected email account`,
      },
    ],
  },
  {
    id: "planning",
    title: "Task Planning",
    icon: Workflow,
    description: "Stay organized and on track",
    image: "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=400&h=200&fit=crop",
    articles: [
      {
        id: "task-planning-guide",
        title: "Staying Organized",
        image: "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=600&h=300&fit=crop",
        content: `# Never Forget a Task Again! ✅

The Task Planner helps you keep track of everything you need to do. No more mental juggling — just clear, organized lists.

## Three Ways to View Your Tasks

**📅 Calendar View**
See your tasks on a calendar. Great for planning your week ahead.

**📝 List View**
A simple list of everything. Easy to scan and check things off.

**📋 Board View (Kanban)**
Drag cards between columns like "To Do," "In Progress," and "Done." Very satisfying!

## Creating a Task

1. Click **"Add Task"**
2. Write what you need to do (keep it specific!)
3. Pick a due date (when does it need to be done?)
4. Set a priority:
   - 🔴 High — Do this first!
   - 🟡 Medium — Important but not urgent
   - 🟢 Low — Nice to do when you have time
5. Click **Save**

## Moving Tasks Along

When you start working on something:
- Change status to **"In Progress"**

When you finish:
- Mark it **"Complete"** — enjoy that checkmark! ✅

## Tips for Staying on Top of Things 💡

**Write everything down**: If it's in your head, it should be in your list.

**Be specific**: "Work on website" is vague. "Write homepage headline" is clear.

**Review daily**: Spend 5 minutes each morning looking at what's due.

**Celebrate wins**: Checking things off feels good. Enjoy it!

## What About Big Projects?

Break them into smaller pieces! Instead of:
- "Launch new product" ❌

Try:
- "Write product description" ✅
- "Take product photos" ✅
- "Set up product page" ✅
- "Test checkout process" ✅

Small steps = steady progress!`,
      },
    ],
  },
  {
    id: "cloud",
    title: "Cloud Dashboard",
    icon: Cloud,
    description: "Your account and settings",
    image: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400&h=200&fit=crop",
    articles: [
      {
        id: "cloud-dashboard-guide",
        title: "Your Cloud Dashboard",
        image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&h=300&fit=crop",
        content: `# Your Account Headquarters ☁️

The Cloud Dashboard is where you manage your account, settings, and connected services. Think of it as your control panel.

## What's Here?

**👤 Your Profile**
Update your name, photo, password, and notification preferences.

**🏢 Your Businesses**
If you work with multiple companies or brands, switch between them here.

**📁 Your Projects**
See all your websites and projects in one list.

**🖼️ Your Assets**
Quick access to your uploaded images and files.

**📧 Email Settings**
Set up your email to send messages directly from Unison Tasks.

**🔌 Connected Apps**
See what other services are connected to your account.

## Managing Your Profile

**To update your information:**
1. Click on your name/photo in the corner
2. Click "Profile"
3. Edit whatever you need
4. Click "Save"

**To change your password:**
1. Go to Profile
2. Click "Change Password"
3. Enter your current password
4. Enter your new password (twice)
5. Click "Update"

## Keeping Your Account Secure 🔒

We take security seriously! Here's how to stay safe:

**Use a strong password**: Mix letters, numbers, and symbols.

**Turn on two-factor authentication**: Get a code on your phone when you log in.

**Review your sessions**: See where you're logged in and log out remotely if needed.

## Need Help?

From the Cloud Dashboard, you can also:
- Access our help center
- Contact support
- Check your subscription status
- View your billing history`,
      },
    ],
  },
  {
    id: "files",
    title: "File Management",
    icon: FolderOpen,
    description: "Store and organize your files",
    image: "https://images.unsplash.com/photo-1544396821-4dd40b938ad3?w=400&h=200&fit=crop",
    articles: [
      {
        id: "files-guide",
        title: "Organizing Your Files",
        image: "https://images.unsplash.com/photo-1618044619888-009e412ff12a?w=600&h=300&fit=crop",
        content: `# Your Files, Safe and Organized 📁

Upload, store, and organize all your important files. Access them from anywhere!

## How to Upload Files

**The Easy Way: Drag and Drop**
1. Open the Files section
2. Drag files from your computer
3. Drop them in the window
4. Done!

**The Classic Way: Click to Browse**
1. Click the "Upload" button
2. Select files from your computer
3. Click "Open"

**Upload Many at Once**
Select multiple files (hold Ctrl/Cmd and click) and upload them all together!

## Keeping Things Organized

**Create Folders**
1. Click "New Folder"
2. Give it a name (like "Receipts 2024" or "Client Logos")
3. Click "Create"

**Move Files to Folders**
1. Click on a file to select it
2. Click "Move"
3. Choose the destination folder
4. Click "Move Here"

**Find Files Fast**
Use the search box! Type any part of a file name and watch results appear.

## Sharing Files

Need someone else to see a file?

1. Click on the file
2. Click "Share" 
3. Copy the link
4. Send it to them via email or message

They can view or download without needing an account!

## How Much Space Do You Have?

| Your Plan | Storage Space |
|-----------|---------------|
| Free | 100 MB |
| Pro | 10 GB |
| Business | 100 GB |

Running low? You can upgrade anytime or delete files you no longer need.

## File Tips 💡

**Use clear names**: "logo-final-v2.png" beats "IMG_39281.png"

**Create a folder system**: Organize by project, client, or date — whatever makes sense for you

**Clean up regularly**: Delete old files you don't need anymore`,
      },
    ],
  },
];

export const quickLinks = [
  { title: "Welcome Guide", sectionId: "getting-started", articleId: "platform-overview" },
  { title: "Build a Website", sectionId: "web-builder", articleId: "web-builder-intro" },
  { title: "Customer Manager", sectionId: "crm", articleId: "crm-overview" },
  { title: "Cloud Settings", sectionId: "cloud", articleId: "cloud-dashboard-guide" },
  { title: "Design Graphics", sectionId: "design-studio", articleId: "design-studio-overview" },
  { title: "Your Files", sectionId: "files", articleId: "files-guide" },
];
