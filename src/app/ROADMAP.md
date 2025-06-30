

# Unified School Management System - Roadmap

This document tracks the features implemented and planned for the Unified School Management System.

## ✅ Implemented Features

### I. Core Infrastructure & Setup
- [x] Next.js 15 with App Router
- [x] Tailwind CSS for styling
- [x] Ant Design component library integration
- [x] Database Setup:
    - [x] SuperAdmin DB connection (`mongoose`)
    - [x] Tenant-specific DB connections (`mongoose`)
- [x] Authentication (NextAuth.js):
    - [x] Credentials-based login
    - [x] Role-based access control (SuperAdmin, Admin, Teacher, Student, Finance, Librarian)
    - [x] Session management (JWT)
- [x] Basic Layouts:
    - [x] SuperAdmin Portal Layout (Sider, Header, Content)
    - [x] School Portal Layout (Sider with role-based menus, Header, Content, Breadcrumbs)
    - [x] Public School Website Layout (Header, Footer, Basic Navigation)
- [x] Middleware for route protection and role-based redirects

### II. SuperAdmin Portal (`/dashboard`, `/schools`)
- [x] **Dashboard**: Basic placeholder page.
- [x] **School Management**:
    - [x] List existing schools
    - [x] Add new schools (Name, School Code, MongoDB URI, Contact Info)
    - [x] Edit existing schools
    - [x] View school details

### III. School Portal - Admin Section (`/[schoolCode]/portal/admin/...`)
- [x] **Dashboard**: Placeholder page with basic structure.
- [x] **User Management**:
    - [x] List all tenant users (admins, teachers, students etc.)
    - [x] Add new tenant users with specific roles (Admin, Teacher, Finance, etc.)
    - [x] Edit tenant user details (profile info, role, status)
    - [x] Password management (set on create, optional update on edit)
- [x] **Student Management**:
    - [x] List all students with key details.
    - [x] Add new students (creates TenantUser with 'student' role & Student profile).
    - [x] Edit student details (user info, profile info, academic class/year).
    - [x] Activate/Deactivate student accounts.
- [x] **Teacher Management**:
    - [x] List all teachers with key details.
    - [x] Add new teachers (creates TenantUser with 'teacher' role & Teacher profile).
    - [x] Edit teacher details (user info, profile info, qualifications, specialization).
    - [x] Activate/Deactivate teacher accounts.
    - [x] API support for `assignedClassesAndSubjects` (UI for direct assignment management modal exists).
- [x] **Academics Management**:
    - [x] **Academics Overview Page**: Dashboard for academic modules.
    - [x] **Academic Year Management**: CRUD operations, including setting the active year.
    - [x] **Term Management**: CRUD operations, linked to Academic Years, including setting active term.
    - [x] **Subject Management**: CRUD operations for school subjects.
    - [x] **Class Management**: CRUD operations, linking classes to academic years, class teachers (optional), and subjects offered.
    - [x] **A-Level Combination Management**: CRUD operations for A-Level subject combinations, linked to academic years and subjects.
    - [x] **Timetable Management (Admin Shell & Period Management)**: CRUD for timetable definitions (name, year, class, term, status). Management of individual periods. Includes conflict detection for periods and copy timetable functionality.
    - [x] **Grading Scale Management**: CRUD for grading scales, including specific types for O-Level divisions, A-Level points, and grade definitions with points/GPA. Enhanced model to support Tanzanian point systems.
    - [x] **Teacher Assignment UI**: More granular UI for managing teacher class/subject assignments.
- [x] **Exam Management**:
    - [x] **Exam Definition**: CRUD operations for exams (name, academic year, term, dates, status, weight).
    - [x] **Assessment Management**: CRUD operations for individual assessments (papers, practicals) under an exam, linking to subjects and classes.
- [x] **Student Attendance Records (Admin View)**:
    - [x] Admin page to filter and view attendance records (Academic Year, Class, Subject, Date Range).
    - [x] API endpoint to fetch attendance records with necessary population.
- [x] **Website Content Management**:
    - [x] **Website Management Overview Page**.
    - [x] **News Article Management**: CRUD operations for news articles (title, slug, content, images, etc.). Includes AI summary & content generation.
    - [x] **Event Management**: CRUD operations for school events (details, dates, images, etc.).
    - [x] **Gallery Management**: CRUD operations for gallery images (upload, title, album, tags).
    - [x] **Blog/Articles Management**: CRUD operations for blog posts.
- [x] **School Settings**:
    - [x] Manage basic website settings (School Name, Logo, Tagline, Contact Info, Footer, Colors).
    - [x] Manage "About Us" page content using Rich Text Editor with HTML sanitization.
    - [x] Manage public website navigation links.
- [x] **Admin Reports**:
    - [x] **Student Term Report**: View page for admins to select student, academic year, term and generate a term performance report using weighted exam scores and grading scales. Includes chart.
    - [x] **Class Performance Report**: View page for admins to see performance summary of all students in a class.
- [x] **Finance Management**:
    - [x] **Fee structure setup**: CRUD for individual fee items (name, amount, applicability).
    - [x] **Student fee collection and tracking** (Model, APIs, and UI Page for recording/viewing payments)
    - [x] **Financial reporting (Advanced: Beyond simple payment lists)**
        - [x] Basic Page and Navigation Created
        - [x] API for Fee Collection Summary Report
        - [x] UI for Fee Collection Summary Report (with filters and charts)
        - [x] API for Outstanding Balances Report
        - [x] UI for Outstanding Balances Report
        - [x] Expense Report (API and UI)
        - [x] Income Statement Report (UI)
    - [x] Invoicing and receipts (API and UI)
    - [x] Expense tracking (API and UI)
