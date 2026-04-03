import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      prompt, 
      type, 
      features = [], 
      database = true, 
      authentication = false,
      framework = 'react',
      includeBackend = true,
      sampleData = true,
      colorScheme = 'light',
      brandColors
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ 
          error: "AI features are not available. Please deploy to Lovable Cloud.",
          isLocalDevelopment: true
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are an ELITE Full-Stack Application Generator AI. You create COMPLETE, PRODUCTION-READY applications including database schema, backend APIs, and interactive frontends.

🎯 **GENERATION MODE: ${type.toUpperCase()}**

You will generate a COMPREHENSIVE application with:

1. **DATABASE SCHEMA** (if enabled)
   - Proper table design with relationships
   - Primary keys, foreign keys, indexes
   - Row-level security policies
   - Sample data for testing

2. **BACKEND API** (if enabled)
   - RESTful endpoints
   - CRUD operations
   - Authentication & authorization
   - Business logic validation
   - Error handling

3. **FRONTEND APPLICATION**
   - React components (or vanilla JS for ${framework})
   - Interactive UI with Tailwind CSS
   - Form validation
   - Data fetching and state management
   - Real-time updates
   - Responsive design

4. **INTEGRATION**
   - Connect frontend to backend
   - Mock data for live preview
   - Proper error handling
   - Loading states

**CRITICAL GENERATION RULES:**

**FOR DASHBOARD TYPE:**
- Create analytics cards with charts
- Data tables with sorting/filtering
- Sidebar navigation
- User profile section
- Recent activity feed
- Stats overview

**FOR CRM TYPE:**
- Contacts/Leads management
- Pipeline visualization (Kanban)
- Activity timeline
- Email integration UI
- Task management
- Search and filters

**FOR SETTINGS TYPE:**
- Tabbed interface
- Form sections (Profile, Security, Notifications, Billing)
- Toggle switches and dropdowns
- Save/Cancel actions
- Validation feedback
- Success messages

**FOR ADMIN TYPE:**
- User management table
- Role/permission matrix
- System logs viewer
- Configuration editor
- Audit trail
- Bulk actions

