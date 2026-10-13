import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const distPath = path.join(__dirname, 'dist');
const configFilePath = path.join(__dirname, 'config.json');

app.use(express.json());

const defaultConfig = {
  videoId: '1235125945',
  ad1ScriptUrl: 'https://bauval.org/14/d5971812e8228bafc23fefa5e2dcedb5',
  ad2ScriptUrl: 'https://bauval.org/21/3359dfb49d3904ef22e968fbd601bd0f',
  ad2ContainerId: 'container-3359dfb49d3904ef22e968fbd601bd0f',
  topBannerCount: 10,
  bottomBannerCount: 5,
  autoScroll: true,
};

function readConfig() {
  try {
    if (fs.existsSync(configFilePath)) {
      const data = fs.readFileSync(configFilePath, 'utf-8');
      return { ...defaultConfig, ...JSON.parse(data) };
    }
  } catch (err) {
    console.error('Error reading config file:', err);
  }
  return defaultConfig;
}

function saveConfig(cfg) {
  try {
    fs.writeFileSync(configFilePath, JSON.stringify(cfg, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing config file:', err);
    return false;
  }
}

// Config API endpoints
app.get('/api/config', (req, res) => {
  res.json(readConfig());
});

app.post('/api/config', (req, res) => {
  const current = readConfig();
  const updated = {
    ...current,
    ...req.body,
  };
  if (saveConfig(updated)) {
    res.json({ success: true, config: updated });
  } else {
    res.status(500).json({ success: false, message: 'Failed to write config' });
  }
});

// Admin verify endpoint (password: 445566)
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === '445566') {
    res.json({ success: true, token: 'adm_session_valid' });
  } else {
    res.status(401).json({ success: false, message: 'Invalid password' });
  }
});

// Serve frontend assets
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  app.get('*', (req, res) => {
    res.status(503).send('Build folder not found. Please run "npm run build" first.');
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
