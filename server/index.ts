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
import { YoutubeTranscript } from 'youtube-transcript';

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

// Health check (only when no frontend is present)
// app.get('/') is handled by static files or the SPA fallback below

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
    const { email, password, name } = req.body;
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: '使用者已存在' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name
      }
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
    let { title, category, teamId, content, youtubeUrl } = req.body;
    
    // Fallback to user's first team if teamId is not provided
    if (!teamId) {
      const firstTeam = await prisma.teamMember.findFirst({
        where: { userId: req.user.id }
      });
      if (firstTeam) {
        teamId = firstTeam.teamId;
      } else {
        return res.status(400).json({ error: 'User does not belong to any team' });
      }
    } else {
      const member = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId: req.user.id } } });
      if (!member) return res.status(403).json({ error: 'Access denied' });
    }

    const project = await prisma.project.create({
      data: {
        title: title || '無標題懶人包',
        category: category || 'Drafts',
        content: content || JSON.stringify([{ type: "paragraph", content: "" }]),
        youtubeUrl: youtubeUrl || null,
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
    const { title, content, category, isPublished, graphData, youtubeUrl } = req.body;
    
    const existing = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (existing && existing.teamId) {
      const member = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId: existing.teamId, userId: req.user.id } } });
      if (!member) return res.status(403).json({ error: 'Access denied' });
    }

    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: { 
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(category !== undefined && { category }),
        ...(isPublished !== undefined && { isPublished }),
        ...(graphData !== undefined && { graphData }),
        ...(youtubeUrl !== undefined && { youtubeUrl })
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

// --- Robust JSON Parser Helper ---
function parseRobustJSON(str: string): any {
  let cleaned = str
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  // Remove trailing commas before closing braces/brackets
  cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    try {
      // Fix unescaped control characters/newlines in JSON strings
      const fixed = cleaned.replace(/\n/g, '\\n').replace(/\r/g, '\\r');
      return JSON.parse(fixed);
    } catch {
      throw err;
    }
  }
}

// --- AI Analysis API ---

