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
app.use(express.json({ limit: '50mb' }));

// Health check route for browser visitors
app.get('/', (req, res) => {
  res.send('🚀 Logic Hub Backend API is running successfully!');
});

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
    
    // Auto-create default team and roles
    const team = await prisma.team.create({
      data: { name: `${name} 的團隊`, ownerId: user.id }
    });
    
    const adminRole = await prisma.teamRole.create({
      data: { name: '管理員', canEdit: true, canInvite: true, teamId: team.id }
    });
    const guestRole = await prisma.teamRole.create({
      data: { name: '來賓', canEdit: false, canInvite: false, teamId: team.id }
    });
    
    await prisma.teamMember.create({
      data: { teamId: team.id, userId: user.id, role: '管理員', roleId: adminRole.id }
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
        const adminRole = await prisma.teamRole.create({
          data: { name: '管理員', canEdit: true, canInvite: true, teamId: newTeam.id }
        });
        await prisma.teamMember.create({
          data: { teamId: newTeam.id, userId: user.id, role: '管理員', roleId: adminRole.id }
        });
        teams = await prisma.team.findMany({
          where: { members: { some: { userId: req.user.id } } },
          include: { members: { include: { user: { select: { id: true, name: true, email: true } }, teamRole: true } } }
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
      include: { user: { select: { id: true, name: true, email: true } }, teamRole: true }
    });
    res.json(members);
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/api/teams/:teamId/invite', authenticateToken, async (req: any, res) => {
  try {
    const { email, role, roleId } = req.body;
    const team = await prisma.team.findUnique({ where: { id: req.params.teamId } });
    if (!team || team.ownerId !== req.user.id) return res.status(403).json({ error: '只有團隊所有權人可以邀請成員' });
    
    const targetUser = await prisma.user.findUnique({ where: { email } });
    if (!targetUser) return res.status(404).json({ error: 'User not found' });
    
    const newMember = await prisma.teamMember.upsert({
      where: { teamId_userId: { teamId: req.params.teamId, userId: targetUser.id } },
      update: { role: role || '企劃', roleId: roleId || null },
      create: { teamId: req.params.teamId, userId: targetUser.id, role: role || '企劃', roleId: roleId || null },
      include: { user: { select: { id: true, name: true, email: true } } }
    });
    res.json(newMember);
  } catch (err) {
    res.status(500).json({ error: 'Invite failed' });
  }
});

