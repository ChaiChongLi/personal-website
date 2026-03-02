# Personal Website Frontend - Angular 19

A complete, production-ready Angular 19 frontend application for a personal dashboard/website. Features include stock watchlist tracking, financial news aggregation, task management, development tools bookmarking, and resume building with export capabilities.

## Features

### Core Features
- **Authentication System**: Login with JWT token management, auto-refresh, and role-based access control
- **Stock Watchlist**: Real-time stock price tracking with auto-refresh every 60 seconds
- **Financial News**: Market news aggregation by stock symbol with tabbed interface
- **Todo/Task Management**: Kanban-style task board with pending, in-progress, and completed states
- **Tools Bookmarking**: Organize development tools and resources by category with favorites
- **Resume Builder**: Multi-step resume generator with PDF/Word export capabilities

### Design
- **Dark Theme**: Professional dark mode with custom Material Design overrides
- **Responsive Layout**: Mobile-first design with breakpoints for all device sizes
- **Standalone Components**: All components are Angular 19 standalone components
- **Modern UI**: Angular Material components with custom styling and animations

## Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── core/
│   │   │   ├── guards/
│   │   │   │   └── auth.guard.ts              # Authentication route guard
│   │   │   ├── interceptors/
│   │   │   │   └── auth.interceptor.ts        # HTTP token interceptor
│   │   │   └── services/
│   │   │       ├── auth.service.ts            # Authentication management
│   │   │       ├── stock.service.ts           # Stock data service
│   │   │       ├── news.service.ts            # News aggregation service
│   │   │       ├── todo.service.ts            # Task management service
│   │   │       ├── tool.service.ts            # Tools/bookmarks service
│   │   │       └── resume.service.ts          # Resume management service
│   │   ├── features/
│   │   │   ├── auth/login/                   # Login page
│   │   │   ├── dashboard/                    # Dashboard overview
│   │   │   ├── stocks/                       # Stock watchlist
│   │   │   ├── news/                         # Financial news
│   │   │   ├── todo/                         # Task management
│   │   │   ├── tools/                        # Tools bookmarking
│   │   │   └── resume/                       # Resume builder
│   │   ├── layout/
│   │   │   ├── main-layout/                  # Main app layout with sidenav
│   │   │   └── sidebar/                      # Navigation sidebar
│   │   ├── app.component.ts                  # Root component
│   │   ├── app.config.ts                     # App configuration
│   │   └── app.routes.ts                     # Route definitions
│   ├── environments/
│   │   ├── environment.ts                    # Development environment
│   │   └── environment.prod.ts               # Production environment
│   ├── styles.scss                           # Global styles
│   ├── index.html                            # HTML template
│   └── main.ts                               # Bootstrap entry point
├── angular.json                              # Angular CLI configuration
├── tsconfig.json                             # TypeScript configuration
├── tsconfig.app.json                         # App TypeScript configuration
└── package.json                              # Dependencies
```

## Installation & Setup

### Prerequisites
- Node.js 18+ and npm 9+
- Angular CLI 19+

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build

# Watch mode for development
npm run watch
```

The application will be available at `http://localhost:4200`

## Configuration

