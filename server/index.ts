import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
const pdf = require('pdf-parse');
import mammoth from 'mammoth';
import axios from 'axios';
import * as cheerio from 'cheerio';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import http from 'http';
import { Server } from 'socket.io';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Initialize OpenAI using the compatible endpoint
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
});

// Setup file storage
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// Middleware
app.use(cors());
app.use(express.json());

// JWT Authentication Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied' });
  
  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// --- Auth Routes ---

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'User already exists' });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name, role: role || '企劃' }
    });
    
    // Auto-create default team
    const team = await prisma.team.create({
      data: { name: `${name} 的團隊`, ownerId: user.id }
    });
    await prisma.teamMember.create({
      data: { teamId: team.id, userId: user.id, role: '管理員' }
    });
    
    const token = jwt.sign({ id: user.id, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid password' });
    
    const token = jwt.sign({ id: user.id, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// --- Team API Routes ---

app.get('/api/teams', authenticateToken, async (req: any, res) => {
  try {
    let teams = await prisma.team.findMany({
      where: { members: { some: { userId: req.user.id } } },
      include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } }
    });

    // Backwards compatibility for old accounts without a team
    if (teams.length === 0) {
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      if (user) {
        const newTeam = await prisma.team.create({
          data: { name: `${user.name} 的團隊`, ownerId: user.id }
        });
        await prisma.teamMember.create({
          data: { teamId: newTeam.id, userId: user.id, role: '管理員' }
        });
        teams = await prisma.team.findMany({
          where: { members: { some: { userId: req.user.id } } },
          include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } }
        });
      }
    }

    res.json(teams);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

app.get('/api/teams/:teamId/members', authenticateToken, async (req: any, res) => {
  try {
    const member = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId: req.params.teamId, userId: req.user.id } } });
    if (!member) return res.status(403).json({ error: 'Access denied' });

    const members = await prisma.teamMember.findMany({
      where: { teamId: req.params.teamId },
      include: { user: { select: { id: true, name: true, email: true } } }
    });
    res.json(members);
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/api/teams/:teamId/invite', authenticateToken, async (req: any, res) => {
  try {
    const { email, role } = req.body;
    const requester = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId: req.params.teamId, userId: req.user.id } } });
    if (!requester || requester.role !== '管理員') return res.status(403).json({ error: 'Only admins can invite' });
    
    const targetUser = await prisma.user.findUnique({ where: { email } });
    if (!targetUser) return res.status(404).json({ error: 'User not found' });
    
    const newMember = await prisma.teamMember.upsert({
      where: { teamId_userId: { teamId: req.params.teamId, userId: targetUser.id } },
      update: { role: role || '企劃' },
      create: { teamId: req.params.teamId, userId: targetUser.id, role: role || '企劃' },
      include: { user: { select: { id: true, name: true, email: true } } }
    });
    res.json(newMember);
  } catch (err) {
    res.status(500).json({ error: 'Invite failed' });
  }
});

app.put('/api/teams/:teamId/members/:userId/role', authenticateToken, async (req: any, res) => {
  try {
    const requester = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId: req.params.teamId, userId: req.user.id } } });
    if (!requester || requester.role !== '管理員') return res.status(403).json({ error: 'Access denied' });

    const updated = await prisma.teamMember.update({
      where: { teamId_userId: { teamId: req.params.teamId, userId: req.params.userId } },
      data: { role: req.body.role },
      include: { user: { select: { id: true, name: true, email: true } } }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
});

// --- Database API Routes ---

// Get all projects
app.get('/api/projects', authenticateToken, async (req: any, res) => {
  try {
    const teamId = req.query.teamId as string;
    if (!teamId) return res.json([]);
    const member = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId: req.user.id } } });
    if (!member) return res.status(403).json({ error: 'Access denied' });

    const projects = await prisma.project.findMany({
      where: { teamId },
      orderBy: { updatedAt: 'desc' }
    });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Get a single project
