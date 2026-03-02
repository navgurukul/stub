# Employee Database Module - Design Document

## Overview

This design document defines the Employee Database Module, a new feature that displays a searchable and filterable table of employees within the organization. The module integrates with the existing navigation sidebar and follows established project patterns for component structure, API integration, and UI consistency.

## Objectives

- Provide employees with access to view the organization's employee directory
- Enable search and filtering capabilities based on multiple query parameters
- Maintain consistency with existing UI patterns and component architecture
- Integrate seamlessly with the authenticated user experience

## User Stories

As an authenticated user, I want to:

- View a list of all employees in my organization
- Search for employees by name, email, or other text criteria
- Filter employees by manager relationship
- Filter employees by role
- Navigate through paginated results when the employee list is large
- See relevant employee information including department, employment status, and work location type

## System Context

### Integration Points

**Navigation Sidebar**

- A new menu item will be added to the main navigation section (navLinks)
- Positioned alongside existing items like Activity Tracker, Leaves, and Project Management
- Accessible to all authenticated users

**API Endpoint**

- Base endpoint: `/v1/users`
- Authentication required via bearer token (handled by apiClient)
- Organization context automatically included via orgId from authenticated user

**Existing Infrastructure**

- API Client: Uses centralized apiClient from lib/api-client.ts
- Authentication: Integrates with useAuth hook for user context and orgId
- Constants: New API path defined in API_PATHS constant object
- UI Components: Reuses existing shadcn/ui components (Table, Pagination, Select, Input, Badge, etc.)

## Feature Requirements

### Functional Requirements

1. **Employee List Display**

   - Display employee data in a table format with columns for key attributes
   - Show relevant employee information: name, email, department, employment status, work location, role
   - Handle empty states when no employees match current filters
   - Display loading states during data fetching

2. **Search Functionality**

   - Text-based search using query parameter "q"
   - Search input field with clear button when text is present
   - Search triggered on button click or Enter key press
   - Search applies across employee name, email, and other searchable fields (server-side)

3. **Filter Capabilities**

   - Filter by Manager: Dropdown selection using managerId parameter
   - Filter by Role: Dropdown selection using role parameter
   - Filters combine with search query
   - Clear indication of active filters

4. **Pagination**

   - Support for paginated results using page and limit parameters
   - Default limit: 25 employees per page
   - Pagination controls with Previous, Next, and numbered page links
   - Display current page indicator
   - Show ellipsis for non-adjacent pages on larger screens
   - Total count display showing results summary

5. **Responsive Design**
   - Mobile-friendly table layout
   - Adaptive pagination controls (hide certain elements on mobile)
   - Consistent with existing responsive patterns in the application

### Non-Functional Requirements

1. **Performance**

   - Efficient API calls with proper query parameter management
   - Avoid unnecessary re-fetching when filters don't change
   - Loading states to provide immediate user feedback

2. **User Experience**

   - Consistent with existing page patterns (Projects, Leaves, etc.)
   - Clear visual feedback for loading, empty, and error states
   - Intuitive filter and search controls

3. **Code Quality**
   - Follow established component structure patterns (page + \_components folder)
   - Maintain separation of concerns (container vs presentational components)
   - Proper TypeScript typing for all data structures
   - Defensive handling of API response variants

## Data Model

### Employee Data Structure

Based on the API response structure:

| Field                | Type           | Description                                                           |
| -------------------- | -------------- | --------------------------------------------------------------------- |
| id                   | number         | Unique employee identifier                                            |
| name                 | string         | Full name of the employee                                             |
| email                | string         | Employee email address                                                |
| orgId                | number         | Organization identifier                                               |
| status               | string         | Account status (e.g., "active")                                       |
| managerId            | number \| null | ID of the employee's manager                                          |
| employeeDepartmentId | number         | ID of the employee's department                                       |
| workLocationType     | string         | Work arrangement (e.g., "Remote", "Hybrid", "On-site")                |
| dateOfJoining        | string         | ISO date of employment start                                          |
| employmentType       | string         | Type of employment (e.g., "Part Time/Hourly Consultant", "Full Time") |
| employmentStatus     | string         | Current employment status (e.g., "active", "inactive")                |
| dateOfExit           | string \| null | ISO date of employment end (if applicable)                            |
| slackId              | string \| null | Slack user identifier                                                 |
| alumniStatus         | string \| null | Alumni designation if applicable                                      |
| gender               | string         | Employee gender                                                       |
| discordId            | string \| null | Discord user identifier                                               |
| rolePrimary          | string         | Primary role designation                                              |
| avatarUrl            | string \| null | URL to employee avatar image                                          |
| createdAt            | string         | ISO timestamp of record creation                                      |
| updatedAt            | string         | ISO timestamp of last update                                          |
| roles                | string[]       | Array of role designations                                            |
| employeeDepartment   | Department     | Nested department object                                              |

