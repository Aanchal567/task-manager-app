const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();

// Middleware
// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000', 
    'https://task-manager-frontend-two-eosin.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// MongoDB Connection
const MONGODB_URL = "mongodb+srv://aanchal:123@cluster0.deaqzkf.mongodb.net/taskmanager?retryWrites=true&w=majority";

mongoose.connect(MONGODB_URL)
  .then(() => console.log('✅ MongoDB Connected Successfully!'))
  .catch(err => console.error('❌ MongoDB Error:', err.message));

// ========== DATABASE SCHEMAS ==========

// User Schema
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, default: 'member', enum: ['admin', 'member'] },
  createdAt: { type: Date, default: Date.now }
});

// Project Schema
const ProjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

// Task Schema with Due Date and Priority
const TaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  priority: { type: String, default: 'medium', enum: ['low', 'medium', 'high'] },
  status: { type: String, default: 'pending', enum: ['pending', 'in-progress', 'completed'] },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  dueDate: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Project = mongoose.model('Project', ProjectSchema);
const Task = mongoose.model('Task', TaskSchema);

// ========== AUTHENTICATION MIDDLEWARE ==========
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization');
    if (!token) {
      return res.status(401).json({ error: 'No token provided. Please login.' });
    }
    
    const decoded = jwt.verify(token, 'secret123');
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }
    
    req.user = user;
    req.userId = user._id;
    next();
  } catch (err) {
    console.error('Auth error:', err.message);
    res.status(401).json({ error: 'Invalid token. Please login again.' });
  }
};

// ========== TEST ROUTE ==========
app.get('/', (req, res) => {
  res.json({ 
    message: 'Task Manager API is running!',
    version: '2.0.0',
    endpoints: {
      signup: 'POST /api/signup',
      login: 'POST /api/login',
      projects: 'GET /api/projects, POST /api/projects, DELETE /api/projects/:id, POST /api/projects/:projectId/members/:userId',
      tasks: 'GET /api/tasks, POST /api/tasks, PATCH /api/tasks/:id/status, DELETE /api/tasks/:id',
      users: 'GET /api/users',
      stats: 'GET /api/dashboard/stats'
    }
  });
});

// ========== AUTH ROUTES ==========