### Environment Variables
Edit `src/environments/environment.ts` for development and `src/environments/environment.prod.ts` for production:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api/v1',  // Backend API URL
  stockRefreshInterval: 60000                 // Auto-refresh interval (ms)
};
```

### API Endpoints
The application expects the following API endpoints:

**Authentication:**
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh access token

**Stocks:**
- `GET /stocks/watchlist` - Get watched stocks
- `POST /stocks/add` - Add stock to watchlist
- `PUT /stocks/:id` - Update stock
- `DELETE /stocks/:id` - Delete stock
- `POST /stocks/refresh-prices` - Refresh all prices

**News:**
- `GET /news/symbol/:symbol` - News for specific stock
- `GET /news/watchlist` - News for all watched stocks
- `GET /news/trending` - Trending news
- `GET /news/search` - Search news

**Todos:**
- `GET /todos` - Get all todos with filters
- `GET /todos/stats` - Get todo statistics
- `POST /todos` - Create todo
- `PUT /todos/:id` - Update todo
- `DELETE /todos/:id` - Delete todo
- `POST /todos/bulk-update` - Bulk update todos
- `DELETE /todos/completed` - Delete completed todos

**Tools:**
- `GET /tools` - Get all tools with filters
- `GET /tools/categories` - Get available categories
- `POST /tools` - Create tool
- `PUT /tools/:id` - Update tool
- `DELETE /tools/:id` - Delete tool
- `POST /tools/:id/toggle-favorite` - Toggle favorite

**Resume:**
- `GET /resume/profiles` - Get all profiles
- `GET /resume/profiles/:id` - Get specific profile
- `POST /resume/profiles` - Create profile
- `PUT /resume/profiles/:id` - Update profile
- `DELETE /resume/profiles/:id` - Delete profile
- `GET /resume/profiles/:id/download/pdf` - Download as PDF
- `GET /resume/profiles/:id/download/word` - Download as Word
- `GET /resume/profiles/:id/preview` - Get HTML preview

## Authentication

### Login Flow
1. User navigates to `/login`
2. Submits username and password
3. Backend returns `accessToken`, `refreshToken`, and `user` data
4. Tokens stored in localStorage
5. User redirected to dashboard or return URL

### Token Management
- Access tokens automatically added to all API requests via interceptor
- On 401 response, interceptor attempts token refresh
- On refresh failure, user logged out and redirected to login
- Tokens checked for expiration on app startup

### Demo Credentials
```
Username: demo
Password: demo123
```

## Components

### Standalone Architecture
All components are standalone Angular 19 components with explicit imports:

```typescript
@Component({
  selector: 'app-example',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    // ... other imports
  ],
  templateUrl: './example.component.html',
  styleUrls: ['./example.component.scss']
})
export class ExampleComponent {}
```

### Key Components

**LoginComponent** (`src/app/features/auth/login/`)
- User authentication form
- Password visibility toggle
- Remember me checkbox
- Error handling

**DashboardComponent** (`src/app/features/dashboard/`)
- Summary cards for all features
- Recent stocks, news, todos
- Quick navigation buttons
- Responsive grid layout

**StocksComponent** (`src/app/features/stocks/`)
- Material table with stock data
- Real-time price updates
- Add/remove stocks
- Market badges (MY/US/SG)
- 52-week high/low tracking

**NewsComponent** (`src/app/features/news/`)
- Tabbed interface by stock symbol
- News cards with headlines and snippets
- Relative time formatting
- Direct links to news sources

**TodoComponent** (`src/app/features/todo/`)
- Kanban-style 3-column board
- Drag-and-drop ready (implement with ng-cdk)
- Priority and due date tracking
- Status transitions
- Overdue highlighting

**ToolsComponent** (`src/app/features/tools/`)
- Grid layout with responsive columns
- Search and category filtering
- Favorite/star functionality
- Tag-based organization
- Open in new tab

**ResumeComponent** (`src/app/features/resume/`)
- Multi-step stepper form
- Personal info, experience, education, skills
- Certifications and projects
- Profile management
- PDF/Word export

## Styling & Theme

### Design System
The application uses a comprehensive dark theme with CSS custom properties:

```scss
--bg-primary: #0f1117      // Main background
--bg-secondary: #161b22    // Secondary background
--bg-card: #1c2333         // Card backgrounds
--accent: #58a6ff          // Primary accent (blue)
--success: #3fb950         // Success (green)
--warning: #d29922         // Warning (orange)
--danger: #f85149          // Danger (red)
--text-primary: #e6edf3    // Primary text
--text-secondary: #8b949e  // Secondary text
--border: #30363d          // Border color
```

### Material Design Overrides
All Material components are restyled for dark mode:
- Form fields with custom focus states
- Tables with hover effects
- Dialog and snackbar styling
- Button and chip variants
- Tab and stepper customization

### Responsive Design
Breakpoints:
- `1200px` - Large desktop
- `768px` - Tablet
- `600px` - Mobile

## State Management

### Angular Signals
Modern state management using Angular signals:

```typescript
// Data signals
stocks = signal<StockItem[]>([]);
isLoading = signal(false);
selectedCategory = signal('all');

// Derived signals
filteredTools = computed(() =>
  this.tools().filter(t => t.category === this.selectedCategory())
);

// Update signals
updateStocks(stocks: StockItem[]): void {
  this.stocks.set(stocks);
}

// Increment operations
this.count.update(count => count + 1);
```

## HTTP Interceptors

### Auth Interceptor
Automatically handles:
- Adding `Authorization: Bearer {token}` header to all requests
- Refreshing expired tokens
- Retrying failed requests with new token
- Logging out on refresh failure

### Request/Response
```typescript
// Outgoing request
GET /api/v1/stocks/watchlist HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

// Response
HTTP/1.1 200 OK
Content-Type: application/json
```

## Error Handling

### User-Facing Errors
- Form validation messages
- API error notifications
- Loading states and spinners
- Empty states with helpful messages

### HTTP Errors
- 401: Automatic token refresh or logout
- 4xx: Display error message
- 5xx: Display server error
- Network: Connection error message

## Performance Optimizations

- Lazy-loaded route components
- OnPush change detection strategy (ready to implement)
- Unsubscribe from observables on component destroy
- Efficient array operations in services
- Material CDK virtual scrolling (ready to implement)
- Image optimization and lazy loading (ready to implement)

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 15+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Development

### Code Style
- TypeScript strict mode enabled
- ESLint ready (add @angular-eslint)
- SCSS with nesting and variables
- Comprehensive inline comments

### Testing
Add testing support:
```bash
npm install --save-dev jasmine karma karma-jasmine karma-chrome-launcher @angular/core/testing
```

### Debugging
- Angular DevTools extension
- Browser DevTools
- Console logging for errors
- Network tab inspection

## Deployment

### Build
```bash
# Production build
npm run build

# Output in dist/personal-website-frontend/
```

### Environment Setup
1. Update `environment.prod.ts` with production API URL
2. Configure backend CORS to allow frontend domain
3. Set up SSL/TLS certificates
4. Configure CSP headers

### Deployment Options
- **Vercel**: Push to GitHub, auto-deploy
- **Netlify**: Connect repository, auto-build
- **AWS S3 + CloudFront**: Manual deployment
- **Docker**: Containerize with nginx
- **Traditional Hosting**: FTP/SFTP deployment

## Contributing

When adding new features:
1. Create feature components as standalone
2. Add services with clear APIs
3. Update routes in `app.routes.ts`
4. Follow dark theme styling guidelines
5. Add responsive design support
6. Include error handling
7. Document component interfaces
8. Test in different breakpoints

## License

This project is provided as-is for personal use.

## Support

For issues or questions:
1. Check component documentation
2. Review similar components
3. Check service implementations
4. Verify API endpoints in backend
5. Check browser console for errors
6. Inspect network requests

---

**Built with Angular 19, Material Design, and TypeScript**
