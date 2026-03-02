# Table Loader Refactoring Design

## Objective

Standardize all table loading states across the application to follow a consistent skeleton-based design pattern similar to the employees table implementation, eliminating code redundancy and ensuring the use of existing UI components.

## Current State Analysis

### Employees Table Loading Pattern

- Uses table-structured skeleton with header rows matching actual table columns
- Displays 5 skeleton rows with appropriate cell widths
- Maintains table structure during loading for better UX
- Located in: `app/(authenticated)/employees/_components/LoadingState.tsx`

### Projects Table Loading Pattern

- Uses centered spinner with loading message
- Different visual approach with fixed height container
- Located in: `app/(authenticated)/projects/_components/LoadingState.tsx`

### Leave History Table Loading Pattern

- Uses inline skeleton with 3 full-width rows
- Embedded within the table component itself
- Located in: `app/(authenticated)/leaves/history/_components/LeaveTable.tsx`

### Existing Reusable Components

- Skeleton component: `components/ui/skeleton.tsx`
- Spinner component: `components/ui/spinner.tsx` (uses Loader2Icon with standard styling)
- Table components: `components/ui/table.tsx`

## Design Strategy

### Standardized Loading State Structure

All table loading states shall follow the employees table pattern with the following characteristics:

#### Visual Structure

- Display table header row with actual column names
- Render 5 skeleton rows by default (configurable if needed)
- Use Skeleton component for cell content
- Maintain table border and spacing consistency

#### Component Parameters

- Column definitions: array of column header names
- Skeleton cell widths: array of width classes matching column content
- Row count: number of skeleton rows to display (default: 5)

### Component Consolidation Plan

#### Create Shared TableLoadingState Component

A reusable component that accepts table structure configuration:

**Input Properties:**

- `columns`: Array of objects containing header name and skeleton width
  - Structure: `{ header: string, skeletonWidth: string }`
  - Example: `{ header: "Name", skeletonWidth: "w-32" }`
- `rowCount`: Number of skeleton rows (optional, default: 5)

**Component Location:**

- Create new file: `components/ui/table-loading-state.tsx`

**Behavior:**

- Render Table component with TableHeader and TableBody
- Map over columns to create TableHead elements
- Generate specified number of TableRows with skeleton TableCells
- Apply skeleton width classes to match expected column content

#### Component Usage Pattern

Each table feature directory maintains its own LoadingState wrapper that configures the shared component with appropriate column definitions.

**Example structure:**

- Feature-specific LoadingState imports shared TableLoadingState
- Passes column configuration specific to that table
- Exports as LoadingState for use in page component

### Refactoring Targets

#### Projects Table

- Replace spinner-based loading with skeleton-based loading
- Match column structure: Department, Project Name, PM Email, Budget, Status
- Define appropriate skeleton widths for each column type

#### Leave History Table

- Extract inline loading logic to separate LoadingState component
- Match column structure: Leave Type, Start Date, End Date, Duration, Reason
- Create consistent component structure with other tables

### Component Reuse Principles

#### Spinner Component Usage

- Do not create new spinner implementations
- Use existing Spinner component from `components/ui/spinner.tsx` where spinners are appropriate
- Spinners suitable for: small inline loading indicators, button loading states, form submission states
- Not suitable for: table data loading states (use skeleton instead)

#### Skeleton Component Usage

- Use existing Skeleton component from `components/ui/skeleton.tsx`
- Do not create custom skeleton implementations
- Apply appropriate height and width classes for content type

### Code Organization

#### File Structure

```
components/ui/
  └── table-loading-state.tsx (new shared component)

app/(authenticated)/employees/_components/
  └── LoadingState.tsx (refactor to use shared component)

app/(authenticated)/projects/_components/
  └── LoadingState.tsx (refactor to use shared component)

app/(authenticated)/leaves/history/_components/
  └── LoadingState.tsx (create new, using shared component)
  └── LeaveTable.tsx (remove inline loading logic)
```

#### Import Patterns

- Feature components import from their own `_components/LoadingState`
- Feature LoadingState components import shared TableLoadingState
- All use existing Skeleton component
- No direct Loader2 imports in table loading states

## Design Decisions

### Why Skeleton Over Spinner for Tables

**User Experience:**

- Skeletons provide spatial awareness of content structure
- Users see where data will appear
- Reduces perceived loading time
- Maintains layout stability

**Consistency:**

- Employees table already uses this pattern successfully
- Industry standard for table loading states
- Matches user expectations

### Why Shared Component with Feature Wrappers

**Flexibility:**

- Each table can define its own column structure
- Easy to adjust row count if needed
- Maintains feature encapsulation

**Maintainability:**

- Single source of truth for loading pattern
- Easier to update styling globally
- Reduces code duplication

**Developer Experience:**

- Clear pattern for new tables
- Minimal configuration required
- Type-safe column definitions

## Implementation Considerations

### Column Width Mapping

Skeleton widths should approximate actual content:

- Short text (codes, numbers): `w-20` to `w-24`
- Medium text (names, departments): `w-32` to `w-40`
- Long text (emails, descriptions): `w-40` to `w-48`
- Badges/status indicators: `w-20` to `w-24`
- Dates: `w-24` to `w-32`

### Accessibility

- Table structure maintained for screen readers
- Skeleton elements use appropriate ARIA attributes
- Loading state clearly distinguishable from empty state

### Performance

- Lightweight component with minimal re-renders
- Uses array mapping for skeleton generation
- No complex state or effects required

## Non-Goals

