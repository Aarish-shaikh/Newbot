@echo off
title Evolution API - Cloudflare Tunnel
echo ========================================================
echo Starting Cloudflare Tunnel for Evolution API (port 8080)
echo ========================================================
echo.
echo Look for the public https://*.trycloudflare.com link below:
echo (Press Ctrl+C to stop the tunnel at any time)
echo.
D:\cloudflared.exe tunnel --url http://localhost:8080
pause