app.get('/api/projects/:id', authenticateToken, async (req: any, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: { comments: { include: { author: true } } }
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.teamId) {
      const member = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId: project.teamId, userId: req.user.id } } });
      if (!member) return res.status(403).json({ error: 'Access denied' });
    }
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// Create a new project
app.post('/api/projects', authenticateToken, async (req: any, res) => {
  try {
    const { title, category, teamId } = req.body;
    if (!teamId) return res.status(400).json({ error: 'Missing teamId' });
    const member = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId: req.user.id } } });
    if (!member) return res.status(403).json({ error: 'Access denied' });

    const project = await prisma.project.create({
      data: {
        title: title || '無標題懶人包',
        category: category || 'Drafts',
        content: JSON.stringify([{ type: "paragraph", content: "" }]),
        teamId
      }
    });
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Update a project
app.put('/api/projects/:id', authenticateToken, async (req: any, res) => {
  try {
    const { title, content, category } = req.body;
    
    const existing = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (existing && existing.teamId) {
      const member = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId: existing.teamId, userId: req.user.id } } });
      if (!member) return res.status(403).json({ error: 'Access denied' });
    }

    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: { 
        ...(title && { title }),
        ...(content && { content }),
        ...(category && { category }),
      }
    });
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// --- Commenting API ---

app.post('/api/projects/:id/comments', authenticateToken, async (req: any, res) => {
  try {
    const { blockId, content } = req.body;
    const comment = await prisma.comment.create({
      data: {
        projectId: req.params.id,
        blockId,
        content,
        authorId: req.user.id
      },
      include: { author: true }
    });
    // Broadcast the new comment to anyone viewing this project
    io.to(req.params.id).emit('new-comment', comment);
    res.json(comment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

app.get('/api/projects/:id/comments', authenticateToken, async (req, res) => {
  try {
    const comments = await prisma.comment.findMany({
      where: { projectId: req.params.id },
      include: { author: true },
      orderBy: { createdAt: 'asc' }
    });
    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// --- AI Analysis API ---

app.post('/api/analyze', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const { url } = req.body;
    let textContent = '';
    let fileName = '';

    if (url) {
      // URL Scraping
      const response = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const $ = cheerio.load(response.data);
      $('script, style, nav, footer, iframe, noscript').remove();
      textContent = $('body').text().replace(/\s+/g, ' ').trim();
      fileName = $('title').text() || url;
    } else if (req.file) {
      // File Upload
      const filePath = req.file.path;
      fileName = req.file.originalname;
      const mimeType = req.file.mimetype;
      const lowerFileName = fileName.toLowerCase();

      if (mimeType === 'application/pdf' || lowerFileName.endsWith('.pdf')) {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdf(dataBuffer);
        textContent = data.text;
      } else if (lowerFileName.endsWith('.docx')) {
        const result = await mammoth.extractRawText({ path: filePath });
        textContent = result.value;
      } else {
        textContent = fs.readFileSync(filePath, 'utf-8');
      }
    } else {
      return res.status(400).json({ error: 'No file or URL provided' });
    }

    const format = req.body.format || 'timeline';
    let systemPrompt = '';
    
    if (format === 'tree') {
      systemPrompt = "You are an expert content analyzer. Read the provided document and extract a hierarchical relationship tree of the main concepts. Output strictly in JSON format matching this structure: { \"tree\": [ { \"concept\": \"Main Concept\", \"details\": \"Explanation\", \"subConcepts\": [ { \"concept\": \"Sub concept\", \"details\": \"\", \"subConcepts\": [] } ] } ] }";
    } else if (format === 'summary') {
      systemPrompt = "You are an expert content analyzer. Read the provided document and extract the top 5 most important key takeaways. Output strictly in JSON format matching this structure: { \"summary\": [ { \"point\": \"Key Point X\", \"explanation\": \"Explanation\" } ] }";
    } else {
      systemPrompt = "You are an expert content analyzer. You will read the provided document and extract a logical timeline or list of key points. Output strictly in JSON format matching this structure: { \"timeline\": [ { \"time\": \"string (e.g. 00:00 or Point 1)\", \"text\": \"string\" } ] }";
    }

    if (textContent.length > 15000) {
      textContent = textContent.substring(0, 15000) + '...[truncated]';
    }

    const completion = await openai.chat.completions.create({
      model: "qwen-max",
      messages: [
        { 
          role: "system", 
          content: systemPrompt
        },
        { 
          role: "user", 
          content: `Analyze this document based on the requested format:\n\n${textContent}`
        }
      ],
      response_format: { type: "json_object" }
    });

    const aiContent = completion.choices[0].message.content;
    let parsedResult: any = {};
    
    try {
      if (aiContent) parsedResult = JSON.parse(aiContent);
    } catch (e) {
      console.error("Failed to parse LLM JSON:", aiContent);
    }

    res.json({
      success: true,
      filename: fileName,
      result: parsedResult,
      format: format
    });
    
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze' });
  }
});

// WebSockets Connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Client joins a project room to receive real-time comment updates
  socket.on('join-project', (projectId) => {
    socket.join(projectId);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

httpServer.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
