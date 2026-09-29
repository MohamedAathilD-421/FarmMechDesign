const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const FILE = path.join(DATA_DIR, 'inquiries.json');
fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, '[]');

const company = {
  name: 'Farm Mech Design',
  tagline: 'Designing solutions. Driving agriculture.',
  phone: '8939253197',
  email: 'farmmechdesign@gmail.com'
};

const services = [
  { id: 'agri-machinery', name: 'Agricultural machinery design', covers: 'Field and farm machines designed around your crop, soil and power source.' },
  { id: 'food-machinery', name: 'Food machinery design', covers: 'Processing equipment built for hygiene, throughput and easy cleaning.' },
  { id: 'farm-layout', name: 'Farm layout', covers: 'Planning of sheds, processing areas and material flow on your site.' },
  { id: 'post-harvest', name: 'Post-harvest machinery design', covers: 'Cleaning, sorting, grading and storage machinery.' },
  { id: 'custom', name: 'Custom machinery design', covers: 'A machine for a job nothing on the market does well.' }
];

app.set('trust proxy', 1);
app.use(express.json({ limit: '20kb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.get('/api/company', (_req, res) => res.json(company));
app.get('/api/services', (_req, res) => res.json(services));

// Simple rate limit: 5 inquiries per IP per hour
const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < 3600e3);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 5;
}

const clean = (v, max) => String(v || '').trim().slice(0, max);

app.post('/api/inquiries', async (req, res) => {
  const b = req.body || {};
  if (b.website) return res.json({ ok: true }); // honeypot: bots fill this hidden field
  if (limited(req.ip)) return res.status(429).json({ error: 'Too many requests. Please call us instead.' });

  const inquiry = {
    id: crypto.randomBytes(4).toString('hex').toUpperCase(),
    name: clean(b.name, 100),
    phone: clean(b.phone, 20),
    email: clean(b.email, 120),
    service: clean(b.service, 60),
    message: clean(b.message, 2000),
    createdAt: new Date().toISOString()
  };
  const errors = {};
  if (inquiry.name.length < 2) errors.name = 'Enter your name.';
  if (!/^[0-9+\s-]{8,20}$/.test(inquiry.phone)) errors.phone = 'Enter a valid phone number.';
  if (inquiry.email && !/^\S+@\S+\.\S+$/.test(inquiry.email)) errors.email = 'Enter a valid email address.';
  if (inquiry.message.length < 10) errors.message = 'Describe your requirement in at least 10 characters.';
  if (Object.keys(errors).length) return res.status(400).json({ errors });

  const all = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  all.push(inquiry);
  fs.writeFileSync(FILE, JSON.stringify(all, null, 2));

  if (process.env.SMTP_HOST) {
    try {
      const mail = require('nodemailer').createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 465),
        secure: Number(process.env.SMTP_PORT || 465) === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      });
      await mail.sendMail({
        from: process.env.SMTP_USER,
        to: process.env.MAIL_TO || company.email,
        replyTo: inquiry.email || undefined,
        subject: `New inquiry ${inquiry.id}: ${inquiry.service || 'General'}`,
        text: `Name: ${inquiry.name}\nPhone: ${inquiry.phone}\nEmail: ${inquiry.email}\nService: ${inquiry.service}\n\n${inquiry.message}`
      });
    } catch (e) { console.error('Email failed:', e.message); }
  }
  res.status(201).json({ ok: true, id: inquiry.id });
});

app.get('/api/inquiries', (req, res) => {
  if (!process.env.ADMIN_KEY || req.get('x-admin-key') !== process.env.ADMIN_KEY)
    return res.status(401).json({ error: 'Unauthorized' });
  res.json(JSON.parse(fs.readFileSync(FILE, 'utf8')));
});

app.listen(PORT, () => console.log(`Farm Mech Design running on http://localhost:${PORT}`));
