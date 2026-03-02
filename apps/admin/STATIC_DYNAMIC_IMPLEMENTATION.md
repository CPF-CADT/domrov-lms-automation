# Static & Dynamic Section - Implementation Guide

## Quick Start

### 1. For Static Sections (Headers, Footers)

```tsx
import { StaticSection } from "../components/sections";
import Header from "./Header";

// In your page component
<StaticSection ariaLabel="Page header">
  <Header />
</StaticSection>;
```

**Remember:** Always memoize the Header component itself!

```tsx
// Header.tsx
export default React.memo(Header);
```

### 2. For Dynamic Sections (Stats, Charts, Tables)

```tsx
import { DynamicSection } from "../components/sections";

// In your component
const [data, setData] = useState(null);
const [isLoading, setIsLoading] = useState(true);
const [isRefreshing, setIsRefreshing] = useState(false);
const [error, setError] = useState<string | null>(null);

// Always use useCallback for handlers
const handleRefresh = useCallback(async () => {
  try {
    setIsRefreshing(true);
    const newData = await fetchService.getData();
    setData(newData);
  } catch (err) {
    setError("Failed to refresh");
  } finally {
    setIsRefreshing(false);
  }
}, []);

return (
  <DynamicSection
    title="My Data"
    isLoading={isLoading}
    isRefreshing={isRefreshing}
    error={error}
    onRefresh={handleRefresh}
  >
    <YourContent data={data} />
  </DynamicSection>
);

// Don't forget to memoize!
export default React.memo(MyComponent);
```

---

## Component Hierarchy Diagram

```
MainLayout (h-screen, overflow-hidden)
│
├── Sidebar (flex-shrink-0, w-56)
│   └── Fixed navigation (never scrolls)
│
└── main (flex-1, overflow-hidden)
    │
    └── content-wrapper (px-4...px-12, py-6...py-12)
        │
        ├── StaticSection (Header)
        │   └── Header (memoized - never re-renders)
        │       ├── Title
        │       ├── Notification Button
        │       └── User Profile
        │
        └── Dynamic Sections Container (space-y-8)
            │
            ├── DynamicSection (StatsCards)
            │   ├── Loading State → Skeleton Grid (4 items)
            │   ├── Error State → Alert + Retry Button
            │   └── Content State → Stats Card Grid
            │       ├── Total Users Card
            │       ├── Active Users Card
            │       ├── Revenue Card
            │       └── Transactions Card
            │
            ├── Grid (cols-1, lg:cols-3)
            │   │
            │   ├── DynamicSection (UserGrowthChart)
            │   │   ├── Loading State → Chart Skeleton
            │   │   ├── Error State → Alert + Retry Button
            │   │   └── Content State → Bar Chart
            │   │       └── 7 Interactive Bars (M-Su)
            │   │
            │   └── DynamicSection (RecentActivity)
            │       ├── Loading State → List Skeleton
            │       ├── Error State → Alert + Retry Button
            │       └── Content State → Activity List
            │           ├── Activity Item 1
            │           ├── Activity Item 2
            │           ├── Activity Item 3
            │           ├── Activity Item 4
            │           └── Activity Item 5
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                   DASHBOARD PAGE (MEMOIZED)                │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │           STATIC SECTION (HEADER)                      │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │ Header Component (React.memo)                    │  │ │
│  │  │ - Never receives changing props                 │  │ │
│  │  │ - Never re-renders                              │  │ │
│  │  │ - Completely isolated                           │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │       STATS CARDS (DYNAMIC SECTION)                    │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │ useState: [stats, isLoading, error]             │  │ │
│  │  │ useCallback: [fetchStats, handleRefresh]        │  │ │
│  │  │ useEffect: triggerFetchOnMount                  │  │ │
│  │  │                                                  │  │ │
│  │  │ DynamicSection:                                 │  │ │
│  │  │  - Manages loading skeleton                     │  │ │
│  │  │  - Shows error message on failure               │  │ │
│  │  │  - Provides refresh button                      │  │ │
│  │  │  - Smooth fade-in on content load               │  │ │
│  │  │                                                  │  │ │
│  │  │ Content:                                         │  │ │
│  │  │  - Total Users: 1,234 (+5.2% growth)           │  │ │
│  │  │  - Active Users: 456                           │  │ │
│  │  │  - Revenue: $12,345                            │  │ │
│  │  │  - Transactions: 789                           │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │    USER GROWTH CHART (DYNAMIC SECTION)                │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │ useState: [chartData, isLoading, error]         │  │ │
│  │  │ useCallback: [fetchChart, handleRefresh]        │  │ │
│  │  │ useEffect: triggerFetchOnMount                  │  │ │
│  │  │                                                  │  │ │
│  │  │ DynamicSection:                                 │  │ │
│  │  │  - Shows chart skeleton during loading          │  │ │
│  │  │  - Error handling with retry                    │  │ │
│  │  │  - Manual refresh capability                    │  │ │
│  │  │                                                  │  │ │
│  │  │ Content:                                         │  │ │
│  │  │  ███          Interactive bar chart              │  │ │
│  │  │  ███ ██ █████ Shows daily income data           │  │ │
│  │  │  Mon Tue Wed Thu Fri Sat Sun                    │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │    RECENT ACTIVITY (DYNAMIC SECTION)                  │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │ useState: [activities, isLoading, error]        │  │ │
│  │  │ useCallback: [fetchActivity, handleRefresh]     │  │ │
│  │  │ useEffect: triggerFetchOnMount                  │  │ │
│  │  │                                                  │  │ │
│  │  │ DynamicSection:                                 │  │ │
│  │  │  - List skeleton during loading                 │  │ │
│  │  │  - Error display with retry button              │  │ │
│  │  │  - Refresh button for latest activities         │  │ │
│  │  │                                                  │  │ │
│  │  │ Content:                                         │  │ │
│  │  │  🛍️ John Smith purchased package - 2m ago       │  │ │
│  │  │  👤 Jane Doe registered - 1h ago               │  │ │
│  │  │  🛍️ Bob Johnson purchased package - 3h ago     │  │ │
│  │  │  👤 Alice Williams registered - 5h ago         │  │ │
│  │  │  🛍️ Charlie Brown purchased package - 1d ago   │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## State Management Pattern

### For Each Dynamic Section:

```
MOUNTING
   ↓