app.post('/api/analyze', authenticateToken, upload.single('file'), async (req: any, res) => {
  try {
    const { url, format: requestedFormat } = req.body;
    let textContent = '';
    let fileName = '';

    if (url) {
      if (url.includes('youtube.com/watch') || url.includes('youtu.be/')) {
        // YouTube Video Parsing
        try {
          const transcript = await YoutubeTranscript.fetchTranscript(url);
          textContent = transcript.map(t => t.text).join(' ');
          
          // Get title from the page
          try {
            const response = await axios.get(url, { timeout: 8000 });
            const $ = cheerio.load(response.data);
            fileName = $('title').text() || url;
          } catch {
            fileName = url;
          }
        } catch (ytErr) {
          console.warn("YouTube transcript failed:", ytErr);
          return res.status(400).json({ 
            error: '無法讀取 YouTube 影片字幕。原因可能是該影片沒有提供字幕（CC），或該影片目前遭到 YouTube 流量安全驗證限制（伺服器 IP 被暫時限制）。您可以嘗試使用其他影片，或直接複製字幕文字上傳為檔案進行分析。' 
          });
        }
      } else {
        // Normal URL Scraping
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
      }
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

    const finalFormat = requestedFormat || 'summary';
    let systemPrompt = '';

    if (finalFormat === 'timeline') {
      systemPrompt = `你是一個專業的內容解析師。請深入分析以下文本，提取出時間軸上所有關鍵的重要事件或步驟（越詳細、完整越好）。
請用繁體中文回答，嚴格以 JSON 格式輸出：
{ "timeline": { "title": "主標題", "events": [ { "time": "時間或順序", "title": "事件標題", "description": "事件詳細描述（請詳細說明此事件的前因後果，至少 100 字）", "impact": "此事件的影響、意義或後續效益" } ] } }
要求：必須提供至少 5~10 個事件節點，每個事件都必須有詳盡完整的描述與脈絡，不能敷衍簡略。`;
    } else if (finalFormat === 'tree') {
      systemPrompt = `你是一個專業的知識架構師。請深入分析以下文本，將所有重要觀點與細節整理為樹狀心智圖結構。
請用繁體中文回答，嚴格以 JSON 格式輸出：
{ "tree": { "title": "主題標題", "overview": "整體核心概述（一句話）", "nodes": [ { "concept": "主要核心概念", "details": "詳細說明該概念的核心內涵與重要性（至少 80 字）", "subConcepts": [ { "concept": "子概念與分支說明", "details": "具體的補充、例子或子概念說明" } ] } ] } }
要求：必須提供至少 5~8 個主要核心概念節點，每個概念節點底下必須包含 3~5 個詳細的子概念與具體佐證，務求架構完整、細節豐富。`;
    } else {
      // Default to summary
      const summaryFormat = `{ "summary": { "title": "報告主標題", "tldr": "一句話速讀核心結論", "keyPoints": [ { "point": "重點標題", "explanation": "深度重點說明（必須介於 150-300 字，深入探討因果邏輯、背景與細節，不能敷衍）", "quotes": ["原文重要佐證金句一", "原文佐證金句二"], "details": ["細節補充一（至少 30 字）", "細節補充二（至少 30 字）", "細節補充三（至少 30 字）", "細節補充四（至少 30 字）"] } ] } }`;

      systemPrompt = `你是一個頂級的商業顧問與資料分析專家。請詳細閱讀提供的內容，提取所有深度的關鍵資訊，產生一份內容極為豐富、詳盡且結構完整的懶人包摘要報告。
報告必須包含 4 到 8 個極為詳細的 keyPoints。每個重點的說明(explanation)字數必須極為充足（150-300字），詳細展開分析；每個細節(details)必須包含至少 4 個詳細條列項，每條細節描述必須至少 30 字（詳細列出數據、案例或邏輯細節），絕不能草率。
請嚴格以繁體中文、JSON 格式輸出，結構必須為：
${summaryFormat}`;
    }

    // Limit text to reduce AI processing time
    if (textContent.length > 15000) {
      textContent = textContent.substring(0, 15000) + '...[截斷]';
    }
    
    const isAntiBot = (text: string) => {
      const lower = text.toLowerCase();
      return (
        lower.includes('cloudflare') ||
        lower.includes('security challenge') ||
        lower.includes('enable javascript') ||
        lower.includes('robot check') ||
        lower.includes('access denied') ||
        lower.includes('checking your browser') ||
        (lower.includes('blocked') && lower.includes('ip')) ||
        lower.includes('ddos protection') ||
        lower.includes('just a moment')
      );
    };

    if (textContent.trim().length < 150 || isAntiBot(textContent)) {
      return res.status(400).json({ 
        error: '擷取網網頁內容失敗或遭到防爬蟲阻擋（如 Cloudflare 安全驗證）。請直接複製網頁文章內容，點擊右方迴紋針圖示上傳為 TXT/PDF 檔，或是將文字貼到編輯器中！' 
      });
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
          content: `Analyze this content:\n\n${textContent}`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 4096
    });

    // 從 AI 回應讀取內容
    const rawContent = completion.choices[0]?.message?.content || '';
    
    let resultObj: any;
    try {
      resultObj = parseRobustJSON(rawContent);
    } catch (parseErr) {
      console.error('JSON parse failed, raw content:', rawContent.substring(0, 500));
      return res.status(500).json({ error: 'AI 回傳格式錯誤，無法解析 JSON', raw: rawContent.substring(0, 500) });
    }

    res.json({ success: true, result: resultObj, format: finalFormat, filename: fileName });
  } catch (err) {
    console.error('Analyze error:', err);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

app.post('/api/generate-graph', authenticateToken, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'No content provided' });
    
    // Parse the blocks recursively to extract all plain text
    let plainText = '';
    try {
      const blocks = JSON.parse(content);
      const extractText = (nodes: any[]): string => {
        if (!Array.isArray(nodes)) return '';
        return nodes.map((b: any) => {
          let text = '';
          if (b.content) {
            if (Array.isArray(b.content)) {
              text = b.content.map((c: any) => c.text || '').join('');
            } else if (typeof b.content === 'string') {
              text = b.content;
            }
          }
          const childrenText = b.children ? extractText(b.children) : '';
          return text + (childrenText ? '\n' + childrenText : '');
        }).filter(Boolean).join('\n');
      };
      plainText = extractText(blocks);
    } catch {
      plainText = content;
    }

    if (plainText.length > 20000) {
      plainText = plainText.substring(0, 20000) + '...';
    }

    const systemPrompt = `你是一個專業的知識圖譜構建專家與企劃總監。請將以下文章內容，重組為「視覺化畫布」所需的節點（Nodes）與連線（Edges）。
請盡可能保留原始文章中的細節，讓使用者在畫布上能看到完整的重點解說、名言金句及補充細節。

輸出必須嚴格為 JSON 格式：
{
  "nodes": [
    {
      "id": "node-1", // 必須是唯一字串
      "title": "重點標題",
      "content": "詳盡的重點解說 (字數不限，請保留完整語意)",
      "quotes": ["名言金句1", "名言金句2"],
      "details": ["細節補充1", "細節補充2", "具體行動建議"]
    }
  ],
  "edges": [
    { "source": "node-1", "target": "node-2", "label": "因果/關聯說明 (選填)" }
  ]
}

請確保：
1. 節點的 id 必須與 edges 中的 source/target 完全吻合。
2. edges 的關聯應能反映內容的邏輯推演（如時間順序、因果關係或層級架構）。
3. 如果內容偏向線性（如懶人包），請將節點串連為一條主線，或加入一些分支。`;

    const completion = await openai.chat.completions.create({
      model: "qwen-max",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `請解析以下內容：\n\n${plainText}` }
      ],
      response_format: { type: "json_object" }
    });

    const rawContent = completion.choices[0]?.message?.content || '';

    let resultObj;
    try {
      resultObj = parseRobustJSON(rawContent);
    } catch (parseErr) {
      console.error('JSON parse failed for generate-graph, raw content:', rawContent.substring(0, 500));
      return res.status(500).json({ error: 'AI 回傳格式錯誤，無法生成圖表' });
    }

    res.json({ success: true, graphData: resultObj });
  } catch (err) {
    console.error('Generate graph error:', err);
    res.status(500).json({ error: 'Generation failed' });
  }
});