- [x] **Library Management**:
    - [x] **Book cataloging**: CRUD for books (title, author, ISBN, etc.).
    - [x] **Member management**: View list of students and teachers as library members.
    - [x] **Book borrowing and returns**: Handle circulation desk operations.
    - [x] **Fine management for overdue books**: Integrated into the circulation workflow.
    - [x] **Transaction History**: View all borrowing and return transactions with filters.
    - [x] **Library inventory and reporting**: Dashboard with key library statistics.
- [x] **Dormitory Management**:
    - [x] **Dormitory/Room setup**: Models, APIs, and UI for Dormitory & Room Management.
    - [x] **Student room allocation**: Backend APIs and UI for student assignment to rooms.
- [x] **Grading & Promotion**:
    - [x] **Process Promotions (Analysis)**: UI to view class performance and suggested promotion actions.
    - [x] **Process Promotions (Execution)**: UI and API to confirm and finalize student promotions.
- [x] **Pharmacy/Health Management**:
    - [x] Placeholder Dashboard & Navigation Created
    - [x] Data Models Created (HealthRecord, Visit, Medication, Dispensation)
    - [x] **Inventory of medical supplies (CRUD UI)**
    - [x] **Student health records (View/Edit UI)**
    - [x] **Check-in/Check-out workflow**
    - [x] Medication dispensing log

### IV. School Portal - Teacher Section (`/[schoolCode]/portal/teacher/...`)
- [x] **Marks Entry**:
    - [x] Selection page: Filter by Academic Year, Exam, Class, Subject to find assessments.
    - [x] Detailed Marks Entry page: Enter/update marks and comments for students for a specific assessment.
    - [x] API for batch mark submission with teacher authorization.
- [x] **My Classes**:
    - [x] View classes assigned for the active academic year.
    - [x] Link to student roster for each class.
- [x] **My Timetable**: Display comprehensive timetable for the teacher for the active academic year.
- [x] **Resources**:
    - [x] Upload and manage teaching resources.
    - [x] Share resources with specific classes/students (via `isPublic` and `classLevel` targeting).
- [x] **Attendance**:
    - [x] Selection page for class, subject, date.
    - [x] Entry page to mark attendance for students.
- [x] **My Profile**: Teachers can view their own detailed profile information.

### V. School Portal - Student Section (`/[schoolCode]/portal/student/...`)
- [x] **My Profile**: Students can view their own detailed profile information.
- [x] **My Results**: Students can view their marks for published exams, filtered by academic year and term. Display grouped by exam and subject.
- [x] **My Attendance**: Students can view their attendance records.
- [x] **Resources**: Access learning materials shared by teachers.
- [x] **My Timetable**: View personal class timetable based on active class and academic year.

### VI. Public School Website (`/[schoolCode]/...`)
- [x] **Dynamic Layout**: Header (logo, nav) and Footer driven by School Settings.
- [x] **Homepage**: Basic placeholder structure.
- [x] **News Listing Page**: Displays active news articles.
- [x] **Single News Article Page**: Displays full content of a news article by slug.
- [x] **Blog/Articles Page**: Displays active blog posts and single post pages.
- [x] **Events Listing Page**: Displays active upcoming and past events.
- [x] **Gallery Page**: Displays active gallery items, with album filtering.
- [x] **About Us Page**: Displays content managed from School Settings (sanitized HTML).
- [x] **Admissions Page**: Information on admission process, forms, deadlines.
- [x] **Contact Page**: Contact form, map, detailed contact information.
- [x] **Academics Page**: Overview of academic programs, departments, curriculum highlights.
- [x] **Staff Directory**: Public listing of teaching staff (optional).

### VII. Cross-Cutting Concerns
- [x] **Enhanced Security (Audit Trails)**: Backend service and logging for key actions (logins, user management).

## 🚧 Planned/Pending Features (High-Level)

### School Portal - Admin Section
- [ ] **Grading & Promotion**:
    - [ ] Generate final report cards/transcripts (requires more detailed report templates and O-Level/A-Level division/point aggregation logic).
- [ ] **Detailed Admin Reports**: Implementation of various other report generation tools.
- [ ] **Timetable Generation Tools**: (Advanced) AI or constraint-based tools to assist in or automate timetable creation.

### Cross-Cutting Concerns
- [ ] **Notifications System**: In-app and email notifications for important events.
- [ ] **Advanced Search & Filtering**: Across all major modules.
- [ ] **Data Import/Export**: For key data like students, teachers, marks.
- [ ] **Enhanced Security (Other)**: Password policies, session timeouts.
- [ ] **Accessibility (A11Y) improvements**.
- [ ] **Mobile Responsiveness**: Thorough testing and refinement.
- [ ] **Theming Customization**: Allow admins more control over portal and public site appearance beyond basic colors.
- [ ] **AI Features (Genkit)**: Specific integrations (e.g., support chatbot, data analysis, beyond news summary/generation).
- [ ] **Backup & Restore**: Strategies for tenant data.

This roadmap should give us a clear overview of our progress and what lies ahead!
Let me know what you'd like to tackle next from the "Planned/Pending Features" section.