[useEffect triggers]
   ↓
setIsLoading(true)
   ↓ (async fetch)
setData(result)
setIsLoading(false)
   ↓
RENDER: Content with fade-in animation

---

ON REFRESH CLICK
   ↓
setIsRefreshing(true)
   ↓ (async fetch)
setData(newResult)
setIsRefreshing(false)
   ↓
RENDER: Content with animated refresh button

---

ON ERROR
   ↓
setError(message)
setIsLoading(false)
   ↓
RENDER: Alert box with retry button
```

---

## Coding Patterns

### ✅ Pattern 1: Fetch Data on Mount

```tsx
const MyComponent: React.FC = () => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // useCallback prevents function recreation
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await apiService.getData();
      setData(result);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // useEffect runs once on mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Always memoize
  return ...;
};

export default React.memo(MyComponent);
```

### ✅ Pattern 2: Add Refresh Button

```tsx
const MyComponent: React.FC = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Separate handler for refresh to manage isRefreshing state
  const handleRefresh = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const result = await apiService.getData();
      setData(result);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  return (
    <DynamicSection onRefresh={handleRefresh} isRefreshing={isRefreshing}>
      {/* content */}
    </DynamicSection>
  );
};
```

### ✅ Pattern 3: Custom Loading Skeleton

```tsx
const customLoadingContent = (
  <div className="grid grid-cols-4 gap-4">
    {Array(4)
      .fill(0)
      .map((_, i) => (
        <div key={i} className="h-24 bg-gray-200 rounded animate-pulse" />
      ))}
  </div>
);

<DynamicSection loadingContent={customLoadingContent}>
  {data && <Content />}