### Department Data Structure

| Field       | Type           | Description            |
| ----------- | -------------- | ---------------------- |
| id          | number         | Department identifier  |
| name        | string         | Department name        |
| code        | string \| null | Department code        |
| description | string \| null | Department description |

### API Response Structure

| Field | Type       | Description                                |
| ----- | ---------- | ------------------------------------------ |
| data  | Employee[] | Array of employee objects                  |
| page  | number     | Current page number                        |
| limit | number     | Results per page                           |
| total | number     | Total count of employees matching criteria |

### Query Parameters

| Parameter | Type   | Required | Description                                       |
| --------- | ------ | -------- | ------------------------------------------------- |
| orgId     | number | Yes      | Organization identifier (from authenticated user) |
| managerId | number | No       | Filter by manager ID                              |
| role      | string | No       | Filter by role designation                        |
| q         | string | No       | Text search query                                 |
| page      | number | No       | Page number (default: 1)                          |
| limit     | number | No       | Results per page (default: 25)                    |

## Component Architecture

### File Structure

```
app/(authenticated)/employees/
├── page.tsx                          # Main page (container component)
└── _components/
    ├── EmployeeFilters.tsx          # Filter and search controls
    ├── EmployeesTable.tsx           # Table presentational component
    ├── EmptyState.tsx               # Empty results display
    ├── LoadingState.tsx             # Loading skeleton
    └── index.ts                      # Barrel export
```

### Component Responsibilities

**page.tsx (Container Component)**

- Manages all state (employees data, filters, pagination, loading)
- Fetches employee data from API using apiClient
- Retrieves orgId from useAuth hook
- Transforms API response data for child components
- Handles filter changes and triggers re-fetch
- Manages pagination state and navigation
- Implements error handling and user feedback via toast notifications
- Renders page layout with AppHeader and PageWrapper

**EmployeeFilters.tsx (Presentational)**

- Renders search input with clear functionality
- Displays manager filter dropdown
- Displays role filter dropdown
- Accepts controlled values and change handlers as props
- No internal state or API logic
- Responsive layout for filter controls

**EmployeesTable.tsx (Presentational)**

- Receives array of employee data as props
- Renders table structure with appropriate columns
- Displays employee attributes with proper formatting
- Uses Badge components for status and role indicators
- No data fetching or transformation logic

**EmptyState.tsx (Presentational)**

- Displays message when no employees match current filters
- Provides guidance on adjusting search/filter criteria
- Reusable component with consistent styling

**LoadingState.tsx (Presentational)**

- Displays skeleton loaders while data is being fetched
- Maintains table structure during loading
- Uses Skeleton UI components for consistent loading experience

## User Interface Design

### Page Layout

The page follows the established pattern used in Project Management:

- **Header**: AppHeader with breadcrumb navigation (Dashboard → Employee Database)
- **Wrapper**: PageWrapper for consistent spacing and layout
- **Card Container**: Main card with title, description, and content area
- **Filter Section**: Search and filter controls at the top of the card content
- **Table Section**: Bordered container with table, empty state, or loading state
- **Pagination Section**: Pagination controls below the table (when applicable)
- **Results Summary**: Text display showing count of visible results

### Table Columns

Suggested columns for the employee table:

| Column            | Data Source             | Formatting                     |
| ----------------- | ----------------------- | ------------------------------ |
| Name              | name                    | Plain text, medium font weight |
| Email             | email                   | Plain text, truncated if long  |
| Department        | employeeDepartment.name | Plain text                     |
| Role              | roles array             | Badge (first/primary role)     |
| Employment Status | employmentStatus        | Badge with status-based color  |
| Work Location     | workLocationType        | Plain text                     |

### Filter Controls Layout

Horizontal flex layout (similar to ProjectFilters):

- **Search Input**: Full-width on mobile, flex-1 on desktop, with search icon and clear button
- **Manager Filter**: Dropdown select control
- **Role Filter**: Dropdown select control
- **Search Button**: Trigger button for search action

### Pagination Controls

Using the provided Pagination component structure:

