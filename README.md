# Magnet-Downloader

An Chrome extension to list and manage magnet links for qBittorrent

## Features

- List all magnet links from the current tab
- Send magnet links to qBittorrent to download

## Installation

1. Clone the repository
2. Open Chrome and go to chrome://extensions/
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked"
5. Select the folder where you cloned the repository

## Troubleshooting

- If you get an error about the popup not being able to connect to qBittorrent due to 403 error, try to add the following headers to qBittorrent(option->webUI->security->custom headers):
  - `Access-Control-Allow-Origin: chrome-extension://*`
  - `Access-Control-Allow-Methods: GET, POST, OPTIONS`
  - `Access-Control-Allow-Headers: Authorization, Content-Type, Accept`
  - `Access-Control-Allow-Credentials: true`
