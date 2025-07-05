# Unified School Management System

Welcome to the Unified School Management System, a comprehensive, multi-tenant platform designed to streamline school operations and enhance the digital experience for administrators, teachers, students, and parents.

This project is built with a modern, robust technology stack and provides a wide array of features to manage every aspect of a school's academic and administrative life.

## Key Features

The system is organized into several distinct portals and a public-facing website, each tailored to the needs of its users.

### 1. SuperAdmin Portal
The central control panel for managing the entire platform.
-   **School Management**: Add, edit, and configure new school instances (tenants).
-   **System Oversight**: Monitor platform-wide activity.

### 2. School Admin Portal
A comprehensive dashboard for school administrators to manage their specific institution.
-   **User & Staff Management**: Create and manage accounts for all users (teachers, students, staff), including detailed profiles and role assignments.
-   **Academic Management**:
    -   Define academic years, terms, and grading scales.
    -   Manage subjects, classes, and A-Level subject combinations.
    -   Handle teacher-to-class assignments.
    -   Create and manage class timetables with AI assistance.
-   **Examination Management**: Create exams and manage individual assessments (e.g., papers, practicals).
-   **Financial Management**:
    -   Set up detailed fee structures.
    -   Generate and manage student invoices.
    -   Track payments and manage school expenditures.
    -   Generate financial reports (fee collection, outstanding balances, income statements).
-   **Library Management**: A complete module for cataloging books, managing members, handling circulation, and tracking overdue fines.
-   **Dormitory & Health Management**:
    -   Set up dormitories and rooms.
    -   Allocate students to rooms.
    -   Manage student health visits and dispense medication from an inventory.
-   **Website Content Management**: Control the content of the public-facing school website, including news, blogs, events, and the photo gallery.
-   **Data & System Management**:
    -   Export key data like student rosters.
    -   Manage system and website settings, including themes and navigation.
    -   Access UI for future Backup & Restore functionality.

### 3. Teacher Portal
A dedicated portal for teachers to manage their daily academic tasks.
-   **Class & Student Information**: View assigned classes and student rosters.
-   **Marks Entry**: Easily enter student marks for assessments.
-   **Attendance**: Take and manage student attendance for specific classes and subjects.
-   **Resource Sharing**: Upload and share learning materials with students.
-   **Timetable Viewing**: Access a personal teaching timetable.

### 4. Student Portal
A personal dashboard for students to access their academic information.
-   **Academic Progress**: View results, grades, and attendance records.
-   **Timetable**: Access personal class timetables.
-   **Learning Resources**: Download materials shared by teachers.
-   **AI Assistant**: An integrated AI chatbot with subject-specific expert personas and image analysis capabilities to help with academic questions and tasks.

### 5. Public School Website
A dynamic, customizable website for each school, driven by content managed in the Admin Portal.
-   **Dynamic Pages**: News, Blog, Events, Gallery, About Us, Staff Directory, and more.
-   **Customizable Layout**: School logo, colors, and navigation are all configurable.

## Technology Stack

-   **Frontend**: Next.js 15 (App Router), React, TypeScript
-   **UI**: Ant Design & Tailwind CSS
-   **State Management**: React Hooks & Context API
-   **Backend (API)**: Next.js API Routes
-   **Database**: MongoDB with Mongoose (multi-tenant architecture)
-   **Authentication**: NextAuth.js
-   **Generative AI**: Google's Genkit

This project showcases a powerful, scalable, and modern approach to building complex web applications.