- **Previous Button**: Navigate to previous page (disabled on page 1)
- **Page Numbers**: Show current page, adjacent pages, and ellipsis for gaps
- **Next Button**: Navigate to next page (disabled on last page)
- **Responsive Behavior**: Hide ellipsis and some page numbers on mobile

### Visual States

**Loading State**

- Skeleton loaders matching table structure
- Maintains layout consistency during data fetch

**Empty State**

- Icon and message indicating no results found
- Guidance on adjusting filters or search terms

**Error State**

- Toast notification with error message
- Preserves previous data or shows empty state
- Clear error description for user action

## Behavioral Specifications

### Data Fetching Strategy

1. **Initial Load**

   - Wait for authentication to complete (authLoading check)
   - Verify orgId is available from authenticated user
   - Fetch employees with default parameters (page 1, limit 25, no filters)

2. **Filter Changes**

   - Reset page to 1 when search or filter changes
   - Trigger new API call with updated parameters
   - Show loading state during fetch

3. **Pagination Changes**

   - Update page parameter only
   - Maintain current search and filter values
   - Fetch new page of results

4. **Dependency Management**
   - Re-fetch when: page, limit, managerId, role, searchTerm, or orgId changes
   - Guard against fetching when authLoading is true
   - Guard against fetching when orgId is undefined

### Error Handling

1. **Missing orgId**

   - Display toast error with message: "Organization ID not found"
   - Prompt user to sign in again or contact admin
   - Do not attempt API call

2. **API Request Failure**

   - Log error to console for debugging
   - Extract error message from response or use fallback
   - Display toast with error title and description
   - Set employees array to empty to show empty state

3. **Invalid Response Structure**
   - Use defensive type checking (Array.isArray)
   - Default to empty array if data is not in expected format
   - Prevent runtime errors from malformed responses

### Search and Filter Interaction

1. **Search Input Behavior**

   - User types in search field (controlled input)
   - Search triggered by:
     - Clicking Search button
     - Pressing Enter key in search field
   - Clear button visible only when search input has value
   - Clicking clear button resets both searchInput and searchTerm states

2. **Filter Dropdown Behavior**

   - Manager filter: Dropdown populated with available managers
   - Role filter: Dropdown populated with available roles
   - Filter changes immediately trigger API call (no separate apply button)
   - Combine multiple filters in single API request

3. **Combined Search and Filters**
   - All active filters and search query sent together as query parameters
   - Server-side filtering and searching
   - Client maintains filter state independently

### Pagination Behavior

1. **Page Navigation**

   - Previous button: Decrements page by 1, disabled when page = 1
   - Next button: Increments page by 1, disabled when page = last page
   - Numbered links: Direct navigation to specific page
   - Current page visually highlighted

2. **Page Calculation**

   - Last page = Math.ceil(total / limit)
   - Display logic:
     - Always show page 1
     - Show current page and adjacent pages
     - Show last page
     - Use ellipsis to indicate skipped pages
     - Adjust visibility based on screen size (mobile vs desktop)

3. **Results Summary**
   - Display: "Showing X employees" or "Showing X employee" (singular)
   - Account for pagination: "Showing X-Y of Z employees"
   - Update dynamically based on current page and total

## Navigation Integration

### Sidebar Menu Addition

**Location**: Main navigation section (navLinks array in Sidebar.tsx)

**Menu Item Properties**:

- Title: "Employee Database"
- URL: "/employees"
- Icon: Users (from lucide-react)

**Positioning**: Between "Project Management" and Admin section

### Breadcrumb Navigation

**AppHeader Configuration**:

- Dashboard (/) → Employee Database

## Technical Specifications

### API Integration

**Endpoint Registration**

- Add to API_PATHS constant in lib/constants.ts
- Key: USERS (already exists as EMPLOYEES: "/v1/users")
- Use existing API_PATHS.EMPLOYEES constant

**API Client Usage**

- Import apiClient from @/lib/api-client
- Use apiClient.get() method with params object
- Automatic authentication header injection
- Automatic token refresh on 401 responses

**Request Example**:

```
const params = {
  orgId: user.orgId,
  page: 1,
  limit: 25,
  managerId: selectedManagerId, // optional
  role: selectedRole,           // optional
  q: searchQuery               // optional
};

const response = await apiClient.get(API_PATHS.EMPLOYEES, { params });
```

### State Management

**Container Component State**:

- employees: Employee[] - Array of employee data from API
- loading: boolean - Loading indicator for API requests
- page: number - Current page number
- limit: number - Results per page (default 25)
- total: number - Total employee count from API response
- managerFilter: string - Selected manager ID or "all"
- roleFilter: string - Selected role or "all"
- searchTerm: string - Active search query
- searchInput: string - Controlled search input value

**State Update Patterns**:

- Filter changes → Reset page to 1, update filter state, trigger fetch
- Search → Update searchTerm, reset page to 1, trigger fetch
- Pagination → Update page only, trigger fetch
- Clear search → Reset searchInput and searchTerm, trigger fetch

### Type Definitions

**TypeScript Interfaces**:

- Employee: Complete employee data structure matching API response
- Department: Nested department object structure
- EmployeesResponse: API response wrapper with data, page, limit, total
- EmployeeFiltersProps: Props interface for filter component
- EmployeesTableProps: Props interface for table component

**Type Safety Practices**:

- No usage of 'any' type
- Explicit typing for all function parameters and return values
- Defensive type guards for API response handling
- Optional chaining for nullable fields

### Styling Approach

**Utility Classes**:

- Tailwind CSS for all styling
- Consistent with existing component patterns
- Responsive breakpoints: sm, md, lg, xl

**Component Library**:

- shadcn/ui components for all UI elements
- Card, Table, Select, Input, Button, Badge, Pagination
- Skeleton for loading states

**Layout Patterns**:

- Flex layouts for filter controls
- Grid layouts where appropriate for responsive behavior
- Consistent spacing using Tailwind spacing scale

## Edge Cases and Considerations

### Authentication Guards

- Check authLoading before any API calls
- Verify user.orgId exists before making requests
- Display appropriate error when orgId is missing
- Redirect to login if authentication fails (handled by apiClient)

### Data Handling

- Empty employee list: Display EmptyState component
- No search results: Display EmptyState with search-specific message
- Malformed API response: Use Array.isArray() check, default to empty array
- Missing nested data (department): Handle with optional chaining and fallback display

### Pagination Edge Cases

- Total employees less than limit: Hide pagination controls
- Single page of results: Disable Previous and Next buttons
- Navigate to invalid page: Server validates, returns empty or error
- Rapid page changes: Loading state prevents multiple simultaneous requests

### Filter and Search Edge Cases

- No managers available: Display "No managers" in dropdown or hide filter
- No roles available: Display "No roles" in dropdown or hide filter
- Special characters in search: URL encode handled by axios params
- Empty search string: Should return all results (with other active filters)

### Responsive Behavior

- Mobile table: Consider horizontal scroll or stacked card layout for narrow screens
- Filter layout: Stack filters vertically on mobile, horizontal on desktop
- Pagination: Reduce visible page numbers on mobile, hide ellipsis

### Performance Considerations

- Debounce search input: Consider delaying search trigger if typing rapidly (optional enhancement)
- Memoization: Consider memoizing filter options if fetched separately
- Avoid redundant fetches: useEffect dependencies should be precise

## Future Enhancements

Potential features for future iterations:

1. **Employee Detail View**

   - Click on employee row to view detailed profile
   - Modal or dedicated page with full employee information

2. **Advanced Filters**

   - Filter by department
   - Filter by employment type
   - Filter by date of joining range
   - Combined filter panel with apply/reset buttons

3. **Export Functionality**

   - Export employee list to CSV or Excel
   - Respect current filters and search

4. **Sorting**

   - Sort by name, email, department, date of joining
   - Client-side or server-side sorting

5. **Bulk Actions**

   - Select multiple employees
   - Perform batch operations (if applicable to user role)

6. **Manager Hierarchy View**

   - Tree view of reporting structure
   - Expandable/collapsible org chart

7. **Dynamic Page Size**
   - Allow user to select limit (10, 25, 50, 100 per page)
   - Persist preference in localStorage

## Success Criteria

The Employee Database Module will be considered successfully implemented when:

1. Authenticated users can access the module via sidebar navigation
2. Employee list displays correctly with all specified columns
3. Search functionality filters employees based on text query
4. Manager and role filters work independently and in combination
5. Pagination controls allow navigation through multiple pages of results
6. Loading states provide clear feedback during data fetching
7. Empty states display when no results match criteria
8. Error handling gracefully manages API failures and missing data
9. UI is responsive and functional on mobile and desktop devices
10. Code follows established project patterns for structure, typing, and API integration
11. No console errors or warnings in browser
12. Performance is acceptable with reasonable response times for typical employee counts