- Modification of table data rendering logic
- Changes to empty state components
- Pagination component modifications
- Filter component modifications
- Backend loading optimization
- Addition of new loading state types beyond tables

## Success Criteria

- All table loading states use consistent skeleton pattern
- No redundant loading component code across features
- No new spinner or skeleton component implementations
- Existing Spinner component reused where appropriate
- All tables maintain visual consistency during loading
- Code is easier to maintain with shared component
- New tables can easily adopt the pattern
- Located in: `app/(authenticated)/leaves/history/_components/LeaveTable.tsx`

### Existing Reusable Components

- Skeleton component: `components/ui/skeleton.tsx`
- Spinner component: `components/ui/spinner.tsx` (uses Loader2Icon with standard styling)
- Table components: `components/ui/table.tsx`

## Design Strategy

### Standardized Loading State Structure

All table loading states shall follow the employees table pattern with the following characteristics:

#### Visual Structure

- Display table header row with actual column names
- Render 5 skeleton rows by default (configurable if needed)
- Use Skeleton component for cell content
- Maintain table border and spacing consistency

#### Component Parameters

- Column definitions: array of column header names
- Skeleton cell widths: array of width classes matching column content
- Row count: number of skeleton rows to display (default: 5)

### Component Consolidation Plan

#### Create Shared TableLoadingState Component

A reusable component that accepts table structure configuration:

**Input Properties:**

- `columns`: Array of objects containing header name and skeleton width
  - Structure: `{ header: string, skeletonWidth: string }`
  - Example: `{ header: "Name", skeletonWidth: "w-32" }`
- `rowCount`: Number of skeleton rows (optional, default: 5)

**Component Location:**

- Create new file: `components/ui/table-loading-state.tsx`

**Behavior:**

- Render Table component with TableHeader and TableBody
- Map over columns to create TableHead elements
- Generate specified number of TableRows with skeleton TableCells
- Apply skeleton width classes to match expected column content

#### Component Usage Pattern

Each table feature directory maintains its own LoadingState wrapper that configures the shared component with appropriate column definitions.

**Example structure:**

- Feature-specific LoadingState imports shared TableLoadingState
- Passes column configuration specific to that table
- Exports as LoadingState for use in page component

### Refactoring Targets

#### Projects Table

- Replace spinner-based loading with skeleton-based loading
- Match column structure: Department, Project Name, PM Email, Budget, Status
- Define appropriate skeleton widths for each column type

#### Leave History Table

- Extract inline loading logic to separate LoadingState component
- Match column structure: Leave Type, Start Date, End Date, Duration, Reason
- Create consistent component structure with other tables

### Component Reuse Principles

#### Spinner Component Usage

- Do not create new spinner implementations
- Use existing Spinner component from `components/ui/spinner.tsx` where spinners are appropriate
- Spinners suitable for: small inline loading indicators, button loading states, form submission states
- Not suitable for: table data loading states (use skeleton instead)

#### Skeleton Component Usage

- Use existing Skeleton component from `components/ui/skeleton.tsx`
- Do not create custom skeleton implementations
- Apply appropriate height and width classes for content type

### Code Organization

#### File Structure

```
components/ui/
  └── table-loading-state.tsx (new shared component)

app/(authenticated)/employees/_components/
  └── LoadingState.tsx (refactor to use shared component)

app/(authenticated)/projects/_components/
  └── LoadingState.tsx (refactor to use shared component)

app/(authenticated)/leaves/history/_components/
  └── LoadingState.tsx (create new, using shared component)
  └── LeaveTable.tsx (remove inline loading logic)
```

#### Import Patterns

- Feature components import from their own `_components/LoadingState`
- Feature LoadingState components import shared TableLoadingState
- All use existing Skeleton component
- No direct Loader2 imports in table loading states

## Design Decisions

### Why Skeleton Over Spinner for Tables

**User Experience:**

- Skeletons provide spatial awareness of content structure
- Users see where data will appear
- Reduces perceived loading time
- Maintains layout stability

**Consistency:**

- Employees table already uses this pattern successfully
- Industry standard for table loading states
- Matches user expectations

### Why Shared Component with Feature Wrappers

**Flexibility:**

- Each table can define its own column structure
- Easy to adjust row count if needed
- Maintains feature encapsulation

**Maintainability:**

- Single source of truth for loading pattern
- Easier to update styling globally
- Reduces code duplication

**Developer Experience:**

- Clear pattern for new tables
- Minimal configuration required
- Type-safe column definitions

## Implementation Considerations

### Column Width Mapping

Skeleton widths should approximate actual content:

- Short text (codes, numbers): `w-20` to `w-24`
- Medium text (names, departments): `w-32` to `w-40`
- Long text (emails, descriptions): `w-40` to `w-48`
- Badges/status indicators: `w-20` to `w-24`
- Dates: `w-24` to `w-32`

### Accessibility

- Table structure maintained for screen readers
- Skeleton elements use appropriate ARIA attributes
- Loading state clearly distinguishable from empty state

### Performance

- Lightweight component with minimal re-renders
- Uses array mapping for skeleton generation
- No complex state or effects required

## Non-Goals

- Modification of table data rendering logic
- Changes to empty state components
- Pagination component modifications
- Filter component modifications
- Backend loading optimization
- Addition of new loading state types beyond tables

## Success Criteria

- All table loading states use consistent skeleton pattern
- No redundant loading component code across features
- No new spinner or skeleton component implementations
- Existing Spinner component reused where appropriate
- All tables maintain visual consistency during loading
- Code is easier to maintain with shared component
- New tables can easily adopt the pattern