// Signup with Name
app.post('/api/signup', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role: role || 'member'
    });
    
    await user.save();
    
    console.log(`✅ New user created: ${name} (${email}) - Role: ${user.role}`);
    res.status(201).json({ 
      message: 'User created successfully', 
      userId: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role, name: user.name },
      'secret123',
      { expiresIn: '7d' }
    );
    
    console.log(`✅ User logged in: ${user.name} (${email})`);
    res.json({ 
      token, 
      role: user.role, 
      userId: user._id,
      email: user.email,
      name: user.name
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ========== PROJECT ROUTES ==========

// Get all projects
app.get('/api/projects', auth, async (req, res) => {
  try {
    let projects;
    
    if (req.user.role === 'admin') {
      projects = await Project.find()
        .populate('createdBy', 'name email')
        .populate('members', 'name email');
    } else {
      projects = await Project.find({ 
        $or: [
          { createdBy: req.user._id },
          { members: req.user._id }
        ]
      })
      .populate('createdBy', 'name email')
      .populate('members', 'name email');
    }
    
    res.json(projects);
  } catch (err) {
    console.error('Get projects error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create new project (Admin only)
app.post('/api/projects', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin only can create projects.' });
    }
    
    const { name, description, members } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }
    
    const project = new Project({
      name,
      description: description || '',
      createdBy: req.user._id,
      members: members || []
    });
    
    await project.save();
    
    const populatedProject = await Project.findById(project._id)
      .populate('createdBy', 'name email')
      .populate('members', 'name email');
    
    console.log(`✅ Project created: ${name} by ${req.user.name}`);
    res.status(201).json(populatedProject);
  } catch (err) {
    console.error('Create project error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete project (Admin only)
app.delete('/api/projects/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }
    
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    await Task.deleteMany({ projectId: req.params.id });
    
    console.log(`✅ Project deleted: ${project.name}`);
    res.json({ message: 'Project deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add member to project (Admin only)
app.post('/api/projects/:projectId/members/:userId', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }
    
    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (!project.members.includes(req.params.userId)) {
      project.members.push(req.params.userId);
      await project.save();
    }
    
    const updatedProject = await Project.findById(project._id)
      .populate('createdBy', 'name email')
      .populate('members', 'name email');
    
    console.log(`✅ Member added: ${user.name} to project ${project.name}`);
    res.json(updatedProject);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remove member from project (Admin only)
app.delete('/api/projects/:projectId/members/:userId', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }
    
    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    project.members = project.members.filter(
      member => member.toString() !== req.params.userId
    );
    await project.save();
    
    const updatedProject = await Project.findById(project._id)
      .populate('createdBy', 'name email')
      .populate('members', 'name email');
    
    console.log(`✅ Member removed from project ${project.name}`);
    res.json(updatedProject);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== TASK ROUTES ==========

// Get all tasks
app.get('/api/tasks', auth, async (req, res) => {
  try {
    let tasks;
    
    if (req.user.role === 'admin') {
      tasks = await Task.find()
        .populate('assignedTo', 'name email')
        .populate('projectId', 'name');
    } else {
      tasks = await Task.find({ assignedTo: req.user._id })
        .populate('assignedTo', 'name email')
        .populate('projectId', 'name');
    }
    
    res.json(tasks);
  } catch (err) {
    console.error('Get tasks error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create new task (Admin only) with complete fields
app.post('/api/tasks', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin only can create tasks.' });
    }
    
    const { title, description, priority, assignedTo, projectId, dueDate } = req.body;
    
    if (!title || !assignedTo || !projectId) {
      return res.status(400).json({ error: 'Title, assignedTo, and projectId are required' });
    }
    
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const user = await User.findById(assignedTo);
    if (!user) {
      return res.status(404).json({ error: 'Assigned user not found' });
    }
    
    const task = new Task({
      title,
      description: description || '',
      priority: priority || 'medium',
      status: 'pending',
      assignedTo,
      projectId,
      dueDate: dueDate || null
    });
    
    await task.save();
    
    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name email')
      .populate('projectId', 'name');
    
    console.log(`✅ Task created: ${title} assigned to ${user.name}`);
    res.status(201).json(populatedTask);
  } catch (err) {
    console.error('Create task error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update task status
app.patch('/api/tasks/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const taskId = req.params.id;
    
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    if (req.user.role !== 'admin' && task.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied. You can only update your own tasks.' });
    }
    
    task.status = status;
    await task.save();
    
    const updatedTask = await Task.findById(taskId)
      .populate('assignedTo', 'name email')
      .populate('projectId', 'name');
    
    console.log(`✅ Task status updated: ${task.title} -> ${status}`);
    res.json(updatedTask);
  } catch (err) {
    console.error('Update task error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update task (full update - Admin only)
app.put('/api/tasks/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }
    
    const { title, description, priority, assignedTo, projectId, dueDate, status } = req.body;
    
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { title, description, priority, assignedTo, projectId, dueDate, status },
      { new: true }
    )
    .populate('assignedTo', 'name email')
    .populate('projectId', 'name');
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete task (Admin only)
app.delete('/api/tasks/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }
    
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    console.log(`✅ Task deleted: ${task.title}`);
    res.json({ message: 'Task deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== DASHBOARD STATS ==========
app.get('/api/dashboard/stats', auth, async (req, res) => {
  try {
    let query = {};
    
    if (req.user.role !== 'admin') {
      query.assignedTo = req.user._id;
    }
    
    const total = await Task.countDocuments(query);
    const pending = await Task.countDocuments({ ...query, status: 'pending' });
    const inProgress = await Task.countDocuments({ ...query, status: 'in-progress' });
    const completed = await Task.countDocuments({ ...query, status: 'completed' });
    
    const overdue = await Task.countDocuments({
      ...query,
      dueDate: { $lt: new Date() },
      status: { $ne: 'completed' }
    });
    
    // Tasks per user
    const tasksPerUser = await Task.aggregate([
      { $match: query },
      { $group: { _id: '$assignedTo', count: { $sum: 1 } } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      { $project: { name: '$user.name', email: '$user.email', count: 1 } }
    ]);
    
    res.json({
      total,
      pending,
      inProgress,
      completed,
      overdue,
      tasksPerUser
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ========== USER ROUTES ==========

// Get all users (Admin only)
app.get('/api/users', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }
    
    const users = await User.find({}, 'name email role _id createdAt');
    res.json(users);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get single user
app.get('/api/users/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id, 'name email role _id');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== ERROR HANDLING MIDDLEWARE ==========
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  res.status(500).json({ error: 'Something went wrong!' });
});

// ========== START SERVER ==========
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`\n🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📝 API Documentation: http://localhost:${PORT}/`);
  console.log(`✅ MongoDB Connected`);
  console.log(`🔐 Auth endpoints: /api/signup, /api/login`);
  console.log(`📊 Ready to accept requests!\n`);
});