// WebSockets Connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Client joins a project room to receive real-time updates
  socket.on('join-project', (projectId) => {
    socket.join(projectId);
  });

  // Cursor movement broadcasting
  socket.on('cursor-move', (data) => {
    // data: { projectId, userId, userName, x, y, color }
    socket.to(data.projectId).emit('remote-cursor-move', data);
  });

  socket.on('cursor-leave', (data) => {
    socket.to(data.projectId).emit('remote-cursor-leave', { userId: data.userId });
  });

  // Block updates broadcasting
  socket.on('block-update', (data) => {
    // data: { projectId, blocks }
    socket.to(data.projectId).emit('remote-block-update', data.blocks);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// ─────────────────────────────────────────────
// 前端靜態檔案 (Vite build output → /dist)
// ─────────────────────────────────────────────
const frontendDist = path.join(__dirname, '..', 'dist');
if (fs.existsSync(frontendDist)) {
  // 靜態檔案：JS / CSS / 圖片等
  app.use(express.static(frontendDist));
  // SPA fallback：只針對非 /api 的 GET 路由回傳 index.html
  app.use((req: any, res: any, next: any) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
  console.log(`✅ Serving frontend from ${frontendDist}`);
} else {
  // 僅後端模式：根路由顯示 API 狀態
  app.get('/', (_: any, res: any) => {
    res.json({ message: '🚀 Logic Hub Backend API is running successfully!' });
  });
  console.log('ℹ️  No frontend dist found, running in API-only mode');
}

httpServer.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
