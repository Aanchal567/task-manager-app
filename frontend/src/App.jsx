import './App.css';
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'https://task-manager-app-9a44.onrender.com/api';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [activeTab, setActiveTab] = useState('dashboard');
  const [newTask, setNewTask] = useState({ 
    title: '', 
    description: '', 
    priority: 'medium', 
    projectId: '', 
    assignedTo: '',
    dueDate: ''
  });
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = token;
      fetchAllData();
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const decodedUser = JSON.parse(window.atob(base64));
        setUser(decodedUser);
      } catch (err) {
        console.error('Token decode error:', err);
      }
    }
  }, [token]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [tasksRes, projectsRes, statsRes, usersRes] = await Promise.all([
        axios.get(`${API_URL}/tasks`),
        axios.get(`${API_URL}/projects`),
        axios.get(`${API_URL}/dashboard/stats`),
        axios.get(`${API_URL}/users`).catch(() => ({ data: [] }))
      ]);
      setTasks(tasksRes.data);
      setProjects(projectsRes.data);
      setStats(statsRes.data);
      setUsers(usersRes.data);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const addProject = async () => {
    if (!newProject.name.trim()) return;
    setLoading(true);
    try {
      await axios.post(`${API_URL}/projects`, newProject);
      fetchAllData();
      setNewProject({ name: '', description: '' });
    } catch (err) {
      alert(err.response?.data?.error || 'Error creating project');
    } finally {
      setLoading(false);
    }
  };

  const addTask = async () => {
    if (!newTask.title || !newTask.projectId || !newTask.assignedTo) {
      alert('Please fill all required fields');
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API_URL}/tasks`, newTask);
      fetchAllData();
      setNewTask({ 
        title: '', 
        description: '', 
        priority: 'medium', 
        projectId: '', 
        assignedTo: '',
        dueDate: ''
      });
    } catch (err) {
      alert(err.response?.data?.error || 'Error creating task');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (taskId, status) => {
    try {
      await axios.patch(`${API_URL}/tasks/${taskId}/status`, { status });
      fetchAllData();
    } catch (err) {
      alert(err.response?.data?.error || 'Error updating status');
    }
  };

  const deleteTask = async (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await axios.delete(`${API_URL}/tasks/${taskId}`);
        fetchAllData();
      } catch (err) {
        alert(err.response?.data?.error || 'Error deleting task');
      }
    }
  };

  const deleteProject = async (projectId) => {
    if (window.confirm('Are you sure? This will delete all tasks in this project.')) {
      try {
        await axios.delete(`${API_URL}/projects/${projectId}`);
        fetchAllData();
      } catch (err) {
        alert(err.response?.data?.error || 'Error deleting project');
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  if (!token) {
    return <LoginForm onLogin={setToken} />;
  }

  const pendingTasks = tasks.filter(t => t.status === 'pending').length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in-progress').length;
  const completionRate = stats.total ? Math.round((completedTasks / stats.total) * 100) : 0;

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#64748b';
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-content">
          <div className="logo">
            <div className="logo-icon">
              <span>✓</span>
            </div>
            <h1 className="logo-text">TaskFlow</h1>
          </div>
          
          <div className="nav-menu">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            >
              <span>📊</span>
              Dashboard
            </button>
            
            <button
              onClick={() => setActiveTab('projects')}
              className={`nav-item ${activeTab === 'projects' ? 'active' : ''}`}
            >
              <span>📁</span>
              Projects
            </button>
            
            <button
              onClick={() => setActiveTab('tasks')}
              className={`nav-item ${activeTab === 'tasks' ? 'active' : ''}`}
            >
              <span>✅</span>
              Tasks
            </button>
          </div>
          
          <div className="user-profile">
            <div className="profile-card">
              <div className="avatar">
                {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
              </div>
              <div className="user-email">{user?.name || user?.email}</div>
              <div className="user-role">{user?.role}</div>
              <button onClick={handleLogout} className="logout-btn">
                <span>🚪</span>
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {loading && (
          <div className="loading-overlay">
            <div className="loading-content">
              <div className="spinner"></div>
              <span>Loading...</span>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div>
            <div className="welcome-section">
              <h1 className="welcome-title">
                Welcome back, {user?.name || user?.email?.split('@')[0]}! 👋
              </h1>
              <p className="welcome-subtitle">Here's what's happening with your tasks today.</p>
            </div>

            <div className="stats-grid">
              <div className="stat-card total">
                <div className="stat-header">
                  <div className="stat-icon total">✅</div>
                  <div className="stat-value">{stats.total || 0}</div>
                </div>
                <div className="stat-label">Total Tasks</div>
              </div>

              <div className="stat-card pending">
                <div className="stat-header">
                  <div className="stat-icon pending">⏰</div>
                  <div className="stat-value">{pendingTasks}</div>
                </div>
                <div className="stat-label">Pending Tasks</div>
              </div>

              <div className="stat-card progress">
                <div className="stat-header">
                  <div className="stat-icon progress">📈</div>
                  <div className="stat-value">{inProgressTasks}</div>
                </div>
                <div className="stat-label">In Progress</div>
              </div>

              <div className="stat-card completed">
                <div className="stat-header">
                  <div className="stat-icon completed">✔️</div>
                  <div className="stat-value">{completedTasks}</div>
                </div>
                <div className="stat-label">Completed</div>
              </div>
            </div>

            <div className="progress-grid">
              <div className="progress-card">
                <h3 className="progress-title">Overall Progress</h3>
                <div className="progress-bar-container">
                  <div className="progress-label">
                    <span>Completion Rate</span>
                    <span>{completionRate}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${completionRate}%` }}></div>
                  </div>
                </div>
                <div className="stats-list">
                  <div className="stat-row">
                    <span>Active Projects</span>
                    <span>{projects.length}</span>
                  </div>
                  <div className="stat-row">
                    <span>Team Members</span>
                    <span>{users.length + 1}</span>
                  </div>
                  {stats.overdue > 0 && (
                    <div className="stat-row">
                      <span>⚠️ Overdue Tasks</span>
                      <span style={{ color: '#ef4444' }}>{stats.overdue}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="tip-card">
                <div className="tip-icon">💡</div>
                <h3 className="tip-title">Quick Tip</h3>
                <p className="tip-text">Focus on completing high priority tasks first. You're doing great!</p>
                <div className="tip-footer">
                  <span>Stay productive</span>
                  <span>→</span>
                </div>
              </div>
            </div>

            {stats.tasksPerUser && stats.tasksPerUser.length > 0 && (
              <div className="progress-card" style={{ marginTop: '24px' }}>
                <h3 className="progress-title">📊 Tasks Per User</h3>
                <div className="stats-list">
                  {stats.tasksPerUser.map((userStat, idx) => (
                    <div key={idx} className="stat-row">
                      <span>{userStat.name || userStat.email}</span>
                      <span style={{ fontWeight: 'bold' }}>{userStat.count} tasks</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'projects' && (
          <div>
            <div className="section-header">
              <div>
                <h2 className="section-title">Projects</h2>
                <p className="section-subtitle">Manage and organize your team projects</p>
              </div>
              {user?.role === 'admin' && (
                <div className="add-project-form">
                  <input
                    type="text"
                    placeholder="Project name..."
                    value={newProject.name}
                    onChange={e => setNewProject({...newProject, name: e.target.value})}
                    className="project-input"
                  />
                  <input
                    type="text"
                    placeholder="Description (optional)"
                    value={newProject.description}
                    onChange={e => setNewProject({...newProject, description: e.target.value})}
                    className="project-input"
                  />
                  <button onClick={addProject} className="btn-primary">
                    <span>➕</span>
                    Add Project
                  </button>
                </div>
              )}
            </div>

            <div className="projects-grid">
              {projects.map(project => (
                <div key={project._id} className="project-card">
                  <div className="project-header"></div>
                  <div className="project-content">
                    <div className="project-icon">📁</div>
                    <h3 className="project-name">{project.name}</h3>
                    {project.description && (
                      <p className="project-meta">{project.description}</p>
                    )}
                    <p className="project-meta">
                      Created by: {project.createdBy?.name || project.createdBy?.email?.split('@')[0] || 'Admin'}
                    </p>
                    {project.members?.length > 0 && (
                      <p className="project-meta">
                        Members: {project.members.map(m => m.name || m.email?.split('@')[0]).join(', ')}
                      </p>
                    )}
                    <div className="project-footer">
                      <span className="task-count">
                        Tasks: {tasks.filter(t => t.projectId?._id === project._id).length}
                      </span>
                      {user?.role === 'admin' && (
                        <button 
                          onClick={() => deleteProject(project._id)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '18px' }}
                        >
                          🗑️
                        </button>
                      )}
                      <span className="arrow-icon">→</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div>
            <div className="section-header">
              <div>
                <h2 className="section-title">Tasks</h2>
                <p className="section-subtitle">Track, manage and update your tasks</p>
              </div>
            </div>

            {user?.role === 'admin' && (
              <div className="create-task-card">
                <h3 className="task-form-title">
                  <span>➕</span>
                  Create New Task
                </h3>
                <div className="task-form">
                  <input
                    type="text"
                    placeholder="Task title *"
                    value={newTask.title}
                    onChange={e => setNewTask({...newTask, title: e.target.value})}
                    className="task-input"
                  />
                  <input
                    type="text"
                    placeholder="Description"
                    value={newTask.description}
                    onChange={e => setNewTask({...newTask, description: e.target.value})}
                    className="task-input"
                  />
                  <select
                    value={newTask.priority}
                    onChange={e => setNewTask({...newTask, priority: e.target.value})}
                    className="task-select"
                  >
                    <option value="low">🟢 Low Priority</option>
                    <option value="medium">🟡 Medium Priority</option>
                    <option value="high">🔴 High Priority</option>
                  </select>
                  <input
                    type="date"
                    placeholder="Due Date"
                    value={newTask.dueDate}
                    onChange={e => setNewTask({...newTask, dueDate: e.target.value})}
                    className="task-input"
                  />
                  <select
                    value={newTask.projectId}
                    onChange={e => setNewTask({...newTask, projectId: e.target.value})}
                    className="task-select"
                  >
                    <option value="">Select Project *</option>
                    {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                  </select>
                  <select
                    value={newTask.assignedTo}
                    onChange={e => setNewTask({...newTask, assignedTo: e.target.value})}
                    className="task-select"
                  >
                    <option value="">Assign to Member *</option>
                    {users.map(u => <option key={u._id} value={u._id}>{u.name || u.email}</option>)}
                  </select>
                  <button onClick={addTask} className="btn-primary">
                    Create Task
                  </button>
                </div>
              </div>
            )}

            <div className="tasks-list">
              {tasks.map(task => {
                const statusClass = task.status === 'pending' ? 'status-pending' : 
                                   task.status === 'in-progress' ? 'status-progress' : 'status-completed';
                const statusIcon = task.status === 'pending' ? '⏳' : 
                                  task.status === 'in-progress' ? '⚡' : '✅';
                const priorityIcon = task.priority === 'high' ? '🔴' : 
                                    task.priority === 'medium' ? '🟡' : '🟢';
                const isTaskOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
                
                return (
                  <div key={task._id} className="task-item" style={{ borderLeft: isTaskOverdue ? '4px solid #ef4444' : 'none' }}>
                    <div className="task-info">
                      <h3 className="task-title">
                        {task.title}
                        {isTaskOverdue && <span style={{ color: '#ef4444', fontSize: '12px', marginLeft: '8px' }}>⚠️ Overdue</span>}
                      </h3>
                      {task.description && <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>{task.description}</p>}
                      <div className="task-meta">
                        <span>📁 {task.projectId?.name || 'No Project'}</span>
                        <span>👤 {task.assignedTo?.name || task.assignedTo?.email || 'Unassigned'}</span>
                        <span>{priorityIcon} {task.priority || 'medium'}</span>
                        {task.dueDate && <span>📅 {new Date(task.dueDate).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <div className="task-actions">
                      <div className={`status-badge ${statusClass}`}>
                        <span>{statusIcon}</span>
                        <span>{task.status}</span>
                      </div>
                      <select
                        value={task.status}
                        onChange={e => updateStatus(task._id, e.target.value)}
                        className="status-select"
                      >
                        <option value="pending">Pending</option>
                        <option value="in-progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                      {user?.role === 'admin' && (
                        <button 
                          onClick={() => deleteTask(task._id)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '18px' }}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {tasks.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  No tasks yet. {user?.role === 'admin' && 'Create your first task above!'}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LoginForm({ onLogin }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [role, setRole] = useState('member');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignup) {
        if (!name) {
          alert('Please enter your name');
          setLoading(false);
          return;
        }
        await axios.post(`${API_URL}/signup`, { name, email, password, role });
        alert('✨ Signup successful! Please login.');
        setIsSignup(false);
        setName('');
        setEmail('');
        setPassword('');
      } else {
        const response = await axios.post(`${API_URL}/login`, { email, password });
        localStorage.setItem('token', response.data.token);
        onLogin(response.data.token);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header"></div>
        <div className="login-content">
          <div className="login-logo">
            <div className="logo-circle">✓</div>
            <h2 className="login-title">{isSignup ? 'Create Account' : 'Welcome Back'}</h2>
            <p className="login-subtitle">
              {isSignup ? 'Join TaskFlow today' : 'Sign in to continue'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {isSignup && (
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="form-input"
                required
              />
            </div>

            {isSignup && (
              <div className="form-group">
                <label className="form-label">Role</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="form-select"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            )}

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Loading...' : (isSignup ? 'Sign Up' : 'Login')}
            </button>
          </form>

          <div className="toggle-btn">
            <button onClick={() => setIsSignup(!isSignup)} className="toggle-link">
              {isSignup ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;