**DATABASE SCHEMA EXAMPLE:**
\`\`\`json
{
  "schema": [
    {
      "name": "users",
      "description": "User accounts",
      "fields": [
        { "name": "id", "type": "uuid", "required": true },
        { "name": "email", "type": "text", "required": true, "unique": true },
        { "name": "full_name", "type": "text", "required": true },
        { "name": "role", "type": "text", "required": true, "defaultValue": "user" },
        { "name": "created_at", "type": "timestamp", "required": true }
      ],
      "policies": [
        {
          "name": "Users can view own profile",
          "operation": "SELECT",
          "using": "auth.uid() = id"
        }
      ]
    },
    {
      "name": "projects",
      "description": "User projects",
      "fields": [
        { "name": "id", "type": "uuid", "required": true },
        { "name": "user_id", "type": "uuid", "required": true, 
          "foreignKey": { "table": "users", "field": "id", "onDelete": "CASCADE" } },
        { "name": "title", "type": "text", "required": true },
        { "name": "status", "type": "text", "required": true },
        { "name": "created_at", "type": "timestamp", "required": true }
      ]
    }
  ],
  "relationships": [
    {
      "type": "one-to-many",
      "from": { "table": "users", "field": "id" },
      "to": { "table": "projects", "field": "user_id" }
    }
  ]
}
\`\`\`

**BACKEND API EXAMPLE:**
\`\`\`json
{
  "endpoints": [
    {
      "path": "/api/projects",
      "method": "GET",
      "description": "List all projects for authenticated user",
      "protected": true,
      "handler": "async (req, res) => { const userId = req.user.id; const { data } = await supabase.from('projects').select('*').eq('user_id', userId); return res.json(data); }"
    },
    {
      "path": "/api/projects",
      "method": "POST",
      "description": "Create new project",
      "protected": true,
      "validation": { "body": { "title": "required|string", "status": "required|string" } },
      "handler": "async (req, res) => { const { title, status } = req.body; const { data } = await supabase.from('projects').insert({ user_id: req.user.id, title, status }).select().single(); return res.json(data); }"
    }
  ]
}
\`\`\`

**FRONTEND COMPONENT EXAMPLE:**
\`\`\`typescript
import { useState, useEffect } from 'react';

interface Project {
  id: string;
  title: string;
  status: string;
  created_at: string;
}

export default function ProjectDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      // In preview, use mock data
      const mockProjects = [
        { id: '1', title: 'Website Redesign', status: 'active', created_at: new Date().toISOString() },
        { id: '2', title: 'Mobile App', status: 'planning', created_at: new Date().toISOString() },
      ];
      setProjects(mockProjects);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Dashboard UI */}
    </div>
  );
}
\`\`\`

**OUTPUT FORMAT:**

You MUST return a valid JSON object with this EXACT structure:

\`\`\`json
{
  "config": {
    "id": "unique-id",
    "name": "Application Name",
    "description": "What this app does",
    "type": "${type}",
    "database": { ... database config ... },
    "backend": { ... backend config ... },
    "frontend": { ... frontend config ... },
    "auth": { ... auth config if enabled ... },
    "features": [ ... list of features ... ],
    "metadata": {
      "created_at": "ISO timestamp",
      "version": "1.0.0"
    }
  },
  "files": [
    {
      "path": "src/App.tsx",
      "content": "... complete file content ...",
      "type": "typescript",
      "description": "Main application component"
    },
    {
      "path": "supabase/migrations/001_initial_schema.sql",
      "content": "... SQL migration ...",
      "type": "sql",
      "description": "Database schema"
    }
  ],
  "preview": {
    "entryPoint": "src/App.tsx",
    "htmlBundle": "<!DOCTYPE html>... complete HTML for live preview ...",
    "mockData": { ... sample data for preview ... },
    "supportsLiveEdit": true
  },
  "instructions": [
    "1. Run the SQL migration to create database tables",
    "2. Deploy the Edge Functions",
    "3. Install dependencies: npm install",
    "4. Run the app: npm run dev"
  ]
}
\`\`\`

**PREVIEW HTML BUNDLE REQUIREMENTS:**

The htmlBundle MUST be a complete, self-contained HTML document that:
1. Includes Tailwind CSS via CDN
2. Includes React via CDN (if using React)
3. Contains all components inline
4. Uses mock data for preview (no real API calls)
5. Is immediately executable in an iframe
6. Has NO external dependencies

Example structure:
\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${type} Dashboard</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</head>
<body>
  <div id="root"></div>
  
  <script type="text/babel">
    const { useState, useEffect } = React;
    
    // Mock data
    const mockData = ${JSON.stringify(sampleData ? 'GENERATE_SAMPLE_DATA_HERE' : '{}')};
    
    // Main App Component
    function App() {
      // Component code here
      return (
        <div className="min-h-screen bg-gray-50">
          {/* UI here */}
        </div>
      );
    }
    
    ReactDOM.render(<App />, document.getElementById('root'));
  </script>
</body>
</html>
\`\`\`

${features.length > 0 ? `
**REQUESTED FEATURES:**
${features.map((f: string) => `- ${f}`).join('\n')}
` : ''}

${brandColors ? `
**BRAND COLORS:**
- Primary: ${brandColors.primary}
- Secondary: ${brandColors.secondary}
${brandColors.accent ? `- Accent: ${brandColors.accent}` : ''}
` : ''}

**USER PROMPT:**
${prompt}

Generate a COMPLETE, PRODUCTION-READY application now. Include ALL components, pages, database schema, and API endpoints. Make it beautiful, functional, and immediately usable.`;

    console.log('[Full-Stack Generator] Generating application:', { type, features, database, authentication });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    let generatedApp;
    try {
      generatedApp = JSON.parse(content);
    } catch (e) {
      console.error('[Full-Stack Generator] Failed to parse JSON response:', e);
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Save generation pattern for learning
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    await supabase.from('ai_code_patterns').insert({
      pattern_type: `fullstack_${type}`,
      description: `Full-stack ${type} application`,
      code_snippet: JSON.stringify(generatedApp.config),
      tags: [type, 'fullstack', ...features],
      usage_count: 1,
      success_rate: 100
    });

    console.log('[Full-Stack Generator] Application generated successfully');

    return new Response(
      JSON.stringify(generatedApp),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('[Full-Stack Generator] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