app.put('/api/teams/:teamId/members/:userId/role', authenticateToken, async (req: any, res) => {
  try {
    const team = await prisma.team.findUnique({ where: { id: req.params.teamId } });
    if (!team || team.ownerId !== req.user.id) return res.status(403).json({ error: '只有團隊所有權人可以修改權限' });

    let roleName = req.body.role;
    let roleId = req.body.roleId;

    if (roleId) {
      const teamRole = await prisma.teamRole.findUnique({ where: { id: roleId } });
      if (teamRole) roleName = teamRole.name;
    }

    const updated = await prisma.teamMember.update({
      where: { teamId_userId: { teamId: req.params.teamId, userId: req.params.userId } },
      data: { 
        role: roleName,
        ...(roleId && { roleId })
      },
      include: { user: { select: { id: true, name: true, email: true } }, teamRole: true }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
});

// --- Custom Roles API ---

app.get('/api/teams/:teamId/roles', authenticateToken, async (req: any, res) => {
  try {
    const roles = await prisma.teamRole.findMany({ where: { teamId: req.params.teamId } });
    res.json(roles);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

app.post('/api/teams/:teamId/roles', authenticateToken, async (req: any, res) => {
  try {
    const team = await prisma.team.findUnique({ where: { id: req.params.teamId } });
    if (!team || team.ownerId !== req.user.id) return res.status(403).json({ error: '只有團隊所有權人可以新增角色' });

    const role = await prisma.teamRole.create({
      data: {
        name: req.body.name,
        canEdit: req.body.canEdit ?? true,
        canInvite: req.body.canInvite ?? false,
        teamId: req.params.teamId
      }
    });
    res.json(role);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create role' });
  }
});

app.delete('/api/teams/:teamId/roles/:roleId', authenticateToken, async (req: any, res) => {
  try {
    const team = await prisma.team.findUnique({ where: { id: req.params.teamId } });
    if (!team || team.ownerId !== req.user.id) return res.status(403).json({ error: '只有團隊所有權人可以刪除角色' });

    await prisma.teamRole.delete({ where: { id: req.params.roleId } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete role' });
  }
});

// --- User Profile & History API ---

app.get('/api/user/history', authenticateToken, async (req: any, res) => {
  try {
    const history = await prisma.userHistory.findMany({
      where: { userId: req.user.id },
      orderBy: { lastAccessed: 'desc' },
      include: {
        project: {
          include: { team: true }
        }
      },
      take: 50
    });
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

app.post('/api/user/history', authenticateToken, async (req: any, res) => {
  try {
    const { projectId } = req.body;
    if (!projectId) return res.status(400).json({ error: 'projectId is required' });

    const history = await prisma.userHistory.upsert({
      where: {
        userId_projectId: {
          userId: req.user.id,
          projectId: projectId
        }
      },
      update: { lastAccessed: new Date() },
      create: {
        userId: req.user.id,
        projectId: projectId
      }
    });
    res.json(history);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to record history' });
  }
});

app.put('/api/user/profile', authenticateToken, async (req: any, res) => {
  try {
    const { name, password } = req.body;
    const updateData: any = {};
    if (name) updateData.name = name;
    if (password) updateData.password = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: { id: true, name: true, email: true, role: true }
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
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
      const response = await axios.get(url, { 
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5'
        },
        timeout: 10000
      });
      const $ = cheerio.load(response.data);
      
      // 深度去噪 (Remove structural noise)
      $('script, style, nav, footer, header, aside, iframe, noscript, form, button, .ad, .advertisement, .sidebar, .comments, #comments, .menu').remove();
      
      // 保留排版呼吸空間 (Preserve structural spacing by inserting newlines)
      $('p, div, h1, h2, h3, h4, h5, h6, li, article, section').each((_, el) => {
        $(el).prepend('\\n');
        $(el).append('\\n');
      });
      $('br').replaceWith('\\n');

      // 提取文字並進行正則壓縮 (Extract and normalize text)
      textContent = $('body').text()
        .replace(/^[ \\t]+/gm, '')         // 去除每行開頭的空白
        .replace(/[ \\t]+$/gm, '')         // 去除每行結尾的空白
        .replace(/[ \\t]+/g, ' ')          // 將連續空白縮減為單一空格
        .replace(/\\n{3,}/g, '\\n\\n')     // 限制連續換行最多為兩個 (保留段落)
        .trim();
        
      fileName = $('title').text().trim() || url;
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
    
    const treeFormat = `{ "tree": { "title": "架構總覽標題", "overview": "整體架構的一分鐘摘要解說...", "nodes": [ { "concept": "主要概念", "details": "詳細說明", "imagePrompt": "abstract futuristic concept illustration", "subConcepts": [ { "concept": "子概念", "details": "詳細說明", "subConcepts": [] } ] } ] } }`;
    const summaryFormat = `{ "summary": { "title": "報告主標題", "tldr": "一句話速讀核心結論", "keyPoints": [ { "point": "重點標題", "explanation": "重點詳細說明", "imagePrompt": "abstract glowing lightbulb 3d render", "quotes": ["擷取的原文名言或金句"], "details": ["細節補充1", "細節補充2"] } ] } }`;
    const timelineFormat = `{ "timeline": { "title": "發展史或流程總覽標題", "events": [ { "time": "時間點或階段", "title": "事件名稱", "description": "具體經過描述", "impact": "此事件造成的後果或影響力", "imagePrompt": "minimalist abstract clock hourglass 3d illustration" } ] } }`;

    if (format === 'auto') {
      systemPrompt = `你是一個頂級的商業顧問與資料分析專家。請先分析這段文本的結構特性。
如果具有強烈的時間順序（如新聞事件發展、歷史），請輸出「時間線(timeline)」格式；
如果具有明確的階層或分類關係（如公司架構、產品分類），請輸出「樹狀圖(tree)」格式；
否則請輸出「總覽摘要(summary)」格式。

請在 JSON 中加入 "detectedFormat" 欄位標明你選擇的格式 (timeline, tree, 或 summary)，並將對應的內容放在同名的欄位中。
如果選擇 tree，請確保遵循此結構: ${treeFormat}
如果選擇 summary，請確保遵循此結構: ${summaryFormat}
如果選擇 timeline，請確保遵循此結構: ${timelineFormat}
請為重要節點提供精準的英文圖片生成指令 (imagePrompt)。
請嚴格以 JSON 格式輸出。`;
    } else if (format === 'tree') {
      systemPrompt = `你是一個頂級的商業顧問與資料分析專家。請閱讀提供的文章，並提煉出具備豐富層次結構的「樹狀圖」。
請務必提供全局的 title 與 overview。最少提煉出 3 到 5 個主概念，每個主概念下須包含多個子概念，並附上詳細說明。
請為最具代表性的概念提供一個英文的圖片生成指令 (imagePrompt)。
請嚴格以 JSON 格式輸出，結構必須為：
${treeFormat}`;
    } else if (format === 'summary') {
      systemPrompt = `你是一個頂級的商業顧問與資料分析專家。請閱讀提供的文章，並提取出最重要的 5 到 8 個關鍵重點（Key Takeaways）。
請提供一份「高階報告」，包含主標題(title)與一句話速讀(tldr)。每個重點需要有說明(explanation)、從原文擷取的金句(quotes)以及條列式細節(details)。
同時為重點提供一個英文的圖片生成指令 (imagePrompt) 用於產生示意圖。
請嚴格以 JSON 格式輸出，結構必須為：
${summaryFormat}`;
    } else {
      systemPrompt = `你是一個頂級的商業顧問與資料分析專家。請閱讀提供的文章，並依照時間先後順序或邏輯順序，提取出具體的「時間軸」或「流程步驟」。
請提供時間線總標題(title)。每個事件必須包含明確的事件名稱(title)、詳細經過(description)以及此事件造成的影響(impact)。
挑選重要步驟提供一個英文的圖片生成指令 (imagePrompt)。
請嚴格以 JSON 格式輸出，結構必須為：
${timelineFormat}`;
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

    // 從 AI 回應讀取內容
    const rawContent = completion.choices[0]?.message?.content || '';
    
    // 清除可能的 markdown code fence（```json ... ```）
    const jsonStr = rawContent
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    let resultObj: any;
    try {
      resultObj = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error('JSON parse failed, raw content:', rawContent.substring(0, 500));
      return res.status(500).json({ error: 'AI 回傳格式錯誤，無法解析 JSON', raw: rawContent.substring(0, 500) });
    }
    
    // 自動偵測格式：如果 AI 沒有回傳 detectedFormat，從結果的 key 推斷
    let finalFormat: string;
    if (req.body.format === 'auto') {
      finalFormat = resultObj.detectedFormat
        || (resultObj.timeline ? 'timeline'
          : resultObj.tree ? 'tree'
          : resultObj.summary ? 'summary'
          : 'timeline');
    } else {
      finalFormat = req.body.format || 'timeline';
    }

    res.json({ success: true, result: resultObj, format: finalFormat, filename: fileName });
  } catch (err) {
    console.error('Analyze error:', err);
    res.status(500).json({ error: 'Analysis failed' });
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
