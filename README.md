# ThesisDesk — Thesis Defense Scheduling Portal

ThesisDesk is a responsive web application for university thesis defense appointment scheduling, featuring dedicated portals for Students and Administrators/Panel members.

## Features

- **Student Portal**:
  - Browse available defense time slots with real-time status indicators.
  - Book and manage oral defense appointments.
  - Track proposal, defense, and revision milestones.
  - Monitor file conformity and submission sheets.

- **Admin & Panel Portal**:
  - Manage and configure available date windows and defense timeslots.
  - Review student appointments, submissions, and documentation.
  - Export schedules to CSV and calendar formats (iCal).
  - Search student directory and archive completed defense records.

- **Responsive Architecture**:
  - Clean, institutional UI optimized for desktop, tablet, and mobile viewing.
  - Side drawers for appointment details and status modal previews.

## Tech Stack

- **Framework**: React 19 + TypeScript
- **Bundler & Tooling**: Vite
- **Styling**: Tailwind CSS
- **Icons & Motion**: Lucide React, Motion

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- npm or bun

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Shiru-Kage/thesisdesk.git
   cd thesisdesk
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the local development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```
