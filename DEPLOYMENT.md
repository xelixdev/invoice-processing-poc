# 🚀 Deployment Guide

## Overview

This project consists of:

- **Backend**: Django REST API (deployed to Railway)
- **Frontend**: Next.js application (deployed to Vercel)

## 🏗️ Backend Deployment (Railway)

### 1. Connect to Railway

1. Go to [Railway](https://railway.app) and sign up/login
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your `MikeHiett/invoice-processing-poc` repository
4. Choose the `django-railway` branch

### 2. Configure Environment Variables

In Railway, go to your project → Variables tab and add:

```bash
# Django Configuration
DEBUG=False
SECRET_KEY=your-super-secret-key-here-make-it-long-and-random
ALLOWED_HOSTS=your-app-name.railway.app

# AI Service (choose one)
ANTHROPIC_API_KEY=your-anthropic-api-key

# CORS (will be updated after Vercel deployment)
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

### 3. Add PostgreSQL Database

1. In Railway, click "New" → "Database" → "PostgreSQL"
2. Railway will automatically set the `DATABASE_URL` environment variable

### 4. Deploy Settings

Railway should automatically:

- Detect it's a Python project
- Use the `Procfile` for deployment commands
- Run migrations and collect static files

Your backend will be available at: `https://your-app-name.railway.app`

## 🌐 Frontend Deployment (Vercel)

### 1. Connect to Vercel

1. Go to [Vercel](https://vercel.com) and sign up/login
2. Click "New Project" → Import from GitHub
3. Select your `MikeHiett/invoice-processing-poc` repository
4. Set the **Root Directory** to `frontend`

### 2. Configure Environment Variables

In Vercel, go to your project → Settings → Environment Variables:

```bash
NEXT_PUBLIC_API_URL=https://your-railway-app-name.railway.app
```

### 3. Deploy

Vercel will automatically deploy your Next.js app.

Your frontend will be available at: `https://your-app-name.vercel.app`

## 🔗 Connect Frontend and Backend

### Update Railway CORS Settings

Once your Vercel app is deployed, update the Railway environment variables:

```bash
CORS_ALLOWED_ORIGINS=https://your-vercel-app.vercel.app,http://localhost:3000
ALLOWED_HOSTS=your-railway-app.railway.app,localhost,127.0.0.1
```

## 🧪 Testing the Deployment

1. Visit your Vercel frontend URL
2. Go to `/invoices/upload`
3. Upload a test invoice
4. Verify it processes correctly

## 🔧 Troubleshooting

### Backend Issues

- Check Railway logs: Railway dashboard → your project → View logs
- Verify environment variables are set correctly
- Ensure database is connected

### Frontend Issues

- Check Vercel logs: Vercel dashboard → your project → Functions tab
- Verify `NEXT_PUBLIC_API_URL` is set correctly
- Check browser console for errors

### CORS Issues

- Ensure your Vercel domain is in `CORS_ALLOWED_ORIGINS`
- Verify the backend URL in frontend env vars

## 📝 Environment Variables Summary

### Railway (Backend)

```bash
DEBUG=False
SECRET_KEY=your-secret-key
ALLOWED_HOSTS=your-railway-app.railway.app
ANTHROPIC_API_KEY=your-api-key
CORS_ALLOWED_ORIGINS=https://your-vercel-app.vercel.app,http://localhost:3000
```

### Vercel (Frontend)

```bash
NEXT_PUBLIC_API_URL=https://your-railway-app.railway.app
```

## 🎉 Success!

Once deployed, you'll have:

- ✅ Django API running on Railway with PostgreSQL
- ✅ Next.js frontend on Vercel
- ✅ AI-powered invoice extraction
- ✅ Automatic deployments on git push

Your invoice processing app is now live! 🚀
