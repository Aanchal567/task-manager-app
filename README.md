# TaskFlow - Team Task Manager

A complete task management system with role-based access control (Admin/Member).

## 🚀 Features

- 🔐 **Authentication** - Signup/Login with JWT
- 👥 **Role-Based Access** - Admin can manage everything, Members see only assigned tasks
- 📁 **Project Management** - Create projects, add/remove members
- ✅ **Task Management** - Create, assign, update status, set priorities
- 📊 **Dashboard** - Analytics, overdue tasks, tasks per user
- 🎨 **Modern UI** - Beautiful gradient design with animations

## 🛠 Tech Stack

| Category | Technology |
|----------|-----------|
| Frontend | React.js, CSS3 |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas |
| Authentication | JWT |
| Deployment | Railway (Backend), Vercel (Frontend) |

## 🏃‍♂️ Run Locally

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas account or local MongoDB

### Backend Setup
```bash
cd backend
npm install
node server.js