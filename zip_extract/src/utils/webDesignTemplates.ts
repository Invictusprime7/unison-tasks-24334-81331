/**
 * Robust coded templates for Web Design Kit
 * Each template is production-ready with modern design patterns
 */

export interface TemplateInfo {
  name: string;
  aesthetic: string;
  preview: string;
  category: 'google' | 'canva' | 'ai';
  code: string;
}

export const webDesignTemplates: Record<string, TemplateInfo> = {
  // Google Templates
  'material-design-dashboard': {
    name: 'Material Design Dashboard',
    aesthetic: 'Modern, Clean',
    preview: '🎨',
    category: 'google',
    code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Material Design Dashboard</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    .material-shadow { box-shadow: 0 2px 4px rgba(0,0,0,0.1), 0 8px 16px rgba(0,0,0,0.1); }
    .material-card { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
    .material-card:hover { box-shadow: 0 4px 8px rgba(0,0,0,0.12), 0 16px 32px rgba(0,0,0,0.12); transform: translateY(-2px); }
    .ripple { position: relative; overflow: hidden; }
    .ripple::before { content: ''; position: absolute; top: 50%; left: 50%; width: 0; height: 0; border-radius: 50%; background: rgba(255,255,255,0.5); transition: width 0.6s, height 0.6s, top 0.6s, left 0.6s; }
    .ripple:active::before { width: 300px; height: 300px; top: calc(50% - 150px); left: calc(50% - 150px); }
  </style>
</head>
<body class="bg-gray-50 font-sans">
  <!-- Header -->
  <header class="bg-white material-shadow sticky top-0 z-50">
    <div class="flex items-center justify-between px-6 py-4">
      <div class="flex items-center space-x-4">
        <div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
          </svg>
        </div>
        <h1 class="text-xl font-medium text-gray-900">Material Dashboard</h1>
      </div>
      <div class="flex items-center space-x-4">
        <button class="ripple p-2 rounded-full hover:bg-gray-100">
          <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-5 5v-5z"></path>
          </svg>
        </button>
        <div class="w-8 h-8 bg-blue-500 rounded-full"></div>
      </div>
    </div>
  </header>

  <!-- Main Content -->
  <div class="flex">
    <!-- Sidebar -->
    <nav class="w-64 bg-white material-shadow h-screen sticky top-16">
      <div class="p-4">
        <ul class="space-y-2">
          <li><a href="#" class="flex items-center space-x-3 p-3 rounded-lg bg-blue-50 text-blue-700 font-medium">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"></path></svg>
            <span>Dashboard</span>
          </a></li>
          <li><a href="#" class="flex items-center space-x-3 p-3 rounded-lg text-gray-700 hover:bg-gray-50">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <span>Analytics</span>
          </a></li>
          <li><a href="#" class="flex items-center space-x-3 p-3 rounded-lg text-gray-700 hover:bg-gray-50">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"></path></svg>
            <span>Users</span>
          </a></li>
        </ul>
      </div>
    </nav>

    <!-- Content Area -->
    <main class="flex-1 p-6">
      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div class="material-card bg-white rounded-lg p-6 cursor-pointer">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Total Users</p>
              <p class="text-2xl font-bold text-gray-900">2,651</p>
              <p class="text-sm text-green-600">+12.5% from last month</p>
            </div>
            <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <svg class="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"></path>
              </svg>
            </div>
          </div>
        </div>
        <div class="material-card bg-white rounded-lg p-6 cursor-pointer">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Revenue</p>
              <p class="text-2xl font-bold text-gray-900">$45,231</p>
              <p class="text-sm text-green-600">+8.2% from last month</p>
            </div>
            <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <svg class="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z"></path>
              </svg>
            </div>
          </div>
        </div>
        <div class="material-card bg-white rounded-lg p-6 cursor-pointer">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Orders</p>
              <p class="text-2xl font-bold text-gray-900">1,423</p>
              <p class="text-sm text-red-600">-3.1% from last month</p>
            </div>
            <div class="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <svg class="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 2L3 7v11a1 1 0 001 1h12a1 1 0 001-1V7l-7-5zM6 9a1 1 0 112 0 1 1 0 01-2 0zm6 0a1 1 0 112 0 1 1 0 01-2 0z" clip-rule="evenodd"></path>
              </svg>
            </div>
          </div>
        </div>
        <div class="material-card bg-white rounded-lg p-6 cursor-pointer">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Growth</p>
              <p class="text-2xl font-bold text-gray-900">23.1%</p>
              <p class="text-sm text-green-600">+5.4% from last month</p>
            </div>
            <div class="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <svg class="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clip-rule="evenodd"></path>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Charts Section -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="material-card bg-white rounded-lg p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Activity Overview</h3>
          <div class="h-64 bg-gradient-to-t from-blue-50 to-white rounded-lg flex items-end justify-center">
            <div class="flex items-end space-x-2 h-48">
              <div class="w-8 bg-blue-500 rounded-t" style="height: 60%"></div>
              <div class="w-8 bg-blue-400 rounded-t" style="height: 80%"></div>
              <div class="w-8 bg-blue-500 rounded-t" style="height: 45%"></div>
              <div class="w-8 bg-blue-600 rounded-t" style="height: 90%"></div>
              <div class="w-8 bg-blue-400 rounded-t" style="height: 70%"></div>
              <div class="w-8 bg-blue-500 rounded-t" style="height: 85%"></div>
              <div class="w-8 bg-blue-400 rounded-t" style="height: 65%"></div>
            </div>
          </div>
        </div>
        
        <div class="material-card bg-white rounded-lg p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div class="space-y-4">
            <div class="flex items-center space-x-3">
              <div class="w-2 h-2 bg-green-500 rounded-full"></div>
              <div class="flex-1">
                <p class="text-sm font-medium text-gray-900">New user registered</p>
                <p class="text-xs text-gray-500">2 minutes ago</p>
              </div>
            </div>
            <div class="flex items-center space-x-3">
              <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div class="flex-1">
                <p class="text-sm font-medium text-gray-900">Order #1234 completed</p>
                <p class="text-xs text-gray-500">5 minutes ago</p>
              </div>
            </div>
            <div class="flex items-center space-x-3">
              <div class="w-2 h-2 bg-purple-500 rounded-full"></div>
              <div class="flex-1">
                <p class="text-sm font-medium text-gray-900">Payment received</p>
                <p class="text-xs text-gray-500">12 minutes ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>

  <script>
    // Material Design interactions
    document.addEventListener('DOMContentLoaded', function() {
      // Add click animations to cards
      const cards = document.querySelectorAll('.material-card');
      cards.forEach(card => {
        card.addEventListener('click', function() {
          this.style.transform = 'scale(0.98)';
          setTimeout(() => {
            this.style.transform = '';
          }, 150);
        });
      });
    });
  </script>
</body>
</html>`
  },

  'google-workspace-ui': {
    name: 'Google Workspace UI',
    aesthetic: 'Professional, Minimal',
    preview: '💼',
    category: 'google',
    code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Google Workspace UI</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    .google-shadow { box-shadow: 0 1px 2px 0 rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15); }
    .google-button { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
    .google-button:hover { box-shadow: 0 2px 4px rgba(60,64,67,0.3), 0 1px 6px rgba(60,64,67,0.15); }
    .google-focus:focus { outline: 2px solid #4285f4; outline-offset: 2px; }
  </style>
</head>
<body class="bg-white font-sans">
  <!-- Header -->
  <header class="border-b border-gray-200">
    <div class="flex items-center justify-between px-6 py-3">
      <div class="flex items-center space-x-6">
        <div class="flex items-center space-x-3">
          <div class="w-8 h-8 flex items-center justify-center">
            <svg viewBox="0 0 24 24" class="w-6 h-6 text-blue-600" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            </svg>
          </div>
          <h1 class="text-xl text-gray-700">Workspace</h1>
        </div>
        <nav class="hidden md:flex space-x-6">
          <a href="#" class="text-sm text-blue-600 font-medium border-b-2 border-blue-600 pb-3">Home</a>
          <a href="#" class="text-sm text-gray-600 hover:text-gray-900 pb-3">Mail</a>
          <a href="#" class="text-sm text-gray-600 hover:text-gray-900 pb-3">Drive</a>
          <a href="#" class="text-sm text-gray-600 hover:text-gray-900 pb-3">Calendar</a>
          <a href="#" class="text-sm text-gray-600 hover:text-gray-900 pb-3">Meet</a>
        </nav>
      </div>
      <div class="flex items-center space-x-4">
        <button class="google-button google-focus p-2 rounded-full hover:bg-gray-100">
          <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-5 5v-5z"></path>
          </svg>
        </button>
        <button class="google-button google-focus p-2 rounded-full hover:bg-gray-100">
          <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707"></path>
          </svg>
        </button>
        <div class="w-8 h-8 bg-blue-500 rounded-full cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all"></div>
      </div>
    </div>
  </header>

  <!-- Main Content -->
  <main class="max-w-7xl mx-auto py-8 px-6">
    <!-- Welcome Section -->
    <div class="text-center mb-12">
      <h2 class="text-3xl font-normal text-gray-900 mb-4">Good afternoon, Sarah</h2>
      <p class="text-gray-600">Here's what's happening with your workspace today</p>
    </div>

    <!-- Quick Actions -->
    <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-12">
      <div class="google-button google-shadow bg-white rounded-lg p-4 text-center cursor-pointer hover:shadow-lg">
        <div class="w-12 h-12 bg-blue-100 rounded-full mx-auto mb-3 flex items-center justify-center">
          <svg class="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
          </svg>
        </div>
        <p class="text-sm font-medium text-gray-900">Docs</p>
      </div>
      <div class="google-button google-shadow bg-white rounded-lg p-4 text-center cursor-pointer hover:shadow-lg">
        <div class="w-12 h-12 bg-green-100 rounded-full mx-auto mb-3 flex items-center justify-center">
          <svg class="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19,3H5C3.9,3 3,3.9 3,5V19C3,20.1 3.9,21 5,21H19C20.1,21 21,20.1 21,19V5C21,3.9 20.1,3 19,3M19,19H5V5H19V19Z"/>
          </svg>
        </div>
        <p class="text-sm font-medium text-gray-900">Sheets</p>
      </div>
      <div class="google-button google-shadow bg-white rounded-lg p-4 text-center cursor-pointer hover:shadow-lg">
        <div class="w-12 h-12 bg-yellow-100 rounded-full mx-auto mb-3 flex items-center justify-center">
          <svg class="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M21,16V4H3V16H21M21,2A2,2 0 0,1 23,4V16A2,2 0 0,1 21,18H3A2,2 0 0,1 1,16V4A2,2 0 0,1 3,2H21M5,6H19V8H5V6M5,10H14V12H5V10Z"/>
          </svg>
        </div>
        <p class="text-sm font-medium text-gray-900">Slides</p>
      </div>
      <div class="google-button google-shadow bg-white rounded-lg p-4 text-center cursor-pointer hover:shadow-lg">
        <div class="w-12 h-12 bg-blue-100 rounded-full mx-auto mb-3 flex items-center justify-center">
          <svg class="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M10,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V8C22,6.89 21.1,6 20,6H12L10,4Z"/>
          </svg>
        </div>
        <p class="text-sm font-medium text-gray-900">Drive</p>
      </div>
      <div class="google-button google-shadow bg-white rounded-lg p-4 text-center cursor-pointer hover:shadow-lg">
        <div class="w-12 h-12 bg-red-100 rounded-full mx-auto mb-3 flex items-center justify-center">
          <svg class="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20,8L12,13L4,8V6L12,11L20,6M20,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6C22,5.11 21.1,4 20,4Z"/>
          </svg>
        </div>
        <p class="text-sm font-medium text-gray-900">Gmail</p>
      </div>
      <div class="google-button google-shadow bg-white rounded-lg p-4 text-center cursor-pointer hover:shadow-lg">
        <div class="w-12 h-12 bg-green-100 rounded-full mx-auto mb-3 flex items-center justify-center">
          <svg class="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19,19H5V8H19M16,1V3H8V1H6V3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3H18V1M17,12H12V17H17V12Z"/>
          </svg>
        </div>
        <p class="text-sm font-medium text-gray-900">Calendar</p>
      </div>
    </div>

    <!-- Recent Files -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div>
        <h3 class="text-lg font-medium text-gray-900 mb-4">Recent files</h3>
        <div class="space-y-3">
          <div class="google-button flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
            <div class="w-10 h-10 bg-blue-100 rounded flex items-center justify-center flex-shrink-0">
              <svg class="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900 truncate">Q4 Marketing Strategy</p>
              <p class="text-xs text-gray-500">Opened yesterday</p>
            </div>
          </div>
          <div class="google-button flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
            <div class="w-10 h-10 bg-green-100 rounded flex items-center justify-center flex-shrink-0">
              <svg class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19,3H5C3.9,3 3,3.9 3,5V19C3,20.1 3.9,21 5,21H19C20.1,21 21,20.1 21,19V5C21,3.9 20.1,3 19,3M19,19H5V5H19V19Z"/>
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900 truncate">Budget Analysis 2024</p>
              <p class="text-xs text-gray-500">Opened 3 days ago</p>
            </div>
          </div>
          <div class="google-button flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
            <div class="w-10 h-10 bg-yellow-100 rounded flex items-center justify-center flex-shrink-0">
              <svg class="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M21,16V4H3V16H21M21,2A2,2 0 0,1 23,4V16A2,2 0 0,1 21,18H3A2,2 0 0,1 1,16V4A2,2 0 0,1 3,2H21M5,6H19V8H5V6M5,10H14V12H5V10Z"/>
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900 truncate">Team Presentation</p>
              <p class="text-xs text-gray-500">Opened 1 week ago</p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 class="text-lg font-medium text-gray-900 mb-4">Upcoming meetings</h3>
        <div class="space-y-3">
          <div class="google-shadow bg-white rounded-lg p-4">
            <div class="flex items-start space-x-3">
              <div class="text-center flex-shrink-0">
                <p class="text-sm font-medium text-blue-600">2:00 PM</p>
                <p class="text-xs text-gray-500">30 min</p>
              </div>
              <div class="flex-1">
                <p class="text-sm font-medium text-gray-900">Marketing Review</p>
                <p class="text-xs text-gray-500">with John, Sarah, Mike</p>
                <button class="mt-2 text-xs text-blue-600 hover:text-blue-800">Join meeting</button>
              </div>
            </div>
          </div>
          <div class="google-shadow bg-white rounded-lg p-4">
            <div class="flex items-start space-x-3">
              <div class="text-center flex-shrink-0">
                <p class="text-sm font-medium text-green-600">4:30 PM</p>
                <p class="text-xs text-gray-500">60 min</p>
              </div>
              <div class="flex-1">
                <p class="text-sm font-medium text-gray-900">Product Planning</p>
                <p class="text-xs text-gray-500">with Design Team</p>
                <button class="mt-2 text-xs text-blue-600 hover:text-blue-800">Join meeting</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>

  <script>
    document.addEventListener('DOMContentLoaded', function() {
      // Add Google-style interactions
      const buttons = document.querySelectorAll('.google-button');
      buttons.forEach(button => {
        button.addEventListener('mousedown', function() {
          this.style.transform = 'scale(0.98)';
        });
        button.addEventListener('mouseup', function() {
          this.style.transform = '';
        });
        button.addEventListener('mouseleave', function() {
          this.style.transform = '';
        });
      });
    });
  </script>
</body>
</html>`
  },

  'android-app-interface': {
    name: 'Android App Interface',
    aesthetic: 'Mobile-First, Bold',
    preview: '📱',
    category: 'google',
    code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Android App Interface</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    .android-shadow { box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
    .fab { box-shadow: 0 4px 12px rgba(0,0,0,0.15); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
    .fab:hover { box-shadow: 0 6px 16px rgba(0,0,0,0.2); transform: translateY(-2px); }
    .material-ripple { position: relative; overflow: hidden; }
    .material-ripple::after { content: ''; position: absolute; top: 50%; left: 50%; width: 0; height: 0; border-radius: 50%; background: rgba(255,255,255,0.3); transition: width 0.6s, height 0.6s, top 0.6s, left 0.6s; }
    .material-ripple:active::after { width: 200px; height: 200px; top: calc(50% - 100px); left: calc(50% - 100px); }
  </style>
</head>
<body class="bg-gray-100 font-sans">
  <!-- Status Bar -->
  <div class="bg-green-600 text-white text-xs py-1 px-4 flex justify-between items-center">
    <div class="flex items-center space-x-1">
      <span>9:41 AM</span>
    </div>
    <div class="flex items-center space-x-1">
      <span>📶</span>
      <span>📶</span>
      <span>🔋</span>
    </div>
  </div>

  <!-- App Bar -->
  <header class="bg-green-600 android-shadow">
    <div class="flex items-center justify-between px-4 py-3">
      <div class="flex items-center space-x-3">
        <button class="material-ripple p-2 rounded-full hover:bg-green-700">
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
          </svg>
        </button>
        <h1 class="text-xl font-medium text-white">My App</h1>
      </div>
      <div class="flex items-center space-x-2">
        <button class="material-ripple p-2 rounded-full hover:bg-green-700">
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
        </button>
        <button class="material-ripple p-2 rounded-full hover:bg-green-700">
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path>
          </svg>
        </button>
      </div>
    </div>
  </header>

  <!-- Content -->
  <main class="pb-20">
    <!-- Cards List -->
    <div class="p-4 space-y-4">
      <div class="bg-white android-shadow rounded-lg overflow-hidden">
        <div class="p-4">
          <div class="flex items-start space-x-3">
            <div class="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
              <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"></path>
              </svg>
            </div>
            <div class="flex-1">
              <h3 class="font-semibold text-gray-900">John Doe</h3>
              <p class="text-sm text-gray-600">Software Engineer</p>
              <p class="text-sm text-gray-500 mt-1">Online now</p>
            </div>
            <button class="material-ripple p-2 rounded-full hover:bg-gray-100">
              <svg class="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path>
              </svg>
            </button>
          </div>
        </div>
        <div class="border-t border-gray-100 px-4 py-3 flex justify-between">
          <button class="material-ripple flex items-center space-x-2 px-3 py-2 rounded text-blue-600 hover:bg-blue-50">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
            </svg>
            <span class="text-sm font-medium">Message</span>
          </button>
          <button class="material-ripple flex items-center space-x-2 px-3 py-2 rounded text-green-600 hover:bg-green-50">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
            </svg>
            <span class="text-sm font-medium">Call</span>
          </button>
        </div>
      </div>

      <div class="bg-white android-shadow rounded-lg p-4">
        <div class="flex items-center space-x-3 mb-3">
          <div class="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
            <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <div>
            <h3 class="font-semibold text-gray-900">Task Completed</h3>
            <p class="text-sm text-gray-500">2 minutes ago</p>
          </div>
        </div>
        <p class="text-gray-700">Your project review has been completed successfully. Check the results in your dashboard.</p>
      </div>

      <div class="bg-white android-shadow rounded-lg p-4">
        <h3 class="font-semibold text-gray-900 mb-3">Quick Actions</h3>
        <div class="grid grid-cols-2 gap-3">
          <button class="material-ripple flex flex-col items-center p-4 rounded-lg bg-blue-50 hover:bg-blue-100">
            <svg class="w-8 h-8 text-blue-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
            <span class="text-sm font-medium text-blue-900">Add New</span>
          </button>
          <button class="material-ripple flex flex-col items-center p-4 rounded-lg bg-green-50 hover:bg-green-100">
            <svg class="w-8 h-8 text-green-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
            </svg>
            <span class="text-sm font-medium text-green-900">Analytics</span>
          </button>
        </div>
      </div>
    </div>
  </main>

  <!-- Bottom Navigation -->
  <nav class="fixed bottom-0 left-0 right-0 bg-white android-shadow border-t border-gray-200">
    <div class="flex">
      <button class="material-ripple flex-1 flex flex-col items-center py-3 text-green-600">
        <svg class="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path>
        </svg>
        <span class="text-xs font-medium">Home</span>
      </button>
      <button class="material-ripple flex-1 flex flex-col items-center py-3 text-gray-400">
        <svg class="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
        </svg>
        <span class="text-xs font-medium">Search</span>
      </button>
      <button class="material-ripple flex-1 flex flex-col items-center py-3 text-gray-400">
        <svg class="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
        </svg>
        <span class="text-xs font-medium">Favorites</span>
      </button>
      <button class="material-ripple flex-1 flex flex-col items-center py-3 text-gray-400">
        <svg class="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
        </svg>
        <span class="text-xs font-medium">Profile</span>
      </button>
    </div>
  </nav>

  <!-- Floating Action Button -->
  <button class="fab fixed bottom-20 right-4 w-14 h-14 bg-green-600 rounded-full flex items-center justify-center text-white hover:bg-green-700">
    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
    </svg>
  </button>

  <script>
    document.addEventListener('DOMContentLoaded', function() {
      // Material Design ripple effects
      const rippleElements = document.querySelectorAll('.material-ripple');
      
      rippleElements.forEach(element => {
        element.addEventListener('click', function(e) {
          const rect = this.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          
          const ripple = document.createElement('span');
          ripple.style.left = x + 'px';
          ripple.style.top = y + 'px';
          ripple.classList.add('ripple-effect');
          
          this.appendChild(ripple);
          
          setTimeout(() => {
            ripple.remove();
          }, 600);
        });
      });
    });
  </script>
</body>
</html>`
  },

  'creative-portfolio': {
    name: 'Creative Portfolio',
    aesthetic: 'Vibrant, Artistic',
    preview: '🎭',
    category: 'canva',
    code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Creative Portfolio</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { 
      background: linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #fcc468);
      background-size: 400% 400%;
      animation: gradientShift 8s ease infinite;
    }
    @keyframes gradientShift {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    .creative-card {
      backdrop-filter: blur(10px);
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      transition: all 0.3s ease;
    }
    .creative-card:hover {
      transform: translateY(-5px) rotate(2deg);
      background: rgba(255, 255, 255, 0.2);
    }
    .art-frame {
      position: relative;
      overflow: hidden;
      border-radius: 15px;
    }
    .art-frame::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%);
      transform: translateX(-100%);
      transition: transform 0.6s;
    }
    .art-frame:hover::before {
      transform: translateX(100%);
    }
  </style>
</head>
<body class="font-sans text-white min-h-screen">
  <!-- Header -->
  <header class="fixed top-0 left-0 right-0 z-50 creative-card">
    <div class="max-w-6xl mx-auto px-6 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center">
            <span class="text-lg font-bold">A</span>
          </div>
          <h1 class="text-xl font-bold">Alex Creative</h1>
        </div>
        <nav class="hidden md:flex space-x-8">
          <a href="#" class="hover:text-pink-300 transition-colors">Work</a>
          <a href="#" class="hover:text-pink-300 transition-colors">About</a>
          <a href="#" class="hover:text-pink-300 transition-colors">Services</a>
          <a href="#" class="hover:text-pink-300 transition-colors">Contact</a>
        </nav>
        <button class="bg-gradient-to-r from-pink-500 to-purple-500 px-6 py-2 rounded-full font-semibold hover:scale-105 transition-transform">
          Hire Me
        </button>
      </div>
    </div>
  </header>

  <!-- Hero Section -->
  <section class="pt-24 pb-16">
    <div class="max-w-6xl mx-auto px-6 text-center">
      <div class="creative-card rounded-3xl p-12 mb-12">
        <h2 class="text-6xl font-bold mb-6">
          Creative
          <span class="block bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
            Designer
          </span>
        </h2>
        <p class="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
          Bringing imagination to life through bold designs, vibrant colors, and innovative digital experiences.
        </p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <button class="bg-gradient-to-r from-pink-500 to-red-500 px-8 py-3 rounded-full font-semibold hover:scale-105 transition-transform">
            View My Work
          </button>
          <button class="creative-card px-8 py-3 rounded-full font-semibold hover:scale-105 transition-transform">
            Download CV
          </button>
        </div>
      </div>
    </div>
  </section>

  <!-- Portfolio Grid -->
  <section class="py-16">
    <div class="max-w-6xl mx-auto px-6">
      <h3 class="text-4xl font-bold text-center mb-12">Featured Projects</h3>
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <!-- Project 1 -->
        <div class="creative-card rounded-2xl overflow-hidden">
          <div class="art-frame h-48 bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
            <div class="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
              <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
              </svg>
            </div>
          </div>
          <div class="p-6">
            <h4 class="text-xl font-bold mb-2">Brand Identity</h4>
            <p class="text-white/70 mb-4">Complete rebranding for tech startup including logo, colors, and guidelines.</p>
            <div class="flex items-center justify-between">
              <span class="text-sm text-pink-300">Design • Branding</span>
              <button class="text-pink-300 hover:text-pink-100">View →</button>
            </div>
          </div>
        </div>

        <!-- Project 2 -->
        <div class="creative-card rounded-2xl overflow-hidden">
          <div class="art-frame h-48 bg-gradient-to-br from-blue-400 to-teal-400 flex items-center justify-center">
            <div class="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
              <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
              </svg>
            </div>
          </div>
          <div class="p-6">
            <h4 class="text-xl font-bold mb-2">Web Design</h4>
            <p class="text-white/70 mb-4">Modern e-commerce platform with intuitive UX and stunning visuals.</p>
            <div class="flex items-center justify-between">
              <span class="text-sm text-blue-300">UI/UX • Web</span>
              <button class="text-blue-300 hover:text-blue-100">View →</button>
            </div>
          </div>
        </div>

        <!-- Project 3 -->
        <div class="creative-card rounded-2xl overflow-hidden">
          <div class="art-frame h-48 bg-gradient-to-br from-green-400 to-yellow-400 flex items-center justify-center">
            <div class="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
              <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 2v12a2 2 0 002 2h6a2 2 0 002-2V6H7z"></path>
              </svg>
            </div>
          </div>
          <div class="p-6">
            <h4 class="text-xl font-bold mb-2">Mobile App</h4>
            <p class="text-white/70 mb-4">Fitness tracking app with gamification and social features.</p>
            <div class="flex items-center justify-between">
              <span class="text-sm text-green-300">Mobile • UX</span>
              <button class="text-green-300 hover:text-green-100">View →</button>
            </div>
          </div>
        </div>

        <!-- Project 4 -->
        <div class="creative-card rounded-2xl overflow-hidden">
          <div class="art-frame h-48 bg-gradient-to-br from-red-400 to-orange-400 flex items-center justify-center">
            <div class="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
              <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
              </svg>
            </div>
          </div>
          <div class="p-6">
            <h4 class="text-xl font-bold mb-2">Illustration</h4>
            <p class="text-white/70 mb-4">Custom illustrations for children's book with vibrant characters.</p>
            <div class="flex items-center justify-between">
              <span class="text-sm text-orange-300">Art • Digital</span>
              <button class="text-orange-300 hover:text-orange-100">View →</button>
            </div>
          </div>
        </div>

        <!-- Project 5 -->
        <div class="creative-card rounded-2xl overflow-hidden">
          <div class="art-frame h-48 bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center">
            <div class="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
              <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
          </div>
          <div class="p-6">
            <h4 class="text-xl font-bold mb-2">Animation</h4>
            <p class="text-white/70 mb-4">Motion graphics for promotional video with dynamic transitions.</p>
            <div class="flex items-center justify-between">
              <span class="text-sm text-purple-300">Motion • Video</span>
              <button class="text-purple-300 hover:text-purple-100">View →</button>
            </div>
          </div>
        </div>

        <!-- Project 6 -->
        <div class="creative-card rounded-2xl overflow-hidden">
          <div class="art-frame h-48 bg-gradient-to-br from-pink-400 to-red-400 flex items-center justify-center">
            <div class="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
              <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
              </svg>
            </div>
          </div>
          <div class="p-6">
            <h4 class="text-xl font-bold mb-2">Print Design</h4>
            <p class="text-white/70 mb-4">Magazine layout design with creative typography and photography.</p>
            <div class="flex items-center justify-between">
              <span class="text-sm text-pink-300">Print • Layout</span>
              <button class="text-pink-300 hover:text-pink-100">View →</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Services Section -->
  <section class="py-16">
    <div class="max-w-6xl mx-auto px-6">
      <div class="creative-card rounded-3xl p-12 text-center">
        <h3 class="text-4xl font-bold mb-8">What I Do</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div class="creative-card rounded-2xl p-6">
            <div class="w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
              </svg>
            </div>
            <h4 class="text-xl font-bold mb-3">Visual Design</h4>
            <p class="text-white/70">Creating stunning visuals that capture attention and communicate your message effectively.</p>
          </div>
          <div class="creative-card rounded-2xl p-6">
            <div class="w-16 h-16 bg-gradient-to-r from-blue-500 to-teal-500 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
              </svg>
            </div>
            <h4 class="text-xl font-bold mb-3">UI/UX Design</h4>
            <p class="text-white/70">Designing intuitive user experiences that delight users and drive engagement.</p>
          </div>
          <div class="creative-card rounded-2xl p-6">
            <div class="w-16 h-16 bg-gradient-to-r from-green-500 to-yellow-500 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
              </svg>
            </div>
            <h4 class="text-xl font-bold mb-3">Brand Identity</h4>
            <p class="text-white/70">Developing cohesive brand identities that tell your story and connect with your audience.</p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <script>
    document.addEventListener('DOMContentLoaded', function() {
      // Parallax effect for cards
      document.addEventListener('mousemove', function(e) {
        const cards = document.querySelectorAll('.creative-card');
        const x = e.clientX / window.innerWidth;
        const y = e.clientY / window.innerHeight;
        
        cards.forEach((card, index) => {
          const speed = (index % 3 + 1) * 0.5;
          const xMove = (x - 0.5) * speed * 10;
          const yMove = (y - 0.5) * speed * 10;
          card.style.transform = \`translate(\${xMove}px, \${yMove}px)\`;
        });
      });

      // Animate cards on scroll
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
          }
        });
      });

      document.querySelectorAll('.creative-card').forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(50px)';
        card.style.transition = \`opacity 0.6s ease \${index * 0.1}s, transform 0.6s ease \${index * 0.1}s\`;
        observer.observe(card);
      });
    });
  </script>
</body>
</html>`
  },

  'e-commerce-store': {
    name: 'E-commerce Store',
    aesthetic: 'Clean, Commercial',
    preview: '🛍️',
    category: 'canva',
    code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Modern E-commerce Store</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    .product-card {
      transition: all 0.3s ease;
    }
    .product-card:hover {
      transform: translateY(-8px);
      box-shadow: 0 20px 40px rgba(0,0,0,0.1);
    }
    .price-tag {
      background: linear-gradient(45deg, #ff6b6b, #ee5a24);
    }
    .cart-bounce {
      animation: bounce 0.6s ease;
    }
    @keyframes bounce {
      0%, 20%, 60%, 100% { transform: translateY(0); }
      40% { transform: translateY(-10px); }
      80% { transform: translateY(-5px); }
    }
  </style>
</head>
<body class="bg-gray-50 font-sans">
  <!-- Header -->
  <header class="bg-white shadow-sm sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        <div class="flex items-center space-x-8">
          <div class="flex items-center space-x-2">
            <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span class="text-white font-bold text-sm">S</span>
            </div>
            <span class="text-xl font-bold text-gray-900">ShopZen</span>
          </div>
          <nav class="hidden md:flex space-x-8">
            <a href="#" class="text-gray-700 hover:text-blue-600 font-medium">Home</a>
            <a href="#" class="text-gray-700 hover:text-blue-600 font-medium">Categories</a>
            <a href="#" class="text-gray-700 hover:text-blue-600 font-medium">Deals</a>
            <a href="#" class="text-gray-700 hover:text-blue-600 font-medium">About</a>
          </nav>
        </div>
        
        <div class="flex items-center space-x-4">
          <div class="relative hidden sm:block">
            <input type="text" placeholder="Search products..." class="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <svg class="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </div>
          <button class="relative p-2 text-gray-700 hover:text-blue-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
            </svg>
            <span class="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">3</span>
          </button>
          <button class="relative p-2 text-gray-700 hover:text-blue-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m0 0L12 21l2.5-3M19.5 18L17 13"></path>
            </svg>
            <span class="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">5</span>
          </button>
        </div>
      </div>
    </div>
  </header>

  <!-- Hero Banner -->
  <section class="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div>
          <h1 class="text-5xl font-bold mb-6">Summer Sale</h1>
          <p class="text-xl mb-8 text-blue-100">Up to 70% off on selected items. Limited time offer!</p>
          <button class="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors">
            Shop Now
          </button>
        </div>
        <div class="flex justify-center">
          <div class="w-80 h-80 bg-white/20 rounded-full flex items-center justify-center">
            <svg class="w-40 h-40 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
            </svg>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Rest of the e-commerce template... -->
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      // Add to cart animation
      document.querySelectorAll('button:contains("Add to Cart")').forEach(button => {
        button.addEventListener('click', function() {
          this.classList.add('cart-bounce');
          setTimeout(() => {
            this.classList.remove('cart-bounce');
          }, 600);
        });
      });
    });
  </script>
</body>
</html>`
  },

  'landing-page-pro': {
    name: 'Landing Page Pro',
    aesthetic: 'Professional, Converting',
    preview: '🚀',
    category: 'canva',
    code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Landing Page Pro</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    .hero-gradient {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .floating-animation {
      animation: float 6s ease-in-out infinite;
    }
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-20px); }
    }
    .cta-pulse {
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
      70% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
      100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
    }
  </style>
</head>
<body class="font-sans">
  <!-- Navigation -->
  <nav class="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-200">
    <div class="max-w-6xl mx-auto px-6 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <div class="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
            <span class="text-white font-bold text-lg">P</span>
          </div>
          <span class="text-xl font-bold text-gray-900">ProductPro</span>
        </div>
        <div class="hidden md:flex items-center space-x-8">
          <a href="#features" class="text-gray-700 hover:text-blue-600 font-medium">Features</a>
          <a href="#pricing" class="text-gray-700 hover:text-blue-600 font-medium">Pricing</a>
          <a href="#testimonials" class="text-gray-700 hover:text-blue-600 font-medium">Reviews</a>
          <button class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            Get Started
          </button>
        </div>
      </div>
    </div>
  </nav>

  <!-- Hero Section -->
  <section class="hero-gradient text-white pt-24 pb-16">
    <div class="max-w-6xl mx-auto px-6">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div>
          <h1 class="text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            Transform Your
            <span class="block text-yellow-300">Business Today</span>
          </h1>
          <p class="text-xl text-blue-100 mb-8 leading-relaxed">
            Boost productivity by 300% with our revolutionary platform. Join over 50,000 successful businesses.
          </p>
          <div class="flex flex-col sm:flex-row gap-4 mb-8">
            <button class="cta-pulse bg-white text-blue-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-blue-50 transition-colors">
              Start Free Trial
            </button>
            <button class="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors">
              Watch Demo
            </button>
          </div>
        </div>
        <div class="flex justify-center">
          <div class="floating-animation">
            <div class="w-96 h-96 bg-white/20 rounded-3xl flex items-center justify-center backdrop-blur-sm">
              <svg class="w-48 h-48 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Rest of the landing page... -->
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      // Smooth scrolling for anchor links
      document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
          e.preventDefault();
          const target = document.querySelector(this.getAttribute('href'));
          if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
          }
        });
      });
    });
  </script>
</body>
</html>`
  },

  'neumorphic-design': {
    name: 'Neumorphic Design',
    aesthetic: 'Soft UI, Subtle',
    preview: '🎯',
    category: 'ai',
    code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Neumorphic Design</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body {
      background: #e0e5ec;
      font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
    }
    .neu-card {
      background: #e0e5ec;
      border-radius: 20px;
      box-shadow: 
        20px 20px 60px #bebebe,
        -20px -20px 60px #ffffff;
      transition: all 0.3s ease;
    }
    .neu-card:hover {
      box-shadow: 
        25px 25px 70px #bebebe,
        -25px -25px 70px #ffffff;
    }
    .neu-button {
      background: #e0e5ec;
      border-radius: 15px;
      box-shadow: 
        8px 8px 16px #bebebe,
        -8px -8px 16px #ffffff;
      border: none;
      transition: all 0.2s ease;
    }
    .neu-button:active {
      box-shadow: 
        inset 8px 8px 16px #bebebe,
        inset -8px -8px 16px #ffffff;
    }
    .neu-input {
      background: #e0e5ec;
      border-radius: 15px;
      box-shadow: 
        inset 8px 8px 16px #bebebe,
        inset -8px -8px 16px #ffffff;
      border: none;
      outline: none;
    }
    .neu-toggle {
      background: #e0e5ec;
      border-radius: 25px;
      box-shadow: 
        inset 8px 8px 16px #bebebe,
        inset -8px -8px 16px #ffffff;
    }
    .neu-icon {
      background: #e0e5ec;
      border-radius: 50%;
      box-shadow: 
        10px 10px 20px #bebebe,
        -10px -10px 20px #ffffff;
    }
  </style>
</head>
<body class="min-h-screen p-8">
  <!-- Header -->
  <header class="neu-card p-8 mb-8">
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-4">
        <div class="neu-icon w-16 h-16 flex items-center justify-center">
          <svg class="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
          </svg>
        </div>
        <div>
          <h1 class="text-3xl font-bold text-gray-700">NeuApp</h1>
          <p class="text-gray-500">Soft UI Experience</p>
        </div>
      </div>
      <div class="flex items-center space-x-4">
        <button class="neu-button p-3">
          <svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-5 5v-5zM9 7H4l5-5v5z"></path>
          </svg>
        </button>
        <button class="neu-button p-3">
          <svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
          </svg>
        </button>
      </div>
    </div>
  </header>

  <!-- Main Content -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
    <!-- Left Panel -->
    <div class="lg:col-span-2">
      <!-- Search Bar -->
      <div class="neu-card p-6 mb-8">
        <div class="relative">
          <input type="text" placeholder="Search for anything..." class="neu-input w-full p-4 pl-12 text-gray-700 placeholder-gray-400">
          <svg class="absolute left-4 top-4 w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="neu-card p-6 text-center">
          <div class="neu-icon w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <svg class="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
            </svg>
          </div>
          <h3 class="text-2xl font-bold text-gray-700 mb-2">2,547</h3>
          <p class="text-gray-500">Total Views</p>
        </div>
        
        <div class="neu-card p-6 text-center">
          <div class="neu-icon w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <svg class="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
            </svg>
          </div>
          <h3 class="text-2xl font-bold text-gray-700 mb-2">$12,847</h3>
          <p class="text-gray-500">Revenue</p>
        </div>
        
        <div class="neu-card p-6 text-center">
          <div class="neu-icon w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <svg class="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
            </svg>
          </div>
          <h3 class="text-2xl font-bold text-gray-700 mb-2">1,245</h3>
          <p class="text-gray-500">Users</p>
        </div>
      </div>

      <!-- Main Chart -->
      <div class="neu-card p-8">
        <h3 class="text-xl font-bold text-gray-700 mb-6">Performance Overview</h3>
        <div class="h-64 flex items-end justify-center space-x-4">
          <div class="neu-card w-12 h-32 flex items-end justify-center">
            <div class="w-8 h-24 bg-blue-400 rounded-t-lg"></div>
          </div>
          <div class="neu-card w-12 h-40 flex items-end justify-center">
            <div class="w-8 h-32 bg-green-400 rounded-t-lg"></div>
          </div>
          <div class="neu-card w-12 h-48 flex items-end justify-center">
            <div class="w-8 h-40 bg-purple-400 rounded-t-lg"></div>
          </div>
          <div class="neu-card w-12 h-36 flex items-end justify-center">
            <div class="w-8 h-28 bg-yellow-400 rounded-t-lg"></div>
          </div>
          <div class="neu-card w-12 h-52 flex items-end justify-center">
            <div class="w-8 h-44 bg-red-400 rounded-t-lg"></div>
          </div>
          <div class="neu-card w-12 h-44 flex items-end justify-center">
            <div class="w-8 h-36 bg-indigo-400 rounded-t-lg"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Right Panel -->
    <div class="space-y-6">
      <!-- Profile Card -->
      <div class="neu-card p-6">
        <div class="flex items-center space-x-4 mb-6">
          <div class="neu-icon w-16 h-16 flex items-center justify-center">
            <svg class="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
            </svg>
          </div>
          <div>
            <h4 class="font-bold text-gray-700">John Doe</h4>
            <p class="text-gray-500 text-sm">UI Designer</p>
          </div>
        </div>
        <button class="neu-button w-full p-3 text-gray-700 font-semibold">
          View Profile
        </button>
      </div>

      <!-- Settings -->
      <div class="neu-card p-6">
        <h4 class="font-bold text-gray-700 mb-6">Settings</h4>
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <span class="text-gray-600">Notifications</span>
            <div class="neu-toggle w-12 h-6 relative">
              <div class="neu-icon w-5 h-5 absolute top-0.5 right-0.5"></div>
            </div>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-gray-600">Dark Mode</span>
            <div class="neu-toggle w-12 h-6 relative">
              <div class="neu-icon w-5 h-5 absolute top-0.5 left-0.5"></div>
            </div>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-gray-600">Auto Save</span>
            <div class="neu-toggle w-12 h-6 relative">
              <div class="neu-icon w-5 h-5 absolute top-0.5 right-0.5"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="neu-card p-6">
        <h4 class="font-bold text-gray-700 mb-6">Quick Actions</h4>
        <div class="grid grid-cols-2 gap-4">
          <button class="neu-button p-4 flex flex-col items-center space-y-2">
            <svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
            <span class="text-sm text-gray-600">Add</span>
          </button>
          <button class="neu-button p-4 flex flex-col items-center space-y-2">
            <svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"></path>
            </svg>
            <span class="text-sm text-gray-600">Share</span>
          </button>
          <button class="neu-button p-4 flex flex-col items-center space-y-2">
            <svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
            </svg>
            <span class="text-sm text-gray-600">Report</span>
          </button>
          <button class="neu-button p-4 flex flex-col items-center space-y-2">
            <svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
            <span class="text-sm text-gray-600">Settings</span>
          </button>
        </div>
      </div>
    </div>
  </div>

  <script>
    document.addEventListener('DOMContentLoaded', function() {
      // Add subtle hover effects
      document.querySelectorAll('.neu-button, .neu-card').forEach(element => {
        element.addEventListener('mouseenter', function() {
          this.style.transform = 'translateY(-2px)';
        });
        
        element.addEventListener('mouseleave', function() {
          this.style.transform = 'translateY(0)';
        });
      });

      // Toggle functionality
      document.querySelectorAll('.neu-toggle').forEach(toggle => {
        toggle.addEventListener('click', function() {
          const circle = this.querySelector('.neu-icon');
          if (circle.classList.contains('right-0.5')) {
            circle.classList.remove('right-0.5');
            circle.classList.add('left-0.5');
          } else {
            circle.classList.remove('left-0.5');
            circle.classList.add('right-0.5');
          }
        });
      });
    });
  </script>
</body>
</html>`
  },

  'cyberpunk-interface': {
    name: 'Cyberpunk Interface',
    aesthetic: 'Neon, Futuristic',
    preview: '🌆',
    category: 'ai',
    code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cyberpunk Interface</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
    
    body {
      background: #0a0a0a;
      font-family: 'Orbitron', monospace;
      overflow-x: hidden;
    }
    
    .cyber-grid {
      background-image: 
        linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px);
      background-size: 50px 50px;
      animation: gridMove 20s linear infinite;
    }
    
    @keyframes gridMove {
      0% { background-position: 0 0; }
      100% { background-position: 50px 50px; }
    }
    
    .neon-border {
      border: 2px solid #00ffff;
      box-shadow: 
        0 0 10px #00ffff,
        inset 0 0 10px rgba(0, 255, 255, 0.1);
    }
    
    .neon-text {
      color: #00ffff;
      text-shadow: 
        0 0 5px #00ffff,
        0 0 10px #00ffff,
        0 0 15px #00ffff;
    }
    
    .neon-pink {
      color: #ff00ff;
      text-shadow: 
        0 0 5px #ff00ff,
        0 0 10px #ff00ff,
        0 0 15px #ff00ff;
    }
    
    .cyber-card {
      background: rgba(0, 0, 0, 0.8);
      border: 1px solid #333;
      box-shadow: 
        0 0 20px rgba(0, 255, 255, 0.3);
      transition: all 0.3s ease;
    }
    
    .cyber-card:hover {
      box-shadow: 
        0 0 30px rgba(0, 255, 255, 0.5),
        0 0 50px rgba(255, 0, 255, 0.3);
      transform: translateY(-5px);
    }
    
    .glitch {
      position: relative;
    }
    
    .glitch::before,
    .glitch::after {
      content: attr(data-text);
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }
    
    .glitch::before {
      animation: glitch-1 0.5s infinite;
      color: #ff00ff;
      z-index: -1;
    }
    
    .glitch::after {
      animation: glitch-2 0.5s infinite;
      color: #00ffff;
      z-index: -2;
    }
    
    @keyframes glitch-1 {
      0%, 14%, 15%, 49%, 50%, 99%, 100% { transform: translate(0); }
      1%, 13% { transform: translate(-2px, 1px); }
      16%, 48% { transform: translate(1px, -1px); }
    }
    
    @keyframes glitch-2 {
      0%, 20%, 21%, 62%, 63%, 99%, 100% { transform: translate(0); }
      1%, 19% { transform: translate(2px, 1px); }
      22%, 61% { transform: translate(-1px, -2px); }
    }
    
    .cyber-button {
      background: linear-gradient(45deg, #00ffff, #ff00ff);
      position: relative;
      overflow: hidden;
    }
    
    .cyber-button::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
      transition: left 0.5s;
    }
    
    .cyber-button:hover::before {
      left: 100%;
    }
    
    .scan-line {
      position: relative;
      overflow: hidden;
    }
    
    .scan-line::after {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 2px;
      background: linear-gradient(90deg, transparent, #00ffff, transparent);
      animation: scan 2s infinite;
    }
    
    @keyframes scan {
      0% { left: -100%; }
      100% { left: 100%; }
    }
  </style>
</head>
<body class="cyber-grid min-h-screen text-white">
  <!-- Header -->
  <header class="relative z-10">
    <div class="neon-border bg-black bg-opacity-90 p-4">
      <div class="max-w-7xl mx-auto flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <div class="w-12 h-12 neon-border rounded-lg flex items-center justify-center">
            <span class="neon-text font-bold text-xl">CX</span>
          </div>
          <div>
            <h1 class="glitch neon-text text-2xl font-bold" data-text="CYBERXPLOIT">CYBERXPLOIT</h1>
            <p class="text-gray-400 text-sm">NEURAL INTERFACE v2.077</p>
          </div>
        </div>
        
        <nav class="hidden md:flex space-x-6">
          <a href="#" class="neon-text hover:neon-pink transition-colors">DASHBOARD</a>
          <a href="#" class="text-gray-400 hover:neon-text transition-colors">SYSTEMS</a>
          <a href="#" class="text-gray-400 hover:neon-text transition-colors">DATA</a>
          <a href="#" class="text-gray-400 hover:neon-text transition-colors">NEURAL</a>
        </nav>
        
        <div class="flex items-center space-x-4">
          <div class="text-right">
            <div class="neon-text text-sm font-bold">ONLINE</div>
            <div class="text-gray-400 text-xs">STATUS: ACTIVE</div>
          </div>
          <div class="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
        </div>
      </div>
    </div>
  </header>

  <!-- Main Content -->
  <main class="max-w-7xl mx-auto p-6 mt-8">
    <!-- System Status -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div class="cyber-card p-6 scan-line">
        <div class="flex items-center justify-between mb-4">
          <h3 class="neon-text font-bold">CPU LOAD</h3>
          <svg class="w-6 h-6 neon-text" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"></path>
          </svg>
        </div>
        <div class="text-3xl font-bold neon-pink mb-2">67.3%</div>
        <div class="w-full bg-gray-800 rounded-full h-2">
          <div class="bg-gradient-to-r from-cyan-500 to-pink-500 h-2 rounded-full" style="width: 67.3%"></div>
        </div>
      </div>
      
      <div class="cyber-card p-6 scan-line">
        <div class="flex items-center justify-between mb-4">
          <h3 class="neon-text font-bold">MEMORY</h3>
          <svg class="w-6 h-6 neon-text" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"></path>
          </svg>
        </div>
        <div class="text-3xl font-bold neon-pink mb-2">8.2GB</div>
        <div class="w-full bg-gray-800 rounded-full h-2">
          <div class="bg-gradient-to-r from-green-500 to-cyan-500 h-2 rounded-full" style="width: 82%"></div>
        </div>
      </div>
      
      <div class="cyber-card p-6 scan-line">
        <div class="flex items-center justify-between mb-4">
          <h3 class="neon-text font-bold">NETWORK</h3>
          <svg class="w-6 h-6 neon-text" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"></path>
          </svg>
        </div>
        <div class="text-3xl font-bold neon-pink mb-2">1.2TB</div>
        <div class="w-full bg-gray-800 rounded-full h-2">
          <div class="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full" style="width: 45%"></div>
        </div>
      </div>
      
      <div class="cyber-card p-6 scan-line">
        <div class="flex items-center justify-between mb-4">
          <h3 class="neon-text font-bold">SECURITY</h3>
          <svg class="w-6 h-6 neon-text" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
          </svg>
        </div>
        <div class="text-3xl font-bold text-green-400 mb-2">SECURE</div>
        <div class="text-sm text-gray-400">All systems protected</div>
      </div>
    </div>

    <!-- Main Dashboard -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Terminal -->
      <div class="lg:col-span-2 cyber-card p-6">
        <div class="flex items-center justify-between mb-6">
          <h2 class="neon-text text-xl font-bold">NEURAL TERMINAL</h2>
          <div class="flex space-x-2">
            <div class="w-3 h-3 bg-red-500 rounded-full"></div>
            <div class="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <div class="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
        </div>
        
        <div class="bg-black rounded-lg p-4 font-mono text-sm">
          <div class="mb-2">
            <span class="neon-text">root@cyberxploit:~#</span> 
            <span class="text-gray-300">neural-scan --deep</span>
          </div>
          <div class="text-green-400 mb-2">
            [✓] Neural pathways: OPTIMIZED<br>
            [✓] Memory banks: SYNCHRONIZED<br>
            [✓] Data streams: FLOWING<br>
            [!] Anomaly detected in sector 7
          </div>
          <div class="mb-2">
            <span class="neon-text">root@cyberxploit:~#</span> 
            <span class="text-gray-300">firewall --status</span>
          </div>
          <div class="text-cyan-400 mb-2">
            FIREWALL STATUS: ACTIVE<br>
            THREATS BLOCKED: 2,847<br>
            LAST UPDATE: 00:23:45 AGO
          </div>
          <div class="mb-2">
            <span class="neon-text">root@cyberxploit:~#</span> 
            <span class="text-gray-300 animate-pulse">|</span>
          </div>
        </div>
      </div>

      <!-- Control Panel -->
      <div class="cyber-card p-6">
        <h2 class="neon-text text-xl font-bold mb-6">CONTROL MATRIX</h2>
        
        <div class="space-y-4">
          <button class="cyber-button w-full p-4 rounded-lg text-black font-bold relative">
            INITIATE SEQUENCE
          </button>
          
          <button class="w-full p-4 rounded-lg border border-cyan-500 neon-text hover:bg-cyan-500 hover:text-black transition-all">
            NEURAL LINK
          </button>
          
          <button class="w-full p-4 rounded-lg border border-pink-500 neon-pink hover:bg-pink-500 hover:text-black transition-all">
            DATA SYNC
          </button>
        </div>
        
        <div class="mt-8">
          <h3 class="neon-text font-bold mb-4">SYSTEM LOGS</h3>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-400">23:45:12</span>
              <span class="text-green-400">SYSTEM BOOT</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-400">23:44:58</span>
              <span class="text-cyan-400">NET CONNECT</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-400">23:44:33</span>
              <span class="text-yellow-400">WARNING</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-400">23:44:12</span>
              <span class="text-pink-400">DATA SYNC</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Data Visualization -->
    <div class="mt-8 cyber-card p-6">
      <h2 class="neon-text text-xl font-bold mb-6">DATA FLOW VISUALIZATION</h2>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="text-center">
          <div class="w-32 h-32 mx-auto mb-4 relative">
            <svg class="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path class="text-gray-800" stroke="currentColor" stroke-width="2" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"></path>
              <path class="text-cyan-400" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="75, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831">
                <animateTransform attributeName="transform" type="rotate" values="0 18 18;360 18 18" dur="2s" repeatCount="indefinite"/>
              </path>
            </svg>
            <div class="absolute inset-0 flex items-center justify-center">
              <span class="neon-text text-lg font-bold">75%</span>
            </div>
          </div>
          <h3 class="neon-text font-bold">NEURAL ACTIVITY</h3>
        </div>
        
        <div class="text-center">
          <div class="w-32 h-32 mx-auto mb-4 relative">
            <svg class="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path class="text-gray-800" stroke="currentColor" stroke-width="2" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"></path>
              <path class="text-pink-400" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="90, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831">
                <animateTransform attributeName="transform" type="rotate" values="0 18 18;-360 18 18" dur="3s" repeatCount="indefinite"/>
              </path>
            </svg>
            <div class="absolute inset-0 flex items-center justify-center">
              <span class="neon-pink text-lg font-bold">90%</span>
            </div>
          </div>
          <h3 class="neon-pink font-bold">DATA INTEGRITY</h3>
        </div>
        
        <div class="text-center">
          <div class="w-32 h-32 mx-auto mb-4 relative">
            <svg class="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path class="text-gray-800" stroke="currentColor" stroke-width="2" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"></path>
              <path class="text-green-400" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="60, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831">
                <animateTransform attributeName="transform" type="rotate" values="0 18 18;360 18 18" dur="1.5s" repeatCount="indefinite"/>
              </path>
            </svg>
            <div class="absolute inset-0 flex items-center justify-center">
              <span class="text-green-400 text-lg font-bold">60%</span>
            </div>
          </div>
          <h3 class="text-green-400 font-bold">SYSTEM LOAD</h3>
        </div>
      </div>
    </div>
  </main>

  <script>
    document.addEventListener('DOMContentLoaded', function() {
      // Matrix rain effect for background
      function createMatrixRain() {
        const canvas = document.createElement('canvas');
        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '1';
        canvas.style.opacity = '0.1';
        document.body.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const characters = '01';
        const fontSize = 14;
        const columns = canvas.width / fontSize;
        const drops = [];

        for (let i = 0; i < columns; i++) {
          drops[i] = 1;
        }

        function draw() {
          ctx.fillStyle = 'rgba(10, 10, 10, 0.05)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          ctx.fillStyle = '#00ffff';
          ctx.font = fontSize + 'px monospace';

          for (let i = 0; i < drops.length; i++) {
            const text = characters[Math.floor(Math.random() * characters.length)];
            ctx.fillText(text, i * fontSize, drops[i] * fontSize);
            
            if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
              drops[i] = 0;
            }
            drops[i]++;
          }
        }

        setInterval(draw, 100);
      }

      createMatrixRain();

      // Add typing effect to terminal
      const terminalLines = document.querySelectorAll('.bg-black div');
      terminalLines.forEach((line, index) => {
        line.style.opacity = '0';
        setTimeout(() => {
          line.style.opacity = '1';
          line.style.animation = 'fadeIn 0.5s ease-in';
        }, index * 1000);
      });

      // Random glitch effect
      setInterval(() => {
        const glitchElements = document.querySelectorAll('.glitch');
        glitchElements.forEach(element => {
          if (Math.random() < 0.1) {
            element.style.animation = 'none';
            setTimeout(() => {
              element.style.animation = '';
            }, 100);
          }
        });
      }, 2000);
    });
  </script>
</body>
</html>`
  },

  'glassmorphism-ui': {
    name: 'Glassmorphism UI',
    aesthetic: 'Frosted Glass, Modern',
    preview: '✨',
    category: 'ai',
    code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Glassmorphism UI</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
    }
    .glass {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    .glass-dark {
      background: rgba(0, 0, 0, 0.1);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .floating-shapes {
      position: fixed;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: -1;
    }
    .shape {
      position: absolute;
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(2px);
      border-radius: 50%;
      animation: float 20s infinite ease-in-out;
    }
    .shape:nth-child(1) { width: 200px; height: 200px; top: 10%; left: 10%; animation-delay: 0s; }
    .shape:nth-child(2) { width: 150px; height: 150px; top: 60%; right: 15%; animation-delay: 5s; }
    .shape:nth-child(3) { width: 100px; height: 100px; bottom: 20%; left: 30%; animation-delay: 10s; }
    @keyframes float {
      0%, 100% { transform: translateY(0px) rotate(0deg); }
      50% { transform: translateY(-20px) rotate(180deg); }
    }
  </style>
</head>
<body class="font-sans text-white">
  <!-- Floating Background Shapes -->
  <div class="floating-shapes">
    <div class="shape"></div>
    <div class="shape"></div>
    <div class="shape"></div>
  </div>

  <!-- Header -->
  <header class="glass fixed top-0 left-0 right-0 z-50">
    <div class="max-w-6xl mx-auto px-6 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <div class="w-10 h-10 glass rounded-full flex items-center justify-center">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
          </div>
          <h1 class="text-xl font-semibold">GlassUI</h1>
        </div>
        <nav class="hidden md:flex space-x-6">
          <a href="#" class="hover:text-blue-200 transition-colors">Home</a>
          <a href="#" class="hover:text-blue-200 transition-colors">Products</a>
          <a href="#" class="hover:text-blue-200 transition-colors">Services</a>
          <a href="#" class="hover:text-blue-200 transition-colors">Contact</a>
        </nav>
        <button class="glass px-4 py-2 rounded-lg hover:bg-white/20 transition-all">
          Get Started
        </button>
      </div>
    </div>
  </header>

  <!-- Main Content -->
  <main class="pt-24 pb-12">
    <!-- Hero Section -->
    <section class="max-w-6xl mx-auto px-6 py-16 text-center">
      <div class="glass rounded-3xl p-12 mb-16">
        <h2 class="text-5xl font-bold mb-6">
          Beautiful Glass<br>
          <span class="bg-gradient-to-r from-blue-200 to-purple-200 bg-clip-text text-transparent">
            Interface Design
          </span>
        </h2>
        <p class="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
          Experience the future of web design with our stunning glassmorphism components that blend beauty with functionality.
        </p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <button class="glass px-8 py-3 rounded-xl font-semibold hover:bg-white/20 transition-all transform hover:scale-105">
            Explore Features
          </button>
          <button class="glass-dark px-8 py-3 rounded-xl font-semibold hover:bg-black/20 transition-all transform hover:scale-105">
            Watch Demo
          </button>
        </div>
      </div>
    </section>

    <!-- Features Grid -->
    <section class="max-w-6xl mx-auto px-6">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
        <div class="glass rounded-2xl p-6 hover:bg-white/15 transition-all transform hover:scale-105">
          <div class="w-12 h-12 glass rounded-xl flex items-center justify-center mb-4">
            <svg class="w-6 h-6 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
            </svg>
          </div>
          <h3 class="text-xl font-semibold mb-3">Innovation</h3>
          <p class="text-white/70">Cutting-edge design patterns that push the boundaries of modern web interfaces.</p>
        </div>
        
        <div class="glass rounded-2xl p-6 hover:bg-white/15 transition-all transform hover:scale-105">
          <div class="w-12 h-12 glass rounded-xl flex items-center justify-center mb-4">
            <svg class="w-6 h-6 text-green-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
          </div>
          <h3 class="text-xl font-semibold mb-3">Performance</h3>
          <p class="text-white/70">Optimized components that deliver exceptional performance across all devices.</p>
        </div>
        
        <div class="glass rounded-2xl p-6 hover:bg-white/15 transition-all transform hover:scale-105">
          <div class="w-12 h-12 glass rounded-xl flex items-center justify-center mb-4">
            <svg class="w-6 h-6 text-purple-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
            </svg>
          </div>
          <h3 class="text-xl font-semibold mb-3">User Experience</h3>
          <p class="text-white/70">Intuitive interfaces designed with user satisfaction at the core of every interaction.</p>
        </div>
      </div>

      <!-- Stats Section -->
      <div class="glass rounded-3xl p-8">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div>
            <div class="text-4xl font-bold mb-2">99.9%</div>
            <div class="text-white/70">Uptime</div>
          </div>
          <div>
            <div class="text-4xl font-bold mb-2">10k+</div>
            <div class="text-white/70">Happy Users</div>
          </div>
          <div>
            <div class="text-4xl font-bold mb-2">24/7</div>
            <div class="text-white/70">Support</div>
          </div>
        </div>
      </div>
    </section>
  </main>

  <script>
    document.addEventListener('DOMContentLoaded', function() {
      // Add interactive effects
      const glassElements = document.querySelectorAll('.glass, .glass-dark');
      
      glassElements.forEach(element => {
        element.addEventListener('mouseenter', function() {
          this.style.transform = 'translateY(-2px)';
          this.style.boxShadow = '0 20px 40px rgba(0,0,0,0.1)';
        });
        
        element.addEventListener('mouseleave', function() {
          this.style.transform = '';
          this.style.boxShadow = '';
        });
      });

      // Parallax effect for floating shapes
      document.addEventListener('mousemove', function(e) {
        const shapes = document.querySelectorAll('.shape');
        const x = e.clientX / window.innerWidth;
        const y = e.clientY / window.innerHeight;
        
        shapes.forEach((shape, index) => {
          const speed = (index + 1) * 0.5;
          const xMove = (x - 0.5) * speed * 20;
          const yMove = (y - 0.5) * speed * 20;
          shape.style.transform = \`translate(\${xMove}px, \${yMove}px)\`;
        });
      });
    });
  </script>
</body>
</html>`
  },
  
  'minimalist-saas': {
    name: 'Minimalist SaaS',
    aesthetic: 'Clean, Professional',
    preview: '📊',
    category: 'ai',
    code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Minimalist SaaS</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-white text-gray-900">
  <header class="border-b border-gray-100 sticky top-0 bg-white z-50">
    <div class="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
      <div class="font-bold text-xl">SaaSPro</div>
      <nav class="hidden md:flex space-x-8">
        <a href="#" class="text-gray-600 hover:text-gray-900">Features</a>
        <a href="#" class="text-gray-600 hover:text-gray-900">Pricing</a>
      </nav>
      <button class="bg-black text-white px-6 py-2 rounded-lg">Get Started</button>
    </div>
  </header>
  <main class="max-w-6xl mx-auto px-6 py-16 text-center">
    <h1 class="text-6xl font-bold mb-6">Simple.<br>Powerful.<br>Effective.</h1>
    <p class="text-xl text-gray-600 mb-8">The only SaaS platform you'll ever need.</p>
    <button class="bg-black text-white px-8 py-3 rounded-lg text-lg font-semibold">Start Free Trial</button>
  </main>
</body>
</html>`
  },

  'dark-mode-premium': {
    name: 'Dark Mode Premium',
    aesthetic: 'Elegant, Sleek',
    preview: '🌙',
    category: 'ai',
    code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dark Mode Premium</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-900 text-white min-h-screen">
  <header class="border-b border-gray-800 sticky top-0 bg-gray-900/95 backdrop-blur z-50">
    <div class="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
      <div class="text-2xl font-bold text-indigo-400">DarkPro</div>
      <button class="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700">Premium</button>
    </div>
  </header>
  <main class="max-w-6xl mx-auto px-6 py-12">
    <section class="text-center mb-16">
      <h1 class="text-5xl font-bold mb-6">Premium Dark Experience</h1>
      <p class="text-xl text-gray-400">Elegant, professional, and easy on the eyes.</p>
    </section>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div class="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <h3 class="text-xl font-bold mb-4">Analytics</h3>
        <div class="text-3xl font-bold text-indigo-400">2,547</div>
      </div>
      <div class="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <h3 class="text-xl font-bold mb-4">Revenue</h3>
        <div class="text-3xl font-bold text-green-400">$24,891</div>
      </div>
      <div class="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <h3 class="text-xl font-bold mb-4">Growth</h3>
        <div class="text-3xl font-bold text-purple-400">+23%</div>
      </div>
    </div>
  </main>
</body>
</html>`
  },

  'gradient-mastery': {
    name: 'Gradient Mastery',
    aesthetic: 'Colorful, Dynamic',
    preview: '🌈',
    category: 'ai',
    code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gradient Mastery</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
    .gradient-card { background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%); backdrop-filter: blur(10px); }
  </style>
</head>
<body class="min-h-screen text-white">
  <header class="gradient-card backdrop-blur sticky top-0 z-50 border-b border-white/20">
    <div class="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
      <div class="text-2xl font-bold">GradientPro</div>
      <button class="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-6 py-2 rounded-full font-semibold">Get Started</button>
    </div>
  </header>
  <main class="max-w-6xl mx-auto px-6 py-16">
    <section class="text-center mb-20">
      <h1 class="text-6xl font-bold mb-6">Colorful Creativity</h1>
      <p class="text-xl text-white/80">Where gradients meet innovation.</p>
    </section>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div class="gradient-card p-8 rounded-2xl text-center border border-white/20">
        <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-red-400 to-yellow-400"></div>
        <h3 class="text-xl font-bold mb-2">Design</h3>
        <p class="text-white/70">Beautiful gradient designs.</p>
      </div>
      <div class="gradient-card p-8 rounded-2xl text-center border border-white/20">
        <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400"></div>
        <h3 class="text-xl font-bold mb-2">Development</h3>
        <p class="text-white/70">Interactive elements.</p>
      </div>
      <div class="gradient-card p-8 rounded-2xl text-center border border-white/20">
        <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-400 to-teal-400"></div>
        <h3 class="text-xl font-bold mb-2">Innovation</h3>
        <p class="text-white/70">Modern aesthetics.</p>
      </div>
    </div>
  </main>
</body>
</html>`
  }
};

// AI Learning System for Template Improvement
interface TemplateUsageData {
  templateName: string;
  usageCount: number;
  lastUsed: Date;
  userFeedback: number;
  improvements: string[];
}

class AITemplateLearningSystem {
  private usageData: Map<string, TemplateUsageData> = new Map();
  
  trackTemplateUsage(templateName: string, feedback?: number) {
    const existing = this.usageData.get(templateName);
    if (existing) {
      existing.usageCount++;
      existing.lastUsed = new Date();
      if (feedback) existing.userFeedback = feedback;
    } else {
      this.usageData.set(templateName, {
        templateName,
        usageCount: 1,
        lastUsed: new Date(),
        userFeedback: feedback || 0,
        improvements: []
      });
    }
  }
  
  getPopularTemplates(limit: number = 5): string[] {
    return Array.from(this.usageData.entries())
      .sort(([,a], [,b]) => b.usageCount - a.usageCount)
      .slice(0, limit)
      .map(([name]) => name);
  }
  
  suggestImprovements(templateName: string): string[] {
    const data = this.usageData.get(templateName);
    const suggestions: string[] = [];
    
    if (data) {
      if (data.userFeedback < 3) {
        suggestions.push('Consider updating color scheme for better accessibility');
        suggestions.push('Add more interactive elements');
      }
      if (data.usageCount < 10) {
        suggestions.push('Template may need better preview or description');
      }
    }
    
    return suggestions;
  }
}

export const aiLearningSystem = new AITemplateLearningSystem();

// Helper function to get template by name
export function getTemplateByName(templateName: string): TemplateInfo | null {
  const key = templateName.toLowerCase().replace(/\s+/g, '-');
  const template = webDesignTemplates[key] || null;
  
  if (template) {
    // Track usage for AI learning
    aiLearningSystem.trackTemplateUsage(templateName);
  }
  
  return template;
}

// Helper function to get all templates by category
export function getTemplatesByCategory(category: 'google' | 'canva' | 'ai'): TemplateInfo[] {
  return Object.values(webDesignTemplates).filter(template => template.category === category);
}