</DynamicSection>;
```

---

## Visual Layout

### Desktop (1280px+)

```
┌─────────────────────────────────────────────────────┐
│                    HEADER                           │
├──────────┬────────────────────────────────────────┤
│          │                                        │
│ SIDEBAR  │  Dashboard                             │
│ w-64     │  Key Statistics                        │
│          │  ┌────┬────┬────┬────┐                 │
│          │  │St1 │St2 │St3 │St4 │                 │
│          │  └────┴────┴────┴────┘                 │
│          │                                        │
│          │  ┌──────────────┬──────────────┐       │
│          │  │  Growth      │  Activity    │       │
│          │  │  Chart       │  Feed        │       │
│          │  │              │              │       │
│          │  │              │              │       │
│          │  └──────────────┴──────────────┘       │
│          │                                        │
└──────────┴────────────────────────────────────────┘
```

### Tablet (768px - 1024px)

```
┌─────────────────────────────────────┐
│          HEADER                     │
├─────────────────────────────────────┤
│ Dashboard                           │
│ Key Statistics                      │
│ ┌────┬────┬────┬────┐             │
│ │St1 │St2 │St3 │St4 │             │
│ └────┴────┴────┴────┘             │
│                                    │
│ ┌──────────────┬──────────────┐   │
│ │  Growth      │  Activity    │   │
│ │  Chart       │  Feed        │   │
│ │              │              │   │
│ └──────────────┴──────────────┘   │
│                                    │
└─────────────────────────────────────┘
```

### Mobile (<768px)

```
┌────────────────────────┐
│   HEADER (Fixed)       │
├────────────────────────┤
│ Dashboard              │
│                        │
│ Key Statistics         │
│ ┌────────────────────┐ │
│ │  Statistic Card 1  │ │
│ └────────────────────┘ │
│ ┌────────────────────┐ │
│ │  Statistic Card 2  │ │
│ └────────────────────┘ │
│ ...                    │
│                        │
│ Growth Chart           │
│ ┌────────────────────┐ │
│ │      Chart         │ │
│ └────────────────────┘ │
│                        │
│ Recent Activity        │
│ ┌────────────────────┐ │
│ │ Activity Item 1    │ │
│ └────────────────────┘ │
│ ┌────────────────────┐ │
│ │ Activity Item 2    │ │
│ └────────────────────┘ │
│ ...                    │
│                        │
└────────────────────────┘
(Sidebar hidden, no sideways scroll)
```

---

## Testing the Implementation

### Test 1: Static Content Never Re-renders

```tsx
// Add a console.log in Header component
const Header = () => {
  console.log('Header rendered');
  return ...
};

// Expected: "Header rendered" appears ONLY once on mount
// Expected: Changes to other sections don't trigger this log
```

### Test 2: Dynamic Content Updates Independently

```tsx
// Click refresh on StatsCards
// Expected: Only stats skeleton shows, other sections unaffected
// Expected: Smooth fade-in when stats load
// Expected: No full page re-render
```

### Test 3: Error Handling

```tsx
// Close network in DevTools
// Click refresh on any section
// Expected: Error message displays with retry button
// Expected: Retry button works when network restored
// Expected: Other sections unaffected
```

### Test 4: Loading States

```tsx
// Check performance profiler
// Expected: Only relevant component updates on data change
// Expected: No "wasted renders" on static sections
// Expected: Smooth animations between states
```

---

## Performance Checklist

- [ ] All components wrapped with `React.memo()`
- [ ] All callbacks wrapped with `useCallback()`
- [ ] Static sections receive no changing props
- [ ] Each DynamicSection has its own state
- [ ] Error boundaries considered for crash handling
- [ ] ARIA roles properly assigned
- [ ] Loading skeleton matches content layout
- [ ] Transitions are smooth (300ms fade)
- [ ] Refresh button provides visual feedback
- [ ] Mobile layout tested and responsive

---

## Common Issues & Solutions

### Issue: Header re-renders on every parent change

**Solution:**

```tsx
// Ensure Header is wrapped with React.memo
export default React.memo(Header);

// Ensure StaticSection also memoized
export default React.memo(StaticSection);
```

### Issue: Refresh button doesn't show

**Solution:**

```tsx
// Make sure onRefresh prop is provided
<DynamicSection
  onRefresh={handleRefresh}  // This is required
  isRefreshing={isRefreshing}
>
```

### Issue: Loading skeleton doesn't match content

**Solution:**

```tsx
// Provide custom loadingContent that matches your layout
const loadingContent = (
  <div className="grid grid-cols-4 gap-4">
    {/* Match the exact grid of your content */}
  </div>
);

<DynamicSection loadingContent={loadingContent} />;
```

---

## Further Reading

- STATIC_DYNAMIC_PATTERN.md - Full architecture guide
- PAGINATION_IMPLEMENTATION.md - Pagination pattern
- REFACTORING_GUIDE.md - Previous refactoring work
