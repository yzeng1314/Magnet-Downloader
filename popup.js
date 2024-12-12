// UI Elements
const magnetList = document.getElementById('magnet-list');
const refreshButton = document.getElementById('refresh-links');
const downloadButton = document.getElementById('download-selected');
const saveSettingsButton = document.getElementById('save-settings');
const testConnectionButton = document.getElementById('test-connection');
const statusMessage = document.getElementById('status-message');

// Tab switching
document.querySelectorAll('.tab-button').forEach(button => {
  button.addEventListener('click', () => {
    // Remove active class from all buttons and contents
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // Add active class to clicked button and corresponding content
    button.classList.add('active');
    document.getElementById(`${button.dataset.tab}-tab`).classList.add('active');
  });
});

// Load settings on popup open
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  scanForMagnetLinks();
});

// Settings management
async function loadSettings() {
  const settings = await chrome.storage.sync.get(['webuiUrl', 'username', 'password']);
  document.getElementById('webui-url').value = settings.webuiUrl || '';
  document.getElementById('username').value = settings.username || '';
  document.getElementById('password').value = settings.password || '';
}

saveSettingsButton.addEventListener('click', async () => {
  const settings = {
    webuiUrl: document.getElementById('webui-url').value.trim(),
    username: document.getElementById('username').value.trim(),
    password: document.getElementById('password').value.trim()
  };

  await chrome.storage.sync.set(settings);
  showStatus('Settings saved successfully!', 'success');
});

// Test qBittorrent connection
testConnectionButton.addEventListener('click', async () => {
  try {
    const settings = await chrome.storage.sync.get(['webuiUrl', 'username', 'password']);
    if (!settings.webuiUrl) {
      throw new Error('WebUI URL is required');
    }

    const response = await fetch(`${settings.webuiUrl}/api/v2/app/version`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(settings.username && {
          'Authorization': 'Basic ' + btoa(`${settings.username}:${settings.password}`)
        })
      },
      credentials: 'include',
      mode: 'cors'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
    }

    const version = await response.text();
    showStatus(`Connected successfully! qBittorrent version: ${version}`, 'success');
  } catch (error) {
    console.error('Connection error details:', error);
    let errorMessage = error.message;
    if (error.message === 'Failed to fetch') {
      errorMessage = 'Connection failed. Please check:\n' +
        '1. CORS is enabled in qBittorrent\n' +
        '2. The WebUI URL is correct\n' +
        '3. qBittorrent is running and accessible';
    }
    showStatus(`Connection failed: ${errorMessage}`, 'error');
  }
});

// Scan for magnet links
async function scanForMagnetLinks() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => {
        const links = Array.from(document.querySelectorAll('a[href^="magnet:"]'));
        return links.map(link => ({
          url: link.href,
          name: link.textContent.trim() || extractNameFromMagnet(link.href) || 'Unnamed torrent'
        }));

        function extractNameFromMagnet(magnetUrl) {
          const match = magnetUrl.match(/dn=([^&]+)/);
          if (match) {
            return decodeURIComponent(match[1].replace(/\+/g, ' '));
          }
          return null;
        }
      }
    });

    const magnetLinks = results[0].result;
    updateMagnetList(magnetLinks);
  } catch (error) {
    showStatus('Error scanning for magnet links', 'error');
  }
}

// Update magnet links list in popup
function updateMagnetList(magnetLinks) {
  magnetList.innerHTML = '';
  
  if (magnetLinks.length === 0) {
    magnetList.innerHTML = '<div class="magnet-item"><p>No magnet links found on this page.</p></div>';
    return;
  }

  magnetLinks.forEach((link, index) => {
    const item = document.createElement('div');
    item.className = 'magnet-item';
    item.innerHTML = `
      <input type="checkbox" id="magnet-${index}" data-url="${link.url}">
      <label class="magnet-name" for="magnet-${index}" title="${link.name}">${link.name}</label>
    `;
    magnetList.appendChild(item);
  });
}

// Refresh magnet links
refreshButton.addEventListener('click', scanForMagnetLinks);

// Download selected magnets
downloadButton.addEventListener('click', async () => {
  const settings = await chrome.storage.sync.get(['webuiUrl', 'username', 'password']);
  if (!settings.webuiUrl) {
    showStatus('Please configure qBittorrent settings first', 'error');
    return;
  }

  const selectedMagnets = Array.from(document.querySelectorAll('input[type="checkbox"]:checked'))
    .map(checkbox => checkbox.dataset.url);

  if (selectedMagnets.length === 0) {
    showStatus('Please select at least one magnet link', 'error');
    return;
  }

  try {
    for (const magnetUrl of selectedMagnets) {
      const response = await fetch(`${settings.webuiUrl}/api/v2/torrents/add`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
          ...(settings.username && {
            'Authorization': 'Basic ' + btoa(`${settings.username}:${settings.password}`)
          })
        },
        credentials: 'include',
        mode: 'cors',
        body: new URLSearchParams({
          urls: magnetUrl
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to add torrent: ${response.status} - ${response.statusText}`);
      }
    }

    showStatus(`Successfully added ${selectedMagnets.length} torrent(s) to qBittorrent`, 'success');
  } catch (error) {
    console.error('Download error details:', error);
    showStatus(`Error adding torrents: ${error.message}`, 'error');
  }
});

// Helper function to show status messages
function showStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
  setTimeout(() => {
    statusMessage.className = 'status-message';
  }, 5000);
} 