# ARIA FinOps: React.js Frontend Design for Cost Intelligence Dashboard

This document outlines the React.js frontend design for the ARIA FinOps and Cost Intelligence modules. The frontend will provide a rich, interactive user experience for tracking, attributing, and optimizing AI costs, aligning with the existing ARIA dashboard's dark theme and design principles. It will be built using **React 18**, **TypeScript**, and **Tailwind CSS**, leveraging charting libraries like Recharts or D3.js for data visualization.

## 1. Project Structure

The FinOps frontend will reside within the existing `aria-web/` module, ensuring consistency with the overall ARIA application structure.

```
aria/
  aria-web/          → Existing React 18 + TypeScript + WebSocket client
    src/
      components/    → Reusable UI components (buttons, cards, tables)
      features/      → Feature-specific components and logic
        finops/      → NEW: FinOps specific components
          components/  → Smaller, reusable FinOps UI elements
          pages/       → Main FinOps dashboard pages
            ExecutiveFinOpsDashboard.tsx
            CostIntelligenceDashboard.tsx
          hooks/       → Custom React hooks for data fetching/state management
          services/    → API client for FinOps backend
          types/       → TypeScript interfaces for FinOps data
      layouts/       → Overall page layouts (e.g., sidebar, header)
      lib/           → Utility functions, charting configurations
      styles/        → Tailwind CSS configurations, global styles
      App.tsx        → Main application entry point
      main.tsx       → React rendering setup
    package.json     → Frontend dependencies
    tailwind.config.js → Tailwind CSS configuration
    tsconfig.json    → TypeScript configuration
```

## 2. UI/UX Design Principles

*   **Consistency**: Adhere to the existing ARIA dashboard's dark theme, typography, color palette (neon accents), and component styling.
*   **Clarity**: Present complex financial data in an easily digestible and intuitive manner.
*   **Interactivity**: Enable users to drill down, filter, and simulate scenarios to explore cost drivers and optimization opportunities.
*   **Responsiveness**: Ensure the dashboard is usable across various screen sizes.
*   **Performance**: Optimize rendering for smooth user experience, especially with data-heavy visualizations.

## 3. Key Frontend Components and Pages

### 3.1. `ExecutiveFinOpsDashboard.tsx`

**Purpose**: Provides a high-level overview of AI spend and financial health for executives.

*   **Layout**: Similar to the existing ARIA dashboard, using a grid of cards for key metrics.
*   **Components**:
    *   **Metric Cards**: Displaying `Total AI Spend (MTD)`, `Projected Annual AI Spend`, `Total Savings Identified by ARIA`, and `Cost per 1,000 AI Transactions`.
    *   **Cost Waterfall Chart**: A Recharts/D3.js based waterfall chart visualizing the breakdown of `Total Cost` into `Model Cost`, `Infrastructure Cost`, `Observability Cost`, `Governance Cost`, `Storage Cost`, and `Network Cost`.
    *   **Spend by Line of Business (LOB) Bar Chart**: Horizontal bar chart showing AI spend attributed to different LOBs.
    *   **ROI / Value Realization Trend Line**: A line chart illustrating the trend of AI spend against a chosen business value metric (e.g., developer productivity, revenue impact).
*   **Interactivity**: Date range picker, environment filter.

### 3.2. `CostIntelligenceDashboard.tsx`

**Purpose**: Offers granular insights into AI costs and actionable optimization recommendations for engineering and platform teams.

*   **Layout**: Features a main content area with interactive visualizations and a dedicated sidebar or section for optimization recommendations.
*   **Components**:
    *   **Cost Attribution Tree/Graph**: An interactive tree-map or force-directed graph visualization (using D3.js or Cytoscape.js) allowing users to drill down from `Organization` to `LOB`, `Project`, `Application`, `User`, and `Model` to see cost distribution. Each node would display its attributed cost.
    *   **Before vs. After Comparison Chart**: A stacked bar chart or grouped bar chart showing current costs versus projected costs after applying ARIA's optimization recommendations. This will clearly highlight potential savings across different cost categories.
    *   **Optimization Recommendations Panel**: A scrollable list of cards, each representing an `OptimizationRecommendation`.
        *   Each card will display: `Recommendation Type`, `Description`, `Target Dimension`, `Estimated Savings (USD)`, `Confidence Score`, and `Status`.
        *   Action buttons: `Apply` (triggers `POST /api/v1/finops/recommendations/{id}/apply`), `Dismiss` (triggers `POST /api/v1/finops/recommendations/{id}/dismiss`), `Create Ticket` (triggers `POST /api/v1/finops/recommendations/{id}/create-ticket`).
    *   **What-If Simulator**: An interactive section with sliders and input fields:
        *   **Sliders**: `Requests per Minute (RPM)`, `Trace Retention Days`, `Evaluation Coverage %`, `Default Model Tier`.
        *   **Real-time Output**: Displays `Projected Monthly Cost` and `Potential Savings` dynamically as sliders are adjusted.
    *   **Detailed Cost Breakdown Table**: A sortable and filterable table showing `ai_usage_event` data, allowing users to inspect individual AI interactions and their associated costs.
*   **Interactivity**: Filters for dimensions (User, Model, Application, LOB), date range picker, search functionality for recommendations.

### 3.3. Reusable UI Components

*   **`FinOpsMetricCard.tsx`**: A generic card component for displaying key performance indicators with a title, value, and optional trend indicator.
*   **`ChartContainer.tsx`**: A wrapper component for charts, providing consistent styling, loading states, and error handling.
*   **`RecommendationCard.tsx`**: A component to display individual optimization recommendations with action buttons.
*   **`DimensionFilter.tsx`**: A dropdown/multi-select component for filtering data by various dimensions (User, Model, LOB, etc.).

## 4. Data Flow and API Integration

*   **API Client**: A dedicated `FinOpsApiService` (e.g., `src/features/finops/services/FinOpsApiService.ts`) will handle all communication with the Spring Boot backend, using `axios` or `fetch`.
*   **Data Fetching**: React Query or SWR will be used for efficient data fetching, caching, and state management, reducing boilerplate and improving performance.
*   **State Management**: React Context API or Zustand/Jotai for local component state, with global state managed for filters and user preferences.
*   **Authentication**: Leverage the existing ARIA frontend's JWT authentication mechanism to secure API calls.

## 5. Mock Data Strategy for Frontend Development

During frontend development, before full backend integration, mock API responses will be used to simulate data. This will allow parallel development and rapid iteration on the UI/UX. The mock data will mirror the structure of the DTOs defined in the backend API design.

## 6. Technology Stack Details

*   **React 18**: For building dynamic and interactive user interfaces.
*   **TypeScript**: For type safety and improved developer experience.
*   **Tailwind CSS**: For utility-first CSS styling, ensuring rapid and consistent UI development.
*   **Recharts / D3.js**: For powerful and customizable data visualizations.
*   **React Query / SWR**: For efficient server state management.
*   **Vite**: As the build tool for fast development and optimized production builds.
*   **Axios / Fetch API**: For making HTTP requests to the backend.

This frontend design ensures a visually appealing, highly functional, and intuitive FinOps dashboard that seamlessly integrates with the ARIA platform and provides valuable insights into AI cost management.
